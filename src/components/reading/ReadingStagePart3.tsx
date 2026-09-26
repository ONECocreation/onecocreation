"use client";

import ReadingStageDoor from "./ReadingStageDoor";
import ReadingDayUnlockButton from "./ReadingDayUnlockButton";
import type { EncoreFloorDoor } from "@/lib/reading-day-doors";

/**
 * PART 3'S OWN TOP SCREEN — the book talk, Stage 2's room (TASK-473,
 * block 968,624). A thin caller of `ReadingStageDoor` (course change, same
 * block: one generic gated-door screen for Parts 3 and 4, never two
 * implementations) — this file's own job is composing the "not owned"
 * card from `encoreFloor` (server-derived, never re-fetched here) and
 * naming Part 3's own door ("stage2") and words ("the book talk").
 */

export interface ReadingStagePart3Props {
  jitsiDomain: string;
  encoreFloor: EncoreFloorDoor;
  /** "2:22 PM MDT" (reading-day.ts's clockWords) — null only when the
   *  schedule itself is off */
  whenWords: string | null;
}

export default function ReadingStagePart3({ jitsiDomain, encoreFloor, whenWords }: ReadingStagePart3Props) {
  const notOwned = (
    <>
      <p className="kit-body">
        {encoreFloor.price
          ? encoreFloor.passLive
            ? `Unlock the book talk for ${encoreFloor.price}, once.`
            : `Comes with ${encoreFloor.name} and up. ${encoreFloor.price} a month.`
          : `Comes with ${encoreFloor.name} and up.`}
      </p>
      <div className="kit-btn-row">
        <ReadingDayUnlockButton
          itemId={encoreFloor.itemId}
          label="Unlock the book talk"
          ariaLabel={`Unlock the book talk with ${encoreFloor.name}`}
        />
      </div>
    </>
  );

  return (
    <ReadingStageDoor
      door="stage2"
      jitsiDomain={jitsiDomain}
      whenWords={whenWords}
      label="the book talk"
      notOwned={notOwned}
    />
  );
}
