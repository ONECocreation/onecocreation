"use client";

import { useReadingPart } from "./ReadingPartContext";
import ReadingStage, { type ReadingStageProps } from "./ReadingStage";
import ReadingStagePart3, { type ReadingStagePart3Props } from "./ReadingStagePart3";
import ReadingStagePart4, { type ReadingStagePart4Props } from "./ReadingStagePart4";

/**
 * THE TOP SCREEN'S OWN SWITCH (TASK-473, block 968,624) — reads the
 * shared selection (`ReadingPartContext`) and mounts EXACTLY ONE of the
 * three stage components. `ReadingStage` (parts 1 and 2 — Stage 1's one
 * free, two-way room) is completely UNCHANGED in its own prop contract;
 * this deck is the only new thing wrapping it. Switching parts naturally
 * unmounts whichever screen was showing (its own JitsiRoom cleanup
 * disposes the conference) before the next one mounts — React itself
 * enforces "exactly ONE conference mounted at a time," no extra guard
 * needed here.
 */
export default function ReadingStageDeck({
  stage1,
  part3,
  part4,
}: {
  stage1: ReadingStageProps;
  part3: ReadingStagePart3Props;
  part4: ReadingStagePart4Props;
}) {
  const { selected } = useReadingPart();
  if (selected === 3) return <ReadingStagePart3 {...part3} />;
  if (selected === 4) return <ReadingStagePart4 {...part4} />;
  return <ReadingStage {...stage1} />;
}
