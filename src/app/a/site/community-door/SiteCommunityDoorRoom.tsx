"use client";

import { SectionHead } from "@/components/console/glass";
import CommunityDoorCard from "@/components/console/CommunityDoorCard";

/**
 * /a/site/community-door — the COMMUNITY DOOR sub-room (TASK-188, 0018.06.18
 * a₿ · block 966,112). T-162's card moved here from beside the switches when
 * the Site room became an accordion; the card itself is untouched — the five
 * readiness probes in plain words and the community switch with the flip
 * rule AS WORDS, her call, never a hard block.
 */
export default function SiteCommunityDoorRoom() {
  return (
    <div className="p-6" style={{ maxWidth: 860 }}>
      <h1 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 4px" }}>The Community door</h1>
      <p style={{ fontSize: ".82rem", color: "var(--muted)", margin: "0 0 6px", maxWidth: 640 }}>
        What the Community door needs before it opens — and the switch, when the rows read ok.
      </p>
      <SectionHead label="Community door — what it needs before it opens" />
      <CommunityDoorCard />
    </div>
  );
}
