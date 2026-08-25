#!/usr/bin/env node
/**
 * check-usability.mjs — the contrast gate (TASK-27/S29 lane 2, 0018.06.01
 * a₿, block 963,756). The S20-era throwaway WCAG scripts productized: the
 * sweep the Admiral asked for — "they should be sweeping for things like
 * this before I see it."
 *
 * WHAT IT MEASURES — text/ground pairs, WCAG 2.x relative-luminance ratios
 * in sRGB, 4.5:1 for body text, 3:1 for large text (≥24px, or ≥18.66px at
 * ≥700 weight — detected from the same declaration block when stated):
 *
 *   A. CONTRACT PAIRS — the kit's token-vs-token obligations (ink on ground,
 *      muted on panel, the band ladder, the money button's ink on gold, the
 *      nav's ink on the header's own dark, …), resolved against EVERY
 *      cartridge twin in BOTH themes. The scope composition mirrors the
 *      browser's cascade for custom properties on <html>:
 *        X night = :root + twin[X]
 *        X dawn  = :root + love's dawn + twin[X] + twin[X][dawn]
 *      so a twin without a dawn section honestly shows what it inherits
 *      (the blank-dawn quirk included) — the sweep measures what renders,
 *      not what the files wish rendered. Since TASK-42/S45 the contract
 *      also carries the AURORA BAND pairs: the three band text roles
 *      (ink-strong / ink-body / muted) over each cartridge's three
 *      --oc-effect-* blob hues, the effects registry's contrast seam.
 *
 *   B. CO-DECLARED PAIRS — every CSS rule and every TSX inline-style object
 *      that declares color AND background(-color) in one block (the publish
 *      button lives in such an object — a pure-CSS scan would be blind to
 *      it). var() refs resolve against the scope set; same-file string
 *      consts (const GOLD = "var(--gold-deep, …)") and ${interpolations}
 *      resolve too. Alpha backgrounds composite over the scope's ground;
 *      gradients measure every stop and take the worst. Studio files (the
 *      editor chrome) additionally layer the .oc-studio token scopes
 *      (puck-theme.css night + ruled dawn twins) over the cartridges the
 *      studio can actually wear: love (production) and blank (the bench).
 *
 * WHY STATIC ANALYSIS (the honest, maintainable choice): the color truth
 * of this house lives in tokens — cartridge.css, cartridges.css, the
 * studio's twin blocks. A browser-driven sweep would need a running server,
 * a headless chromium, theme priming and per-route crawling to reach the
 * same values, and it would still miss states (hover, error, the editor
 * behind the gate). Resolving tokens statically is deterministic, runs in
 * milliseconds with node stdlib only, measures ALL FIVE cartridges in BOTH
 * themes at once, and points at the exact file:line of the failing value.
 * What it honestly does NOT see, said out loud: text over IMAGERY (hero
 * veils, photo bands — a per-pixel browser lane, not this gate), rules
 * where color and ground are declared in different blocks and meet only
 * through the cascade (the contract pairs carry that weight), and non-text
 * UI boundaries (WCAG 1.4.11 — borders/focus rings need a ruled pair list
 * before they can be gated; flagged for Fable).
 *
 * RULED EXCEPTIONS are cited, never re-flagged: scripts/usability-exceptions.mjs
 * holds the list, each entry with its ruling reference (additions need a
 * ruling line — the law is in that file's header). Matched exceptions print
 * as EXCEPTED; an exception whose pair no longer fails prints as STALE.
 *
 * Exit 0 when every measured pair passes (or is ruled). Exit 1 on any
 * non-excepted failure — findings are for Fable/the Admiral to rule: fix
 * the pair, or add it to the exception list WITH its ruling.
 *
 * Run from the repo root:  node scripts/check-usability.mjs [--verbose]
 * (or: npm run check:usability)
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { USABILITY_EXCEPTIONS } from "./usability-exceptions.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERBOSE = process.argv.includes("--verbose");

/* ── the color engine ────────────────────────────────────────────────── */

const NAMED = {
  black: [0, 0, 0, 1], white: [255, 255, 255, 1],
  transparent: [0, 0, 0, 0],
  red: [255, 0, 0, 1], green: [0, 128, 0, 1], blue: [0, 0, 255, 1],
  gold: [255, 215, 0, 1], gray: [128, 128, 128, 1], grey: [128, 128, 128, 1],
};

