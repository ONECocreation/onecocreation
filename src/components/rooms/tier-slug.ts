/** `/packages/[slug]` resolves these — the same map matrix-rooms.ts's
 *  PACKAGE_FALLBACK carries (TASK-150; RoomsShelf's own local constant
 *  retired with the one-card-per-package shelf). Duplicated here for the
 *  Classroom Four's own room-tab renderer (Lane ROOM) rather than reaching
 *  into a shipped foundation's private constant. */
export const TIER_SLUG: Record<string, string> = {
  A: "weekly-intuitive",
  B: "observer",
  C: "evening-star",
};
