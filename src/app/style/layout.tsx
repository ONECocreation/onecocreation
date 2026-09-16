import "./puck-theme.css";
import "./studio-tokens.css";
import "./preview.css";
import BenchNotes from "@/components/BenchNotes";
import { benchEnabled } from "@/lib/bench-gate";
import { SiteChromeHeader } from "@/components/console/site-chrome";
import StyleRoomStrip from "./StyleRoomStrip";

/**
 * The STYLE editor's OWN top-level layout. History: PUCK P2 (Admiral-approved
 * — escape the console chrome) moved the route out from under /a,
 * where the console shell had squeezed Puck's full-app editor into the
 * console's locked content strip; this layout became the ONLY chrome around
 * the editor — no SiteHeader, no console sidebar/header, just full-bleed
 * viewport. TASK-327 (cut 0018.06.26 a₿ · block 967255) PARTIALLY REVERSES
 * that ruling on the Admiral's own instruction this cut ("make sure they
 * have a unified header so we can get back easily to the admin area"): the
 * route now wears the console's own site header (SiteChromeHeader — the
 * same header every /a page renders, imported from the site-chrome swap
 * point with zero edit to SiteConsoleShell) plus a slim room strip (a door
 * back to /a, the room word, the page being edited). The editor still owns
 * everything below the header block: the wrapper is a full-viewport flex
 * column, the body region takes flex:1, and the editor fills it (its root's
 * one-line 100vh → 100% seam is named in TASK-327's SUMMARY).
 * The route still gates itself exactly like every /a room (each page checks
 * operatorFromCookieHeader itself; see [[...slug]]/page.tsx) — this layout
 * adds chrome, never auth.
 * (TASK-175, 0018.06.17 a₿: /studio → /style — the page designer is Style;
 * "the studio" names only the VDO.Ninja go-live fork.)
 *
 * puck-theme.css (the house-night override of Puck's design tokens) is
 * imported here rather than in the client PuckEditor component so it loads
 * once with the rest of the route's CSS, same pattern as cartridge.css/
 * house.css in the root layout.
 */
export default function StyleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <SiteChromeHeader />
      <StyleRoomStrip />
      {/* the body region: everything below the header block. position:
          relative makes it the positioning context for the routes that
          fill it absolutely (the reference viewer) and for the editor's
          preview overlay (preview.css .oc-preview-shell), so the overlay
          can never cover the admin door above. */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {children}
      </div>
      {/* S26 lane 3 — the bench feedback rail. The gate reads env on the
          server: production builds never render it, and its route 404s too. */}
      {benchEnabled() ? <BenchNotes /> : null}
    </div>
  );
}
