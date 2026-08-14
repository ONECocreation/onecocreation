"use client";

import { useState } from "react";
import { Render } from "@puckeditor/core";
import { config } from "@/lib/puck-config";
import { BOARD_SAMPLE } from "@/lib/board-sample";
import {
  useBrandPalette,
  PALETTE_KEYS,
  SLOT_LABELS,
  type PaletteKey,
} from "@/lib/use-brand-palette";
import { effectivePalette, contrastRatio } from "@pacsarcade/puck-config/tokens";
import { ONECOCREATION } from "@/brand/tokens";

/**
 * BrandBoard — the brand's dressing room (/studio/brand, BRAND BOARD batch
 * 2026-08-14). One page where Love sees the WHOLE brand in both skins at
 * once and tunes the palette against real blocks:
 *
 *   control rail (roll · save · reset · back to studio)
 *   ┌───────────── night pane ─────────────┬───────────── dawn pane ─────┐
 *   │ palette strip (click = eyedrop night)│ strip (click = dawn override)│
 *   │ <Render BOARD_SAMPLE/> (real blocks) │ same, in the light skin      │
 *   │ gradient lab (try-outs, not saved)   │ gradient lab                 │
 *   └──────────────────────────────────────┴──────────────────────────────┘
 *
 * The panes are the SAME dual-theme mechanism as Preview & publish
 * (.oc-pv-dark / .oc-pv-light from studio/preview.css); the live-preview
 * <style> the useBrandPalette hook injects targets those scopes, so every
 * tweak lands in both panes instantly. LEGIBILITY DOCTRINE throughout:
 * labels sit on solid/text-safe grounds, override state is gold ring PLUS
 * a dot (never colour alone), all icon controls carry title + aria-label.
 */

const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, Menlo, Consolas, monospace";

const pill: React.CSSProperties = {
  padding: "6px 13px", borderRadius: 999, fontSize: 13, fontWeight: 700,
  letterSpacing: ".02em", border: "none", cursor: "pointer",
  fontFamily: SANS, whiteSpace: "nowrap",
};

/* ── gradient lab data ────────────────────────────────────────────────── */
const PAIRS: [PaletteKey, PaletteKey][] = [
  ["p1", "p2"], ["p2", "p3"], ["p1", "p5"],
  ["p3", "p4"], ["p4", "p5"], ["p2", "p5"],
  ["p1", "p3"], ["p2", "p4"], ["p1", "p4"], ["p3", "p5"],
];
const ANGLES = [135, 90, 45, 160, 20];

/** dark-on-light or light-on-dark, never mid-on-mid: pick the ink that
 *  clears BOTH gradient stops best (doctrine — measured, not assumed) */
function gradientInk(a: string, b: string): string {
  const dark = "#141021", light = "#ffffff";
  const minDark = Math.min(contrastRatio(dark, a), contrastRatio(dark, b));
  const minLight = Math.min(contrastRatio(light, a), contrastRatio(light, b));
  return minDark >= minLight ? dark : light;
}

function GradientLab({ hexes, shuffleN, onShuffle }: {
  hexes: Record<PaletteKey, string>;
  shuffleN: number;
  onShuffle: () => void;
}) {
  const angle = ANGLES[shuffleN % ANGLES.length];
  const bands = [0, 1, 2].map((i) => PAIRS[(shuffleN + i) % PAIRS.length]);
  const [bA, bB] = bands[0];
  const btnInk = gradientInk(hexes[bA], hexes[bB]);
  /* the label chip: a text-safe panel over the busy gradient (doctrine) */
  const chip: React.CSSProperties = {
    position: "absolute", left: 10, bottom: 8,
    background: "rgba(12,10,22,.85)", color: "#F4ECFF",
    fontFamily: MONO, fontSize: 11.5, fontWeight: 700,
    padding: "3px 9px", borderRadius: 7, letterSpacing: ".04em",
  };
  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".18em",
          textTransform: "uppercase", fontWeight: 700, color: "var(--ink-strong)" }}>
          Gradient lab
        </span>
        <button
          onClick={onShuffle}
          title="shuffle — cycle gradient pairs and angles"
          aria-label="shuffle gradient pairs and angles"
          style={{ ...pill, padding: "3px 10px", fontSize: 12, background: "rgba(139,118,196,.25)",
            color: "var(--ink-strong)", border: "1px solid var(--edge)" }}
        >⟳ shuffle</button>
      </div>
      {bands.map(([a, b], i) => (
        <div key={i} style={{ position: "relative", height: 74, borderRadius: 12,
          marginBottom: 10, background: `linear-gradient(${angle}deg, var(--${a}), var(--${b}))` }}>
          <span style={chip}>{a} → {b} · {angle}°</span>
        </div>
      ))}
      <span style={{ display: "inline-block", padding: "10px 22px", borderRadius: 999,
        background: `linear-gradient(${angle}deg, var(--${bA}), var(--${bB}))`,
        color: btnInk, fontFamily: SANS, fontWeight: 800, fontSize: 14 }}>
        Gradient button — {bA} → {bB}
      </span>
      <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.5, color: "var(--ink-body)", fontFamily: SANS }}>
        gradients are a try-out — saving them to the brand comes later
      </p>
    </div>
  );
}

