import type { CSSProperties } from "react";
import TipJar, { type JarKey } from "@/components/TipJar";

/**
 * TASK-498 (block 969,095 · R-072, settled Monday — the Admiral
 * [00:44:13–00:44:38]): the tip items live ONLY under Store, in their own
 * drop-down at the bottom of the page. This drawer is that drop-down: a
 * native <details>/<summary> in the /contact idiom, wearing the warm-panel
 * frame the /support jars block wore before the move. It is page
 * furniture, NOT a shelf section — STORE_SECTIONS keeps four entries with
 * ConsciousCuts & Soul Sessions LAST (Love's meeting, 0018.05.11); the
 * drawer mounts below the shelf in store/page.tsx.
 *
 * The face reuses words already approved on /support (relocated, not
 * written): the "Tip the Field" heading and its pick-a-jar line on the
 * summary, the "Gifts of Gratitude" sub-heading with its two-line
 * explainer above the widget, and the bitcoin line inside. The widget is
 * TipJar as-is (READ-ONLY — its words, including "Keeps the lights on…",
 * are Love's to reword). No new copy lives here.
 *
 * The double gate is the caller's (store/page.tsx): jarsOpen() — the
 * features.jars switch AND a live bitcoin rail — AND liveJarKeys()'s
 * per-item live-status truth, the same gate the jars had on /support.
 * Derive-or-dash: an empty liveJars list renders NOTHING (no drawer, no
 * empty box), so a closed rail or a hidden jar can never be woken by the
 * move. The crumb of each jar's item page points at #gifts
 * (sectionForItem, store-sections.ts) — this id is that anchor.
 */

/* the relocated /support block's own text styles, named once and shared
   instead of repeated inline */
const headingStyle: CSSProperties = { fontWeight: 400, fontSize: "1.5rem", margin: 0 };
const noteStyle: CSSProperties = { color: "var(--muted)", margin: "4px 0 0", fontSize: ".95rem" };
const dashLineStyle: CSSProperties = { color: "var(--muted)", margin: "2px 0 0", fontSize: ".95rem" };
const bitcoinLineStyle: CSSProperties = { fontSize: ".82rem", color: "var(--muted)", marginTop: 18 };
const subSectionStyle: CSSProperties = { marginTop: 38, paddingTop: 30, borderTop: "1px solid var(--warm-edge)" };

export default function GiftDrawer({ liveJars }: { liveJars: JarKey[] }) {
  if (liveJars.length === 0) return null;
  return (
    <section style={{ padding: "10px 0 46px" }}>
      <div className="wrap reveal">
        <details
          id="gifts"
          style={{ background: "var(--warm-panel)", border: "1px solid var(--warm-edge)", borderRadius: 30, padding: "34px 38px", boxShadow: "var(--soft)" }}
        >
          <summary style={{ cursor: "pointer" }}>
            <h2 style={headingStyle}>Tip the Field</h2>
            <p style={noteStyle}>
              pick a jar, pick an amount — it lands in your basket, and it&apos;s done in a breath.
            </p>
          </summary>

          {/* ── Gifts of Gratitude, its own header (relocated from /support) ── */}
          <div style={subSectionStyle}>
            <h2 style={headingStyle}>Gifts of Gratitude</h2>
            <p style={noteStyle}>
              A gift bought forward for someone who needs it, held until they can claim it.
            </p>
            <p style={dashLineStyle}>
              — how gifts were received will show here.
            </p>
            <TipJar only={liveJars} />
            <p style={bitcoinLineStyle}>
              Bitcoin gifts travel on-chain straight to Love&apos;s own wallet — nothing
              held, nothing routed by anyone else. Dollars are always welcome too: bitcoin is an
              option here, never a demand.
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}