function parseHex(s) {
  const m = s.match(/^#([0-9a-fA-F]{3,8})$/);
  if (!m) return null;
  const h = m[1];
  if (h.length === 3 || h.length === 4) {
    const [r, g, b, a] = h.split("").map((c) => parseInt(c + c, 16));
    return [r, g, b, h.length === 4 ? a / 255 : 1];
  }
  if (h.length === 6 || h.length === 8) {
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return [r, g, b, a];
  }
  return null;
}

function parseRgb(s) {
  const m = s.match(/^rgba?\((.*)\)$/s);
  if (!m) return null;
  const body = m[1].trim();
  /* comma syntax: rgb(1,2,3) / rgba(1,2,3,.5) */
  if (body.includes(",")) {
    const parts = body.split(",").map((p) => p.trim());
    if (parts.length < 3 || parts.length > 4) return null;
    const chan = (p) => p.endsWith("%") ? (parseFloat(p) / 100) * 255 : parseFloat(p);
    const r = chan(parts[0]), g = chan(parts[1]), b = chan(parts[2]);
    const a = parts[3] === undefined ? 1 : (parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]));
    if ([r, g, b, a].some((v) => Number.isNaN(v))) return null;
    return [r, g, b, a];
  }
  /* space syntax: rgb(1 2 3 / .5) */
  const sm = body.match(/^([^\s/]+)\s+([^\s/]+)\s+([^\s/]+)(?:\s*\/\s*([^\s/]+))?$/);
  if (!sm) return null;
  const chan = (p) => p.endsWith("%") ? (parseFloat(p) / 100) * 255 : parseFloat(p);
  const r = chan(sm[1]), g = chan(sm[2]), b = chan(sm[3]);
  let a = 1;
  if (sm[4] !== undefined) a = sm[4].endsWith("%") ? parseFloat(sm[4]) / 100 : parseFloat(sm[4]);
  if ([r, g, b, a].some((v) => Number.isNaN(v))) return null;
  return [r, g, b, a];
}

/** split a function body's top-level commas (paren-aware) */
function splitTop(s) {
  const out = []; let depth = 0; let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((p) => p.trim());
}

/** resolve var() refs against a scope's var map; returns null when a ref
 *  has no value and no fallback (caller marks the pair unresolvable) */
function resolveVars(value, scopeVars, depth = 0) {
  if (depth > 12) return null;
  let out = "";
  let i = 0;
  let changed = false;
  while (i < value.length) {
    if (value.startsWith("var(", i)) {
      let depth2 = 1; let j = i + 4;
      while (j < value.length && depth2 > 0) {
        if (value[j] === "(") depth2++;
        if (value[j] === ")") depth2--;
        j++;
      }
      const inner = value.slice(i + 4, j - 1);
      const parts = splitTop(inner);
      const name = parts[0].trim();
      const fallback = parts.length > 1 ? parts.slice(1).join(",").trim() : null;
      if (scopeVars.has(name)) { out += scopeVars.get(name).value; changed = true; }
      else if (fallback !== null) { out += fallback; changed = true; }
      else return null;
      i = j;
    } else {
      out += value[i]; i++;
    }
  }
  const trimmed = out.trim();
  return changed && trimmed.includes("var(") ? resolveVars(trimmed, scopeVars, depth + 1) : trimmed;
}

function parseColorMix(s, scopeVars) {
  const m = s.match(/^color-mix\(\s*in\s+(srgb|srgb-linear|oklab|oklch|hsl|lab|lch)\s*,(.*)\)$/s);
  if (!m) return null;
  if (m[1] !== "srgb") return "unresolvable"; /* oklab & friends: honest skip */
  const parts = splitTop(m[2]);
  if (parts.length !== 2) return "unresolvable";
  const read = (p) => {
    const pm = p.match(/^(.*?)\s+(\d+(?:\.\d+)?)%$/);
    if (pm) return { color: pm[1].trim(), pct: parseFloat(pm[2]) };
    return { color: p.trim(), pct: null };
  };
  const a = read(parts[0]), b = read(parts[1]);
  const ca = resolveColor(a.color, scopeVars), cb = resolveColor(b.color, scopeVars);
  if (!ca || !cb) return "unresolvable";
  let pa = a.pct, pb = b.pct;
  if (pa === null && pb === null) { pa = 50; pb = 50; }
  else if (pa === null) pa = 100 - pb;
  else if (pb === null) pb = 100 - pa;
  const sum = pa + pb;
  if (sum <= 0) return "unresolvable";
  pa /= sum; pb /= sum;
  /* sRGB mix: channels AND alpha weighted (the spec's premultiplied result
     for opaque mixes; honest approximation for the transparent case) */
  const alpha = ca[3] * pa + cb[3] * pb;
  if (alpha <= 0) return [0, 0, 0, 0];
  const mix = (x, y) => (x * ca[3] * pa + y * cb[3] * pb) / alpha;
  return [mix(ca[0], cb[0]), mix(ca[1], cb[1]), mix(ca[2], cb[2]), alpha];
}

/** one color value → [r,g,b,a] or null. Handles hex, rgb(a), named,
 *  color-mix(in srgb,…). var() must already be resolved by the caller. */
