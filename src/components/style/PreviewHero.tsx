"use client";

import type { ReactNode } from "react";

/**
 * PreviewHero (TASK-346 LANE A, cut 0018.07.02 a₿ — the drafter's split
 * taken by Number One's SUPERSEDING CUT NOTE, top of the brief). Mounted
 * via `overrides.iframe` at the very top of the `/style` home canvas
 * (`src/components/PuckEditor.tsx`'s `PreviewCanvasFrame`), matching what
 * a visitor of the live `/` route sees today (`src/app/page.tsx:62`,
 * `<Hero session={session}/>` above `<Render>`).
 *
 * LANE A shows a BARE `Hero` — the real, unmodified component, per the
 * CUT NOTE's own words ("a bare `<Hero>`"). Unlike the full L-sized
 * brief's Build step 4 (which assumed this file would import `Hero`
 * directly from `@/components/sections`), `hero` arrives here as an
 * ALREADY-RENDERED `ReactNode` prop instead:
 *
 * GROUND GAP FOUND WHILE BUILDING (not in the brief's own Ground work —
 * documented in full at `src/app/style/[[...slug]]/page.tsx`, where the
 * fix lives): `sections.tsx` carries no `"use client"` directive, and its
 * module-level siblings (`booking.ts`/`store.ts`/`site-config.ts`) import
 * Node built-ins + redis/nodemailer transitively. PuckEditor.tsx (and
 * therefore this file, mounted deep inside its `overrides.iframe` tree) is
 * `"use client"` — a client file importing `Hero` directly forces Next to
 * pull `sections.tsx`'s WHOLE module graph into the browser bundle, which
 * fails to build (`fs`/`net`/`tls`/`dns`/`child_process` can't resolve
 * client-side; reproduced with a real `npx next build` run). The fix: the
 * SERVER route renders `<Hero session={session}/>` itself (exactly like
 * `src/app/page.tsx`'s own live hero) and passes the finished element down
 * through the client tree as an opaque prop — the standard Next.js
 * "Server Component passed as a Client Component's prop" composition
 * pattern. This file, and every client file between here and the route,
 * never imports `sections.tsx` — `Hero` stays entirely read-only,
 * unmodified, exactly as the brief's OWNS/READ-ONLY list requires; only
 * WHERE it is instantiated moved, one layer up.
 *
 * SEAM FOR LANE B: when the reading door needs to wear `BuilderMarker`,
 * this composition (a pre-rendered `Hero` element, opaque to every client
 * file) can no longer be wrapped from the client side — the marker would
 * need to reach in from the SAME server-side render that builds
 * `previewHero`, or `Hero`'s JSX gets forked there instead (reusing
 * `weeklyReadingDoor`/`ROOMS`/`CosmicSky`/`LightCode`, the L brief's Build
 * step 4 option (a)). Not decided here; left for Lane B's own build,
 * which will need to re-read this file's own history before assuming the
 * L brief's original Build step 4 shape still applies unmodified.
 *
 * THE "PREVIEW ONLY" AFFORDANCE: a small corner label, legibility-
 * doctrine-compliant (a text sentence, not a color-only cue), matching
 * the accepted mockup's (https://claude.ai/artifact/8VthqpdhvDdPUBXXui93fM,
 * section B) `.frame-lbl` treatment — "Hero · preview only, not saved
 * into the page" sits at the top-left corner of the canvas frame in the
 * mockup's illustration. This label reuses the SAME floating-panel recipe
 * T-342's `BuilderMarker` already verified for contrast in both themes
 * (`--pop-bg`/`--pop-edge`/`--pop-shadow`, ink in `--nav-gold`) rather
 * than inventing a new token pairing or relying on `--muted` (which is
 * NOT theme-invariant outside a `.keep-dark` DOM scope — cartridge.css:241
 * — and this label sits just outside `.hero.keep-dark`, one wrapping div
 * up, so it can't lean on that scoping the way Hero's own children can).
 * `pointer-events:none` — informational only, never blocks the hero's own
 * buttons.
 */
export default function PreviewHero({ hero }: { hero: ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <div
        aria-hidden={false}
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 2,
          display: "inline-flex",
          alignItems: "center",
          pointerEvents: "none",
          background: "var(--pop-bg)",
          border: "1px solid var(--pop-edge)",
          boxShadow: "var(--pop-shadow)",
          borderRadius: 6,
          padding: "4px 10px",
          font: "600 10.5px var(--font-mono, ui-monospace)",
          letterSpacing: ".05em",
          textTransform: "uppercase",
          color: "var(--nav-gold, #FAC51C)",
          whiteSpace: "nowrap",
        }}
      >
        Preview only — not saved to the page
      </div>
      {hero}
    </div>
  );
}
