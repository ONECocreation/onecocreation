import { tierSatisfies, type Tier } from "./entitlement";

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

export interface MatrixRoom {
  /** room ALIAS, e.g. #claire-senses:onecocreation.com */
  id: string;
  title: string;
  kind: "class" | "community";
  minTier: Tier | "all";
}

/* ── CONTENT: Love's rooms ──────────────────────────────────────────────── */
export const ROOMS: MatrixRoom[] = [
  { id: "#heart-field:onecocreation.com", title: "The Heart Field — Commons", kind: "community", minTier: "all" },
  { id: "#claire-senses:onecocreation.com", title: "Claire Senses — Foundations", kind: "class", minTier: "A" },
  { id: "#tune-up:onecocreation.com", title: "Daily Tune-Up & Check-ins", kind: "community", minTier: "A" },
  { id: "#weekly-reading:onecocreation.com", title: "Chronicles: Weekly Reading", kind: "class", minTier: "B" },
  { id: "#observers-circle:onecocreation.com", title: "The Observers' Circle", kind: "community", minTier: "B" },
  { id: "#quantum-healing:onecocreation.com", title: "Quantum Healing — Deep Dive", kind: "class", minTier: "C" },
  { id: "#inner-sanctum:onecocreation.com", title: "Evening Star — Inner Sanctum", kind: "community", minTier: "C" },
];

/** Which rooms a tier opens. `all` rooms are open to any paying member. */
export function roomsForTier(tier: Tier): MatrixRoom[] {
  return ROOMS.filter((r) => r.minTier === "all" || tierSatisfies(tier, r.minTier));
}

/* ── the homeserver ─────────────────────────────────────────────────────── */

function config(): { base: string; token: string } | null {
  const base = process.env.MATRIX_HOMESERVER?.replace(/\/$/, "");
  const token = process.env.MATRIX_BOT_TOKEN;
  return base && token ? { base, token } : null;
}

export function matrixConfigured(): boolean {
  return config() !== null;
}

async function call(
  method: "GET" | "POST",
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
