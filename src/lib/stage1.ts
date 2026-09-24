import { kv } from "@/lib/store";
import { TENANT } from "@/lib/tenant";
import { mintJitsiRoom } from "@/lib/studio/jitsi-door";
import { stage2Expired } from "@/lib/stage2";

/**
 * STAGE 1 — THE READING ITSELF, AS A ONE-WAY HOUSE JITSI ROOM (TASK-438,
 * block 968,222; HOLD LIFTED block 968,269) — the same three-phase
 * lifecycle Stage 2 already proved (`closed` → `prepared` → `published`),
 * with ONE deliberate difference: publish from closed — including an
 * expired stored state — is REFUSED (null, nothing written, never a
 * mint). Stage 1's room must only ever exist after Love has prepared it
 * and is standing inside it as host; a door the viewers can see before
 * she is there is the exact failure this lifecycle exists to prevent.
 *
 * The midnight close is Stage 2's own law, IMPORTED: `stage2Expired`
 * carries the Denver calendar-date arithmetic (ruling 4), so this
 * file never writes the zone literal a second time. An expired state
 * reads IDLE here, so every reader (the public route, the operator route,
 * prepare, publish, the /reading page's SSR) sees `closed` at once, and
 * the next Prepare mints a FRESH room — Friday's rehearsal room is never
 * re-used on Saturday.
 *
 * KV key `stage1:state:${TENANT}` via `store.ts`'s `kv()` — its own doc,
 * never Stage 2's key, never the studio door's, never the live flag.
 * NO MODULE-LEVEL CACHE: every function reads KV fresh, the same honesty
 * Stage 2 keeps under normal sequential operator clicking.
 */

export type Stage1Phase = "closed" | "prepared" | "published";

export interface Stage1State {
  phase: Stage1Phase;
  /** the room slug on the house Jitsi (`mintJitsiRoom()`'s own
   *  `oc-<16 hex>` shape) — null only while `phase === "closed"`. */
  room: string | null;
  /** unix MILLISECONDS — when this room was minted (Prepare); null only
   *  while `closed`. */
  openedAtMs: number | null;
  /** unix MILLISECONDS — when the phase became `published` (the
   *  midnight-close anchor); null while `closed` or `prepared`, and on a
   *  stored doc written without it (read as `null`). */
  publishedAtMs: number | null;
}

/** The one KV key this whole lane reads and writes. */
const KEY = `stage1:state:${TENANT}`;

export const IDLE: Stage1State = { phase: "closed", room: null, openedAtMs: null, publishedAtMs: null };

/** `mintJitsiRoom()`'s own shape, checked again here rather than trusted —
 *  a stored value is never assumed to have come from that function. */
const ROOM_SHAPE = /^oc-[0-9a-f]{16}$/;

/**
 * FAIL-CLOSED INVARIANT CHECK (stage2.ts's own invariant, mirrored):
 * `phase` must be one of the three known strings; `phase !== "closed"`
 * requires `room` to be a non-empty string matching the mint shape;
 * `phase === "closed"` requires `room === null`. Any mismatch — a
 * hand-edited or half-written KV value — is not a real Stage1State, never
 * a half-trusted patch.
 */
function isValidState(raw: unknown): raw is Stage1State {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (o.phase !== "closed" && o.phase !== "prepared" && o.phase !== "published") return false;
  if (o.phase === "closed") return o.room === null;
  return typeof o.room === "string" && ROOM_SHAPE.test(o.room);
}

/** GET, JSON-parse in a try/catch → any failure OR any invariant
 *  violation fails CLOSED to IDLE, never a guessed-open state. An EXPIRED
 *  state (its Denver calendar day is over, by the imported
 *  `stage2Expired`) reads IDLE the same way — the midnight close lives
 *  HERE, so every reader sees it at once; nothing is written on read.
 *  `nowMs` defaults to the server's own clock and is NEVER taken from a
 *  request. */
export async function getStage1State(nowMs: number = Date.now()): Promise<Stage1State> {
  try {
    const res = (await kv(["GET", KEY])) as { result?: unknown } | null;
    if (typeof res?.result !== "string" || !res.result) return IDLE;
    const parsed = JSON.parse(res.result) as unknown;
    if (!isValidState(parsed)) return IDLE;
    const state: Stage1State = {
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

/** Writes are never silently swallowed: an unconfigured vault (`kv()`
 *  resolving null) THROWS, so prepare/publish/close can never report a
 *  transition they failed to store — a failed write never reads as
 *  success. A throwing `kv()` propagates the same way. */
async function writeStage1State(state: Stage1State): Promise<void> {
  const res = await kv(["SET", KEY, JSON.stringify(state)]);
  if (res === null) throw new Error("stage1 state vault is not configured — nothing was written");
}

/** Reads fresh state; `phase !== "closed"` is idempotent — returns the
 *  state unchanged, mints nothing (a second click never double-mints).
 *  `phase === "closed"` mints via `mintJitsiRoom()` (imported, read-only)
 *  and writes `prepared`, privately — nothing visitors can see yet. An
 *  EXPIRED stored doc reads `closed` through getStage1State, so the first
 *  Prepare of a new Denver day always mints a FRESH room — Friday's room
 *  is never re-used on Saturday. */
export async function prepareStage1(): Promise<Stage1State> {
  const current = await getStage1State();
  if (current.phase !== "closed") return current;
  const next: Stage1State = { phase: "prepared", room: mintJitsiRoom(), openedAtMs: Date.now(), publishedAtMs: null };
  await writeStage1State(next);
  return next;
}

/** THE ONE DIFFERENCE FROM STAGE 2 (the brief's Build 1): `closed` —
 *  including an expired stored state — is REFUSED (`null`, nothing
 *  written, NEVER a mint); Stage 1 has no closed→publish convenience
 *  path, because its room must only ever exist after Prepare. `published`
 *  is an idempotent no-op (the first stamp stands); `prepared` flips to
 *  `published` with the SAME room and `openedAtMs`, stamping
 *  `publishedAtMs` (the midnight-close anchor). */
export async function publishStage1(): Promise<Stage1State | null> {
  const current = await getStage1State();
  if (current.phase === "closed") return null;
  if (current.phase === "published") return current;
  const next: Stage1State = { ...current, phase: "published", publishedAtMs: Date.now() };
  await writeStage1State(next);
  return next;
}

/** Writes IDLE verbatim regardless of current phase — trivially
 *  idempotent. Clears our own issuance record; it does not and cannot
 *  forcibly disconnect anyone already inside the old Jitsi room (only
 *  Love ending the call, with everyone gone, actually ends it) — the
 *  viewers' own next poll is what removes them. */
export async function closeStage1(): Promise<Stage1State> {
  await writeStage1State(IDLE);
  return IDLE;
}
