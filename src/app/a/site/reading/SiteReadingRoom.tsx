"use client";

import { SectionHead } from "@/components/console/glass";
import ReadingScheduleCard from "./ReadingScheduleCard";
import RoomsCard, { DOORS } from "./RoomsCard";

/**
 * /a/site/reading — the WEEKLY READING sub-room (TASK-381, block 968,047+;
 * TASK-475, block 968,624). Same shell shape as SiteCommunityDoorRoom.tsx
 * / SiteAboutVideosRoom.tsx: h1 + intro line + SectionHead + the card. No
 * public surface — this sets the schedule T-382 (the notice) and T-370
 * (the sign-up block) will read.
 *
 * TASK-475 (the Admiral's ruling: "one area for love to open each room as
 * needed on the host side"): the separate Stage1Card/Stage2Card sections
 * are replaced by ONE `RoomsCard`, one config array. `Stage1Card.tsx`/
 * `Stage2Card.tsx` are not deleted (house law) — they simply stop being
 * imported here.
 *
 * TASK-481 (block 968,624+, the Admiral's ruling: "was there going to be
 * 4 rooms in the /a/site/reading room. i'm seeing 3. we spoke about one
 * line per meeting time"): the Housewarming (12:12) gets its OWN door and
 * its own row now — the "Free room" row above used to cover Parts 1 and 2
 * together because both read Stage 1's one door; the stage1 row below
 * narrows to "Reading · 1:11" (Part 2 alone). `RoomsCard.tsx` itself needs
 * no edit — it was already door-agnostic, config-driven.
 *
 * TASK-486 (block 968,624+): `DOORS` moved onto `RoomsCard.tsx` itself
 * (exported from there) so the new `/a/site/reading/go/[door]` email-link
 * page reads the SAME array, never a second, driftable copy of the four
 * doors.
 */

export default function SiteReadingRoom() {
  return (
    <div className="p-6" style={{ maxWidth: 860 }}>
      <h1 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 4px" }}>The weekly reading</h1>
      <p style={{ fontSize: ".82rem", color: "var(--muted)", margin: "0 0 6px", maxWidth: 640 }}>
        Set the reading&apos;s schedule below, then open each room when you&apos;re ready.
      </p>
      <SectionHead label="The weekly reading — day, time, zone" />
      <ReadingScheduleCard />
      <SectionHead label="The rooms" />
      <RoomsCard doors={DOORS} />
    </div>
  );
}
