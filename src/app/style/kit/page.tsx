import type { Metadata } from "next";
import { headers } from "next/headers";
import OperatorGate from "@/components/OperatorGate";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import { Button, Card, Field, Tabs } from "@/components/kit";

/**
 * /style/kit (TASK-349, lane 1 of the OC UI kit migration order) — the
 * repo's first component preview. A new sibling static route beside
 * `src/app/style/brand/page.tsx` and `src/app/style/reference/[slug]/
 * page.tsx`: the static `kit` segment beats the optional catch-all
 * ([[...slug]]/page.tsx), so this route never collides with editing a
 * page — the exact precedent those two files' own docblocks state.
 *
 * Same gate idiom as every other /style leaf: no operator cookie, no
 * preview.
 *
 * ROUND 2 (Number One's pickup finding): the ORIGINAL Round 1 layout
 * stacked the two theme panes full-height, one after the other, inside
 * `<div style={{ position: "absolute", inset: 0, overflowY: "auto" }}>` —
 * so the dawn pane sat below the fold of an INNER scroller and never
 * appeared in any shot (a plain viewport screenshot only shows what's on
 * screen; puppeteer's `fullPage: true` measures `document.documentElement`'s
 * own scroll size, which an inner `overflow:auto` div never contributes
 * to).
 *
 * That inner scroller is not this page's own choice — it is FORCED by the
 * shared `/style` layout: `src/app/style/layout.tsx:39` wraps every
 * `/style/*` route in `position: "fixed", inset: 0, width: "100vw",
 * height: "100vh", overflow: "hidden"`. A `position:fixed` element takes
 * no part in normal document flow, so nothing outside it ever grows
 * `document.body`'s scroll height, and `overflow:hidden` on it clips
 * anything taller than one viewport into total invisibility unless SOME
 * descendant creates its own scrolling context. Every existing `/style`
 * leaf (`brand/page.tsx`, `reference/[slug]/page.tsx`) already does this
 * the same way. Editing the shared layout is out of this lane's scope
 * (it would change every `/style` route, not just this one) — so the
 * inner scroller itself stays (removing it without another fix would make
 * anything taller than one screen not just unshootable but literally
 * unreachable, even by hand-scrolling).
 *
 * The fix instead: make BOTH panes fit inside ONE screen at the shot
 * widths this repo's harness actually uses (390×844, 1440×1100 —
 * scripts/shots-fixture.cjs's `heightFor()`), so the inner scroller never
 * needs to move at all for a plain (or `--full-page`) screenshot to show
 * everything:
 *   - a two-column CSS grid, night | dawn, side by side, from 820px up;
 *     stacked (one full-width column) below it — the Admiral's preferred
 *     shape. Tried side-by-side ALWAYS first (down to 360px): at a true
 *     390px shot width, two columns' own min-content width (the button
 *     labels can't shrink below their own text) forced the grid wider
 *     than the viewport, and `html,body{overflow-x:clip}` (house.css:595)
 *     clipped the whole dawn column off-screen — worse than the original
 *     bug, and unreachable even by scrolling. Stacking below 820px avoids
 *     it entirely;
 *   - the narrow-box stacking demo (R-071's own proof) moved OUT of each
 *     theme pane into ONE shared instance above the grid — the law itself
 *     (no-wrap, stack) has nothing to do with theme color, so proving it
 *     twice cost height without adding information;
 *   - each pane trimmed to a compact gallery (`sm` buttons throughout, no
 *     repeated prose) so BOTH columns fit fully at 1440 with room to
 *     spare (verified by shot). At 390 stacked, two full panes still
 *     don't both clear the ~700px budget (header + room strip take
 *     roughly 100-110px either width) — Tabs, the tallest single part,
 *     is hidden below 820px to buy back height; Button/Card/Field (the
 *     other five items on Number One's inspection list) fit for BOTH
 *     panes at 390. Documented honestly in SUMMARY: Tabs in the dawn
 *     theme is only inspectable in the 1440 shot.
 */
