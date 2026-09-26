"use client";

import ReadingStageDoor from "./ReadingStageDoor";
import ReadingDayUnlockButton from "./ReadingDayUnlockButton";
import type { QaDoor } from "@/lib/reading-day-doors";

/**
 * PART 4'S OWN TOP SCREEN — the Q&A with Love (TASK-473, block 968,624).
 *
 * COURSE CHANGE (same block, after the first pass linked out to the Q&A's
 * existing `/rooms/<slug>` page and polled the site-wide `/api/live`
 * flag): the Admiral ruled ONE screen on /reading — nobody goes to
 * /rooms, signed-in visitors join or leave any room right there. This
 * file is now a thin caller of `ReadingStageDoor` (the SAME generic
 * gated-door screen Part 3 uses), naming door `"qa"` — which polls
 * `/api/qa-door` (T-475, a separate lane, mirrors `/api/stage2` verbatim:
 * `{ok, open, decision, reachable?, room?}`, min tier C). All the old
 * `/api/live`/`liveRoomName`/`qaRoomHref` logic is GONE — a 404 (T-475
 * not landed yet) or any failed read simply keeps the door closed, so
 * this screen honestly shows closed (or, once `qaEntitled` reflects a
 * real grant, its own offer state) until that lane ships.
 */

export interface ReadingStagePart4Props {
  jitsiDomain: string;
  qaOffer: QaDoor;
  /** "3:33 PM MDT" — null only when the schedule itself is off */
  whenWords: string | null;
}

export default function ReadingStagePart4({ jitsiDomain, qaOffer, whenWords }: ReadingStagePart4Props) {
  const notOwned = (
    <>
      <p className="kit-body">
        {qaOffer.passLive && qaOffer.price
          ? `Unlock the Q&A for ${qaOffer.price}, once.`
          : `Comes with ${qaOffer.eveningStar.name} and up.`}
      </p>
      <div className="kit-btn-row">
        <ReadingDayUnlockButton itemId={qaOffer.itemId} label="Unlock the Q&A" />
      </div>
    </>
  );

  return (
    <ReadingStageDoor door="qa" jitsiDomain={jitsiDomain} whenWords={whenWords} label="the Q&A" notOwned={notOwned} />
  );
}
