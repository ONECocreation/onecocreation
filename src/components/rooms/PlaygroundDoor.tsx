import Link from "next/link";
import Card from "@/components/kit/Card";

/**
 * THE PLAYGROUND DOOR (TASK-460, block 968,543 — decision cw-playground-where,
 * option B; MOVED by TASK-465, block 968,561): the Playground room's OWN
 * door into the after-reading call. This is a plain link, not a live
 * decision — Stage2Door.tsx already IS that live door (mounted on the free
 * reading room's Stage, gated by `/api/stage2`'s own tier check); this is
 * its sibling on the class room whose members the Playground opens for,
 * pointing straight at the Playground's own page (`/reading/playground`)
 * rather than re-polling Stage 2's route a second time.
 *
 * TASK-465: this door now sits inside the Observer room itself
 * (`#weekly-reading`, `reading-room.ts`'s `PLAYGROUND_ROOM_SLUG`) — a
 * member reading this door is already inside the room its own words
 * describe, so the old "it's here for Weekly Intuitive members and up"
 * qualifier is dropped rather than translated (redundant, and the
 * Admiral's own no-em-dash ruling, block 968,561, gave the words a reason
 * to be shorter anyway).
 *
 * Its OWN leaf file, not inline JSX in StageView.tsx: the operator census
 * (tests/operator-census.baseline.json) ratchets StageView's
 * `buttonFamilies` at 1 (StoryTimePill.tsx's own docblock, TASK-450's
 * identical seam), and the census write mode never RAISES a count —
 * "fewer, never more". A new leaf file enters at the new-file allowance
 * instead (T-419's decision A), the house's sanctioned path for exactly
 * this — never a rewrite of the ratchet.
 */
export default function PlaygroundDoor() {
  return (
    <Card>
      <div className="kit-stack">
        <div className="kit-text-quiet">Love opens the Playground call right after the reading.</div>
        <div className="kit-btn-row kitx-actions">
          <Link href="/reading/playground" className="kit-btn kit-btn-main kit-btn-sm">
            Join the Playground call
          </Link>
        </div>
      </div>
    </Card>
  );
}
