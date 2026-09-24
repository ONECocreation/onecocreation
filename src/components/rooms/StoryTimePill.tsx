"use client";

/**
 * STORY TIME PILL (TASK-450, block 968,370; K124 §T-450 + the Admiral's
 * ruling 2, block 968,357) — the Heart Field room's door to the reading
 * on the room's OWN stage. The room's existing pill idiom is
 * RoomVideoSlot.tsx's "● Join Live Session" (btn btn-gold); this pill is
 * that same family on a <button type="button"> — it mounts the stage in
 * place, it never navigates — with NO inline style and no new CSS class.
 *
 * Its OWN leaf file, not an inline JSX button inside StageView: the
 * operator census (tests/operator-census.test.ts) ratchets StageView's
 * buttonFamilies at 1 and its write mode NEVER raises a count — fewer,
 * never more. A new leaf enters at the new-file allowance, the house's
 * sanctioned path for exactly this (T-419's decision A). Pure
 * presentation: the click's fresh authorization lives in StageView's
 * storyTime handler, handed down here.
 */
export default function StoryTimePill({ onWatch }: { onWatch: () => void }) {
  return (
    <button type="button" className="btn btn-gold" onClick={onWatch}>
      ● Story time
    </button>
  );
}
