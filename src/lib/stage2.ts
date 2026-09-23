import { kv } from "@/lib/store";
import { TENANT } from "@/lib/tenant";
import { mintJitsiRoom } from "@/lib/studio/jitsi-door";
import { zonedDateParts, DEFAULT_TZ } from "@/lib/booking-time";

/**
 * STAGE 2 — THE AFTER-READING JITSI PILOT (TASK-392, block 968,091) — the
 * three-phase lifecycle: `closed` → `prepared` → `published`. Mirrors
 * `live.ts`'s `LiveState`/`oc:live` shape (one KV doc, sanitised on every
 * read, IDLE on any doubt), never `site-config.ts`'s dual-driver shape —
 * this lane deliberately never touches `site-config.ts` (Ground: the
 * public `/api/admin/site` GET hands its whole config to any anonymous
 * caller, so Stage 2's room name must never live there).
 *
 * A plain open/closed boolean would let a repeated "open" mint a second
 * room and let members in before Love had even started the call
 * (Astra's review, finding 5) — the three phases separate MINTING
 * (`prepared`, private) from ISSUING (`published`, the door exists).
 *
 * TASK-439 (block 968,218, the Admiral's ruling 4): Stage 2 also closes
 * ITSELF at midnight Mountain. `publishedAtMs` stamps the publish instant
 * and `stage2Expired` compares America/Denver CALENDAR dates (never a
 * fixed UTC offset — the zone carries the DST rules); `getStage2State`
 * fails closed to IDLE on an expired state, so after Denver midnight
 * every reader (member route, operator route, prepare, publish) sees
 * `closed` and the next prepare/publish mints a FRESH room — a Friday
 * rehearsal room can never be re-used on Saturday (security critic
 * finding 3, closed HERE in the state read, not in the routes).
 *
 * KV key `stage2:state:${TENANT}` via `store.ts`'s `kv()` — the same
 * tenant-namespaced REST client `studio/jitsi-door.ts` already uses for
 * its own one-time-room precedent. NO MODULE-LEVEL CACHE: every function
 * below reads KV fresh, which is what keeps the transitions honest under
 * normal sequential operator clicking. Two truly simultaneous PUTs (two
 * admins clicking at the same instant) are NOT locked against by this
 * pilot — a real mutex is out of scope for one builder-day, named here
 * and in the brief's Honestly-broken section, not hidden.
 */

export type Stage2Phase = "closed" | "prepared" | "published";

export interface Stage2State {
  phase: Stage2Phase;
  /** the room slug on the house Jitsi (`mintJitsiRoom()`'s own
   *  `oc-<16 hex>` shape) — null only while `phase === "closed"`. */
  room: string | null;
  /** unix MILLISECONDS — when this room was minted (prepare or the
   *  closed→publish convenience path); null only while `closed`. */
  openedAtMs: number | null;
  /** unix MILLISECONDS — when the phase became `published` (ruling 4's
   *  midnight-close anchor); null while `closed` or `prepared`, and on a
   *  stored doc written before the ruling (read as `null`). */
  publishedAtMs: number | null;
}

/** The one KV key this whole lane reads and writes. */
const KEY = `stage2:state:${TENANT}`;

export const IDLE: Stage2State = { phase: "closed", room: null, openedAtMs: null, publishedAtMs: null };

/** `mintJitsiRoom()`'s own shape, checked again here rather than trusted —
 *  a stored value is never assumed to have come from that function. */
const ROOM_SHAPE = /^oc-[0-9a-f]{16}$/;

/**
 * FAIL-CLOSED INVARIANT CHECK (Astra's review, finding 7): `phase` must be
 * one of the three known strings; `phase !== "closed"` requires `room` to
 * be a non-empty string matching the mint shape; `phase === "closed"`
 * requires `room === null`. Any mismatch — a hand-edited or half-written
 * KV value — is not a real Stage2State, never a half-trusted patch.
 */
function isValidState(raw: unknown): raw is Stage2State {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (o.phase !== "closed" && o.phase !== "prepared" && o.phase !== "published") return false;
  if (o.phase === "closed") return o.room === null;
  return typeof o.room === "string" && ROOM_SHAPE.test(o.room);
}

