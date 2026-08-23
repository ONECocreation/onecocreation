"use client";

import { useEffect, useState } from "react";
import { Render } from "@puckeditor/core";
import { config } from "@/lib/puck-config";
import { BOARD_SAMPLE } from "@/lib/board-sample";
import {
  useBrandPalette,
  PALETTE_KEYS,
  SLOT_LABELS,
  type PaletteKey,
} from "@/lib/use-brand-palette";
import type { IdentityField, VoiceRow } from "@/lib/cartridge-identity"; /* type-only — the module itself is server-side (fs) and never enters this bundle */
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
 * tweak lands in both panes instantly. Below the panes sits THE DRESSING
 * ROOM (S8, cartridge hardening; finished S9): the cartridge's non-CSS
 * identity — logos, hero art, the time door, the copy tokens, the sign-in
 * ceremony, the meta trio, portraits, tier art, the thank-you, the voices
 * of the field and the nav accent — and, since S10, the SELECTION itself:
 * which cartridge the whole site wears by default. All of it read and
 * written through /api/brand's identity branch, one cartridge literal (or
 * one pinned voice row) at a time. LEGIBILITY DOCTRINE throughout:
 * labels sit on solid/text-safe grounds, override state is gold ring PLUS
 * a dot (never colour alone), all icon controls carry title + aria-label.
 */

