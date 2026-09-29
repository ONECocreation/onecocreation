"use client";

import ReplaysCard from "./ReplaysCard";

/**
 * /a/site/replays - the REPLAYS sub-room (TASK-496, block 969,088+). The
 * list Love (or the Admiral) pastes YouTube links into; /replays plays
 * exactly this list. Zero entries is a working state: the public page
 * shows its designed empty note until the first link lands here.
 *
 * Class-based throughout (the /a uniformity law; operator-census is
 * fewer-never-more): not one inline style attribute anywhere in this
 * room, unlike the pre-ratchet legacy shells beside it.
 */
export default function SiteReplaysRoom() {
  return (
    <div className="kit-stack">
      <h2 className="kit-h2">Replays</h2>
      <p className="kit-text-quiet">
        The list the Replays page plays. Paste a YouTube link per replay, order the rows, save. An empty list is
        fine: the page shows its quiet note until the first one lands.
      </p>
      <ReplaysCard />
    </div>
  );
}