export const metadata: Metadata = {
  title: "Kit — One Cocreation admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/* demo-only labels previewing the real /me tab set the architect pass
   names for lane 4 (§3, §6) — this page wires nothing to a real API */
const DEMO_TABS = [
  { id: "profile", label: "Profile", content: <p className="kit-text-quiet kit-preview-panel-copy">Local-first profile; &ldquo;link a key&rdquo; optional.</p> },
  { id: "calendar", label: "Calendar", content: <p className="kit-text-quiet kit-preview-panel-copy">Lane 4 mounts the real BFT calendar here.</p> },
  { id: "purchases", label: "Purchases", content: <p className="kit-text-quiet kit-preview-panel-copy">Owned memberships and one-time items.</p> },
];

const PREVIEW_STYLE = `
.kit-preview-shell{padding:6px 10px 8px}
@media(min-width:820px){.kit-preview-shell{padding:14px 14px 24px}}
.kit-preview-intro-copy{margin:0 0 6px}
@media(max-width:819px){.kit-preview-intro-copy{display:none}}
.kit-preview-grid{display:grid;grid-template-columns:1fr;gap:5px}
/* side by side once there is real room for two columns without either one
   squeezing narrower than its own buttons' min-content width (measured:
   two columns need ~820px to avoid the dawn column clipping off-screen
   behind html,body{overflow-x:clip} — house.css:595 — the exact failure
   Number One caught at 390px in Round 1 of this fix) */
@media(min-width:820px){.kit-preview-grid{grid-template-columns:1fr 1fr;gap:14px}}
.kit-preview-pane{padding:5px}
@media(min-width:820px){.kit-preview-pane{padding:14px}}
.kit-preview-label{margin:0 0 2px;font-size:.68rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.kit-preview-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px}
.kit-preview-frame{border:1px dashed var(--edge);border-radius:10px;padding:3px;margin-bottom:4px}
.kit-preview-fields{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px}
.kit-preview-card-body{padding:6px}
@media(min-width:820px){
  .kit-preview-row,.kit-preview-frame,.kit-preview-fields{margin-bottom:10px}
  .kit-preview-card-body{padding:18px}
}
/* Tabs is the tallest single part (a tablist + a panel) — at 390 stacked,
   two full panes' Button+Card+Field alone already use most of the ~700px
   budget, so Tabs is deferred to the side-by-side (820px+) layout, where
   both columns fit with room to spare. */
@media(max-width:819px){.kit-preview-tabs{display:none}}
/* the "ok" field is a plain example; the error field is the one with
   something to inspect (label binding + error text + aria-describedby) —
   dropped below 820px to buy back the height the error field alone needs */
@media(max-width:819px){.kit-preview-field-ok{display:none}}
`;

function KitPane({ label, ariaLabel, className }: { label: string; ariaLabel: string; className: string }) {
  const idBase = label.toLowerCase();
  return (
    <section className={`${className} kit-preview-pane`} aria-label={ariaLabel}>
      <p className="kit-preview-label">{label}</p>

      <div className="kit-preview-row">
        <Button variant="main" sm>
          Main door
        </Button>
        <Button variant="second" sm>
          Second door
        </Button>
        <Button variant="quiet">Quiet link</Button>
      </div>

      <Card body={false}>
        <div className="kit-preview-card-body">
          <h2 className="kit-h2" style={{ fontSize: "1rem", margin: "0 0 3px" }}>
            {label} card
          </h2>
          <p className="kit-body" style={{ margin: 0, fontSize: ".8rem" }}>
            Radius 24, glass edge, soft shadow.
          </p>
        </div>
      </Card>

      <div className="kit-preview-fields" style={{ marginTop: 2 }}>
        <div className="kit-preview-field-ok">
          <Field id={`kit-field-ok-${idBase}`} label="Display name" placeholder="Ada Lovelace" />
        </div>
        <Field id={`kit-field-err-${idBase}`} label="Email" defaultValue="not-an-email" error="Not a valid email address." />
      </div>

      <div className="kit-preview-tabs" style={{ marginTop: 6 }}>
        <Tabs items={DEMO_TABS} label={`${label} demo tabs`} />
      </div>
    </section>
  );
}

export default async function KitPreviewPage() {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflowY: "auto" }}>
      {/* page-local layout CSS only (the grid/gallery shape of THIS demo
          route) — never in kit.css, which stays the kit's own reusable law */}
      <style>{PREVIEW_STYLE}</style>
      <div className="kit-preview-shell">
        <h1 className="kit-h1" style={{ fontSize: "1.15rem", margin: "0 0 2px" }}>
          OC UI Kit
        </h1>
        <p className="kit-text-quiet kit-preview-intro-copy">Every kit part, night and dawn, side by side.</p>
        {/* R-071, one shared proof (the law is theme-independent — no-wrap,
            stack — so it doesn't need re-proving per theme): two buttons in
            a narrow box stack, labels never wrap. The frame's own width
            (not the shot's viewport width) is what proves it, so this
            holds at 1440 exactly as it does at 390. */}
        <div className="kit-preview-frame">
          <div className="kit-btn-row">
            <Button variant="main" sm>
              A rather long main label
            </Button>
            <Button variant="second" sm>
              Another long second label
            </Button>
          </div>
        </div>
        <div className="kit-preview-grid">
          <KitPane label="Night" ariaLabel="night (dark theme) pane" className="oc-pv-dark" />
          <KitPane label="Dawn" ariaLabel="dawn (light theme) pane" className="oc-pv-light" />
        </div>
      </div>
    </div>
  );
}
