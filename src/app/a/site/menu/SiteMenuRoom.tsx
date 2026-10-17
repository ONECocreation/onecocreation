"use client";

import NavEditor from "@/components/console/NavEditor";

/**
 * /a/site/menu — THE MENU sub-room (TASK-188, 0018.06.18 a₿ · block
 * 966,112). The nav editor got its own room under the Site accordion ("maybe
 * it gets its own sub-menu under Site" — the Admiral). The card is the same
 * self-contained NavEditor that rode /a/site since TASK-137 (rebuilt in T-615): own
 * fetch, auto save.
 */
export default function SiteMenuRoom() {
  return (
    <div className="p-6" style={{ maxWidth: 1180 }}>
      <h1 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 4px" }}>The Menu</h1>
      <p style={{ fontSize: ".82rem", color: "var(--muted)", margin: "0 0 16px", maxWidth: 640 }}>
        The doors across the top of the site. Each column is a tab on the top of the site, and its cards are the pages under it. Drag a card by its grip into any column, or drag a whole column to reorder the tabs. On a phone, press Change on a card or Tab on a column.
      </p>
      <NavEditor />
    </div>
  );
}
