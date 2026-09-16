"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * StyleRoomStrip (TASK-327, cut 0018.06.26 a₿ · block 967255 — the Admiral:
 * "make sure they have a unified header so we can get back easily to the
 * admin area") — the slim room strip under the shared site header on every
 * /style route: a door back to /a, the room word "Style" (never "studio" —
 * the TASK-175 naming law; StylePac is the house name and never reaches
 * Love's UI), the page being edited, and a View site door. It partially
 * reverses the PUCK P2 full-bleed ruling recorded in ./layout.tsx — the
 * reversal is the Admiral's own instruction this cut.
 *
 * The strip is ALWAYS-NIGHT chrome, same law as the site header it sits
 * under ("the header never theme-flips", cartridge.css): the ground is the
 * header's own night literal and the ink is --nav-dawn-link, the pinned
 * door-cream token that never flips — so both themes read ≥4.5:1 with zero
 * dawn twins. No serifs, 44px door target (the route tree's own LEGIBILITY
 * DOCTRINE, PuckEditor.tsx).
 *
 * The layout above the routes can't see their params, so the page label is
 * derived from the pathname here — the same "use client" + usePathname
 * precedent SiteHeader.tsx already sets. styleRoomLabel is pure and
 * exported for the tests (the LiveStrip stripModel idiom).
 */

/** the honest room label for each /style shape: the catch-all edits a page
 *  slug (bare /style edits "home" — [[...slug]]/page.tsx's own default);
 *  /style/brand is the brand board; /style/reference/<slug> is the recon
 *  viewer. Anything else is a page slug, named as-is. */
export function styleRoomLabel(pathname: string): string {
  const rest = pathname.replace(/^\/style\/?/, "");
  if (rest === "") return "home";
  if (rest === "brand") return "Brand board";
  if (rest.startsWith("reference/")) return `Reference · ${rest.slice("reference/".length)}`;
  return rest;
}

const CREAM = "var(--nav-dawn-link)"; /* #ECE3C9 pinned literal — always-night chrome ink (cartridge.css) */
const SANS = "var(--font-body, 'Helvetica Neue', Helvetica, Arial, sans-serif)";

const door: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", minHeight: 44,
  color: CREAM, fontWeight: 700, fontSize: 14, letterSpacing: ".03em",
  textDecoration: "none", whiteSpace: "nowrap",
};

export default function StyleRoomStrip() {
  const pathname = usePathname() ?? "/style";
  return (
    <div
      aria-label="Style room"
      style={{
        display: "flex", alignItems: "center", gap: "var(--oc-space-5, 16px)",
        padding: "0 22px", /* the site header bar's own side padding (house.css .site-header .bar) */
        background: "rgba(14,12,24,.86)", /* the site header's own night literal — one header block */
        borderTop: "1px solid rgba(139,118,196,.35)",
        fontFamily: SANS, flexWrap: "wrap", flex: "none",
      }}
    >
      <Link href="/a" style={door} title="back to the admin area">
        ← Back to admin
      </Link>
      <span style={{ color: CREAM, fontWeight: 800, fontSize: 14, letterSpacing: ".06em", whiteSpace: "nowrap" }}>
        Style
      </span>
      <span style={{ color: "rgba(236,227,201,.62)" /* the door cream, muted */, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {styleRoomLabel(pathname)}
      </span>
      <span style={{ flex: 1 }} />
      <Link href="/" style={{ ...door, minHeight: 44 }} title="the live site">
        View site
      </Link>
    </div>
  );
}
