"use client";

import { SectionHead } from "@/components/console/glass";
import AboutVideosCard from "./AboutVideosCard";

/**
 * /a/site/about-videos — the VIDEOS ON ABOUT sub-room (TASK-188, 0018.06.18
 * a₿ · block 966,112). T-161's playlist card moved here from /a/site when
 * the Site room became an accordion; the card itself is untouched — paste a
 * YouTube link, the house keeps the 11-char id, /about shows her list.
 */
export default function SiteAboutVideosRoom() {
  return (
    <div className="p-6" style={{ maxWidth: 860 }}>
      <h1 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 4px" }}>Videos on About</h1>
      <p style={{ fontSize: ".82rem", color: "var(--muted)", margin: "0 0 6px", maxWidth: 640 }}>
        The playlist the About page shows — paste a YouTube link, order the rows, save.
      </p>
      <SectionHead label="Videos on About — the playlist Love pastes" />
      <AboutVideosCard />
    </div>
  );
}