/* ── one theme pane ───────────────────────────────────────────────────── */
function ThemePane({ variant, hexes, dawnOverrides, onSwatch, onClearDawn, shuffleN, onShuffle }: {
  variant: "night" | "dawn";
  hexes: Record<PaletteKey, string>;
  dawnOverrides: Partial<Record<PaletteKey, string>>;
  onSwatch: (k: PaletteKey) => void;
  onClearDawn: (k: PaletteKey) => void;
  shuffleN: number;
  onShuffle: () => void;
}) {
  const isDawn = variant === "dawn";
  return (
    <section
      className={isDawn ? "oc-pv-light" : "oc-pv-dark"}
      aria-label={isDawn ? "dawn (light theme) pane" : "night (dark theme) pane"}
      style={{ flex: "1 1 460px", minWidth: 0, borderRadius: 16,
        border: "1px solid rgba(139,118,196,.35)", overflow: "hidden",
        /* the pv class sets background: var(--ground) — a solid hex; this
           is belt-and-braces so the pane NEVER shows a see-through ground */
        backgroundColor: isDawn ? "#fcf7f0" : "#141021" }}
    >
      <div style={{ padding: "16px 18px 30px" }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".2em", fontWeight: 800,
          textTransform: "uppercase", color: "var(--ink-strong)", marginBottom: 12 }}>
          {isDawn ? "☀ Dawn — light theme" : "🌙 Night — dark theme"}
        </div>

        {/* palette strip */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
          {PALETTE_KEYS.map((k) => {
            const overridden = isDawn && Boolean(dawnOverrides[k]);
            const title = isDawn
              ? `${k} · ${SLOT_LABELS[k]} · ${hexes[k]} — click to eyedrop a dawn override${overridden ? " · right-click clears the override" : ""}`
              : `${k} · ${SLOT_LABELS[k]} · ${hexes[k]} — click to eyedrop the night base`;
            return (
              <div key={k} style={{ textAlign: "center" }}>
                <button
                  onClick={() => onSwatch(k)}
                  onContextMenu={(e) => { if (overridden) { e.preventDefault(); onClearDawn(k); } }}
                  title={title}
                  aria-label={title}
                  style={{ position: "relative", width: 44, height: 36, borderRadius: 9,
                    cursor: "pointer", padding: 0, background: hexes[k],
                    border: overridden ? "2px solid #B4862B" : "1px solid var(--edge)",
                    boxShadow: overridden ? "0 0 0 2px rgba(180,134,43,.35)" : "none" }}
                >
                  {overridden && (
                    /* the non-colour cue: a dot chip — survives grayscale */
                    <span aria-hidden style={{ position: "absolute", top: -6, right: -6,
                      width: 13, height: 13, borderRadius: "50%", background: "#B4862B",
                      border: "2px solid var(--ground)", display: "block" }} />
                  )}
                </button>
                <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700,
                  color: "var(--ink-strong)", marginTop: 5 }}>
                  {SLOT_LABELS[k]}{overridden ? " •" : ""}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: "var(--ink-body)" }}>
                  {hexes[k]}
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-body)", fontFamily: SANS }}>
          {isDawn
            ? "click a swatch to eyedrop a dawn override · right-click an overridden swatch (gold ring + dot) to clear it"
            : "click a swatch to eyedrop the night base"}
        </p>

        {/* the specimen — real registry blocks through the real renderer */}
        <div style={{ marginTop: 10 }}>
          <Render config={config} data={BOARD_SAMPLE} />
        </div>

        <GradientLab hexes={hexes} shuffleN={shuffleN} onShuffle={onShuffle} />
      </div>
    </section>
  );
}

