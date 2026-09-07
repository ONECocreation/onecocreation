"use client";

import Link from "next/link";
import LoginPanel from "@/components/LoginPanel";
import { SectionHead } from "@/components/console/glass";
import { useBrandPalette, PALETTE_KEYS, SLOT_LABELS, type PaletteKey } from "@/lib/use-brand-palette";
import { ONECOCREATION } from "@/brand/tokens";
import { cartridge } from "@/brand/cartridge";
import { contrastRatio } from "@pacsarcade/puck-config/tokens";

/**
 * BrandDesk (TASK-135) — the /a/brand room, replacing the old DRESSING
 * ROOM. That page mixed two things that don't belong on an artist's own
 * console: a cert foundry (a Pac's Arcade collectible system) and a
 * multi-theme tester (retired with the sign-in kit, S8 hardening,
 * 0018.05.26 — this brand has ONE cartridge). What's left, and what an
 * artist actually needs here: the five colours her Studio-built pages draw
 * from (brand-palette.ts's p1-p5, the "promote-to-token" rail), a live
 * example so a hex isn't read blind, and the door to the full editor.
 *
 * Each slot's "where it's used" words are ONECOCREATION.palette's own
 * `hint` field (src/brand/tokens.ts) — not invented here. The example
 * below composes a hero band / card / button in that same documented
 * role (p1 = CTAs, p2 = edges/fills, p3 = kickers, p4 = contrast, p5 =
 * band grounds) so editing a swatch visibly moves the piece it names.
 *
 * The header above this page and the sign-in panel below are the site's
 * OWN chrome — they wear the cartridge (space/cream/ink/rose/…), a
 * separate, fixed set from these five KV slots (one brand, one cartridge;
 * only Studio-built pages read p1-p5 today, via PaletteVars). Rendering
 * them here is the same honesty BrandTester always gave: "the actual
 * front door, wearing the cartridge" — not a claim that these slots
 * recolour it.
 *
 * Save/reset ride the SAME machinery the Studio's brand board uses
 * (useBrandPalette → POST/GET /api/brand) — no new save path, no schema
 * change to brand-palette.ts, per this task's OWNS.
 */

const SLOT_HINTS: Record<PaletteKey, string> = Object.fromEntries(
  ONECOCREATION.palette.map((s) => [s.key, s.hint]),
) as Record<PaletteKey, string>;

/* the real night/dawn grounds this brand renders on — cartridge.palette,
   not invented hexes (BrandTester's SWATCH_NOTES names these the same way:
   "page night" / "dawn paper") */
const NIGHT_GROUND = cartridge.palette.space;
const DAWN_GROUND = cartridge.palette.cream;

function contrastWords(hex: string): { label: string; ratio: number; ok: boolean }[] {
  return [
    { label: "on night", ground: NIGHT_GROUND },
    { label: "on dawn", ground: DAWN_GROUND },
  ].map(({ label, ground }) => {
    const ratio = contrastRatio(hex, ground);
    return { label, ratio, ok: ratio >= 4.5 };
  });
}

