"use client";

import ReadingStageDoor from "./ReadingStageDoor";

/**
 * PART 1'S OWN TOP SCREEN — the Housewarming, its own door now (TASK-481,
 * block 968,624+, the Admiral's ruling: "was there going to be 4 rooms in
 * the /a/site/reading room. i'm seeing 3. we spoke about one line per
 * meeting time"). A thin caller of `ReadingStageDoor` — the SAME generic
 * gated-door screen Parts 3 and 4 use — naming door `"housewarming"`
 * (which polls `/api/housewarming-door`).
 *
 * The ONE real difference from `ReadingStagePart3`/`ReadingStagePart4`:
 * the Housewarming is FREE — there is no `"package"` decision on this
 * door's own wire, so there is nothing to compose a `notOwned` card out
 * of; `null` rides that prop (the signin/closed/open branches are the
 * only ones this door's wire ever reaches).
 */

export interface ReadingStagePart1Props {
  jitsiDomain: string;
  /** "12:12 PM MDT" — null only when the schedule itself is off */
  whenWords: string | null;
}

export default function ReadingStagePart1({ jitsiDomain, whenWords }: ReadingStagePart1Props) {
  /* the stage chip's own label, built from the SAME `whenWords` the
     agenda row's own title reads ("12:12 PM MDT · The Housewarming") —
     never a second clockWords() call. */
  const partLabel = whenWords ? `${whenWords} · The Housewarming` : null;

  return (
    <ReadingStageDoor
      door="housewarming"
      jitsiDomain={jitsiDomain}
      whenWords={whenWords}
      label="the Housewarming"
      partLabel={partLabel}
      notOwned={null}
    />
  );
}
