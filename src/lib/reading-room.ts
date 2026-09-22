import { ROOMS, type MatrixRoom } from "./matrix-rooms.ts";

/**
 * THE READING ROOM, DERIVED ONCE (TASK-210, 0018.06.23 a₿) — the free
 * reading's room and every door that leads to it. Pure and client-safe
 * (imports only the rooms registry — the Turbopack lesson of 0018.05.15:
 * a client card must never drag a server module into the browser bundle).
 *
 * TASK-174 (0018.06.17 a₿ · block 966094): the free path leads to the FREE
 * room — the one whose door is open to every member (minTier "all"), the
 * Heart Field Commons — so the card's own words ("free for every member")
 * stay true. Derive-or-dash: no free room in the registry → null, and every
 * consumer shows its words with NO door rather than a fake link.
 *
 * Consumers: ReadWithLove (the home card), the member menu's "The reading
 * room" row (door-machine.ts — Love's 0018.06.18 call: the row led to the
 * tier-B Chronicles room and met a package wall), and the nav's Heart Field
 * row (NavMenu.tsx). One derivation, so the three doors can never disagree.
 *
 * TASK-384 (block 968,061, the Admiral's ruling: arriving at the reading
 * room always opens the Stage) adds one more export, `opensOnStage` — its
 * one consumer is `vantage.ts`'s arrival rule.
 */

/** `#heart-field:onecocreation.com` → `heart-field`. */
export const roomSlug = (id: string): string => id.slice(1, id.indexOf(":"));

/** The bare /rooms/<slug> IS the Stage's address (T-183). */
export const roomPath = (id: string): string => `/rooms/${roomSlug(id)}`;

/** The FREE room — open to every member. */
export function freeRoom(rooms: MatrixRoom[] = ROOMS): MatrixRoom | null {
  return rooms.find((r) => r.minTier === "all") ?? null;
}

const readingRoom = freeRoom();
export const READING_ROOM_SLUG: string | null = readingRoom ? roomSlug(readingRoom.id) : null;
export const READING_ROOM_PATH: string | null = readingRoom ? roomPath(readingRoom.id) : null;

/** True iff `pathname` is the reading room's own address — the Admiral's
 *  ruling (block 968,051): arriving at the reading room always opens the
 *  Stage. Null-safe: no free room in the registry → always false. */
export function opensOnStage(pathname: string): boolean {
  return READING_ROOM_PATH !== null && pathname === READING_ROOM_PATH;
}

/** Where the free reading's door leads: a member straight into the room, a
 *  guest to the sign-in card with `?next=` carried (the T-156 same-origin
 *  rule; the middleware's rooms door would bounce them the same way — the
 *  door just says so upfront). */
export function readingDoorHref(signedIn: boolean): string | null {
  if (!READING_ROOM_PATH) return null;
  return signedIn ? READING_ROOM_PATH : `/login?next=${encodeURIComponent(READING_ROOM_PATH)}`;
}
