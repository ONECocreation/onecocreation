import { tierSatisfies, type Tier } from "./entitlement";
import { ROOMS, type MatrixRoom } from "./matrix-rooms";
export { ROOMS, type MatrixRoom } from "./matrix-rooms";

/**
 * MATRIX — classes and community, tier-gated, wired to a real homeserver.
 *
 * Same split as entitlement.ts: ROOMS is One Cocreation's CONTENT, everything
 * below it is framework-shaped mechanism that reads ROOMS as config.
 *
 * ⛔ A PER-CLONE BOT, NEVER A SYNAPSE ADMIN TOKEN (storefront-framework.md,
 * Module 4). An admin token on a shared homeserver is a fleet-wide blast
 * radius: this clone could deactivate another community's members. The bot is
 * an ordinary account holding elevated power ONLY inside Love's rooms, so the
 * worst it can do is misbehave in Love's own space. The old stub asked for
 * MATRIX_ADMIN_TOKEN; that env name is deliberately gone.
 *
 * ⛔ INVITES ISSUE SERVER-SIDE FROM THE SETTLED FLIP ONLY. There is no
 * client-triggered "claim my invite" route — that would be a free door.
 *
 * ⚠ ROOM CREATION IS NOT DONE HERE. Every gated room must be created by a
 * script with settings that are one-way doors — encryption OFF with
 * history_visibility: shared (Element defaults private rooms to E2EE, which
 * can never be undone and would deny pre-join history to someone who buys
 * tier C after three classes are posted), join_rule: invite rather than the
 * space-restricted default, and m.federate: false so paid media is not
 * permanently replicated to remote servers a kick cannot claw back.
 */

export function roomsForTier(tier: Tier): MatrixRoom[] {
  return ROOMS.filter((r) => r.minTier === "all" || tierSatisfies(tier, r.minTier));
}

/** Every room open to a member holding `tier` — null tier = the free
 *  Community Circle, which still opens every `all` room. */
export function roomsForMember(tier: Tier | null): MatrixRoom[] {
  return tier ? roomsForTier(tier) : ROOMS.filter((r) => r.minTier === "all");
}

/** Bot-invite a member to specific rooms (already-inside counts as done).
 *  The free-member half of the gate: `all` rooms open at login, not at
 *  purchase — a Community Circle soul has no settle event to ride. */
export async function ensureInvited(mxid: string, rooms: MatrixRoom[]): Promise<RoomOutcome[]> {
  const out: RoomOutcome[] = [];
  for (const room of rooms) {
    const id = await resolveRoom(room.id);
    if (!id) {
      out.push({ room: room.id, ok: false, reason: "room not found on the homeserver" });
      continue;
    }
    const res = await call("POST", `/rooms/${encodeURIComponent(id)}/invite`, { user_id: mxid });
    if (res.ok) out.push({ room: room.id, ok: true });
    else if (/already in the room|already invited|already joined/i.test(res.reason)) {
      out.push({ room: room.id, ok: true, already: true });
    } else out.push({ room: room.id, ok: false, reason: res.reason });
  }
  return out;
}

/* ── the homeserver ─────────────────────────────────────────────────────── */

function config(): { base: string; token: string } | null {
  // Love's OWN homeserver is the default now (0018.05.16 — the VPS run made
  // it real). The bot seat is adminpacman: an ordinary account that is room
  // creator/PL100 in Love's rooms — on a single-tenant homeserver the
  // per-clone-bot law and this token describe the same blast radius.
  const base = (process.env.MATRIX_HOMESERVER ?? "https://matrix.onecocreation.com").replace(/\/$/, "");
  const token = process.env.MATRIX_BOT_TOKEN ?? process.env.MATRIX_OCC_ADMIN_TOKEN;
  return base && token ? { base, token } : null;
}

/** The member's matrix id, derived — never asked for. Email members read as
 *  pac.at.pacsarcade.org; key members keep their handle. */
