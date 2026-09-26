"use client";

import { useEffect, useState } from "react";
import { useReadingPart } from "./ReadingPartContext";
import ReadingStage, { type ReadingStageProps } from "./ReadingStage";
import ReadingStagePart1, { type ReadingStagePart1Props } from "./ReadingStagePart1";
import ReadingStagePart3, { type ReadingStagePart3Props } from "./ReadingStagePart3";
import ReadingStagePart4, { type ReadingStagePart4Props } from "./ReadingStagePart4";

/**
 * THE TOP SCREEN'S OWN SWITCH (TASK-473, block 968,624; TASK-481, block
 * 968,624+) — reads the shared selection (`ReadingPartContext`) and
 * mounts EXACTLY ONE of the four stage components. Part 1 (the
 * Housewarming) got its OWN door in TASK-481 (the Admiral's ruling: "was
 * there going to be 4 rooms … we spoke about one line per meeting time")
 * and now mounts `ReadingStagePart1` (a thin `ReadingStageDoor` caller,
 * door `"housewarming"`); `ReadingStage` (Stage 1's own free, two-way
 * room) is Part 2's screen ALONE now, completely UNCHANGED in its own
 * prop contract. Switching parts naturally unmounts whichever screen was
 * showing (its own JitsiRoom cleanup disposes the conference) before the
 * next one mounts — React itself enforces "exactly ONE conference
 * mounted at a time," no extra guard needed here.
 */
/** setTimeout's own ceiling (~24.8 days); a longer wait never arms (a
 *  reload that far out reads the clock again anyway). */
const MAX_TIMER_MS = 2_147_483_647;

/** TASK-489: true until `untilMs`, then false. The first paint uses the
 *  server's own `asOfMs` (the same clock read the countdown buckets
 *  against), so server and client agree; one timer flips it at the
 *  instant itself. */
function useBefore(untilMs: number | null, asOfMs: number): boolean {
  const [before, setBefore] = useState(() => untilMs !== null && asOfMs < untilMs);
  useEffect(() => {
    if (untilMs === null) return;
    const waitMs = Math.max(0, untilMs - Date.now());
    if (waitMs > MAX_TIMER_MS) return;
    const id = setTimeout(() => setBefore(false), waitMs);
    return () => clearTimeout(id);
  }, [untilMs]);
  return before;
}

export default function ReadingStageDeck({
  stage1,
  part1,
  part3,
  part4,
  countdownUntilMs = null,
  asOfMs = 0,
}: {
  stage1: ReadingStageProps;
  part1: ReadingStagePart1Props;
  part3: ReadingStagePart3Props;
  part4: ReadingStagePart4Props;
  /** TASK-489: the Housewarming's start (12:12). Parts 1, 3 and 4 show
   *  Stage 1's own countdown node above them until then. Null = none. */
  countdownUntilMs?: number | null;
  asOfMs?: number;
}) {
  const { selected } = useReadingPart();
  const counting = useBefore(countdownUntilMs, asOfMs);
  /* Part 2's own screen already carries the countdown (ReadingStage,
     K122 item 6a), unchanged and never shown twice. The countdown's slot
     stays first, so flipping it at 12:12 never remounts the screen (or
     its conference) below it. */
  return (
    <>
      {counting && selected !== 2 && stage1.countdown}
      <DeckScreen selected={selected} stage1={stage1} part1={part1} part3={part3} part4={part4} />
    </>
  );
}

function DeckScreen({
  selected,
  stage1,
  part1,
  part3,
  part4,
}: {
  selected: number;
  stage1: ReadingStageProps;
  part1: ReadingStagePart1Props;
  part3: ReadingStagePart3Props;
  part4: ReadingStagePart4Props;
}) {
  if (selected === 1) return <ReadingStagePart1 {...part1} />;
  if (selected === 3) return <ReadingStagePart3 {...part3} />;
  if (selected === 4) return <ReadingStagePart4 {...part4} />;
  return <ReadingStage {...stage1} />;
}
