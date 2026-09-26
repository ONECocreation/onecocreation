"use client";

import { SectionHead } from "@/components/console/glass";
import ReadingScheduleCard from "./ReadingScheduleCard";
import RoomsCard, { type DoorConfig } from "./RoomsCard";

/**
 * /a/site/reading — the WEEKLY READING sub-room (TASK-381, block 968,047+;
 * TASK-475, block 968,624). Same shell shape as SiteCommunityDoorRoom.tsx
 * / SiteAboutVideosRoom.tsx: h1 + intro line + SectionHead + the card. No
 * public surface — this sets the schedule T-382 (the notice) and T-370
 * (the sign-up block) will read.
 *
 * TASK-475 (the Admiral's ruling: "one area for love to open each room as
 * needed on the host side"): the separate Stage1Card/Stage2Card sections
 * are replaced by ONE `RoomsCard`, three identical rows, one config array.
 * `Stage1Card.tsx`/`Stage2Card.tsx` are not deleted (house law) — they
 * simply stop being imported here.
 */
const DOORS: DoorConfig[] = [
  { id: "stage1", label: "Free room · 12:12 Housewarming and 1:11 Reading", adminPath: "/api/admin/stage1" },
  { id: "stage2", label: "Book talk · 2:22", adminPath: "/api/admin/stage2" },
  { id: "qa", label: "Q&A · 3:33", adminPath: "/api/admin/qa-door" },
];

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