export function mxidForSubject(subject: string): string {
  const server = (process.env.MATRIX_HOMESERVER ?? "https://matrix.onecocreation.com")
    .replace(/^https?:\/\/matrix\./, "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const [handle, space] = subject.includes("@")
    ? [subject.slice(0, subject.lastIndexOf("@")), subject.slice(subject.lastIndexOf("@") + 1)]
    : [subject, ""];
  const local = (space === "email" ? handle.replace(/@/g, ".at.") : handle)
    .toLowerCase()
    .replace(/[^a-z0-9._=\/-]/g, "-");
  return `@${local}:${server}`;
}

export function matrixConfigured(): boolean {
  return config() !== null;
}

async function call(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: unknown,
): Promise<{ ok: true; data: unknown } | { ok: false; reason: string }> {
  const cfg = config();
  if (!cfg) return { ok: false, reason: "matrix not configured" };
  try {
    const res = await fetch(`${cfg.base}/_matrix/client/v3${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data as { errcode?: string; error?: string };
      return { ok: false, reason: err.errcode ? `${err.errcode}: ${err.error ?? ""}` : `http ${res.status}` };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "network error" };
  }
}

/** Alias (#room:server) → internal room id (!abc:server). */
async function resolveRoom(alias: string): Promise<string | null> {
  const res = await call("GET", `/directory/room/${encodeURIComponent(alias)}`);
  if (!res.ok) return null;
  const id = (res.data as { room_id?: string }).room_id;
  return typeof id === "string" ? id : null;
}

export interface RoomOutcome {
  room: string;
  ok: boolean;
  /** already in the room — a success, not a failure */
  already?: boolean;
  reason?: string;
}

/**
 * Invite a member to every room their tier opens.
 *
 * Per-room outcomes rather than one throw: a member who is already in three
 * rooms and new to two must end up in all five, and one missing room must not
 * cost them the rest. Callers log the failures — the console's reconcile view
 * is what turns "settled but ungranted" into something Love can act on.
 */
export async function inviteToTierRooms(mxid: string, tier: Tier): Promise<RoomOutcome[]> {
  if (!matrixConfigured()) {
    return roomsForTier(tier).map((r) => ({ room: r.id, ok: false, reason: "matrix not configured" }));
  }
  const out: RoomOutcome[] = [];
  for (const room of roomsForTier(tier)) {
    const id = await resolveRoom(room.id);
    if (!id) {
      out.push({ room: room.id, ok: false, reason: "room not found on the homeserver" });
      continue;
    }
    const res = await call("POST", `/rooms/${encodeURIComponent(id)}/invite`, { user_id: mxid });
    if (res.ok) {
      out.push({ room: room.id, ok: true });
    } else if (/M_FORBIDDEN/.test(res.reason) && /already/i.test(res.reason)) {
      out.push({ room: room.id, ok: true, already: true });
    } else {
      out.push({ room: room.id, ok: false, reason: res.reason });
    }
  }
  return out;
}

/**
 * The other half of the gate, and it ships at the same time as the grant.
 * Refund, dispute, or expiry → the member comes out of the gated rooms.
 * Community rooms marked `all` are left alone unless `everything` is set.
 */
export async function removeFromTierRooms(
  mxid: string,
  opts?: { everything?: boolean; reason?: string },
): Promise<RoomOutcome[]> {
  if (!matrixConfigured()) {
    return [{ room: "*", ok: false, reason: "matrix not configured" }];
  }
  const targets = opts?.everything ? ROOMS : ROOMS.filter((r) => r.minTier !== "all");
  const out: RoomOutcome[] = [];
  for (const room of targets) {
    const id = await resolveRoom(room.id);
    if (!id) {
      out.push({ room: room.id, ok: false, reason: "room not found on the homeserver" });
      continue;
    }
    const res = await call("POST", `/rooms/${encodeURIComponent(id)}/kick`, {
      user_id: mxid,
      reason: opts?.reason ?? "membership ended",
    });
    // not in the room is the state we wanted anyway
    out.push(
      res.ok
        ? { room: room.id, ok: true }
        : /not in the room|M_FORBIDDEN/i.test(res.reason)
          ? { room: room.id, ok: true, already: true }
          : { room: room.id, ok: false, reason: res.reason },
    );
  }
  return out;
}

/** Does this look like a matrix id? Cheap shape check before we spend a call. */
export function isMxid(v: string): boolean {
  return /^@[^:\s]+:[^:\s]+$/.test(v);
}

/**
 * Post a plain-text message into a room, as the bot (TASK-37/S40 lane 1 —
 * the announce). The alias comes from ROOMS, never free-form: callers
 * validate upstream, so a typo here meets "room not found", not a new door.
 * Used for Love's opening word when a class room opens and the goodbye when
 * it rests; members already inside see it on RoomView's next poll.
 */
export async function postToRoom(
  alias: string,
  body: string,
): Promise<{ ok: true; eventId?: string } | { ok: false; reason: string }> {
  const id = await resolveRoom(alias);
  if (!id) return { ok: false, reason: "room not found on the homeserver" };
  const txn = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const res = await call("POST", `/rooms/${encodeURIComponent(id)}/send/m.room.message/${encodeURIComponent(txn)}`, {
    msgtype: "m.text",
    body,
  });
  if (!res.ok) return { ok: false, reason: res.reason };
  const eventId = (res.data as { event_id?: string }).event_id;
  return { ok: true, eventId };
}

/**
 * Pin (or clear) the room's single pinned-message state
 * (`m.room.pinned_events`) — Love's Desk Day altitude's "pinned welcome"
 * rail (room-pins.ts). The bot holds PL100 in Love's own rooms (room
 * creator — see the file header), which is well above the default
 * state_default of 50 that `m.room.pinned_events` requires, so this rides
 * the same call() plumbing as postToRoom rather than needing a wider
 * token. Always replaces the room's pin list with AT MOST one event id —
 * Love's Desk never asks for a stack of pins.
 */
export async function setRoomPinnedEvent(
  alias: string,
  eventId: string | null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const id = await resolveRoom(alias);
  if (!id) return { ok: false, reason: "room not found on the homeserver" };
  const res = await call("PUT", `/rooms/${encodeURIComponent(id)}/state/m.room.pinned_events`, {
    pinned: eventId ? [eventId] : [],
  });
  return res.ok ? { ok: true } : { ok: false, reason: res.reason };
}

/**
 * The room's joined-member count + display names, read with the BOT's own
 * session (it is already a member of every one of Love's rooms) — no
 * per-visitor login round trip needed, which is why this is safe to call
 * from an operator-only server route. `joined_members` hands back a
 * display_name per user in the SAME call, so honest names ride along for
 * free; there is no presence API wired anywhere in this house, so online
 * dots are never invented here (Love's Desk's roster rail, room-pins.ts's
 * sibling honesty rule).
 */
export async function roomRoster(
  alias: string,
): Promise<{ ok: true; count: number; names: string[] } | { ok: false; reason: string }> {
  const id = await resolveRoom(alias);
  if (!id) return { ok: false, reason: "room not found on the homeserver" };
  const res = await call("GET", `/rooms/${encodeURIComponent(id)}/joined_members`);
  if (!res.ok) return { ok: false, reason: res.reason };
  const joined = (res.data as { joined?: Record<string, { display_name?: string }> }).joined ?? {};
  const names = Object.entries(joined).map(
    ([mxid, info]) => info.display_name || mxid.slice(1, mxid.indexOf(":")),
  );
  return { ok: true, count: names.length, names };
}
