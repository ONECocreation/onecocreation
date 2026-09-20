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
 * Named decision 3 (theme-preview mechanism): two stacked forced-theme
 * sections, using the SAME `.oc-pv-dark`/`.oc-pv-light` wrapper classes
 * BrandBoard.tsx's ThemePane already scopes a preview pane with (S8
 * cartridge hardening — cartridge.css:26/240 both select these classes
 * alongside `:root`/`html[data-oc-theme="light"]`, and preview.css already
 * gives them `background: var(--ground); color: var(--ink)`). Both panes
 * render on every load — no toggle, no --click needed for the shots.
 */
export const metadata: Metadata = {
  title: "Kit — One Cocreation admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/* demo-only labels previewing the real /me tab set the architect pass
   names for lane 4 (§3, §6) — this page wires nothing to a real API */
const DEMO_TABS = [
  { id: "profile", label: "Profile", content: <p className="kit-body">A local-first profile — signed in first, &ldquo;link a key&rdquo; optional (architect pass §3, A3).</p> },
  { id: "calendar", label: "Calendar", content: <p className="kit-body">Lane 4 mounts the real BFT calendar here — scoped to the viewer, not a list drawn new.</p> },
  { id: "purchases", label: "Purchases", content: <p className="kit-body">Owned memberships and one-time items, this viewer only.</p> },
];

function KitPane({ label }: { label: string }) {
  return (
    <>
      <h1 className="kit-h1">Button</h1>
      <div className="kit-btn-row" style={{ marginBottom: 24 }}>
        <Button variant="main">Main door</Button>
        <Button variant="second">Second door</Button>
        <Button variant="quiet">Quiet link</Button>
        <Button variant="main" sm>
          Main, small
        </Button>
      </div>

      <h2 className="kit-h2">Two buttons, a narrow box (390px-equivalent)</h2>
      <p className="kit-text-quiet" style={{ marginBottom: 8 }}>
        The no-wrap/stack law (R-071): labels never break; the second button drops to its own
        row instead. This frame is a fixed 390px width regardless of your window size — no
        devtools needed to see it hold.
      </p>
      <div style={{ maxWidth: 390, border: "1px dashed var(--edge)", borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <div className="kit-btn-row">
          <Button variant="main">A rather long main label</Button>
          <Button variant="second">Another long second label</Button>
        </div>
      </div>

      <h2 className="kit-h2">Card</h2>
      <div style={{ maxWidth: 360, marginBottom: 24 }}>
        <Card>
          <h2 className="kit-h2">{label} card</h2>
          <p className="kit-body" style={{ margin: 0 }}>
            The outer shell law only — radius 24, glass edge, the soft shadow.
          </p>
        </Card>
      </div>

      <h2 className="kit-h2">Field</h2>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24 }}>
        <Field id={`kit-field-ok-${label}`} label="Display name" placeholder="Ada Lovelace" />
        <Field
          id={`kit-field-err-${label}`}
          label="Email"
          defaultValue="not-an-email"
          error="That doesn't look like an email address."
        />
      </div>

      <h2 className="kit-h2">Tabs</h2>
      <div style={{ maxWidth: 480, marginBottom: 8 }}>
        <Tabs items={DEMO_TABS} label={`${label} demo tabs`} />
      </div>
      <p className="kit-text-quiet">Arrow keys (or Home/End) move focus between tabs; the panel updates with it.</p>
    </>
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
      <section className="oc-pv-dark" aria-label="night (dark theme) pane" style={{ padding: "28px 24px 48px" }}>
        <KitPane label="Night" />
      </section>
      <section className="oc-pv-light" aria-label="dawn (light theme) pane" style={{ padding: "28px 24px 48px" }}>
        <KitPane label="Dawn" />
      </section>
    </div>
  );
}
