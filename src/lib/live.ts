import { ROOMS, type MatrixRoom } from "./matrix-rooms";
import { listEntitlements, tierSatisfies, type Tier } from "./entitlement";
import { enqueue } from "./mail-queue";
import { brandShell, pill } from "./mail";
import { siteBase } from "./subscribers";
import { SPACE_NAME } from "./identity-config";

/**
 * THE LIVE FLAG (TASK-37/S40 lane 2) — one KV-backed truth for "Love is
 * live now", and the schedule voice said ONCE.
 *
 * The flag is written ONLY by the operator-gated /api/admin/live route (the
 * class door opening/resting) and read by the site-wide banner (via the
 * tiny public /api/live endpoint), the /live page, and the /a console —
 * the console's old hardcoded schedule line and the idle voice below drink
 * from the same two constants, so the truth is spoken in one place.
 *
 * SERVER-ONLY — this file walks the entitlement vault and the mail rail;
 * client surfaces (the banner) read /api/live instead.
 */

/** The weekly rhythm, as the /a console always said it — now the single
 *  truth the /live idle voice reads too (S40 lane 1 ruling). */
export const LIVE_SCHEDULE = "Mon · Wed · Fri ~11:11";
export const LIVE_YOUTUBE = "https://www.youtube.com/@Onecocreation";

/** The exact KV shape (the H13 ruling): `room` is the room SLUG (alias
 *  local part, resolvable against ROOMS — never a free-form alias),
 *  `startedAt` is unix SECONDS. */
export interface LiveState {
  live: boolean;
  kind?: "class" | "community";
  room?: string;
  startedAt?: number;
  /** TASK-236 (0018.06.23 a₿) — the after-hours door: a SECOND room and a
   *  clock, riding beside the live room, not replacing it. `room` is a slug
   *  resolvable through `roomForSlug` (never the free Commons — a room with
   *  `minTier: "all"` is rejected at write time and dropped at read time,
   *  same honesty law as the top-level `room`), `at` is unix SECONDS. Rides
   *  ONLY while the room itself is live (this whole object reads IDLE the
   *  instant `live !== true`) — closing the room clears it for free, no
   *  separate clear ever required by that path. */
  afterHours?: { room: string; at: number };
}

const KEY = "oc:live";
const IDLE: LiveState = { live: false };

/** Room slug ⇄ ROOMS — the same derivation the rooms shelf uses. */
export const slugOfRoom = (r: MatrixRoom): string => r.id.slice(1, r.id.indexOf(":"));
export const roomForSlug = (slug: string): MatrixRoom | undefined =>
  ROOMS.find((r) => slugOfRoom(r) === slug);

/**
 * THE ONE JITSI ROOM-NAME DERIVATION (TASK-146, H60-A ruling). Rooms live
 * on a SHARED Jitsi host (meet.<space's own domain>) alongside every other
 * artist's spaces — a bare room slug ("lesson-path") could collide with
 * another artist's room of the same name. Namespacing by the site's own
 * space slug keeps every artist's rooms distinct with zero coordination.
 *
 * Pure — no I/O, no vault, no mail — so it is safe to call from anywhere
 * this module's OTHER exports would be unsafe to import. In practice it is
 * called from exactly two server call-sites (the room page and /live) and
 * the derived string is threaded down as a prop from there — RoomVideoSlot
 * itself (a "use client" leaf) never imports this file directly: live.ts
 * pulls in the entitlement/mail-queue/vault chain for its OTHER exports,
 * and matrix-rooms.ts's own docblock already records the Turbopack lesson
 * of 0018.05.15 (a client card importing that chain broke the client
 * bundle) — this keeps that lesson from repeating.
 */
export function liveRoomName(slug: string): string {
  return `${liveRoomPrefix()}${slug}`;
}

/** TASK-192 (additive read): the namespace half of liveRoomName(), so a
 *  surface that only knows the guest-TYPED half of a room name (the
 *  Go-Live room's co-create door) derives the SAME prefix instead of
 *  re-inventing it. Pure, like liveRoomName. */
export function liveRoomPrefix(): string {
  const space = SPACE_NAME.trim() || "onecocreation";
  return `${space}-`;
}

/** TASK-243: the one join point for a VDO.Ninja-shaped link — a bare host
 *  in, `https://<host>/` out — so a scheme is never pasted twice across the
 *  handful of call-sites that build a room URL from it. Pure. */