function resolveColor(s, scopeVars) {
  const v = s.trim().replace(/!important$/, "").trim();
  if (v.startsWith("#")) return parseHex(v);
  if (/^rgba?\(/i.test(v)) return parseRgb(v);
  if (/^color-mix\(/i.test(v)) {
    const r = parseColorMix(v, scopeVars);
    return r === "unresolvable" || r === null ? null : r;
  }
  const named = NAMED[v.toLowerCase()];
  return named ?? null;
}

/** a CSS value → the list of colors it can paint:
 *  { colors: [rgba…] } | { skip: reason }  (gradients → every stop) */
function valueColors(raw, scopeVars) {
  let v = raw.trim().replace(/!important$/, "").trim();
  if (/url\(/i.test(v)) return { skip: "imagery (url() — a browser lane, not this gate)" };
  if (/^(none|transparent|inherit|initial|unset|currentColor)$/i.test(v)) return { skip: `keyword "${v}"` };
  const resolved = resolveVars(v, scopeVars);
  if (resolved === null) return { skip: `unresolvable var() in "${v.length > 60 ? v.slice(0, 60) + "…" : v}"` };
  v = resolved;
  const gm = v.match(/^(?:linear|radial|conic)-gradient\((.*)\)$/s);
  if (gm) {
    const stops = splitTop(gm[1]).filter((p) => !/^(to\s|\d+deg|at\s|circle|ellipse|closest|farthest)/i.test(p));
    const colors = [];
    for (const stop of stops) {
      const cm = stop.match(/^(.*?)\s+\d+(?:\.\d+)?%?$/s);
      const c = resolveColor(cm ? cm[1] : stop, scopeVars);
      if (c) colors.push(c);
    }
    if (colors.length === 0) return { skip: "gradient with no resolvable stop" };
    return { colors };
  }
  const c = resolveColor(v, scopeVars);
  if (!c) return { skip: `not a color: "${v.length > 60 ? v.slice(0, 60) + "…" : v}"` };
  return { colors: [c] };
}

function composite(fg, bg) {
  const a = fg[3] + bg[3] * (1 - fg[3]);
  if (a <= 0) return [0, 0, 0, 0];
  return [
    (fg[0] * fg[3] + bg[0] * bg[3] * (1 - fg[3])) / a,
    (fg[1] * fg[3] + bg[1] * bg[3] * (1 - fg[3])) / a,
    (fg[2] * fg[3] + bg[2] * bg[3] * (1 - fg[3])) / a,
    a,
  ];
}

function luminance([r, g, b]) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(fg, bg) {
  const l1 = luminance(fg), l2 = luminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const toHex = ([r, g, b]) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

/* ── the CSS block parser (comments stripped, line numbers kept) ─────── */

function stripCommentsKeepLines(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

function parseBlocks(src, file) {
  const clean = stripCommentsKeepLines(src);
  const blocks = [];
  const lineOf = (idx) => clean.slice(0, idx).split("\n").length;
  const walk = (start, end, selector, selectorLine) => {
    let i = start;
    while (i < end) {
      const open = clean.indexOf("{", i);
      if (open === -1 || open >= end) break;
      /* the selector text between the previous close and this open */
      const selStart = (() => { let j = open - 1; while (j > i && clean[j - 1] !== "}" && clean[j - 1] !== ";") j--; return j; })();
      const sel = clean.slice(selStart, open).trim();
      let depth = 1; let j = open + 1;
      while (j < clean.length && depth > 0) {
        if (clean[j] === "{") depth++;
        if (clean[j] === "}") depth--;
        j++;
      }
      const bodyStart = open + 1, bodyEnd = j - 1;
      const body = clean.slice(bodyStart, bodyEnd);
      if (sel.startsWith("@")) {
        /* at-rule group (@media …): recurse with the parent selector */
        walk(bodyStart, bodyEnd, selector, selectorLine);
      } else {
        blocks.push({ selector: sel, selectorLine: lineOf(selStart), body, bodyLine: lineOf(bodyStart), file });
        if (body.includes("{")) walk(bodyStart, bodyEnd, sel, lineOf(selStart));
      }
      i = j;
    }
  };
  walk(0, clean.length, null, 0);
  return blocks;
}

/** custom properties declared directly in a block body (nested removed) */
function blockVars(body, bodyLine) {
  const flat = body.replace(/\{[\s\S]*?\}/g, "");
  const vars = new Map();
  let i = 0;
  while (i < flat.length) {
    const m = flat.slice(i).match(/(--[A-Za-z0-9-]+)\s*:/);
    if (!m) break;
    const name = m[1];
    const declStart = i + m.index;
    let depth = 0; let j = declStart + m[0].length;
    while (j < flat.length) {
      if (flat[j] === "(") depth++;
      if (flat[j] === ")") depth--;
      if (flat[j] === ";" && depth === 0) break;
      j++;
    }
    const value = flat.slice(declStart + m[0].length, j).trim();
    const line = bodyLine + flat.slice(0, declStart).split("\n").length - 1;
    vars.set(name, { value, line });
    i = j + 1;
  }
  return vars;
}

function blockDecl(body, key) {
  const flat = body.replace(/\{[\s\S]*?\}/g, "");
  const m = flat.match(new RegExp(`(?:^|[;\\s])${key}\\s*:\\s*([^;]+);`, "s"));
  if (!m) return null;
  const line = flat.slice(0, m.index).split("\n").length;
  return { value: m[1].trim(), lineOffset: line - 1 };
}

/* ── the scopes: 5 cartridges × 2 themes, plus the studio overlays ───── */

const SCOPE_FILES = ["src/app/cartridge.css", "src/app/cartridges.css"];
const STUDIO_TOKEN_FILES = ["src/app/studio/puck-theme.css", "src/app/studio/studio-tokens.css"];

/* every stylesheet the sweep reads — token scopes AND pair sources AND the
   override census (a scoped rule in ANY of them can re-declare a pair) */
const CSS_SWEEP_FILES = [
  "src/app/globals.css", "src/app/cartridge.css", "src/app/cartridges.css",
  "src/app/house.css", "src/app/scar.css",
  "src/app/studio/preview.css", "src/app/studio/puck-theme.css", "src/app/studio/studio-tokens.css",
  "src/lib/puck-blocks/parallax.css",
];

const scopeBuckets = { root: new Map(), dawn: new Map(), twin: {}, twinDawn: {}, studio: new Map(), studioDawn: new Map() };

function mergeVars(bucket, vars) {
  for (const [k, v] of vars) bucket.set(k, v); /* later files win — the cascade */
}

for (const rel of [...SCOPE_FILES, ...STUDIO_TOKEN_FILES]) {
  const src = readFileSync(join(root, rel), "utf8");
  for (const block of parseBlocks(src, rel)) {
    const sels = block.selector.split(",").map((s) => s.trim());
    const vars = blockVars(block.body, block.bodyLine);
    if (vars.size === 0) continue;
    for (const sel of sels) {
      if (sel === ":root" || sel === ".oc-pv-dark") mergeVars(scopeBuckets.root, vars);
      else if (sel === 'html[data-oc-theme="light"]' || sel === ".oc-pv-light") mergeVars(scopeBuckets.dawn, vars);
      else if (sel === ".oc-studio") mergeVars(scopeBuckets.studio, vars);
      else if (sel === 'html[data-oc-theme="light"] .oc-studio') mergeVars(scopeBuckets.studioDawn, vars);
      else {
        let m = sel.match(/^html\[data-oc-cartridge="(\w+)"\]$/);
        if (m) { (scopeBuckets.twin[m[1]] ??= new Map()); mergeVars(scopeBuckets.twin[m[1]], vars); continue; }
        m = sel.match(/^html\[data-oc-cartridge="(\w+)"\]\[data-oc-theme="light"\]$/);
        if (m) { (scopeBuckets.twinDawn[m[1]] ??= new Map()); mergeVars(scopeBuckets.twinDawn[m[1]], vars); }
      }
    }
  }
}

const CARTRIDGE_IDS = ["love", "pacman", "earthside", "blank", "mono", "material", "eva"];

function compose(...maps) {
  const out = new Map();
  for (const m of maps) if (m) for (const [k, v] of m) out.set(k, v);
  return out;
}

const SITE_SCOPES = [];
for (const id of CARTRIDGE_IDS) {
  SITE_SCOPES.push({ name: `${id}·night`, vars: compose(scopeBuckets.root, scopeBuckets.twin[id]) });
  SITE_SCOPES.push({ name: `${id}·dawn`, vars: compose(scopeBuckets.root, scopeBuckets.dawn, scopeBuckets.twin[id], scopeBuckets.twinDawn[id]) });
}
/* the studio wears the active cartridge — love in production, blank on the
   bench; the .oc-studio layers ride on top (S21's ruled dawn twins) */
const STUDIO_SCOPES = [];
for (const id of ["love", "blank"]) {
  STUDIO_SCOPES.push({ name: `studio ${id}·night`, vars: compose(scopeBuckets.root, scopeBuckets.twin[id], scopeBuckets.studio) });
  STUDIO_SCOPES.push({ name: `studio ${id}·dawn`, vars: compose(scopeBuckets.root, scopeBuckets.dawn, scopeBuckets.twin[id], scopeBuckets.twinDawn[id], scopeBuckets.studio, scopeBuckets.studioDawn) });
}

const groundOf = (scopeVars) =>
  valueColors(scopeVars.get("--ground")?.value ?? "#000000", scopeVars).colors?.[0] ?? [0, 0, 0, 1];
const studioGroundOf = (scopeVars) =>
  valueColors(scopeVars.get("--studio-shell")?.value ?? scopeVars.get("--ground")?.value ?? "#000000", scopeVars).colors?.[0] ?? [0, 0, 0, 1];

/* ── cascade honesty, the 80/20: a co-declared pair measures the values
   ITS OWN block declares — but a scoped twin/dawn rule can re-declare the
   same selector's background (earthside re-paints `body` on paper; love's
   dawn re-paints it cream). Measuring the base rule's values under those
   scopes would flag what never renders. So: collect every scoped rule that
   re-declares color/background on a selector, and suppress the base pair
   under exactly the scopes that override it. Cross-block pairs (color from
   one rule, ground from its parent) stay honestly unmeasured — the token
   contract above carries that weight. */
const normSel = (sel) =>
  sel.replace(/::?[a-zA-Z-]+(\([^)]*\))?/g, "").replace(/\s+/g, " ").trim();

const overrides = { dawn: new Map(), twin: {}, twinDawn: {}, studio: new Map(), studioDawn: new Map() };

function noteOverride(map, sel, body) {
  const props = new Set();
  if (blockDecl(body, "background-color") ?? blockDecl(body, "background")) props.add("background");
  if (blockDecl(body, "color")) props.add("color");
  if (props.size === 0) return;
  const key = normSel(sel);
  const cur = map.get(key) ?? new Set();
  for (const p of props) cur.add(p);
  map.set(key, cur);
}

for (const rel of CSS_SWEEP_FILES) {
  const src = readFileSync(join(root, rel), "utf8");
  for (const block of parseBlocks(src, rel)) {
    for (const part of block.selector.split(",")) {
      const sel = part.trim();
      let m = sel.match(/^html\[data-oc-cartridge="(\w+)"\](\[data-oc-theme="light"\])?\s+(.+)$/);
      if (m) {
        const map = m[2]
          ? (overrides.twinDawn[m[1]] ??= new Map())
          : (overrides.twin[m[1]] ??= new Map());
        noteOverride(map, m[3], block.body);
        continue;
      }
      m = sel.match(/^html\[data-oc-theme="light"\]\s+\.oc-studio\s+(.+)$/);
      if (m) { noteOverride(overrides.studioDawn, m[1], block.body); continue; }
      m = sel.match(/^\.oc-studio\s+(.+)$/);
      if (m) { noteOverride(overrides.studio, m[1], block.body); continue; }
      m = sel.match(/^html\[data-oc-theme="light"\]\s+(.+)$/);
      if (m) noteOverride(overrides.dawn, m[1], block.body);
    }
  }
}

/** the scopes a co-declared pair may be measured under, given its own
 *  selector (scoped rules render only where their scope matches) and the
 *  override maps (a re-declared pair would measure what never renders) */
function scopesForPair(selector, scopes) {
  const cart = selector.match(/data-oc-cartridge="(\w+)"/)?.[1] ?? null;
  const wantsDawn = selector.includes('data-oc-theme="light"');
  const rest = selector.replace(/^html(\[[^\]]*\])*\s*/, "").replace(/^\.oc-studio\s+/, "");
  const key = normSel(rest);
  return scopes.filter((scope) => {
    const scopeCart = scope.name.replace(/^studio /, "").split("·")[0];
    const scopeDawn = scope.name.endsWith("·dawn");
    if (cart && cart !== scopeCart) return false;
    if (wantsDawn && !scopeDawn) return false;
    if (cart || wantsDawn) return true; /* the pair's own scope always renders it */
    const sets = [];
    if (scope.name.startsWith("studio ")) {
      sets.push(overrides.studio);
      if (scopeDawn) sets.push(overrides.dawn, overrides.studioDawn);
    } else if (scopeDawn) sets.push(overrides.dawn);
    if (scopeCart !== "love") sets.push(overrides.twin[scopeCart]);
    if (scopeDawn && scopeCart !== "love") sets.push(overrides.twinDawn[scopeCart]);
    for (const set of sets) {
      const props = set?.get(key);
      if (props && (props.has("background") || props.has("color"))) return false;
    }
    return true;
  });
}

/* ── measurements ────────────────────────────────────────────────────── */

const skipped = []; /* { where, reason } */

/** measure one fg-on-bg pair across a scope set; bg alpha composites over
 *  each scope's ground. Returns [{ scope, ratio, fg, bg }] — one per scope
 *  where both sides resolved. */
function measurePair(fgRaw, bgRaw, scopes, groundFn = groundOf) {
  const out = [];
  for (const scope of scopes) {
    const fg = valueColors(fgRaw, scope.vars);
    const bg = valueColors(bgRaw, scope.vars);
    if (fg.skip || bg.skip) continue;
    const ground = groundFn(scope.vars);
    let worst = null;
    for (const fc of fg.colors) {
      for (const bc of bg.colors) {
        const bgEff = bc[3] >= 1 ? bc : composite(bc, ground);
        const fgEff = fc[3] >= 1 ? fc : composite(fc, bgEff);
        const r = ratio(fgEff, bgEff);
        if (!worst || r < worst.ratio) worst = { scope: scope.name, ratio: r, fg: fgEff, bg: bgEff };
      }
    }
    if (worst) out.push(worst);
  }
  return out;
}

/* the CONTRACT — the kit's token-vs-token obligations, measured per site
   scope. fg/bg are token refs or literals; `need` is the WCAG bar. */
const CONTRACT = [
  { name: "body ink on ground", fg: "var(--ink)", bg: "var(--ground)", need: 4.5 },
  { name: "strong ink on ground", fg: "var(--ink-strong)", bg: "var(--ground)", need: 4.5 },
  { name: "body copy on ground", fg: "var(--ink-body)", bg: "var(--ground)", need: 4.5 },
  { name: "muted on ground", fg: "var(--muted)", bg: "var(--ground)", need: 4.5 },
  { name: "kicker on ground", fg: "var(--rose)", bg: "var(--ground)", need: 4.5 },
  { name: "info on ground", fg: "var(--info)", bg: "var(--ground)", need: 4.5 },
  { name: "teal-bright on ground", fg: "var(--teal-bright)", bg: "var(--ground)", need: 4.5 },
  { name: "ok on ground", fg: "var(--ok)", bg: "var(--ground)", need: 4.5 },
  { name: "warn on ground", fg: "var(--warn)", bg: "var(--ground)", need: 4.5 },
  { name: "err on ground", fg: "var(--err)", bg: "var(--ground)", need: 4.5 },
  { name: "body copy on panel", fg: "var(--ink-body)", bg: "var(--panel)", need: 4.5 },
  { name: "muted on panel", fg: "var(--muted)", bg: "var(--panel)", need: 4.5 },
  { name: "field ink on field", fg: "var(--field-ink)", bg: "var(--field-bg)", need: 4.5 },
  { name: "ghost button ink", fg: "var(--ghost-ink)", bg: "var(--ghost-bg)", need: 4.5 },
  { name: "money ink on gold", fg: "var(--gold-ink)", bg: "var(--gold)", need: 4.5 },
  { name: "money ink on gold light end", fg: "var(--gold-ink)", bg: "var(--gold-2)", need: 4.5 },
  /* the header never theme-flips — its own dark literal over the page ground */
  { name: "nav ink on the header's dark", fg: "var(--nav-gold)", bg: "rgba(14,12,24,.86)", need: 4.5 },
  ...Array.from({ length: 9 }, (_, i) => ({
    name: `body copy on band ${i + 1}`, fg: "var(--ink-body)", bg: `var(--band-${i + 1})`, need: 4.5,
  })),
  /* THE AURORA BAND (TASK-42/S45) — the effects registry's first effect
     sits BEHIND a band's content, so the band's three text roles owe
     contrast ON TOP of every blob hue at full token strength. Each
     cartridge pours --oc-effect-a/b/c beside its other tokens (the
     template owns the effect CSS; here the tokens are the inert seam —
     poured so this sweep measures real values, never skips). The engine
     composites each blob's alpha over the scope's ground — the rendered
     aurora is gentler still (the layer's own opacity ×.8, then the
     blur), so a pass here is a pass with margin. No scrim token was
     needed in any of the 7 × 2 scopes at pour time. */
  ...["a", "b", "c"].flatMap((blob) => [
    { name: `aurora band: strong ink over blob ${blob}`, fg: "var(--ink-strong)", bg: `var(--oc-effect-${blob})`, need: 4.5 },
    { name: `aurora band: body copy over blob ${blob}`, fg: "var(--ink-body)", bg: `var(--oc-effect-${blob})`, need: 4.5 },
    { name: `aurora band: muted over blob ${blob}`, fg: "var(--muted)", bg: `var(--oc-effect-${blob})`, need: 4.5 },
  ]),
];

const STUDIO_CONTRACT = [
  { name: "studio strong ink on the mat", fg: "var(--ink-strong)", bg: "var(--studio-mat)", need: 4.5 },
  { name: "studio body copy on the mat", fg: "var(--ink-body)", bg: "var(--studio-mat)", need: 4.5 },
  { name: "studio muted on the mat", fg: "var(--muted)", bg: "var(--studio-mat)", need: 4.5 },
  { name: "studio muted on the shell", fg: "var(--muted)", bg: "var(--studio-shell)", need: 4.5 },
  { name: "studio info on the mat", fg: "var(--info)", bg: "var(--studio-mat)", need: 4.5 },
];

const findings = []; /* every measured pair result */
let contractMeasured = 0;

for (const pair of CONTRACT) {
  const results = measurePair(pair.fg, pair.bg, SITE_SCOPES);
  contractMeasured++;
  findings.push({ kind: "contract", name: pair.name, fg: pair.fg, bg: pair.bg, need: pair.need, where: null, results });
}
for (const pair of STUDIO_CONTRACT) {
  const results = measurePair(pair.fg, pair.bg, STUDIO_SCOPES, studioGroundOf);
  contractMeasured++;
  findings.push({ kind: "contract", name: pair.name, fg: pair.fg, bg: pair.bg, need: pair.need, where: null, results });
}

/* co-declared CSS pairs */
const isStudioCss = (rel) => rel.startsWith("src/app/studio/");
let cssPairs = 0;

for (const rel of CSS_SWEEP_FILES) {
  const src = readFileSync(join(root, rel), "utf8");
  const scopes = isStudioCss(rel) ? STUDIO_SCOPES : SITE_SCOPES;
  const groundFn = isStudioCss(rel) ? studioGroundOf : groundOf;
  for (const block of parseBlocks(src, rel)) {
    if (block.selector.startsWith("@")) continue;
    const color = blockDecl(block.body, "color");
    const bgDecl = blockDecl(block.body, "background-color") ?? blockDecl(block.body, "background");
    if (!color || !bgDecl) continue;
    const line = block.bodyLine + color.lineOffset;
    const selOneLine = block.selector.replace(/\s+/g, " ");
    /* large text? same block's font-size/weight */
    const fs = blockDecl(block.body, "font-size");
    const fw = blockDecl(block.body, "font-weight");
    const need = largeTextNeed(fs?.value, fw?.value);
    cssPairs++;
    const pairScopes = scopesForPair(block.selector, scopes);
    if (pairScopes.length === 0) {
      skipped.push({ where: `${rel}:${line} (${selOneLine.slice(0, 60)})`, reason: "re-declared by a scoped twin/dawn rule in every scope — what renders is measured there" });
      continue;
    }
    const results = measurePair(color.value, bgDecl.value, pairScopes, groundFn);
    if (results.length === 0) {
      skipped.push({ where: `${rel}:${line} (${selOneLine.slice(0, 60)})`, reason: "fg or bg unresolvable" });
      continue;
    }
    findings.push({
      kind: "css", name: `${color.value}  on  ${bgDecl.value}`,
      fg: color.value, bg: bgDecl.value, need,
      where: `${rel}:${line}  ${selOneLine.slice(0, 80)}`,
      results,
    });
  }
}

function largeTextNeed(fsValue, fwValue) {
  if (!fsValue) return 4.5;
  const m = fsValue.match(/([\d.]+)\s*(px|rem|em)?/);
  if (!m) return 4.5;
  let px = parseFloat(m[1]);
  if (m[2] === "rem" || m[2] === "em") px *= 16;
  if (px >= 24) return 3.0;
  const bold = fwValue && (/bold/i.test(fwValue) || parseInt(fwValue, 10) >= 700);
  if (px >= 18.66 && bold) return 3.0;
  return 4.5;
}

/* co-declared TSX/TS inline-style pairs */
function* walkSrc(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkSrc(full);
    else if (/\.(tsx|ts)$/.test(entry.name)) yield full;
  }
}

const STUDIO_TSX = (rel) =>
  rel.startsWith("src/components/studio/") || rel.startsWith("src/app/studio/") ||
  ["src/components/PuckEditor.tsx", "src/components/Copilot.tsx", "src/components/BenchNotes.tsx"].includes(rel);

let tsxPairs = 0;

for (const file of walkSrc(join(root, "src"))) {
  const rel = relative(root, file);
  const src = readFileSync(file, "utf8");
  const clean = stripCommentsKeepLines(src);
  /* same-file string consts: const GOLD = "…" | `…` | '…' */
  const consts = new Map();
  for (const m of clean.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*(`[^`]*`|"[^"]*"|'[^']*')\s*;/g)) {
    consts.set(m[1], m[2].slice(1, -1));
  }
  const lineOf = (idx) => clean.slice(0, idx).split("\n").length;
  /* candidate object literals: style={{ … }} and React.CSSProperties consts */
  const starts = [];
  for (const m of clean.matchAll(/style=\{\{/g)) starts.push(m.index + 7);
  for (const m of clean.matchAll(/React\.CSSProperties\s*=\s*\{/g)) starts.push(m.index + m[0].length - 1);
  for (const open of starts) {
    let depth = 1; let j = open + 1;
    while (j < clean.length && depth > 0) {
      if (clean[j] === "{") depth++;
      if (clean[j] === "}") depth--;
      j++;
    }
    const body = clean.slice(open + 1, j - 1);
    const grab = (key) => {
      const m = body.match(new RegExp(`\\b${key}\\s*:\\s*(\`[^\`]*\`|"[^"]*"|'[^']*'|[A-Za-z_$][\\w$]*)`));
      if (!m) return null;
      let v = m[1];
      if (v.startsWith("`") || v.startsWith('"') || v.startsWith("'")) v = v.slice(1, -1);
      else if (consts.has(v)) v = consts.get(v);
      else return null;
      /* ${CONST} interpolations */
      v = v.replace(/\$\{([A-Za-z_$][\w$]*)\}/g, (_, n) => consts.get(n) ?? "");
      return v;
    };
    const color = grab("color");
    const bg = grab("backgroundColor") ?? grab("background");
    if (!color || !bg) continue;
    const fsM = body.match(/\bfontSize\s*:\s*(\d+|["'`][^"'`]*["'`])/);
    const fwM = body.match(/\bfontWeight\s*:\s*(\d+|["'`][^"'`]*["'`])/);
    const fs = fsM ? fsM[1].replace(/["'`]/g, "") + (fsM[1].startsWith('"') || fsM[1].startsWith("'") || fsM[1].startsWith("`") ? "" : "px") : null;
    const fw = fwM ? fwM[1].replace(/["'`]/g, "") : null;
    const need = largeTextNeed(fs, fw);
    tsxPairs++;
    const scopes = STUDIO_TSX(rel) ? STUDIO_SCOPES : SITE_SCOPES;
    const groundFn = STUDIO_TSX(rel) ? studioGroundOf : groundOf;
    const results = measurePair(color, bg, scopes, groundFn);
    const line = lineOf(open);
    if (results.length === 0) {
      skipped.push({ where: `${rel}:${line}`, reason: "fg or bg unresolvable" });
      continue;
    }
    findings.push({
      kind: "tsx", name: `${color}  on  ${bg}`,
      fg: color, bg, need,
      where: `${rel}:${line}`,
      results,
    });
  }
}

/* ── exceptions, the table, the verdict ──────────────────────────────── */

const normHex = (c) => toHex(c);
const exceptionState = USABILITY_EXCEPTIONS.map((e) => ({ entry: e, matched: false }));

for (const e of USABILITY_EXCEPTIONS) {
  if (!e.ruling || !e.ruling.trim()) {
    console.error(`[check-usability] EXCEPTION WITHOUT A RULING (fg ${e.fg} on ${[].concat(e.bg).join("/")} in ${e.file}) — the list's law: no ruling, no entry.`);
    process.exit(1);
  }
}

const matchException = (f, fail) => {
  for (const st of exceptionState) {
    const e = st.entry;
    const bgs = [].concat(e.bg).map((s) => s.toUpperCase());
    if (f.where && !f.where.includes(e.file)) continue;
    if (normHex(fail.fg) !== e.fg.toUpperCase()) continue;
    if (!bgs.includes(normHex(fail.bg))) continue;
    st.matched = true;
    return e;
  }
  return null;
};

const rows = [];   /* failures (worst-first) */
const passed = []; /* fully-passing pairs */
const excepted = []; /* ruled rows */

for (const f of findings) {
  const fails = f.results.filter((r) => r.ratio < f.need - 1e-9);
  if (fails.length === 0) { passed.push(f); continue; }
  /* dedupe identical resolved pairs across scopes (a literal pair measures
     the same everywhere) — keep the worst, list every failing scope */
  const byKey = new Map();
  for (const r of fails) {
    const key = `${normHex(r.fg)}|${normHex(r.bg)}`;
    if (!byKey.has(key)) byKey.set(key, { fg: r.fg, bg: r.bg, worst: r.ratio, scopes: [] });
    const g = byKey.get(key);
    g.worst = Math.min(g.worst, r.ratio);
    g.scopes.push(r.scope);
  }
  for (const g of byKey.values()) {
    const ex = matchException(f, { fg: g.fg, bg: g.bg });
    const row = {
      ratio: g.worst, need: f.need, fg: normHex(g.fg), bg: normHex(g.bg),
      scopes: g.scopes, name: f.name, where: f.where ?? "(token contract)",
      kind: f.kind, exception: ex,
    };
    (ex ? excepted : rows).push(row);
  }
}

rows.sort((a, b) => a.ratio - b.ratio);
excepted.sort((a, b) => a.ratio - b.ratio);

const fmtScopes = (s) => {
  if (s.length >= 8) return `${s.length} scopes`;
  return s.join(", ");
};

console.log(`[check-usability] ${CARTRIDGE_IDS.length} cartridges × 2 themes + the studio scopes; ${contractMeasured} contract pairs, ${cssPairs} css pairs, ${tsxPairs} inline-style pairs; ${skipped.length} skipped as unresolvable${VERBOSE ? ":" : " (--verbose lists them)"}`);
if (VERBOSE) for (const s of skipped) console.log(`  skip  ${s.where} — ${s.reason}`);
console.log("");

if (excepted.length > 0) {
  console.log(`EXCEPTED — ruled, cited, never re-flagged (${excepted.length}):`);
  for (const r of excepted) {
    console.log(`  ${r.ratio.toFixed(2)}:1  (bar ${r.need}:1)  ${r.fg} on ${r.bg}  ${r.where}`);
    console.log(`       ruling: ${r.exception.ruling}`);
  }
  console.log("");
}

const stale = exceptionState.filter((s) => !s.matched);
if (stale.length > 0) {
  console.log(`STALE EXCEPTIONS — their pairs no longer fail anywhere; the entry can leave the list (${stale.length}):`);
  for (const s of stale) console.log(`  ${s.entry.fg} on ${[].concat(s.entry.bg).join("/")}  ${s.entry.file}  (${s.entry.ruling})`);
  console.log("");
}

if (rows.length > 0) {
  console.log(`FAIL — worst first (${rows.length} pair${rows.length === 1 ? "" : "s"}). Findings are for Fable/the Admiral to rule: fix the pair, or add it to scripts/usability-exceptions.mjs WITH its ruling.`);
  for (const r of rows) {
    console.log(`  ${r.ratio.toFixed(2)}:1  (bar ${r.need}:1)  ${r.fg} on ${r.bg}  [${fmtScopes(r.scopes)}]`);
    console.log(`       ${r.kind === "contract" ? `contract: ${r.name}` : r.where}`);
    if (r.kind !== "contract") console.log(`       pair: ${r.name.length > 96 ? r.name.slice(0, 96) + "…" : r.name}`);
  }
  console.log("");
  console.log(`[check-usability] ${rows.length} failing pair(s), ${passed.length} passing, ${excepted.length} ruled exception(s) — exit 1`);
  process.exit(1);
}

console.log(`[check-usability] clean — ${passed.length} pairs pass in every scope, ${excepted.length} ruled exception(s) cited, ${skipped.length} unresolvable skipped.`);
process.exit(0);
