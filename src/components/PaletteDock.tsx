"use client";

import { useEffect, useState } from "react";
import { emitTokenVars } from "@pacsarcade/puck-config/tokens";
import { ONECOCREATION } from "@/brand/tokens";

/**
 * PaletteDock — promote-to-token, now theme-aware (step 5, varianted
 * tokens). Roll a 5-slot palette (HSL harmony), eyedrop colours, and with
 * the 🌙/☀ toggle choose WHICH LAYER a swatch click writes: night (the
 * base) or dawn (a sparse override — light theme only). Preview is one
 * injected <style> in <head> built by the same emitTokenVars the server
 * uses, so the canvas iframe and preview overlay follow live. Save posts
 * {palette, dawn}; dice rolls write night and CLEAR dawn (a rolled palette
 * is a fresh start); reset returns both layers to the cartridge.
 */

type Palette = { p1: string; p2: string; p3: string; p4: string; p5: string };
type PaletteDawn = Partial<Palette>;
const KEYS = ["p1", "p2", "p3", "p4", "p5"] as const;
const LABELS: Record<string, string> = {
  p1: "lead", p2: "mid", p3: "soft", p4: "counter", p5: "deep",
};

const hsl2hex = (h: number, s: number, l: number): string => {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
};

const PREVIEW_ID = "oc-palette-preview";

export default function PaletteDock() {
  const [open, setOpen] = useState(false);
  const [pal, setPal] = useState<Palette | null>(null);
  const [dawn, setDawn] = useState<PaletteDawn>({});
  const [saved, setSaved] = useState<{ pal: Palette; dawn: PaletteDawn } | null>(null);
  const [theme, setTheme] = useState<"night" | "dawn">("night");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/brand")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setPal(d.palette);
          setDawn(d.dawn ?? {});
          setSaved({ pal: d.palette, dawn: d.dawn ?? {} });
        }
      })
      .catch(() => {});
  }, []);

  /* live preview: one head <style> from the same emitter the server uses —
     the canvas iframe style-sync and the preview overlay panes follow */
  useEffect(() => {
    if (!pal) return;
    const varianted: Record<string, Record<string, string>> = {};
    for (const [k, v] of Object.entries(dawn)) if (v) varianted[k] = { dawn: v };
    const css = emitTokenVars(ONECOCREATION, {
      overrides: { base: pal, varianted },
      dawnScopes: [".oc-pv-light"],
      nightScopes: [".oc-pv-dark"],
    });
    let el = document.getElementById(PREVIEW_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = PREVIEW_ID;
      document.head.appendChild(el);
    }
    el.textContent = css;
  }, [pal, dawn]);

  function roll() {
    const base = Math.random() * 360, spread = 30 + Math.random() * 40;
    const rnd = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
    setPal({
      p1: hsl2hex(base, rnd(55, 85), rnd(62, 76)),
      p2: hsl2hex(base + spread, rnd(35, 60), rnd(40, 52)),
      p3: hsl2hex(base - spread, rnd(45, 75), rnd(68, 78)),
      p4: hsl2hex(base + 180, rnd(40, 70), rnd(62, 74)),
      p5: hsl2hex(base + spread / 2, rnd(30, 50), rnd(12, 20)),
    });
    setDawn({}); // a rolled palette is a fresh start — dawn overrides cleared
  }

  async function drop(slot: keyof Palette) {
    if (!("EyeDropper" in window) || !pal) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { sRGBHex } = await new (window as any).EyeDropper().open();
      if (theme === "dawn") setDawn({ ...dawn, [slot]: sRGBHex });
      else setPal({ ...pal, [slot]: sRGBHex });
    } catch { /* Esc */ }
  }

  function clearDawn(slot: keyof Palette) {
    const next = { ...dawn };
    delete next[slot];
    setDawn(next);
  }

  async function save(reset = false) {
    setBusy(true);
    try {
      const res = await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reset ? { reset: true } : { palette: pal, dawn }),
      });
      const d = await res.json();
      if (d.ok) {
        setPal(d.palette);
        setDawn(d.dawn ?? {});
        setSaved({ pal: d.palette, dawn: d.dawn ?? {} });
      }
    } finally { setBusy(false); }
  }

  const dirty =
    pal && saved &&
    (KEYS.some((k) => pal[k] !== saved.pal[k]) ||
      KEYS.some((k) => (dawn[k] ?? "") !== (saved.dawn[k] ?? "")));
  const pill: React.CSSProperties = {
    padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700,
    border: "none", cursor: "pointer",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} title="Brand palette — roll, tune, save (night & dawn)"
        style={{ ...pill, background: "rgba(139,118,196,.22)", color: "#F4ECFF" }}>
        🎲 Palette
      </button>
    );
  }

  const editingDawn = theme === "dawn";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1b1530",
      border: "1px solid rgba(139,118,196,.4)", borderRadius: 12, padding: "6px 10px" }}>
      {pal ? (
        <>
          <button
            onClick={() => setTheme(editingDawn ? "night" : "dawn")}
            title={editingDawn
              ? "editing DAWN (light-theme) values — click for night"
              : "editing NIGHT (base) values — click for dawn; see it in light via Preview & publish"}
            style={{ ...pill, padding: "3px 8px",
              background: editingDawn ? "rgba(252,247,240,.92)" : "#12101f",
              color: editingDawn ? "#3a2a06" : "#EBCB77",
              border: "1px solid rgba(139,118,196,.4)" }}
          >
            {editingDawn ? "☀" : "🌙"}
          </button>
          {KEYS.map((k) => {
            const shown = editingDawn ? (dawn[k] ?? pal[k]) : pal[k];
            const hasDawn = editingDawn && !!dawn[k];
            return (
              <button key={k} onClick={() => drop(k)}
                onContextMenu={(e) => { if (editingDawn && dawn[k]) { e.preventDefault(); clearDawn(k); } }}
                title={editingDawn
                  ? `${k} · ${LABELS[k]} dawn — ${dawn[k] ?? `${pal[k]} (same as night)`} · click to eyedrop${dawn[k] ? " · right-click clears the dawn override" : ""}`
                  : `${k} · ${LABELS[k]} — ${pal[k]} · click to eyedrop a new colour`}
                style={{ width: 22, height: 22, borderRadius: 6, cursor: "pointer", padding: 0,
                  background: shown,
                  border: hasDawn ? "2px solid #EBCB77" : "1px solid rgba(255,255,255,.25)" }} />
            );
          })}
          <button onClick={roll} title="roll a new palette (clears dawn overrides)" style={{ ...pill, background: "#12101f", color: "#EBCB77", border: "1px solid #D9B24E", padding: "3px 8px" }}>🎲</button>
          <button onClick={() => save(false)} disabled={!dirty || busy}
            style={{ ...pill, background: dirty ? "linear-gradient(135deg,#EBCB77,#D9B24E)" : "rgba(139,118,196,.15)", color: dirty ? "#3a2a06" : "#9a8fae" }}>
            {busy ? "Saving…" : dirty ? "Save to brand" : "Saved"}
          </button>
          <button onClick={() => save(true)} disabled={busy} title="back to the cartridge default (both themes)"
            style={{ ...pill, background: "none", color: "#9a8fae", textDecoration: "underline", padding: "5px 4px" }}>reset</button>
        </>
      ) : (
        <span style={{ fontSize: 12, color: "#9a8fae" }}>loading palette…</span>
      )}
      <button onClick={() => setOpen(false)} aria-label="close palette"
        style={{ ...pill, background: "none", color: "#9a8fae", padding: "5px 4px" }}>×</button>
    </div>
  );
}
