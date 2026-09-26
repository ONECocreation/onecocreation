"use client";

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
export default function ReadingStageDeck({
  stage1,
  part1,
  part3,
  part4,
}: {
  stage1: ReadingStageProps;
  part1: ReadingStagePart1Props;
  part3: ReadingStagePart3Props;
  part4: ReadingStagePart4Props;
}) {
  const { selected } = useReadingPart();
  if (selected === 1) return <ReadingStagePart1 {...part1} />;
  if (selected === 3) return <ReadingStagePart3 {...part3} />;
  if (selected === 4) return <ReadingStagePart4 {...part4} />;
  return <ReadingStage {...stage1} />;
}
