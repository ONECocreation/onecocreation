/** `/packages/[slug]` resolves these — the same map RoomsShelf.tsx keeps
 *  as its own local constant. Duplicated here for the Classroom Four's own
 *  room-card renderers (Lane ROOM) rather than reaching into a shipped
 *  foundation's private constant. */
export const TIER_SLUG: Record<string, string> = {
  A: "weekly-intuitive",
  B: "observer",
  C: "evening-star",
};
