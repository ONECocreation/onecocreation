import { TENANT } from "@/lib/tenant";
import { createDoorLifecycle, doorExpired, type DoorState } from "@/lib/door-lifecycle";

/**
 * THE Q&A DOOR (TASK-475, block 968,624) — Love's live Q&A (Part 4, 3:33
 * PM) gets the same three-phase lifecycle Stage 2 already proved:
 * `closed` → `prepared` → `published`, the SAME midnight-Denver
 * self-close, and the SAME `closed → publish` convenience path (mint +
 * publish in one step from the operator's one-click Open — see
 * `RoomsCard.tsx`). Built on the shared `door-lifecycle.ts` factory
 * `stage2.ts` also rides now — a second tenant of the same lifecycle,
 * never a re-implementation.
 *
 * KV key `qa:state:${TENANT}` — its own doc, never Stage 1's, Stage 2's,
 * the studio door's, or the live flag's.
 *
 * The Q&A room itself is a standing Matrix room (`#inner-sanctum`,
 * `minTier: "C"`, `matrix-rooms.ts`) — this door's `room`/`jitsiDomain`
 * are the SEPARATE Jitsi call Love opens for it (the same house-Jitsi
 * pattern Stage 1/2 already use), not the Matrix room's own address.
 */

export type QaPhase = "closed" | "prepared" | "published";

export interface QaState {
  phase: QaPhase;
  /** the room slug on the house Jitsi (`mintJitsiRoom()`'s own
   *  `oc-<16 hex>` shape) — null only while `phase === "closed"`. */
  room: string | null;
  /** unix MILLISECONDS — when this room was minted; null only while
   *  `closed`. */
  openedAtMs: number | null;
  /** unix MILLISECONDS — when the phase became `published` (the
   *  midnight-close anchor); null while `closed` or `prepared`. */
  publishedAtMs: number | null;
}

const KEY = `qa:state:${TENANT}`;

export const IDLE: QaState = { phase: "closed", room: null, openedAtMs: null, publishedAtMs: null };

const door = createDoorLifecycle(KEY, { allowPublishFromClosed: true });

/** The midnight close, pure — delegated to `door-lifecycle.ts`'s
 *  `doorExpired`, the exact same comparison Stage 2 uses. */
export function qaExpired(state: QaState, nowMs: number): boolean {
  return doorExpired(state as DoorState, nowMs);
}

/** GET, fail-closed on any doubt. `nowMs` defaults to the server's own
 *  clock and is NEVER taken from a request. */
export async function getQaState(nowMs: number = Date.now()): Promise<QaState> {
  return door.getState(nowMs);
}

/** `closed` mints via `mintJitsiRoom()` and writes `prepared`, privately;
 *  idempotent on `prepared`/`published` — mints nothing twice. */
export async function prepareQa(): Promise<QaState> {
  return door.prepare();
}

/** `prepared` -> `published` (same room, stamps `publishedAtMs`);
 *  `published` is a no-op; `closed` mints AND publishes in one step (the
 *  same convenience path Stage 2 has). */
export async function publishQa(): Promise<QaState> {
  // The Q&A door always allows publish-from-closed, so this can never be null.
  return (await door.publish()) as QaState;
}

/** Writes IDLE verbatim regardless of current phase. */
export async function closeQa(): Promise<QaState> {
  return door.close();
}
