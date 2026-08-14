"use client";

import { useEffect, useState } from "react";
import { emitTokenVars } from "@pacsarcade/puck-config/tokens";
import { ONECOCREATION } from "@/brand/tokens";

/**
 * useBrandPalette — PaletteDock's state machine as a hook (BRAND BOARD
 * batch, 2026-08-14). The dock's roll/eyedrop/dawn/save/reset logic moved
 * here verbatim so the brand board (src/components/studio/BrandBoard.tsx)
 * owns the UI and this hook owns the machinery:
 *
 *  - same /api/brand {palette, dawn} contract (GET on mount, POST on save,
 *    {reset:true} to return both layers to the cartridge);
 *  - same hsl2hex dice, same "a rolled palette is a fresh start" law
 *    (roll writes night and CLEARS dawn);
 *  - live preview via ONE injected <style id="oc-palette-preview"> in
 *    <head>, built by the same emitTokenVars the server uses, so the
 *    .oc-pv-dark/.oc-pv-light panes and the editor canvas follow live.
 *
 * Fail-soft on GET (e.g. the /board-dev QA route has no operator cookie):
 * fall back to the cartridge defaults so the board always renders; save
 * simply won't land without the cookie (the API stays the authority).
 */

export type Palette = { p1: string; p2: string; p3: string; p4: string; p5: string };
export type PaletteDawn = Partial<Palette>;
export type PaletteLayer = "night" | "dawn";

export const PALETTE_KEYS = ["p1", "p2", "p3", "p4", "p5"] as const;
export type PaletteKey = (typeof PALETTE_KEYS)[number];

export const SLOT_LABELS: Record<PaletteKey, string> = {
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

/** cartridge defaults, client-side (the read twin of brand-palette.ts) */
function cartridgePalette(): Palette {
  const out = {} as Record<string, string>;
  for (const slot of ONECOCREATION.palette) out[slot.key] = slot.value;
  return out as Palette;
}
function cartridgeDawn(): PaletteDawn {
  const out: PaletteDawn = {};
  for (const slot of ONECOCREATION.palette) {
    const d = (slot as { varianted?: Record<string, string> }).varianted?.dawn;
    if (d) out[slot.key as PaletteKey] = d;
  }
  return out;
}

export interface BrandPaletteApi {
  pal: Palette | null;
  dawn: PaletteDawn;
  saved: { pal: Palette; dawn: PaletteDawn } | null;
  dirty: boolean;
  busy: boolean;
  roll: () => void;
  setSlot: (slot: PaletteKey, hex: string, layer: PaletteLayer) => void;
  clearDawn: (slot: PaletteKey) => void;
  eyedrop: (slot: PaletteKey, layer: PaletteLayer) => Promise<void>;
  save: () => Promise<void>;
  reset: () => Promise<void>;
}

export function useBrandPalette(): BrandPaletteApi {
  const [pal, setPal] = useState<Palette | null>(null);
  const [dawn, setDawn] = useState<PaletteDawn>({});
  const [saved, setSaved] = useState<{ pal: Palette; dawn: PaletteDawn } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fallback = () => {
      if (cancelled) return;
      const p = cartridgePalette(), d = cartridgeDawn();
      setPal(p); setDawn(d); setSaved({ pal: p, dawn: d });
    };
    fetch("/api/brand")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.ok) {
          setPal(d.palette);
          setDawn(d.dawn ?? {});
          setSaved({ pal: d.palette, dawn: d.dawn ?? {} });
        } else fallback();
      })
      .catch(fallback);
    return () => { cancelled = true; };
  }, []);

  /* live preview: one head <style> from the same emitter the server uses —
     the canvas iframe style-sync and the .oc-pv-* panes follow */
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

  function setSlot(slot: PaletteKey, hex: string, layer: PaletteLayer) {
    if (!pal) return;
    if (layer === "dawn") setDawn((d) => ({ ...d, [slot]: hex }));
    else setPal({ ...pal, [slot]: hex });
  }

  function clearDawn(slot: PaletteKey) {
    setDawn((d) => {
      const next = { ...d };
      delete next[slot];
      return next;
    });
  }

  async function eyedrop(slot: PaletteKey, layer: PaletteLayer) {
    if (!("EyeDropper" in window) || !pal) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { sRGBHex } = await new (window as any).EyeDropper().open();
      setSlot(slot, sRGBHex, layer);
    } catch { /* Esc */ }
  }

  async function post(body: unknown) {
    setBusy(true);
    try {
      const res = await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (d.ok) {
        setPal(d.palette);
        setDawn(d.dawn ?? {});
        setSaved({ pal: d.palette, dawn: d.dawn ?? {} });
      }
    } finally { setBusy(false); }
  }

  const save = () => post({ palette: pal, dawn });
  const reset = () => post({ reset: true });

  const dirty = Boolean(
    pal && saved &&
    (PALETTE_KEYS.some((k) => pal[k] !== saved.pal[k]) ||
      PALETTE_KEYS.some((k) => (dawn[k] ?? "") !== (saved.dawn[k] ?? ""))),
  );

  return { pal, dawn, saved, dirty, busy, roll, setSlot, clearDawn, eyedrop, save, reset };
}
