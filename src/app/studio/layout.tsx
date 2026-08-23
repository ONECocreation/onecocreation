import "./puck-theme.css";
import "./studio-tokens.css";
import "./preview.css";
import BenchNotes from "@/components/BenchNotes";
import { benchEnabled } from "@/lib/bench-gate";

/**
 * The studio's OWN top-level layout (PUCK P2, Admiral-approved 2026-08-10 —
 * escape the console chrome). /a/studio (P1) rendered inside the console
 * shell (src/app/a/layout.tsx), which squeezed Puck's own full-app editor
 * into the console's locked content strip. Moving the route out from under
 * /a means this layout is the ONLY chrome around the editor: no SiteHeader,
 * no console sidebar/header — just full-bleed viewport. The route still
 * gates itself exactly like every /a room (each page checks
 * operatorFromCookieHeader itself; see [[...slug]]/page.tsx) — this layout
 * doesn't add auth, it only removes furniture.
 *
 * puck-theme.css (the house-night override of Puck's design tokens) is
 * imported here rather than in the client PuckEditor component so it loads
 * once with the rest of the route's CSS, same pattern as cartridge.css/
 * house.css in the root layout.
 */
export default function StudioLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", overflow: "hidden" }}>
      {children}
      {/* S26 lane 3 — the bench feedback rail. The gate reads env on the
          server: production builds never render it, and its route 404s too. */}
      {benchEnabled() ? <BenchNotes /> : null}
    </div>
  );
}