/* ── the board ────────────────────────────────────────────────────────── */
export default function BrandBoard() {
  const { pal, dawn, dirty, busy, roll, clearDawn, eyedrop, save, reset } = useBrandPalette();
  const [shuffleN, setShuffleN] = useState(0);

  function backToStudio() {
    let slug = "";
    try { slug = sessionStorage.getItem("oc-last-slug") ?? ""; } catch { /* private mode */ }
    window.location.assign(slug && slug !== "home" ? `/studio/${slug}` : "/studio");
  }

  const overrides = pal
    ? {
        base: pal,
        varianted: Object.fromEntries(
          Object.entries(dawn).filter(([, v]) => v).map(([k, v]) => [k, { dawn: v as string }]),
        ),
      }
    : undefined;
  const nightHexes = pal ? effectivePalette(ONECOCREATION, [], overrides) : null;
  const dawnHexes = pal ? effectivePalette(ONECOCREATION, ["dawn"], overrides) : null;

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#141021", fontFamily: SANS }}>
      {/* control rail */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center",
        gap: 10, flexWrap: "wrap", padding: "10px 14px", background: "#12101f",
        borderBottom: "1px solid rgba(139,118,196,.3)" }}>
        <span style={{ fontFamily: MONO, fontWeight: 800, letterSpacing: ".22em",
          color: "#F4ECFF", fontSize: 13, whiteSpace: "nowrap" }}>
          ■ <i style={{ fontStyle: "normal", color: "#EBCB77" }}>BRAND BOARD</i>
        </span>
        <button onClick={roll} title="roll a new palette (clears dawn overrides)"
          style={{ ...pill, background: "#1b1530", color: "#EBCB77", border: "1px solid #D9B24E" }}>
          🎲 roll
        </button>
        <button onClick={() => save()} disabled={!dirty || busy}
          title={dirty ? "save this palette to the brand — every slot-coloured block follows" : "no unsaved palette changes"}
          style={{ ...pill,
            background: dirty ? "linear-gradient(135deg,#EBCB77,#D9B24E)" : "rgba(139,118,196,.15)",
            color: dirty ? "#3a2a06" : "#9a8fae", cursor: dirty && !busy ? "pointer" : "default" }}>
          {busy ? "Saving…" : dirty ? "Save to brand" : "Saved"}
        </button>
        <button onClick={() => reset()} disabled={busy}
          title="back to the cartridge default (both themes)"
          style={{ ...pill, background: "none", color: "#D9D2E4", textDecoration: "underline", padding: "6px 6px" }}>
          reset
        </button>
        <span style={{ flex: 1 }} />
        <button onClick={backToStudio} title="back to the page you were editing"
          style={{ ...pill, background: "rgba(139,118,196,.22)", color: "#F4ECFF" }}>
          ← back to studio
        </button>
      </div>

      {/* the two skins, side by side (stacking on narrow chrome) */}
      {pal && nightHexes && dawnHexes ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: 16, alignItems: "flex-start" }}>
          <ThemePane
            variant="night"
            hexes={nightHexes}
            dawnOverrides={dawn}
            onSwatch={(k) => eyedrop(k, "night")}
            onClearDawn={clearDawn}
            shuffleN={shuffleN}
            onShuffle={() => setShuffleN((n) => n + 1)}
          />
          <ThemePane
            variant="dawn"
            hexes={dawnHexes}
            dawnOverrides={dawn}
            onSwatch={(k) => eyedrop(k, "dawn")}
            onClearDawn={clearDawn}
            shuffleN={shuffleN}
            onShuffle={() => setShuffleN((n) => n + 1)}
          />
        </div>
      ) : (
        <p style={{ padding: 24, color: "#D9D2E4", fontSize: 14 }}>loading palette…</p>
      )}
    </div>
  );
}