const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "var(--font-mono)";

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
  const dark = "#141021", light = "#ffffff"; /* S2: contrast-math anchors (contrastRatio parses hex), not styles — kept, reported */
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
    background: "rgba(12,10,22,.85)", color: "#F4ECFF", /* S2: pinned — needs a ruling (chip stays dark over both panes' gradients) */
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
        border: "1px solid var(--oc-structural-edge, rgba(139,118,196,.35))", overflow: "hidden",
        /* the pv class sets background: var(--ground) — a solid hex; this
           is belt-and-braces so the pane NEVER shows a see-through ground */
        backgroundColor: isDawn ? "#fcf7f0" : "#141021" /* S2: pinned — needs a ruling */ }}
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
                    border: overridden ? "2px solid #B4862B" /* S2: gold law — decorative, reported */ : "1px solid var(--edge)",
                    boxShadow: overridden ? "0 0 0 2px rgba(180,134,43,.35)" : "none" }}
                >
                  {overridden && (
                    /* the non-colour cue: a dot chip — survives grayscale */
                    <span aria-hidden style={{ position: "absolute", top: -6, right: -6,
                      width: 13, height: 13, borderRadius: "50%", background: "#B4862B", /* S2: gold law — decorative, reported */
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

/* ── the dressing room (cartridge identity) ───────────────────────────── */
type DressingRow = { field: IdentityField; label: string; hint?: string };
const IDENTITY_GROUPS: { title: string; blurb: string; rows: DressingRow[] }[] = [
  { title: "Logos", blurb: "the marks at the head of the house",
    rows: [
      { field: "logo.lockup", label: "lockup" },
      { field: "logo.mark", label: "mark" },
      { field: "logo.consciouscuts", label: "ConsciousCuts" },
    ]},
  { title: "Hero art", blurb: "the sky the pages open under",
    rows: [
      { field: "hero.moon", label: "moon" },
      { field: "hero.nebula", label: "nebula" },
      { field: "hero.meteors", label: "meteors" },
      { field: "hero.heavenEarth", label: "heaven & earth" },
      { field: "hero.loveSidelook", label: "love sidelook" },
      { field: "hero.lionsGate", label: "lions gate" },
    ]},
  { title: "Doors", blurb: "where the house reaches out",
    rows: [
      { field: "doors.timeTipUrl", label: "time door",
        hint: "an https:// address — or left empty, to sail on its own seam" },
    ]},
  { title: "Voice", blurb: "the short words the site speaks",
    rows: [
      { field: "copy.productName", label: "name" },
      { field: "copy.tagline", label: "tagline" },
      { field: "copy.memberNoun", label: "one member is called" },
    ]},
  { title: "Sign-in", blurb: "the words the login ceremony speaks",
    rows: [
      { field: "signIn.copy.returningTitle", label: "welcome back" },
      { field: "signIn.copy.returningBlurb", label: "welcome blurb" },
      { field: "signIn.copy.signInCta", label: "sign-in button" },
      { field: "signIn.copy.signingCta", label: "signing button" },
      { field: "signIn.copy.doorsHeading", label: "doors heading" },
      { field: "signIn.copy.doorsFootnote", label: "doors footnote" },
    ]},
  { title: "Meta", blurb: "how the wide web is told the house's name",
    rows: [
      { field: "meta.title", label: "tab title" },
      { field: "meta.description", label: "search snippet",
        hint: "a snippet runs long — up to 240 characters" },
      { field: "meta.themeColor", label: "browser chrome",
        hint: "the tint the browser chrome wears — exactly #rrggbb" },
    ]},
  { title: "Portraits", blurb: "Love, and the ConsciousCuts chair",
    rows: [
      { field: "portraits.headshot", label: "headshot" },
      { field: "portraits.cuts.women", label: "cut — women" },
      { field: "portraits.cuts.wax", label: "cut — wax" },
      { field: "portraits.cuts.men", label: "cut — men" },
    ]},
  { title: "Tier art", blurb: "the membership ladder's pictures",
    rows: [
      { field: "tierArt.A", label: "tier A" },
      { field: "tierArt.B", label: "tier B" },
      { field: "tierArt.C", label: "tier C" },
    ]},
  { title: "Thank-you", blurb: "the moment after a paid order",
    rows: [
      { field: "thanks.video", label: "video loop" },
      { field: "thanks.poster", label: "poster" },
      { field: "thanks.heading", label: "heading" },
      { field: "thanks.message", label: "message" },
    ]},
];

type Dressing = Partial<Record<IdentityField, string>>;
type DressingMsg = { field: IdentityField; ok: boolean; text: string };
type VoiceMsg = { key: string; ok: boolean; text: string };
const EMPTY_VOICE: VoiceRow = { quote: "", name: "", who: "", href: "" };

const fieldInput: React.CSSProperties = {
  flex: "1 1 240px", minWidth: 0, background: "var(--oc-input-well, #0e0c1a)", /* S2: pinned — the ruling landed (S22, the A4 offset move): the recessed well keeps its night depth below the ground; the dawn citizen at exactly that depth is the mat */
  color: "var(--ink-strong)", /* S2: pinned — the ruling landed (S22): the literal WAS night --ink-strong, so the pin rides the token */
  border: "1px solid var(--oc-control-edge, rgba(139,118,196,.4))", borderRadius: 8,
  padding: "7px 10px", fontFamily: MONO, fontSize: 12.5, outline: "none",
};

function IdentityRoom() {
  const [values, setValues] = useState<Dressing | null>(null);
  const [draft, setDraft] = useState<Dressing>({});
  const [loadNote, setLoadNote] = useState<string | null>(null);
  const [busyField, setBusyField] = useState<IdentityField | null>(null);
  const [msg, setMsg] = useState<DressingMsg | null>(null);
  /* the registry's shelf — id, name and a four-token palette hint per
     direction — so the picker can show the choice it offers */
  const [choices, setChoices] = useState<{ id: string; name: string; swatches: string[] }[]>([]);
  /* voices of the field — the one list in the cartridge; drafts mirror the
     saved rows one input set per row, plus one empty set for the add */
  const [voices, setVoices] = useState<VoiceRow[] | null>(null);
  const [voiceDraft, setVoiceDraft] = useState<VoiceRow[]>([]);
  const [newVoice, setNewVoice] = useState<VoiceRow>(EMPTY_VOICE);
  const [busyVoice, setBusyVoice] = useState<string | null>(null);
  const [voiceMsg, setVoiceMsg] = useState<VoiceMsg | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/brand")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.ok && d.identity) {
          setValues(d.identity);
          setDraft(d.identity);
          setChoices(Array.isArray(d.cartridges) ? d.cartridges : []);
          const vs: VoiceRow[] = Array.isArray(d.voices) ? d.voices : [];
          setVoices(vs);
          setVoiceDraft(vs.map((v) => ({ ...v })));
        } else {
          setLoadNote("the dressing room opens with the operator key — sign in and it will be here");
        }
      })
      .catch(() => { if (!cancelled) setLoadNote("the dressing room could not be reached just now — a breath, then reload"); });
    return () => { cancelled = true; };
  }, []);

  async function saveField(field: IdentityField, value: string) {
    setBusyField(field);
    setMsg(null);
    try {
      const res = await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: { field, value } }),
      });
      const d = await res.json();
      if (d.ok) {
        setValues((v) => ({ ...(v ?? {}), [field]: value }));
        /* the reload/redeploy note rides every save — shown verbatim */
        setMsg({ field, ok: true, text: d.note ?? "saved into the cartridge" });
      } else {
        /* the API's honest reason, verbatim */
        setMsg({ field, ok: false, text: d.reason ?? "the save did not land" });
      }
    } catch {
      setMsg({ field, ok: false, text: "the save could not reach the server" });
    } finally {
      setBusyField(null);
    }
  }

  async function saveVoice(op: "add" | "edit" | "remove", index: number, row?: VoiceRow) {
    const key = op === "add" ? "voice-add" : `voice-${index}`;
    setBusyVoice(key);
    setVoiceMsg(null);
    try {
      const res = await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice: { op, index, row } }),
      });
      const d = await res.json();
      if (d.ok) {
        /* the saved shelf mirrors the write the rail landed */
        const next = op === "add" ? [...(voices ?? []), row!]
          : op === "edit" ? (voices ?? []).map((v, i) => (i === index ? row! : v))
          : (voices ?? []).filter((_, i) => i !== index);
        setVoices(next);
        setVoiceDraft(next.map((v) => ({ ...v })));
        if (op === "add") setNewVoice(EMPTY_VOICE);
        /* the reload/redeploy note rides every save — shown verbatim */
        setVoiceMsg({ key, ok: true, text: d.note ?? "saved into the cartridge" });
      } else {
        /* the API's honest reason, verbatim */
        setVoiceMsg({ key, ok: false, text: d.reason ?? "the save did not land" });
      }
    } catch {
      setVoiceMsg({ key, ok: false, text: "the save could not reach the server" });
    } finally {
      setBusyVoice(null);
    }
  }

  function msgChip(m: { ok: boolean; text: string }) {
    return (
      <p role="status" style={{ margin: "6px 0 0", display: "inline-block",
        padding: "5px 11px", borderRadius: 8, fontSize: 12.5, lineHeight: 1.5, fontFamily: SANS,
        background: m.ok ? "var(--oc-ok-pill-bg, #16281c)" : "var(--oc-err-pill-bg, #331820)", /* S2: pinned — the ruling landed (S22 F3/F1): the washes thin at dawn so the status inks keep their margin */
        color: m.ok ? "var(--oc-ok-text, #BFE6C9)" : "var(--oc-err-text, #F2C4CE)" /* S2: pinned — the ruling landed (S22 F3/F1): the inks ride the cartridge's dawn status pair */ }}>
        {m.text}
      </p>
    );
  }

  function row(r: DressingRow) {
    const current = values?.[r.field] ?? "";
    const next = draft[r.field] ?? "";
    const dirtyRow = next !== current;
    const busy = busyField === r.field;
    return (
      <div key={r.field} style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, width: 148, flexShrink: 0,
            color: "var(--ink-strong)" /* S2: pinned — the ruling landed (S22): the literal WAS night --ink-strong */ }}>
            {r.label}
          </span>
          <input
            value={next}
            onChange={(e) => setDraft((d) => ({ ...d, [r.field]: e.target.value }))}
            aria-label={`${r.label} — currently ${current || "empty"}`}
            spellCheck={false}
            style={fieldInput}
          />
          <button
            onClick={() => saveField(r.field, next)}
            disabled={!dirtyRow || busyField !== null}
            title={dirtyRow ? `save this ${r.label} into the cartridge` : "no unsaved change"}
            aria-label={dirtyRow ? `save ${r.label}` : `${r.label} saved`}
            style={{ ...pill, padding: "6px 14px", fontSize: 12.5,
              background: dirtyRow ? "linear-gradient(135deg,#EBCB77,#D9B24E)" /* S2: gold law — decorative, reported */ : "rgba(139,118,196,.15)",
              color: dirtyRow ? "#3a2a06" /* S2: gold law — decorative, reported */ : "var(--muted)", /* S2: pinned — the ruling landed (S22): the literal WAS night --muted */
              cursor: dirtyRow && !busyField ? "pointer" : "default" }}>
            {busy ? "Saving…" : dirtyRow ? "Save" : "Saved"}
          </button>
        </div>
        {r.hint && (
          <p style={{ margin: "4px 0 0 158px", fontSize: 12, fontFamily: SANS,
            color: "var(--muted)" /* S2: pinned — the ruling landed (S22): the literal WAS night --muted */ }}>
            {r.hint}
          </p>
        )}
        {msg && msg.field === r.field && <div style={{ marginLeft: 158 }}>{msgChip(msg)}</div>}
      </div>
    );
  }

  /* S11 lane 2 — see it before you wear it. The other gesture: not a save,
     a LOOK. Sets the flag the site-wide strip (components/CartridgePreview)
     reads, then opens the real site in a new tab. sessionStorage, on
     purpose: the preview dies with the tab, belongs to this browser alone,
     and never travels to a visitor. */
  function previewCartridge(id: string) {
    try { sessionStorage.setItem("oc-cartridge-preview", id); } catch { /* private mode — the new tab simply shows no preview */ }
    window.open("/", "_blank", "noopener");
  }

  /* the selection itself — same choice-pill idiom as the nav accent:
     clicking a cartridge IS the save, the current one wears gold ring +
     dot (never colour alone), and the STALE_NOTE rides back verbatim */
  function cartridgePicker() {
    const current = values?.["cartridge.id"] ?? "";
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, width: 148, flexShrink: 0,
            color: "var(--ink-strong)" /* S2: pinned — the ruling landed (S22): the literal WAS night --ink-strong */ }}>
            cartridge
          </span>
          {choices.map((c) => {
            const active = current === c.id;
            const busy = busyField === "cartridge.id";
            return (
              <button
                key={c.id}
                onClick={() => { if (!active) { setDraft((d) => ({ ...d, "cartridge.id": c.id })); saveField("cartridge.id", c.id); } }}
                disabled={busyField !== null}
                title={active ? `${c.name} — the cartridge the site wears` : `dress the whole site in ${c.name}`}
                aria-label={`cartridge ${c.name}${active ? " (current)" : ""}`}
                style={{ ...pill, display: "inline-flex", alignItems: "center", gap: 7,
                  background: active ? "rgba(139,118,196,.25)" : "rgba(139,118,196,.1)",
                  color: "var(--ink-strong)", /* S2: pinned — the ruling landed (S22): the literal WAS night --ink-strong */
                  /* active = gold ring PLUS a dot — never colour alone (doctrine) */
                  border: active ? "2px solid #B4862B" /* S2: gold law — decorative, reported */ : "1px solid var(--oc-control-edge, rgba(139,118,196,.4))" /* S22 D10 */,
                  cursor: busyField ? "default" : "pointer" }}>
                {/* a hint of the direction's contract palette — swatches, not a live preview */}
                {c.swatches.map((s, i) => (
                  <span key={i} aria-hidden style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                    background: s, border: "1px solid rgba(255,255,255,.3)", display: "inline-block" }} />
                ))}
                {busy && !active ? `${c.name} …` : c.name}{active ? " •" : ""}
              </button>
            );
          })}
        </div>
        <p style={{ margin: "8px 0 0 158px", fontSize: 12.5, lineHeight: 1.5, fontFamily: SANS,
          color: "var(--muted)" /* S2: pinned — the ruling landed (S22): the literal WAS night --muted */ }}>
          {"this chooses the site's DEFAULT cartridge for EVERYONE — a deployment choice written into the cartridge file, live only after a reload or a fresh deploy. It is not a per-visitor preview, and it is not the visitor's own night/dawn toggle (data-oc-theme); the dots are a hint of each direction's palette, nothing more."}
        </p>
        {/* the PREVIEW row (S11 lane 2) — deliberately NOT pills: bare
            underlined text buttons with an eye, so the hand never confuses
            LOOKING with CHOOSING. Clicking one saves nothing — it sets a
            flag in this browser's session storage and opens the real site
            in a new tab wearing that cartridge's skin. */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, width: 148, flexShrink: 0,
            color: "var(--ink-strong)" /* S2: pinned — the ruling landed (S22): the literal WAS night --ink-strong */ }}>
            preview
          </span>
          {choices.map((c) => (
            <button
              key={c.id}
              onClick={() => previewCartridge(c.id)}
              title={`see the real site wearing ${c.name} (${c.id}) — a new tab, this browser only, the default unmoved`}
              aria-label={`preview the site under the ${c.id} cartridge`}
              style={{ ...pill, background: "none", border: "none", borderRadius: 0, padding: "4px 2px",
                color: "var(--info)", /* RULED (Fable, 0018.06.01, S22 J-1): the preview link joins the semantic info family — #9d86d9 night / #5f4b96 dawn (6.67:1) */
                textDecoration: "underline", textUnderlineOffset: 3,
                borderBottom: "1px dashed color-mix(in srgb, var(--info) 50%, transparent)" }}>
              {/* the id rides the name — LOVE and EARTHSIDE share the brand
                  name "One Cocreation", and a preview button may never leave
                  the operator guessing WHICH dressing it opens */}
              👁 {c.name} <span style={{ opacity: .7, fontWeight: 400 }}>({c.id})</span>
            </button>
          ))}
        </div>
        <p style={{ margin: "8px 0 0 158px", fontSize: 12.5, lineHeight: 1.5, fontFamily: SANS,
          color: "var(--muted)" /* S2: pinned — the ruling landed (S22): the literal WAS night --muted */ }}>
          {"preview is the operator's LOOK, not a save: the flag lives in THIS browser's session storage, set from this gated room alone — it is not a per-visitor theme switcher, it changes nothing for anyone else, and the default above does not move. What pours is the cartridge's SKIN (tokens, faces, bands, the hero's treatment); the dressing — logos, hero art, the words — is read from the saved cartridge and stays. While the flag lives, a strip at the foot of every page says PREVIEW and names the cartridge; its exit clears the flag and reloads. The visitor's night/dawn toggle still works inside a preview — the two compose, and neither lies about the other."}
        </p>
        {msg && msg.field === "cartridge.id" && <div style={{ marginLeft: 158 }}>{msgChip(msg)}</div>}
      </div>
    );
  }

  function navAccent() {
    const current = values?.["nav.accent"] ?? "gold";
    const choices: { v: "gold" | "dawn"; label: string }[] = [
      { v: "gold", label: "gold" },
      { v: "dawn", label: "dawn" },
    ];
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, width: 148, flexShrink: 0,
            color: "var(--ink-strong)" /* S2: pinned — the ruling landed (S22): the literal WAS night --ink-strong */ }}>
            nav accent
          </span>
          {choices.map(({ v, label }) => {
            const active = current === v;
            const busy = busyField === "nav.accent";
            return (
              <button
                key={v}
                onClick={() => { if (!active) { setDraft((d) => ({ ...d, "nav.accent": v })); saveField("nav.accent", v); } }}
                disabled={busyField !== null}
                title={active ? `${label} — the current nav accent` : `dress the nav in ${label}`}
                aria-label={`nav accent ${label}${active ? " (current)" : ""}`}
                style={{ ...pill,
                  background: active ? "rgba(139,118,196,.25)" : "rgba(139,118,196,.1)",
                  color: "var(--ink-strong)", /* S2: pinned — the ruling landed (S22): the literal WAS night --ink-strong */
                  /* active = gold ring PLUS a dot — never colour alone (doctrine) */
                  border: active ? "2px solid #B4862B" /* S2: gold law — decorative, reported */ : "1px solid var(--oc-control-edge, rgba(139,118,196,.4))" /* S22 D10 */,
                  cursor: busyField ? "default" : "pointer" }}>
                {busy && !active ? `${label} …` : label}{active ? " •" : ""}
              </button>
            );
          })}
        </div>
        <p style={{ margin: "8px 0 0 158px", fontSize: 12.5, lineHeight: 1.5, fontFamily: SANS,
          color: "var(--muted)" /* S2: pinned — the ruling landed (S22): the literal WAS night --muted */ }}>
          {"“gold” is Love's original nav — “dawn” is the kit's rose→lavender retint, and gold then lives on money and the coin mark alone."}
        </p>
        {msg && msg.field === "nav.accent" && <div style={{ marginLeft: 158 }}>{msgChip(msg)}</div>}
      </div>
    );
  }

  /* one voice row's four inputs — quote wide, name / handle / link narrow */
  function voiceInputs(r: VoiceRow, onChange: (next: VoiceRow) => void, keyPrefix: string) {
    const slots: { k: keyof VoiceRow; label: string; grow: string }[] = [
      { k: "quote", label: "quote", grow: "1 1 100%" },
      { k: "name", label: "name", grow: "1 1 140px" },
      { k: "who", label: "handle", grow: "1 1 160px" },
      { k: "href", label: "link", grow: "2 1 260px" },
    ];
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, flex: "1 1 100%" }}>
        {slots.map(({ k, label, grow }) => (
          <input
            key={k}
            value={r[k]}
            onChange={(e) => onChange({ ...r, [k]: e.target.value })}
            aria-label={`${keyPrefix} — ${label}`}
            placeholder={label}
            spellCheck={false}
            style={{ ...fieldInput, flex: grow }}
          />
        ))}
      </div>
    );
  }

  function voicesRoom() {
    if (voices === null) return null;
    const removeBtn: React.CSSProperties = { ...pill, padding: "6px 14px", fontSize: 12.5,
      background: "none", color: "var(--oc-err-text, #F2C4CE)", /* S2: pinned — the ruling landed (S22 F1): the ink rides the cartridge's dawn err */
      textDecoration: "underline" };
    return (
      <div style={{ marginTop: 20 }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".18em",
          textTransform: "uppercase", fontWeight: 700, marginBottom: 2,
          color: "var(--oc-gold-text, #EBCB77)" /* S2: gold law — the ruling landed (S22 B3): night literal is the fallback, dawn drinks the cartridge's gold ink */ }}>
          Voices of the field
        </div>
        <p style={{ margin: "0 0 12px", fontSize: 12, fontFamily: SANS,
          color: "var(--muted)" /* S2: pinned — the ruling landed (S22): the literal WAS night --muted */ }}>
          {"real words from the field, each linked to the video it lives under — curate freely, keep them honest (the shelf holds a dozen)"}
        </p>
        {voices.length === 0 && (
          <p style={{ margin: "0 0 12px", fontSize: 13, fontFamily: SANS,
            color: "var(--ink-body)" /* S2: pinned — the ruling landed (S22): the literal WAS night --ink-body */ }}>
            the shelf stands empty — a voice is real words or nothing
          </p>
        )}
        {voices.map((saved, i) => {
          const d = voiceDraft[i] ?? saved;
          const dirtyRow = d.quote !== saved.quote || d.name !== saved.name || d.who !== saved.who || d.href !== saved.href;
          const key = `voice-${i}`;
          const busy = busyVoice === key;
          return (
            <div key={i} style={{ marginBottom: 14, paddingBottom: 12,
              borderBottom: "1px solid rgba(139,118,196,.18)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {voiceInputs(d, (next) => setVoiceDraft((all) => all.map((v, j) => (j === i ? next : v))), `voice ${i + 1}`)}
                <button
                  onClick={() => saveVoice("edit", i, d)}
                  disabled={!dirtyRow || busyVoice !== null}
                  title={dirtyRow ? "save this voice into the cartridge" : "no unsaved change"}
                  aria-label={dirtyRow ? `save voice ${i + 1}` : `voice ${i + 1} saved`}
                  style={{ ...pill, padding: "6px 14px", fontSize: 12.5,
                    background: dirtyRow ? "linear-gradient(135deg,#EBCB77,#D9B24E)" /* S2: gold law — decorative, reported */ : "rgba(139,118,196,.15)",
                    color: dirtyRow ? "#3a2a06" /* S2: gold law — decorative, reported */ : "var(--muted)", /* S2: pinned — the ruling landed (S22): the literal WAS night --muted */
                    cursor: dirtyRow && !busyVoice ? "pointer" : "default" }}>
                  {busy ? "Saving…" : dirtyRow ? "Save" : "Saved"}
                </button>
                <button
                  onClick={() => saveVoice("remove", i)}
                  disabled={busyVoice !== null}
                  title="take this voice off the shelf"
                  aria-label={`remove voice ${i + 1}`}
                  style={removeBtn}>
                  remove
                </button>
              </div>
              {voiceMsg && voiceMsg.key === key && <div>{msgChip(voiceMsg)}</div>}
            </div>
          );
        })}
        {/* the add form — one empty row at the foot of the shelf */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {voiceInputs(newVoice, setNewVoice, "a new voice")}
          <button
            onClick={() => saveVoice("add", -1, newVoice)}
            disabled={busyVoice !== null || !newVoice.quote || !newVoice.name || !newVoice.who || !newVoice.href}
            title="set this voice on the shelf"
            aria-label="add this voice"
            style={{ ...pill, padding: "6px 14px", fontSize: 12.5,
              background: "rgba(139,118,196,.22)", color: "var(--ink-strong)", /* S2: pinned — the ruling landed (S22): the literal WAS night --ink-strong */
              cursor: busyVoice ? "default" : "pointer" }}>
            {busyVoice === "voice-add" ? "Saving…" : "+ add this voice"}
          </button>
        </div>
        {voiceMsg && voiceMsg.key === "voice-add" && <div>{msgChip(voiceMsg)}</div>}
      </div>
    );
  }

  return (
    <section
      aria-label="the dressing room — the cartridge selection, logos, hero art, doors, voice, sign-in, meta, portraits, tier art, thank-you and voices"
      style={{ margin: "0 16px 24px", padding: "18px 20px 22px", borderRadius: 16,
        border: "1px solid var(--oc-structural-edge, rgba(139,118,196,.35))",
        background: "var(--puck-color-surface)" /* S2: pinned — the ruling landed (S22 A1): the literal WAS night --puck-color-surface — a solid ground under every word (doctrine) */ }}
    >
      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".2em", fontWeight: 800,
        textTransform: "uppercase", color: "var(--ink-strong)" /* S2: pinned — the ruling landed (S22): the literal WAS night --ink-strong */, marginBottom: 6 }}>
        ✦ The dressing room
      </div>
      <p style={{ margin: "0 0 18px", fontSize: 13, lineHeight: 1.55, fontFamily: SANS,
        color: "var(--ink-body)" /* S2: pinned — the ruling landed (S22): the literal WAS night --ink-body */ }}>
        {"the cartridge's non-CSS dressing — which cartridge the site wears, then its logos, hero art, the time door, the words the site speaks, the sign-in ceremony, the meta trio, portraits, tier art, the thank-you and the voices of the field. A save writes the cartridge file itself; the running server catches up on its next reload (dev does it alone) or a fresh deploy."}
      </p>

      {values === null && !loadNote && (
        <p style={{ margin: 0, fontSize: 13, fontFamily: SANS,
          color: "var(--ink-body)" /* S2: pinned — the ruling landed (S22): the literal WAS night --ink-body */ }}>
          opening the dressing room…
        </p>
      )}
      {loadNote && (
        <p role="status" style={{ margin: 0, display: "inline-block", padding: "5px 11px",
          borderRadius: 8, fontSize: 12.5, fontFamily: SANS,
          background: "var(--oc-err-pill-bg, #331820)", color: "var(--oc-err-text, #F2C4CE)" /* S2: pinned — the ruling landed (S22 F1): the wash thins at dawn, the ink rides the cartridge's dawn err */ }}>
          {loadNote}
        </p>
      )}

      {values && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 40px", alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 100%" }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".18em",
              textTransform: "uppercase", fontWeight: 700, marginBottom: 2,
              color: "var(--oc-gold-text, #EBCB77)" /* S2: gold law — the ruling landed (S22 B3): night literal is the fallback, dawn drinks the cartridge's gold ink */ }}>
              Cartridge
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 12, fontFamily: SANS,
              color: "var(--muted)" /* S2: pinned — the ruling landed (S22): the literal WAS night --muted */ }}>
              which dressing the whole site wears — the one line a fork flips
            </p>
            {cartridgePicker()}
          </div>
          {IDENTITY_GROUPS.map((g) => (
            <div key={g.title} style={{ flex: "1 1 420px", minWidth: 0 }}>
              <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".18em",
                textTransform: "uppercase", fontWeight: 700, marginBottom: 2,
                color: "var(--oc-gold-text, #EBCB77)" /* S2: gold law — the ruling landed (S22 B3): night literal is the fallback, dawn drinks the cartridge's gold ink */ }}>
                {g.title}
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontFamily: SANS,
                color: "var(--muted)" /* S2: pinned — the ruling landed (S22): the literal WAS night --muted */ }}>
                {g.blurb}
              </p>
              {g.rows.map(row)}
            </div>
          ))}
          <div style={{ flex: "1 1 420px", minWidth: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".18em",
              textTransform: "uppercase", fontWeight: 700, marginBottom: 2,
              color: "var(--oc-gold-text, #EBCB77)" /* S2: gold law — the ruling landed (S22 B3): night literal is the fallback, dawn drinks the cartridge's gold ink */ }}>
              Nav accent
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 12, fontFamily: SANS,
              color: "var(--muted)" /* S2: pinned — the ruling landed (S22): the literal WAS night --muted */ }}>
              the colour the nav links wear
            </p>
            {navAccent()}
          </div>
          <div style={{ flex: "1 1 100%" }}>
            {voicesRoom()}
          </div>
        </div>
      )}
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
    <div className="oc-studio" /* S22: the board scopes into the studio so the dawn override block reaches it — it spends no --puck-color-* tokens, so the night redeclarations are inert on it (the only night-visible side effect: the house scrollbar styles, puck-theme.css, now dress this scroll area too) */
      style={{ height: "100%", overflowY: "auto", background: "var(--ground)" /* S2: pinned — the ruling landed (S22 A6): the literal WAS night --ground, so the pin rides the token */, fontFamily: SANS }}>
      {/* control rail */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center",
        gap: 10, flexWrap: "wrap", padding: "10px 14px", background: "var(--puck-color-surface)", /* S2: pinned — the ruling landed (S22 A1): the literal WAS night --puck-color-surface, so the pin rides the token */
        borderBottom: "1px solid var(--oc-field-edge, rgba(139,118,196,.3))" /* S22 D7 */ }}>
        <span style={{ fontFamily: MONO, fontWeight: 800, letterSpacing: ".22em",
          color: "var(--ink-strong)" /* S2: pinned — the ruling landed (S22): the literal WAS night --ink-strong */, fontSize: 13, whiteSpace: "nowrap" }}>
          ■ <i style={{ fontStyle: "normal", color: "var(--oc-gold-text, #EBCB77)" /* S2: gold law — the ruling landed (S22 B3): night literal is the fallback, dawn drinks the cartridge's gold ink */ }}>BRAND BOARD</i>
        </span>
        <button onClick={roll} title="roll a new palette (clears dawn overrides)"
          style={{ ...pill, background: "var(--puck-color-surface-subtle)" /* S2: pinned — the ruling landed (S22 A2): the literal WAS night --puck-color-surface-subtle */, color: "var(--oc-gold-text, #EBCB77)" /* S2: gold law — the ruling landed (S22 B3) */, border: "1px solid var(--gold-deep)" /* S2: gold law — the ruling landed (S22 C1): the literal WAS night --gold-deep, so the solid gold edge rides the cartridge's designed dawn gold */ }}>
          🎲 roll
        </button>
        <button onClick={() => save()} disabled={!dirty || busy}
          title={dirty ? "save this palette to the brand — every slot-coloured block follows" : "no unsaved palette changes"}
          style={{ ...pill,
            background: dirty ? "linear-gradient(135deg,#EBCB77,#D9B24E)" /* S2: gold law — decorative, reported */ : "rgba(139,118,196,.15)",
            color: dirty ? "#3a2a06" /* S2: gold law — decorative, reported */ : "var(--muted)" /* S2: pinned — the ruling landed (S22): the literal WAS night --muted */, cursor: dirty && !busy ? "pointer" : "default" }}>
          {busy ? "Saving…" : dirty ? "Save to brand" : "Saved"}
        </button>
        <button onClick={() => reset()} disabled={busy}
          title="back to the cartridge default (both themes)"
          style={{ ...pill, background: "none", color: "var(--ink-body)" /* S2: pinned — the ruling landed (S22): the literal WAS night --ink-body */, textDecoration: "underline", padding: "6px 6px" }}>
          reset
        </button>
        <span style={{ flex: 1 }} />
        <button onClick={backToStudio} title="back to the page you were editing"
          style={{ ...pill, background: "rgba(139,118,196,.22)", color: "var(--ink-strong)" /* S2: pinned — the ruling landed (S22): the literal WAS night --ink-strong */ }}>
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
        <p style={{ padding: 24, color: "var(--ink-body)" /* S2: pinned — the ruling landed (S22): the literal WAS night --ink-body */, fontSize: 14 }}>loading palette…</p>
      )}

      {/* the dressing room — the cartridge's non-CSS identity */}
      <IdentityRoom />
    </div>
  );
}
