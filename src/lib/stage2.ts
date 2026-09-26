import { TENANT } from "@/lib/tenant";
import { createDoorLifecycle, doorExpired, type DoorState } from "@/lib/door-lifecycle";

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
 * TASK-475 (block 968,624): the lifecycle itself now RIDES
 * `door-lifecycle.ts`'s shared factory (built for this lane's new Q&A
 * door, which needed the exact same three phases and midnight close).
 * Everything below is a thin, byte-compatible wrapper: the SAME KV key
 * (`stage2:state:${TENANT}`), the SAME exported names and shapes, the
 * SAME `closed → publish` convenience path — this file's own tests
 * (`tests/stage2-state.test.ts`, `tests/stage2-route.test.ts`, etc.) run
 * untouched against it. `stage1.ts` was deliberately left as its own
 * file (never migrated to the factory this lane) — it never publishes
 * from closed, and refactoring a file this close to Saturday for no
 * behavioral gain was not worth the risk.
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

/** The one KV key this whole lane reads and writes — unchanged by the
 *  TASK-475 refactor. */
const KEY = `stage2:state:${TENANT}`;

export const IDLE: Stage2State = { phase: "closed", room: null, openedAtMs: null, publishedAtMs: null };

const door = createDoorLifecycle(KEY, { allowPublishFromClosed: true });

/**
 * THE MIDNIGHT CLOSE (the Admiral's ruling 4, block 968,218 — "Stage 2
 * closes itself at midnight Denver time", on top of Love's own Close).
 * Pure, delegated to `door-lifecycle.ts`'s `doorExpired` — the exact same
 * comparison, kept under this file's own historic name so nothing that
 * imports `stage2Expired` from here needs to change.
 */
export function stage2Expired(state: Stage2State, nowMs: number): boolean {
  return doorExpired(state as DoorState, nowMs);
}

/** GET, fail-closed on any doubt — delegated to the shared factory.
 *  `nowMs` defaults to the server's own clock and is NEVER taken from a
 *  request. */
export async function getStage2State(nowMs: number = Date.now()): Promise<Stage2State> {
  return door.getState(nowMs);
}

/** Reads fresh state; `phase !== "closed"` is idempotent — returns the
 *  state unchanged, mints nothing (a second click never double-mints).
 *  `phase === "closed"` mints via `mintJitsiRoom()` and writes
 *  `prepared`, privately — nothing members can see yet. */
export async function prepareStage2(): Promise<Stage2State> {
  return door.prepare();
}

/** Reads fresh state; `published` is an idempotent no-op; `prepared`
 *  flips to `published` with the SAME room, no remint, stamping
 *  `publishedAtMs`; `closed` mints AND publishes in one step (a
 *  convenience path — still exactly one mint), stamping both anchors. */
export async function publishStage2(): Promise<Stage2State> {
  // Stage 2 always allows publish-from-closed, so this can never be null.
  return (await door.publish()) as Stage2State;
}

/** Writes IDLE verbatim regardless of current phase — trivially
 *  idempotent. */
export async function closeStage2(): Promise<Stage2State> {
  return door.close();
}