/** GET, JSON-parse in a try/catch → any failure OR any invariant
 *  violation fails CLOSED to IDLE, never a guessed-open state. An EXPIRED
 *  state (ruling 4: its Denver calendar day is over) reads IDLE the same
 *  way — the midnight close lives HERE, so every reader sees it at once;
 *  nothing is written on read. `nowMs` defaults to the server's own clock
 *  and is NEVER taken from a request (security critic finding 6). */
export async function getStage2State(nowMs: number = Date.now()): Promise<Stage2State> {
  try {
    const res = (await kv(["GET", KEY])) as { result?: unknown } | null;
    if (typeof res?.result !== "string" || !res.result) return IDLE;
    const parsed = JSON.parse(res.result) as unknown;
    if (!isValidState(parsed)) return IDLE;
    const state: Stage2State = {
      phase: parsed.phase,
      room: parsed.room,
      openedAtMs: typeof parsed.openedAtMs === "number" ? parsed.openedAtMs : null,
      publishedAtMs: typeof parsed.publishedAtMs === "number" ? parsed.publishedAtMs : null,
    };
    return stage2Expired(state, nowMs) ? IDLE : state;
  } catch {
    return IDLE;
  }
}

/**
 * THE MIDNIGHT CLOSE (the Admiral's ruling 4, block 968,218 — "Stage 2
 * closes itself at midnight Denver time", on top of Love's own Close).
 * Pure: a non-closed state is expired once the America/Denver CALENDAR
 * DATE of its anchor (`publishedAtMs ?? openedAtMs` — the publish stamp
 * when there is one, the mint stamp otherwise) is earlier than the
 * America/Denver date of `nowMs`. Zone arithmetic, never a fixed offset:
 * `DEFAULT_TZ` is imported, no second "America/Denver" literal is written
 * here. A non-closed state with NO anchor is expired (fail closed);
 * `closed` is never expired.
 */
export function stage2Expired(state: Stage2State, nowMs: number): boolean {
  if (state.phase === "closed") return false;
  const anchor = state.publishedAtMs ?? state.openedAtMs;
  if (anchor === null) return true;
  return zonedDateParts(new Date(anchor), DEFAULT_TZ).date < zonedDateParts(new Date(nowMs), DEFAULT_TZ).date;
}

async function writeStage2State(state: Stage2State): Promise<void> {
  await kv(["SET", KEY, JSON.stringify(state)]);
}

/** Reads fresh state; `phase !== "closed"` is idempotent — returns the
 *  state unchanged, mints nothing (a second click never double-mints).
 *  `phase === "closed"` mints via `mintJitsiRoom()` (imported, read-only)
 *  and writes `prepared`, privately — nothing members can see yet. An
 *  EXPIRED stored doc reads `closed` through getStage2State (ruling 4),
 *  so the first prepare of a new Denver day always mints a FRESH room —
 *  Friday's room is never re-used on Saturday. */
export async function prepareStage2(): Promise<Stage2State> {
  const current = await getStage2State();
  if (current.phase !== "closed") return current;
  const next: Stage2State = { phase: "prepared", room: mintJitsiRoom(), openedAtMs: Date.now(), publishedAtMs: null };
  await writeStage2State(next);
  return next;
}

/** Reads fresh state; `published` is an idempotent no-op; `prepared`
 *  flips to `published` with the SAME room, no remint, stamping
 *  `publishedAtMs` (ruling 4's midnight-close anchor); `closed` mints
 *  AND publishes in one step (a convenience path — still exactly one
 *  mint), stamping both anchors. */
export async function publishStage2(): Promise<Stage2State> {
  const current = await getStage2State();
  if (current.phase === "published") return current;
  if (current.phase === "prepared") {
    const next: Stage2State = { ...current, phase: "published", publishedAtMs: Date.now() };
    await writeStage2State(next);
    return next;
  }
  const now = Date.now();
  const next: Stage2State = { phase: "published", room: mintJitsiRoom(), openedAtMs: now, publishedAtMs: now };
  await writeStage2State(next);
  return next;
}

/** Writes IDLE verbatim regardless of current phase — trivially
 *  idempotent. Clears our own issuance record; it does not and cannot
 *  forcibly disconnect anyone already inside the old Jitsi room (Ground —
 *  only Love ending the call, with everyone gone, actually ends it). */
export async function closeStage2(): Promise<Stage2State> {
  await writeStage2State(IDLE);
  return IDLE;
}