export function vdoBase(host: string): string {
  return `https://${host}/`;
}

/** TASK-192 (additive read), TASK-243 (own studio door): T-191's studio
 *  VDO derivation, one word further — the same `${prefix}-studio` room the
 *  /a/studio desk derives inline, shared so the Go-Live room's YouTube door
 *  can never drift from the director's desk. `host` is the meeting config's
 *  own VDO host (SiteConfig.meeting.vdoHost) — Love's own studio
 *  (vdo.onecocreation.com), never the public vdo.ninja by default. Pure:
 *  in, links out. */
export function studioVdoLinks(roomPrefix: string, host: string): { room: string; push: string; guest: string } {
  const room = `${roomPrefix}-studio`;
  const base = vdoBase(host);
  return {
    room,
    push: `${base}?room=${encodeURIComponent(room)}&push=host`,
    guest: `${base}?room=${encodeURIComponent(room)}`,
  };
}

/** TASK-249: a named guest's own camera door — the same `push=` shape
 *  T-243's studioVdoLinks uses for `host` (`push=host`), one word further:
 *  `push=<the guest's own handle>`, so the tile the gallery already
 *  addresses at `?view=<handle>&room=<studioRoom>` (RoomVideoSlot's
 *  GalleryTile) can actually find them once they open this door and
 *  publish. Deliberately NOT folded into studioVdoLinks — Love's own
 *  copyable off-site guest link (`.guest`, bare `?room=<room>`, VDO
 *  assigns a random id) on `/a/studio` and `/a/live` stays exactly as it
 *  was; this is a SECOND, narrower door for a soul the director already
 *  named. Pure: host/room/handle in, one link out. */
export function studioGuestCameraLink(host: string, room: string, handle: string): string {
  return `${vdoBase(host)}?room=${encodeURIComponent(room)}&push=${encodeURIComponent(handle)}`;
}

/** TASK-192 (additive read): one confirmed call, shaped for the Go-Live
 *  room's Discovery-call door. */
export interface TodaySession {
  bookingId: string;
  title: string;
  customer: string;
  startUtc: string;
  endUtc: string;
}

/** TASK-192 (additive read): today's CONFIRMED bookings from the booking
 *  store, UTC-day honest (the slot's own frame — the words say UTC, never
 *  a guessed local midnight), earliest first. Held, released and canceled
 *  never list; an empty day reads as an empty list (derive-or-dash). Pure. */
export function confirmedToday(
  bookings: {
    id: string;
    serviceTitle: string;
    startUtc: string;
    endUtc: string;
    state: string;
    customer: { name?: string; email?: string; npub?: string };
  }[],
  nowMs: number = Date.now(),
): TodaySession[] {
  const day = new Date(nowMs).toISOString().slice(0, 10);
  return bookings
    .filter((b) => b.state === "confirmed" && typeof b.startUtc === "string" && b.startUtc.slice(0, 10) === day)
    .sort((a, b) => a.startUtc.localeCompare(b.startUtc))
    .map((b) => ({
      bookingId: b.id,
      title: b.serviceTitle,
      customer: b.customer.name || b.customer.email || b.customer.npub || "someone",
      startUtc: b.startUtc,
      endUtc: b.endUtc,
    }));
}

/* ── the vault (the house's KV REST pattern, names only) ────────────────── */

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