export default function BrandDesk() {
  const { pal, dirty, busy, setSlot, save, reset } = useBrandPalette();

  if (!pal) {
    return <p className="p-6 text-sm" style={{ color: "var(--muted)" }}>reading the palette…</p>;
  }

  return (
    <div className="p-6" style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 4px" }}>Brand</h1>
      <p style={{ fontSize: ".82rem", color: "var(--muted)", margin: "0 0 6px", maxWidth: 640 }}>
        The five colours your Studio-built pages draw from — edit a swatch and the example below
        moves with it.
      </p>

      {/* ── the example ── */}
      <SectionHead label="Example — built in the slots' own roles" />
      <div style={{ border: "1px solid var(--glass-edge)", borderRadius: 16, overflow: "hidden" }}>
        {/* p5 Deep: "ground shade -- band backgrounds"; p3 Soft: "warm
            secondary -- kickers, highlights" */}
        <div style={{ padding: "26px 22px", background: pal.p5 }}>
          <p style={{ margin: 0, fontSize: ".7rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: pal.p3 }}>
            {cartridge.copy.tagline}
          </p>
          <h2 style={{ margin: "6px 0 0", fontSize: "1.4rem", color: "#fff", fontFamily: cartridge.fonts.display }}>
            {cartridge.copy.productName}
          </h2>
        </div>
        {/* p2 Mid: "structural tint -- edges, fills, bands" (the card's
            border); p4 Counter: "the complement -- contrast moments" (the
            chip); p1 Lead: "the brand's loudest note -- CTAs, key accents"
            (the button, same shape as .btn-rose, live-coloured) */}
        <div style={{ padding: 18, background: "var(--panel, #fff)" }}>
          <div style={{ border: `1.5px solid ${pal.p2}`, borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ flex: 1, minWidth: 160, fontSize: ".85rem" }}>A card, edged in the Mid slot.</span>
            <span style={{ borderRadius: 999, padding: "3px 10px", fontSize: ".66rem", fontWeight: 700, background: pal.p4, color: "#141021" }}>
              Counter
            </span>
            <button type="button" className="btn btn-sm" style={{ background: pal.p1, color: "#2E0E1D", border: "none", fontWeight: 700 }}>
              Book now
            </button>
          </div>
        </div>
      </div>

      <p style={{ fontSize: ".72rem", color: "var(--muted)", margin: "8px 0 0", maxWidth: 640 }}>
        The header above this desk and the sign-in below are the site&apos;s own — they wear the
        cartridge, not these five slots (one brand, one cartridge; only Studio-built pages draw
        from p1&ndash;p5).
      </p>

      {/* ── the swatches ── */}
      <SectionHead label="Swatches — the five slots" />
      {PALETTE_KEYS.map((k) => {
        const grades = contrastWords(pal[k]);
        return (
          <div
            key={k}
            style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", border: "1px solid var(--glass-edge)", borderRadius: 12, padding: "10px 14px", marginBottom: 8 }}
          >
            <input
              type="color"
              value={pal[k]}
              onChange={(e) => setSlot(k, e.target.value, "night")}
              aria-label={`${SLOT_LABELS[k]} colour (${k})`}
              style={{ width: 38, height: 38, border: "none", borderRadius: 8, padding: 0, background: "none" }}
            />
            <div style={{ flex: 1, minWidth: 220 }}>
              <b style={{ fontSize: ".9rem", textTransform: "capitalize" }}>{SLOT_LABELS[k]}</b>
              <span style={{ fontSize: ".78rem", color: "var(--muted)" }}> ({k}) — {SLOT_HINTS[k]}</span>
              <div style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 3 }}>
                {grades.map((g) => (
                  <span key={g.label} style={{ marginRight: 16, color: g.ok ? "var(--ok)" : "var(--err)" }}>
                    {g.label}: {g.ratio.toFixed(2)}:1{g.ok ? "" : " — too light"}
                  </span>
                ))}
              </div>
            </div>
            <code style={{ fontSize: ".76rem" }}>{pal[k]}</code>
          </div>
        );
      })}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
        <button
          type="button"
          className="btn btn-gold btn-sm"
          disabled={busy || !dirty}
          onClick={save}
          style={busy || !dirty ? { opacity: 0.5 } : undefined}
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={reset}>
          Reset to cartridge default
        </button>
        {dirty && !busy && <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>unsaved changes</span>}
      </div>

      {/* ── the real front door ── */}
      <SectionHead label="The real front door" />
      <div style={{ border: "1px solid var(--glass-edge)", borderRadius: 16, overflow: "hidden" }}>
        <LoginPanel />
      </div>

      <p style={{ fontSize: ".78rem", color: "var(--muted)", marginTop: 18 }}>
        For the full edit, open the Studio →{" "}
        <Link href="/studio" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>
          /studio
        </Link>
        .
      </p>
    </div>
  );
}
