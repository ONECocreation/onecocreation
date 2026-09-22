"use client";

import { SectionHead } from "@/components/console/glass";
import ReadingScheduleCard from "./ReadingScheduleCard";
import Stage2Card from "./Stage2Card";

/**
 * /a/site/reading — the WEEKLY READING sub-room (TASK-381, block 968,047+).
 * Same shell shape as SiteCommunityDoorRoom.tsx / SiteAboutVideosRoom.tsx:
 * h1 + intro line + SectionHead + the card. No public surface — this sets
 * the schedule T-382 (the notice) and T-370 (the sign-up block) will read;
 * the reading room now shows it above the video, off it says 'Stay tuned'
 * instead.
 */
export default function SiteReadingRoom() {
  return (
    <div className="p-6" style={{ maxWidth: 860 }}>
      <h1 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 4px" }}>The weekly reading</h1>
      <p style={{ fontSize: ".82rem", color: "var(--muted)", margin: "0 0 6px", maxWidth: 640 }}>
        When the weekly reading happens — set the day, time and zone here. The reading room shows
        it above the video; turn it off and the room says &ldquo;Stay tuned&rdquo; instead.
      </p>
      <SectionHead label="The weekly reading — day, time, zone" />
      <ReadingScheduleCard />
      <SectionHead label="Stage 2 — after the reading" />
      <Stage2Card />
    </div>
  );
}
