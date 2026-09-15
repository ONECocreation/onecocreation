import DoorSheet from "@/components/door/DoorSheet";

/**
 * LoginDoor block (TASK-296 wave B, me-login pair — 0018.06.25 a₿): the
 * { id }-only shape (the JoinSurface/FormDoors precedent). The stored Puck
 * doc holds only the block id; the block renders the REAL DoorSheet in its
 * page mount — the SAME door component the header's sheet mounts (TASK-185
 * Phase B's one-walk-two-mounts ruling: they never disagree). The deep
 * links ride the component itself: `?next=` is read client-side
 * (next-path.ts's nextPathFromLocation), the sign-in-to-sign-up turn is
 * the sheet's own machine — so a published /login serves the identical
 * door the hand-built page does, and nothing session-shaped is ever frozen
 * into a doc. The component itself is never edited — this file only
 * imports and mounts it.
 */
export function createLoginDoor() {
  return {
    label: "Login door (the header's own sheet, page mount)",
    fields: {},
    render: () => <DoorSheet mount="page" />,
  };
}
