"use client";

import { SectionHead } from "@/components/console/glass";
import NavEditor from "@/components/console/NavEditor";

/**
 * /a/site/menu — THE MENU sub-room (TASK-188, 0018.06.18 a₿ · block
 * 966,112). The nav editor got its own room under the Site accordion ("maybe
 * it gets its own sub-menu under Site" — the Admiral). The card is the same
 * self-contained NavEditor that rode /a/site since TASK-137 — own
 * fetch/save, Save unchanged.
 */
export default function SiteMenuRoom() {
  return (
    <div className="p-6" style={{ maxWidth: 860 }}>
      <h1 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 4px" }}>The Menu</h1>
      <p style={{ fontSize: ".82rem", color: "var(--muted)", margin: "0 0 6px", maxWidth: 640 }}>
        The doors across the top of the site — rename them, drag them into order, nest a page under a header.
      </p>
      <SectionHead label="Menu — the doors Love shapes" />
      <NavEditor />
    </div>
  );
}