export function liveStoreConfigured(): boolean {
  return restEnv() !== null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) throw new Error("live flag: vault not configured");
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`live flag: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

/** TASK-236: the after-hours door's own sanitise, field-by-field — bad
 *  shape, a room outside ROOMS, or the free Commons (never a legitimate
 *  after-hours target, mirrors the write route's own check) all drop it
 *  silently (derive-or-dash), never a half-good object reaching a caller. */
function sanitizeAfterHours(raw: unknown): { room: string; at: number } | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.room !== "string") return undefined;
  const room = roomForSlug(o.room);
  if (!room || room.minTier === "all") return undefined;
  if (typeof o.at !== "number" || !Number.isFinite(o.at)) return undefined;
  return { room: o.room, at: o.at };
}

/** The flag, honestly: an unreadable vault or a flag pointing at a room
 *  that isn't in ROOMS both read as DARK — a stale or foreign flag must
 *  never light the banner. */
export async function getLiveState(): Promise<LiveState> {
  try {
    const raw = (await kv(["GET", KEY])) as string | null;
    if (!raw) return IDLE;
    const s = JSON.parse(raw) as LiveState;
    if (!s || s.live !== true) return IDLE;
    if (s.room && !roomForSlug(s.room)) return IDLE;
    return {
      live: true,
      kind: s.kind === "community" ? "community" : "class",
      room: s.room,
      startedAt: typeof s.startedAt === "number" ? s.startedAt : undefined,
      afterHours: sanitizeAfterHours(s.afterHours),
    };
  } catch {
    return IDLE;
  }
}

/** Set or clear — throws when the vault is dark so the route can say so
 *  (a door that opens without its flag would strand the banner). */
export async function setLiveState(s: LiveState): Promise<void> {
  await kv(["SET", KEY, JSON.stringify(s)]);
}

/* ── the words the bot carries into the room ────────────────────────────── */

export function defaultOpeningWord(room: MatrixRoom): string {
  return room.kind === "class"
    ? `● Class is beginning — ${room.title} is open. Come as you are. 🤍`
    : `● ${room.title} is live — come as you are. 🤍`;
}

export function defaultGoodbyeWord(room: MatrixRoom): string {
  return `Thank you for being here — ${room.title} rests until next time. The words stay for you. With love. 🕊️`;
}

/* ── lane 3: the class-starting letter (an OPTION on open, default OFF) ── */

/** The member's letter address, from their grant key: email members carry
 *  it in the key itself ("addr@email"); key-door members resolve through
 *  the registry tags to their linked email door (memberGroup's closure).
 *  No email door = no letter — the room itself still announces. */
async function emailForGrantKey(grantKey: string): Promise<string | null> {
  if (grantKey.endsWith("@email")) return grantKey.slice(0, -"@email".length);
  try {
    const { nip19 } = await import("nostr-tools");
    const { findAllByNpub } = await import("./registry");
    const { emailForSubject } = await import("./member-tier");
    for (const tag of await findAllByNpub(nip19.npubEncode(grantKey))) {
      const em = await emailForSubject(`${tag.handle}@${tag.space}`);
      if (em) return em;
    }
  } catch {
    /* no email door found — the letter simply doesn't go to them */
  }
  return null;
}

/** Every member whose LIVE grant opens this room and who has an email
 *  door — the same gate semantics as getEntitlement (revoked and lapsed
 *  grants read as nothing), deduped by address. */
export async function classStartingAudience(room: MatrixRoom): Promise<string[]> {
  const out = new Set<string>();
  for (const rec of await listEntitlements()) {
    if (rec.revokedAtMs) continue;
    if (rec.expiresAtMs != null && Date.now() > rec.expiresAtMs) continue;
    if (room.minTier !== "all" && !tierSatisfies(rec.tier, room.minTier as Tier)) continue;
    const em = await emailForGrantKey(rec.npub);
    if (em) out.add(em);
  }
  return [...out];
}

/**
 * The class-starting letter — the pwyc/revoke pattern: constant house-voice
 * template, brandShell + pill, enqueue() ONLY (the hourly cap throttles the
 * drain — cap-aware by construction; the mail rail is reputation armor).
 * Wired as an option on the open action, DEFAULT OFF until the Admiral
 * flips it.
 */
export async function sendClassStartingLetters(
  room: MatrixRoom,
): Promise<{ audience: number; queued: number }> {
  const to = await classStartingAudience(room);
  if (to.length === 0) return { audience: 0, queued: 0 };
  const slug = slugOfRoom(room);
  /* the gold CTA stays literal, like every house letter — decorative gold
     awaits the taste-maker's ruling (gold law) */
  const html = brandShell(
    `<p>The room is open, beautiful soul — <b>${room.title}</b> is live now, and your seat is saved.</p>
     <p>Come as you are:</p>
     <p style="text-align:center;margin:24px 0;">${pill(`${siteBase()}/rooms/${slug}`, "Enter the room 🤍", "lg")}</p>
     <p>If the moment passes you by, the words stay in the room — you can read them whenever you arrive.</p>
     <p>With love,<br/>One Cocreation</p>`,
  );
  const queued = await enqueue(
    to.map((addr) => ({ to: addr, subject: `● ${room.title} — the door is open`, html })),
  );
  return { audience: to.length, queued };
}
