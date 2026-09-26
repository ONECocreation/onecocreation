import { TENANT } from "@/lib/tenant";
import { createDoorLifecycle, doorExpired, type DoorState } from "@/lib/door-lifecycle";

/**
 * THE HOUSEWARMING DOOR (TASK-481, block 968,624+) — the Admiral's ruling:
 * "was there going to be 4 rooms in the /a/site/reading room. i'm seeing
 * 3. we spoke about one line per meeting time." T-475's `RoomsCard.tsx`
 * shipped one row for Parts 1 and 2 together ("Free room · 12:12
 * Housewarming and 1:11 Reading") because both read Stage 1's own door.
 * This file gives Part 1 (12:12, the Housewarming) its OWN three-phase
 * lifecycle — `closed` → `prepared` → `published`, the SAME midnight-
 * Denver self-close, and the SAME `closed → publish` convenience path
 * Stage 2 and the Q&A door already take — built on the shared
 * `door-lifecycle.ts` factory (T-475), a THIRD tenant of it now, never a
 * re-implementation. Stage 1 (`stage1.ts`) keeps being Part 2's door
 * alone, untouched by this lane.
 *
 * KV key `housewarming:state:${TENANT}` — its own doc, never Stage 1's,
 * Stage 2's, the Q&A door's, or the studio door's.
 *
 * Unlike the Q&A door, the Housewarming is FREE: every signed-in visitor
 * is entitled, no tier, no order, no package offer — `/api/housewarming-door`
 * (this lane's own route) never reads `member-tier.ts` at all. This file
 * itself carries no entitlement logic either way; it is the lifecycle
 * alone, exactly the shape `qa-door.ts` and `stage2.ts` already prove.
 */

export type HousewarmingPhase = "closed" | "prepared" | "published";

export interface HousewarmingState {
  phase: HousewarmingPhase;
  /** the room slug on the house Jitsi (`mintJitsiRoom()`'s own
   *  `oc-<16 hex>` shape) — null only while `phase === "closed"`. */
  room: string | null;
  /** unix MILLISECONDS — when this room was minted; null only while
   *  `closed`. */
  openedAtMs: number | null;
  /** unix MILLISECONDS — when the phase became `published` (the
   *  midnight-close anchor); null while `closed` or `prepared`. */
  publishedAtMs: number | null;
  /** TASK-487 (block 968,624+, the Admiral's ruling, option C) — unix
   *  MILLISECONDS when Love last pressed "Show my camera" on this door;
   *  null while the picture is up. See `door-lifecycle.ts`'s own doc for
   *  the full reset/authority rules — this is the SAME flag, just typed
   *  under this door's own name. */
  cameraShownAtMs: number | null;
}

const KEY = `housewarming:state:${TENANT}`;

export const IDLE: HousewarmingState = {
  phase: "closed",
  room: null,
  openedAtMs: null,
  publishedAtMs: null,
  cameraShownAtMs: null,
};

const door = createDoorLifecycle(KEY, { allowPublishFromClosed: true });

/** The midnight close, pure — delegated to `door-lifecycle.ts`'s
 *  `doorExpired`, the exact same comparison Stage 2/the Q&A door use. */
export function housewarmingExpired(state: HousewarmingState, nowMs: number): boolean {
  return doorExpired(state as DoorState, nowMs);
}

/** GET, fail-closed on any doubt. `nowMs` defaults to the server's own
 *  clock and is NEVER taken from a request. */
export async function getHousewarmingState(nowMs: number = Date.now()): Promise<HousewarmingState> {
  return door.getState(nowMs);
}

/** `closed` mints via `mintJitsiRoom()` and writes `prepared`, privately;
 *  idempotent on `prepared`/`published` — mints nothing twice. */
export async function prepareHousewarming(): Promise<HousewarmingState> {
  return door.prepare();
}

/** `prepared` -> `published` (same room, stamps `publishedAtMs`);
 *  `published` is a no-op; `closed` mints AND publishes in one step (the
 *  same convenience path Stage 2/the Q&A door have — the one-click Open
 *  path `RoomsCard.tsx` relies on). */
export async function publishHousewarming(): Promise<HousewarmingState> {
  // The Housewarming always allows publish-from-closed, so this can never be null.
  return (await door.publish()) as HousewarmingState;
}

/** Writes IDLE verbatim regardless of current phase. */
export async function closeHousewarming(): Promise<HousewarmingState> {
  return door.close();
}

/** TASK-487 — Love's "Show my camera": valid only while published; `null`
 *  (never written) otherwise. Idempotent if already shown. */
export async function showHousewarmingCamera(): Promise<HousewarmingState | null> {
  return door.showCamera();
}

/** TASK-487 — "Pause my camera": valid only while published; `null`
 *  (never written) otherwise. Idempotent if already hidden. */
export async function hideHousewarmingCamera(): Promise<HousewarmingState | null> {
  return door.hideCamera();
}
