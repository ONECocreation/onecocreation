import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

/**
 * TASK-383 (0018.07.02 a-B, block 968,048) -- A MACHINE CEILING ON DESIGN
 * DRIFT. The Admiral, on why the site keeps needing rework: "since this is
 * a template we should have a common css throughout the page," "the
 * website has framework foundations for the template we need to adhere
 * to... not build individual pages and rulesets," and on buttons, "that
 * was reinvented."
 *
 * This file is BOTH the scanner and its own test suite (the house pattern
 * for small pure-function modules -- see tests/chat-reactions.test.ts,
 * whose functions live in a src file; these live here because OWNS keeps
 * this lane out of src/ entirely). It measures four kinds of design drift
 * across every `.tsx` file under `src/` and every stylesheet under `src/`
 * (R4 -- the file set is discovered fresh each run, not a fixed list):
 *
 *   (a) `style={{ ... }}` object-literal blocks in `.tsx` files, except a
 *       block whose every key is a CSS custom property (`--foo`) -- those
 *       are exempt (R8).
 *   (b) hand-typed colours in `.tsx` files: 3/4/6/8-digit hex runs and
 *       `rgb()`/`rgba()`/`hsl()`/`hsla()` calls, anywhere in the file, not
 *       only inside style blocks (R7).
 *   (c) "styled buttons": any JSX tag that carries BOTH a `style=`
 *       attribute and a `className` whose tokens include `btn`, `kit-btn`,
 *       or anything starting `btn-`/`kit-btn-` (Build 2c/R9) -- any tag
 *       kind, not only `<button>` (StudioHub.tsx's `<a>` is real Ground).
 *   (d) `!important` and real (non-token, non-`sans-serif`) serif
 *       `font-family`/`font` declarations, across every stylesheet found
 *       under `src/`.
 *
 * It is a RATCHET, not a fixer: `tests/design-drift.ceilings.json` pins
 * today's measured counts (R1 -- every scanned file gets a record, zeros
 * included), and the normal test run only checks `measured <= ceiling`.
 * Nothing under `src/` is touched by this lane.
 *
 * TWO write modes, both monotone (R2), chosen by an env var, mutually
 * exclusive with the normal check in a single vitest invocation:
 *   DESIGN_DRIFT_WRITE=init   -- only when the ceilings file does not yet
 *                               exist; records exactly what it measures.
 *   DESIGN_DRIFT_WRITE=1      -- ratchets an EXISTING file: every ceiling
 *                               becomes min(old, measured), a path whose
 *                               file is gone is dropped, a brand-new path
 *                               is added at min(measured, allowance) -- 3
 *                               style blocks / 0 colours / 0 styled
 *                               buttons for a new `.tsx`, 0/0 for a new
 *                               stylesheet (Build 4/R4 -- a new stylesheet
 *                               is exactly the per-page ruleset the
 *                               Admiral named; it needs Number One's
 *                               word, not a free allowance).
 * Neither mode ever raises a number by hand; that takes an explicit JSON
 * edit, which shows up in a PR diff (R2).
 *
 * FAIL CLOSED (R3): a missing, empty, unparsable or wrongly-shaped
 * ceilings file fails. A stylesheet with no record fails outright, even
 * at zero (R4) -- no allowance, because its mere existence is the
 * violation. A `.tsx` path with no record gets NEW_FILE_STYLE_ALLOWANCE
 * for style blocks only (0 for colours/styled buttons -- R1). A recorded
 * path whose file no longer exists fails too, so a rename is visible
 * (R3) -- run write mode to drop it.
 *
 * ONE LEXICAL MASKING PASS (R5, `maskSource`): a small state machine --
 * code / single-quoted string / double-quoted string / template literal
 * (with `${ }` nesting, and backticks nested inside an interpolation) /
 * block comment -- walks the source once and blanks ONLY block-comment
 * spans (a JSX comment's curly-brace-wrapped block comment included) to
 * spaces, keeping newlines so every line number still lines up with the
 * original file. Strings and template literals are NOT masked -- a
 * colour typed inside a string is a real hit. `//` line comments are
 * deliberately left alone: unsafe to strip next to an `https://`-shaped
 * string, and zero real cases exist today (checked against the live
 * tree). Every metric reads the masked copy.
 *
 * DETERMINISTIC, NEVER FLAPS (R6): the same bytes always give the same
 * numbers. Where the scanner cannot tell a real tag from a look-alike
 * (`useState<Foo>`, a generic `<T,>(x: T) => x`), it may under- or
 * over-count in principle, but never inconsistently -- see the "false
 * tag" tests below for why these specific look-alikes are, in practice,
 * harmless (they never survive to trip a real metric).
 *
 * WHAT THIS GUARD DOES NOT SEE (R10, plus one more found while building
 * this lane's fixtures against the real tree):
 *   - styling moved into a `.ts` helper (this scanner is `.tsx`-only);
 *   - a style OBJECT held in a variable (`const field: CSSProperties =
 *     {...}`, DoorSheet.tsx's real shape) or CHOSEN by a condition
 *     (`style={cond ? {...} : undefined}`, WildDoors.tsx's real shape) --
 *     neither one is literally `style={{`;
 *   - a `className` built in a helper function, or a component invoked
 *     with `style=` but no literal `btn`/`kit-btn` className token at the
 *     call site (SignInCard.tsx's real
 *     `<Button ... style={{ width: "100%" }}>` -- the kit Button applies
 *     its own classes internally, so this call site carries no className
 *     for the scanner to read);
 *   - properties added INSIDE an existing style block (the block COUNT
 *     does not move, only a brand-new block does);
 *   - named colours (`red`, `white` -- a known gap, R7);
 *   - a file renamed or split: the new path starts fresh at the new-file
 *     allowance, and the OLD path fails closed (R3) until write mode
 *     drops it -- the diff makes the rename visible either way.
 * Counts hold syntax, not all styling; the rest is the reviewer's eye.
 *
 * This lane fixes none of the drift it counts and touches nothing under
 * `src/` -- see OWNS in TASK-383-oc-design-drift-guard.md.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Hit {
  index: number;
  line: number;
  snippet: string;
}

export interface FileMetric {
  count: number;
  hits: Hit[];
}

export interface TsxMetrics {
  styleBlocks: FileMetric;
  colours: FileMetric;
  styledButtons: FileMetric;
}

export interface CssMetrics {
  important: FileMetric;
  serif: FileMetric;
}

export interface Measured {
  tsx: Record<string, TsxMetrics>;
  css: Record<string, CssMetrics>;
}

export interface TsxCeiling {
  styleBlocks: number;
  colours: number;
  styledButtons: number;
}

export interface CssCeiling {
  important: number;
  serif: number;
}

export interface Ceilings {
  tsx: Record<string, TsxCeiling>;
  css: Record<string, CssCeiling>;
}

export type MetricName = keyof TsxCeiling | keyof CssCeiling;

export type Violation =
  | { kind: "ceiling"; file: string; metric: MetricName; measured: number; ceiling: number; examples: Hit[] }
  | { kind: "untracked-stylesheet"; file: string }
  | { kind: "missing-file"; file: string };

export type WriteResolution =
  | { mode: "check" }
  | { mode: "init"; error?: string }
  | { mode: "ratchet"; error?: string };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPO_ROOT = process.cwd();
export const CEILINGS_PATH = path.join(REPO_ROOT, "tests/design-drift.ceilings.json");

/**
 * RULED (Ground, TASK-383): sits at the real median of today's smallest
 * working files (82 `.tsx` files carry 1-5 blocks; the ten smallest by
 * line count run 1-5 with a median of 3), far under SignInCard.tsx's 22,
 * and enough above the kit primitives' 0 to allow one or two one-off
 * numeric nudges (a `marginBottom`, a `width: "100%"`) before a class is
 * owed. Applies ONLY to a `.tsx` path with NO ceilings record at all
 * (R1) -- an ordinary already-recorded file must never regress below its
 * own history, new-file allowance or not.
 */
export const NEW_FILE_STYLE_ALLOWANCE = 3;

/** R1/R2: the full per-metric allowance table for a brand-new `.tsx` path. */
const NEW_FILE_TSX_ALLOWANCE: TsxCeiling = { styleBlocks: NEW_FILE_STYLE_ALLOWANCE, colours: 0, styledButtons: 0 };

/**
 * R4/Build4: a brand-new stylesheet gets NO allowance at all -- the CSS
 * file set is small and named, not an open set a builder grows casually,
 * and a new stylesheet is exactly the per-page ruleset the Admiral named.
 * (This constant only matters inside WRITE=1's merge; the normal check
 * fails an unrecorded stylesheet outright, allowance or not -- R4.)
 */
const NEW_FILE_CSS_ALLOWANCE: CssCeiling = { important: 0, serif: 0 };

const FAILURE_HEADER = "DESIGN DRIFT CEILING EXCEEDED";
const FAILURE_FOOTER =
  "-> use a class from kit.css or house.css and a token from cartridge.css; never raise the ceiling.";

// ---------------------------------------------------------------------------
// Lexical primitives -- shared by every metric (R5, Build 2/2c "reuse this
// same walker"). `skipOpaque` is the one string/template-literal-aware
// building block; findMatchingBrace, findTagEnd and splitTopLevel are all
// built on it, so string/backtick handling is written exactly once.
// ---------------------------------------------------------------------------

/**
 * If `src[i]` opens a single- or double-quoted string, or a template
 * literal (with arbitrarily nested `${ }` interpolations and further
 * nested backtick strings inside them -- R9), returns the index just
 * past its closing delimiter. Otherwise returns `i` unchanged. Every
 * bracket/tag/comma walker below calls this first, so none of them ever
 * mistakes a quote, brace, or angle bracket sitting inside a string for
 * real structure.
 */
function skipOpaque(src: string, i: number): number {
  const c = src[i];
  if (c === "'" || c === '"') {
    let j = i + 1;
    while (j < src.length) {
      if (src[j] === "\\") {
        j += 2;
        continue;
      }
      if (src[j] === c) return j + 1;
      j++;
    }
    return src.length;
  }
  if (c === "`") return skipTemplate(src, i);
  return i;
}

/** `src[backtickIndex] === "\`"`; returns the index just past the closing backtick. */
function skipTemplate(src: string, backtickIndex: number): number {
  let j = backtickIndex + 1;
  while (j < src.length) {
    const c = src[j];
    if (c === "\\") {
      j += 2;
      continue;
    }
    if (c === "`") return j + 1;
    if (c === "$" && src[j + 1] === "{") {
      j = skipInterpolation(src, j + 2);
      continue;
    }
    j++;
  }
  return src.length;
}

/** `i` is the index right after a template's opening `${`; returns the index just past the matching `}`. */
function skipInterpolation(src: string, i: number): number {
  let depth = 0;
  let j = i;
  while (j < src.length) {
    const skipped = skipOpaque(src, j);
    if (skipped !== j) {
      j = skipped;
      continue;
    }
    const c = src[j];
    if (c === "{") {
      depth++;
      j++;
      continue;
    }
    if (c === "}") {
      if (depth === 0) return j + 1;
      depth--;
      j++;
      continue;
    }
    j++;
  }
  return src.length;
}

/**
 * `src[openIndex] === "{"`; returns the index of its matching `}`
 * (string/template-aware), or -1 if the walk runs off the end or hits a
 * stray close with no matching open since `openIndex` (R6: deterministic
 * "no match", never a thrown error).
 */
export function findMatchingBrace(src: string, openIndex: number): number {
  let depth = 0;
  let i = openIndex;
  while (i < src.length) {
    const skipped = skipOpaque(src, i);
    if (skipped !== i) {
      i = skipped;
      continue;
    }
    const c = src[i];
    if (c === "{") {
      depth++;
      i++;
      continue;
    }
    if (c === "}") {
      depth--;
      if (depth === 0) return i;
      if (depth < 0) return -1;
      i++;
      continue;
    }
    i++;
  }
  return -1;
}

/**
 * `src[startIndex] === "<"`; walks to the matching `>` that ends this
 * JSX tag, tracking `{}` depth (so a `>` or `=>` inside an attribute
 * expression, at depth > 0, never ends the tag early -- R9) and
 * string/template state. Returns -1 if the walk runs off the end, or if
 * a `}` appears with no matching `{` opened since `startIndex` (a sign
 * this `<` was never really a tag start -- see the "false tag" tests).
 */
export function findTagEnd(src: string, startIndex: number): number {
  let depth = 0;
  let i = startIndex + 1;
  while (i < src.length) {
    const skipped = skipOpaque(src, i);
    if (skipped !== i) {
      i = skipped;
      continue;
    }
    const c = src[i];
    if (c === "{") {
      depth++;
      i++;
      continue;
    }
    if (c === "}") {
      depth--;
      if (depth < 0) return -1;
      i++;
      continue;
    }
    if (c === ">" && depth === 0) return i;
    i++;
  }
  return -1;
}

/** Splits `text` on top-level occurrences of `sep` (depth 0, outside strings/templates). */
export function splitTopLevel(text: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < text.length) {
    const skipped = skipOpaque(text, i);
    if (skipped !== i) {
      i = skipped;
      continue;
    }
    const c = text[i];
    if (c === "{" || c === "[" || c === "(") {
      depth++;
      i++;
      continue;
    }
    if (c === "}" || c === "]" || c === ")") {
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }
    if (depth === 0 && text.startsWith(sep, i)) {
      parts.push(text.slice(start, i));
      i += sep.length;
      start = i;
      continue;
    }
    i++;
  }
  parts.push(text.slice(start));
  return parts;
}

/** The index of the first top-level `:` in `text` (depth 0, outside strings), or -1. */
function findTopLevelColon(text: string): number {
  let depth = 0;
  let i = 0;
  while (i < text.length) {
    const skipped = skipOpaque(text, i);
    if (skipped !== i) {
      i = skipped;
      continue;
    }
    const c = text[i];
    if (c === "{" || c === "[" || c === "(") {
      depth++;
      i++;
      continue;
    }
    if (c === "}" || c === "]" || c === ")") {
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }
    if (c === ":" && depth === 0) return i;
    i++;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// maskSource -- R5's one lexical pass
// ---------------------------------------------------------------------------

/**
 * Walks `src` once, replacing ONLY block-comment spans (delimiters
 * included) with spaces -- newlines are kept as newlines, so the result
 * is exactly `src.length` long and every offset/line number still
 * matches the original. Strings and template literals are left
 * untouched (colours typed inside them are real hits); `//` is never
 * treated as a comment starter (R5's state list has no line-comment
 * state at all).
 */
export function maskSource(src: string): string {
  const out: string[] = [];
  let i = 0;
  let inComment = false;
  while (i < src.length) {
    if (inComment) {
      if (src[i] === "*" && src[i + 1] === "/") {
        out.push(" ", " ");
        i += 2;
        inComment = false;
        continue;
      }
      out.push(src[i] === "\n" ? "\n" : " ");
      i++;
      continue;
    }
    if (src[i] === "'" || src[i] === '"') {
      const end = skipOpaque(src, i);
      out.push(src.slice(i, end));
      i = end;
      continue;
    }
    if (src[i] === "`") {
      const end = skipTemplate(src, i);
      out.push(maskTemplateComments(src.slice(i, end)));
      i = end;
      continue;
    }
    if (src[i] === "/" && src[i + 1] === "*") {
      out.push(" ", " ");
      i += 2;
      inComment = true;
      continue;
    }
    out.push(src[i]);
    i++;
  }
  return out.join("");
}

/**
 * A template literal's raw text is never a comment (a literal `/*`
 * inside it, e.g. a URL, must survive -- R9), but any `${ }`
 * interpolation inside it is real code and DOES get its own comments
 * masked, recursively (an interpolation can itself hold a nested
 * template). This walks one already-extracted template-literal slice
 * (starting at its own backtick) and returns it with only its
 * interpolations' comments masked.
 */
function maskTemplateComments(tpl: string): string {
  const out: string[] = [];
  let i = 0;
  while (i < tpl.length) {
    if (tpl[i] === "\\") {
      out.push(tpl.slice(i, i + 2));
      i += 2;
      continue;
    }
    if (tpl[i] === "$" && tpl[i + 1] === "{") {
      const end = skipInterpolation(tpl, i + 2); // index just past the matching '}'
      out.push("${", maskSource(tpl.slice(i + 2, end - 1)), "}");
      i = end;
      continue;
    }
    out.push(tpl[i]);
    i++;
  }
  return out.join("");
}

// ---------------------------------------------------------------------------
// Metric (a): style={{ ... }} blocks, minus the custom-property exemption
// ---------------------------------------------------------------------------

/**
 * R8: rejects a block containing a spread (`...x`) or a computed key
 * (`[k]:`), tolerates a trailing comma, and is unaffected by a cast
 * AFTER the object (`} as CSSProperties}` -- `findMatchingBrace` already
 * stopped at the object's own `}`, so the cast text is never even seen
 * here). An empty object (`style={{}}`) is vacuously exempt -- it sets
 * no real property either way.
 */
export function isCustomPropsOnly(interiorText: string): boolean {
  const entries = splitTopLevel(interiorText, ",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
  if (entries.length === 0) return true;
  for (const entry of entries) {
    if (entry.startsWith("...")) return false; // spread -- R8
    const colonAt = findTopLevelColon(entry);
    const keyText = (colonAt === -1 ? entry : entry.slice(0, colonAt)).trim();
    if (keyText.startsWith("[")) return false; // computed key -- R8
    const quote = keyText[0];
    const bare = quote === '"' || quote === "'" ? keyText.slice(1, keyText.lastIndexOf(quote)) : keyText;
    if (!bare.startsWith("--")) return false;
  }
  return true;
}

const STYLE_BLOCK_OPEN = /\bstyle\s*=\s*\{\s*\{/g;

/** Every `style={{` block in `masked` (a `.tsx` file's masked source) that is NOT custom-props-only. */
export function findStyleBlockIndices(masked: string): number[] {
  const indices: number[] = [];
  const re = new RegExp(STYLE_BLOCK_OPEN.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked))) {
    const objOpen = m.index + m[0].length - 1; // the object literal's own '{'
    const objClose = findMatchingBrace(masked, objOpen);
    if (objClose === -1) continue; // unterminated/malformed -- skip, deterministic
    const interior = masked.slice(objOpen + 1, objClose);
    if (isCustomPropsOnly(interior)) continue;
    indices.push(m.index);
  }
  return indices;
}

// ---------------------------------------------------------------------------
// Metric (b): hand-typed colours, anywhere in the file (R7)
// ---------------------------------------------------------------------------

/**
 * R7: complete runs of 3/4/6/8 hex digits, never when the `#` is
 * preceded by `&` (a numeric HTML entity such as `&#8217;`), plus every
 * `rgb(`/`rgba(`/`hsl(`/`hsla(` call -- including inside `color-mix(...)`
 * and inside a token fallback such as `var(--ok, #7fb98f)` (DoorSheet.tsx
 * real Ground). Named colours (`red`, `white`) are a known gap (R7/R10).
 */
export function findColourIndices(masked: string): number[] {
  const indices: number[] = [];
  const hexRe = /(?<!&)#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{3})(?![0-9A-Fa-f])/g;
  let m: RegExpExecArray | null;
  while ((m = hexRe.exec(masked))) indices.push(m.index);
  const fnRe = /\b(?:rgba?|hsla?)\(/g;
  while ((m = fnRe.exec(masked))) indices.push(m.index);
  indices.sort((x, y) => x - y);
  return indices;
}

// ---------------------------------------------------------------------------
// Metric (c): styled buttons -- style= AND a btn/kit-btn className token
// ---------------------------------------------------------------------------

/** Collects only the literal text of a template literal, replacing each `${...}` with a single space. */
function extractTemplateStaticText(src: string, backtickIndex: number): string {
  let out = "";
  let j = backtickIndex + 1;
  while (j < src.length) {
    const c = src[j];
    if (c === "\\") {
      out += src[j + 1] ?? "";
      j += 2;
      continue;
    }
    if (c === "`") break;
    if (c === "$" && src[j + 1] === "{") {
      out += " ";
      j = skipInterpolation(src, j + 2);
      continue;
    }
    out += c;
    j++;
  }
  return out;
}

/**
 * Recovers whatever STATIC class-name text a tag's `className` attribute
 * carries: a plain string, a bare template literal (SubscribeForm.tsx's
 * real
 * `className={\`btn btn-rose${label ? " btn-sm" : ""}\`}`), or every
 * quoted string found inside a `{ ... }` expression (covers a simple
 * ternary, Build 2c's third case). `className={someVariable}` or a
 * value built by a helper yields "" -- a known, documented gap (R10).
 */
export function extractClassNameText(tagText: string): string {
  const m = /\bclassName\s*=\s*/.exec(tagText);
  if (!m) return "";
  const i = m.index + m[0].length;
  const c = tagText[i];
  if (c === '"' || c === "'") {
    const end = skipOpaque(tagText, i);
    return tagText.slice(i + 1, end - 1);
  }
  if (c === "{") {
    const end = findMatchingBrace(tagText, i);
    if (end === -1) return "";
    const inner = tagText.slice(i + 1, end).trim();
    if (inner.startsWith("`")) return extractTemplateStaticText(inner, 0);
    const strings: string[] = [];
    const strRe = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;
    let sm: RegExpExecArray | null;
    while ((sm = strRe.exec(inner))) strings.push(sm[0].slice(1, -1));
    return strings.join(" ");
  }
  return "";
}

/** RULED (Build 2c): a button class token is exactly `btn`/`kit-btn`, or starts `btn-`/`kit-btn-`. */
export function hasButtonClassToken(classText: string): boolean {
  const tokens = classText.split(/\s+/).filter(Boolean);
  return tokens.some((t) => t === "btn" || t === "kit-btn" || t.startsWith("btn-") || t.startsWith("kit-btn-"));
}

/** style= present (any form -- `style={{...}}` or `style={variable}`, Build 2c) AND a qualifying className. */
export function isStyledButton(tagText: string): boolean {
  if (!/\bstyle\s*=/.test(tagText)) return false;
  return hasButtonClassToken(extractClassNameText(tagText));
}

const TAG_START = /<([A-Za-z][\w.]*)/g;

/** Every tag in `masked` that is a styled button, of any tag kind (StudioHub.tsx's real `<a>`). */
export function findStyledButtonIndices(masked: string): number[] {
  const indices: number[] = [];
  const re = new RegExp(TAG_START.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked))) {
    const lt = m.index;
    const before = lt > 0 ? masked[lt - 1] : "";
    if (/[A-Za-z0-9_$]/.test(before)) continue; // e.g. useState<Foo>(...) -- not a tag (R9)
    const end = findTagEnd(masked, lt);
    if (end === -1) continue; // e.g. a stray '<T,>' generic that never closes as a tag -- skip
    const tagText = masked.slice(lt, end + 1);
    if (isStyledButton(tagText)) indices.push(lt);
  }
  return indices;
}

// ---------------------------------------------------------------------------
// Metric (d): !important and real serif declarations, in CSS
// ---------------------------------------------------------------------------

export function findImportantIndices(masked: string): number[] {
  const indices: number[] = [];
  const re = /!important\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked))) indices.push(m.index);
  return indices;
}

/** Removes every `var(...)` call (balanced, nested fallbacks included) from a declaration's value. */
function stripVarCalls(value: string): string {
  let result = "";
  let i = 0;
  while (i < value.length) {
    if (value.startsWith("var(", i)) {
      let depth = 1;
      let j = i + 4;
      while (j < value.length && depth > 0) {
        if (value[j] === "(") depth++;
        else if (value[j] === ")") depth--;
        j++;
      }
      i = j;
      result += " ";
      continue;
    }
    result += value[i];
    i++;
  }
  return result;
}

const FONT_DECL = /\b(?:font-family|font)\s*:\s*([^;{}]*)/g;
const REAL_SERIF = /(?<!sans-)\bserif\b/i;

/**
 * Scopes to `font-family:`/`font:` declarations only (never a bare
 * "serif" grep -- `cartridges.css:471` names a MONOSPACE stack
 * `--serif`, a live custom-property NAME, not a value; this regex only
 * matches the property names `font-family`/`font` themselves, so a
 * `--serif:` custom-property definition is never even examined). Strips
 * every `var(...)` call (nested fallbacks included --
 * `globals.css`'s real `var(--font-h1, var(--serif, inherit))` reduces
 * to nothing) before checking what remains for a standalone `serif` not
 * preceded by `sans-`.
 */
export function findSerifIndices(masked: string): number[] {
  const indices: number[] = [];
  const re = new RegExp(FONT_DECL.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked))) {
    const stripped = stripVarCalls(m[1] ?? "");
    if (REAL_SERIF.test(stripped)) indices.push(m.index);
  }
  return indices;
}

// ---------------------------------------------------------------------------
// File-tree scanning -- plain node:fs, synchronous, no AST/parser (Build 7)
// ---------------------------------------------------------------------------

/** Recursive `*.css`/`*.tsx` discovery built from `fs.readdirSync` alone (no third-party walker). */
function listFilesRecursive(rootDir: string, extension: string): string[] {
  const out: string[] = [];
  const stack: string[] = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && full.endsWith(extension)) out.push(full);
    }
  }
  return out.sort();
}

function newlineOffsets(s: string): number[] {
  const offsets: number[] = [];
  for (let i = 0; i < s.length; i++) if (s[i] === "\n") offsets.push(i);
  return offsets;
}

/** 1-based line number containing `index`, via binary search over precomputed newline offsets. */
function lineForIndex(offsets: number[], index: number): number {
  let lo = 0;
  let hi = offsets.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid] < index) lo = mid + 1;
    else hi = mid;
  }
  return lo + 1;
}

function toHits(raw: string, offsets: number[], lines: string[], indices: number[]): Hit[] {
  return indices.map((index) => {
    const line = lineForIndex(offsets, index);
    return { index, line, snippet: (lines[line - 1] ?? "").trim() };
  });
}

export function scanTsxContent(raw: string): TsxMetrics {
  const masked = maskSource(raw);
  const offsets = newlineOffsets(raw);
  const lines = raw.split("\n");
  const styleBlocks = findStyleBlockIndices(masked);
  const colours = findColourIndices(masked);
  const styledButtons = findStyledButtonIndices(masked);
  return {
    styleBlocks: { count: styleBlocks.length, hits: toHits(raw, offsets, lines, styleBlocks) },
    colours: { count: colours.length, hits: toHits(raw, offsets, lines, colours) },
    styledButtons: { count: styledButtons.length, hits: toHits(raw, offsets, lines, styledButtons) },
  };
}

export function scanCssContent(raw: string): CssMetrics {
  const masked = maskSource(raw);
  const offsets = newlineOffsets(raw);
  const lines = raw.split("\n");
  const important = findImportantIndices(masked);
  const serif = findSerifIndices(masked);
  return {
    important: { count: important.length, hits: toHits(raw, offsets, lines, important) },
    serif: { count: serif.length, hits: toHits(raw, offsets, lines, serif) },
  };
}

/** Walks every `.tsx` and `.css` file under `<repoRoot>/src`, keyed by repo-relative forward-slash paths. */
export function scanTree(repoRoot: string): Measured {
  const tsx: Measured["tsx"] = {};
  for (const abs of listFilesRecursive(path.join(repoRoot, "src"), ".tsx")) {
    const rel = path.relative(repoRoot, abs).split(path.sep).join("/");
    tsx[rel] = scanTsxContent(fs.readFileSync(abs, "utf8"));
  }
  const css: Measured["css"] = {};
  for (const abs of listFilesRecursive(path.join(repoRoot, "src"), ".css")) {
    const rel = path.relative(repoRoot, abs).split(path.sep).join("/");
    css[rel] = scanCssContent(fs.readFileSync(abs, "utf8"));
  }
  return { tsx, css };
}

// ---------------------------------------------------------------------------
// Ceilings: build / merge (write modes) / compare (the ratchet) / format
// ---------------------------------------------------------------------------

export function buildInitialCeilings(measured: Measured): Ceilings {
  const tsx: Ceilings["tsx"] = {};
  for (const [file, m] of Object.entries(measured.tsx)) {
    tsx[file] = { styleBlocks: m.styleBlocks.count, colours: m.colours.count, styledButtons: m.styledButtons.count };
  }
  const css: Ceilings["css"] = {};
  for (const [file, m] of Object.entries(measured.css)) {
    css[file] = { important: m.important.count, serif: m.serif.count };
  }
  return { tsx, css };
}

/**
 * R2's pure merge: every ceiling becomes `min(old, measured)`, a path
 * missing from `measured` (its file is gone) is dropped, and a path
 * with no prior record is added at `min(measured, new-file allowance)`
 * per metric. Never raises a number under any input.
 */
export function mergeCeilings(old: Ceilings, measured: Measured): Ceilings {
  const tsx: Ceilings["tsx"] = {};
  for (const [file, m] of Object.entries(measured.tsx)) {
    const prev = old.tsx[file];
    const allowance = prev ?? NEW_FILE_TSX_ALLOWANCE;
    tsx[file] = {
      styleBlocks: Math.min(allowance.styleBlocks, m.styleBlocks.count),
      colours: Math.min(allowance.colours, m.colours.count),
      styledButtons: Math.min(allowance.styledButtons, m.styledButtons.count),
    };
  }
  const css: Ceilings["css"] = {};
  for (const [file, m] of Object.entries(measured.css)) {
    const prev = old.css[file];
    const allowance = prev ?? NEW_FILE_CSS_ALLOWANCE;
    css[file] = {
      important: Math.min(allowance.important, m.important.count),
      serif: Math.min(allowance.serif, m.serif.count),
    };
  }
  return { tsx, css };
}

function ceilingForTsx(rec: TsxCeiling | undefined, metric: keyof TsxCeiling): number {
  if (rec) return rec[metric];
  return metric === "styleBlocks" ? NEW_FILE_STYLE_ALLOWANCE : 0;
}

const TSX_METRICS: Array<keyof TsxCeiling> = ["styleBlocks", "colours", "styledButtons"];
const CSS_METRICS: Array<keyof CssCeiling> = ["important", "serif"];

/**
 * The ratchet itself: `measured <= ceiling` for every scanned file and
 * metric (R1: absent `.tsx` record = new-file allowance; R4: absent CSS
 * record = fail outright, no allowance; R3: a recorded file that no
 * longer exists on disk fails too).
 */
export function compareCeilings(ceilings: Ceilings, measured: Measured): Violation[] {
  const violations: Violation[] = [];

  for (const file of Object.keys(measured.tsx).sort()) {
    const m = measured.tsx[file];
    const rec = ceilings.tsx[file];
    for (const metric of TSX_METRICS) {
      const measuredCount = m[metric].count;
      const ceiling = ceilingForTsx(rec, metric);
      if (measuredCount > ceiling) {
        violations.push({ kind: "ceiling", file, metric, measured: measuredCount, ceiling, examples: m[metric].hits.slice(0, 2) });
      }
    }
  }

  for (const file of Object.keys(measured.css).sort()) {
    const m = measured.css[file];
    const rec = ceilings.css[file];
    if (!rec) {
      violations.push({ kind: "untracked-stylesheet", file });
      continue;
    }
    for (const metric of CSS_METRICS) {
      const measuredCount = m[metric].count;
      const ceiling = rec[metric];
      if (measuredCount > ceiling) {
        violations.push({ kind: "ceiling", file, metric, measured: measuredCount, ceiling, examples: m[metric].hits.slice(0, 2) });
      }
    }
  }

  for (const file of Object.keys(ceilings.tsx).sort()) {
    if (!(file in measured.tsx)) violations.push({ kind: "missing-file", file });
  }
  for (const file of Object.keys(ceilings.css).sort()) {
    if (!(file in measured.css)) violations.push({ kind: "missing-file", file });
  }

  return violations;
}

/** R11: the listed locations are "examples of matches in this file", never "the lines you added". */
export function formatFailureMessage(violations: Violation[]): string {
  const lines: string[] = [FAILURE_HEADER];
  for (const v of violations) {
    if (v.kind === "untracked-stylesheet") {
      lines.push(`  ${v.file} -- no ceilings record for this stylesheet (a new stylesheet needs Number One's word)`);
      continue;
    }
    if (v.kind === "missing-file") {
      lines.push(`  ${v.file} -- recorded in the ceilings file but no longer exists; run write mode to drop it`);
      continue;
    }
    lines.push(`  ${v.file} -- ${v.metric}: measured ${v.measured}, ceiling ${v.ceiling}`);
    if (v.examples.length > 0) {
      lines.push("    examples of matches in this file:");
      for (const ex of v.examples) lines.push(`    ${ex.line}: ${ex.snippet}`);
    }
  }
  lines.push(FAILURE_FOOTER);
  return lines.join("\n");
}

/** R2: pure decision of what an invocation should do, given the env var and whether the file exists. */
export function resolveWriteMode(env: string | undefined, ceilingsFileExists: boolean): WriteResolution {
  if (env === "init") {
    if (ceilingsFileExists) {
      return {
        mode: "init",
        error:
          "DESIGN_DRIFT_WRITE=init refuses: tests/design-drift.ceilings.json already exists -- use DESIGN_DRIFT_WRITE=1 to ratchet it instead.",
      };
    }
    return { mode: "init" };
  }
  if (env === "1") return { mode: "ratchet" };
  return { mode: "check" };
}

function isTsxCeilingRecord(v: unknown): v is TsxCeiling {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return typeof r.styleBlocks === "number" && typeof r.colours === "number" && typeof r.styledButtons === "number";
}

function isCssCeilingRecord(v: unknown): v is CssCeiling {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return typeof r.important === "number" && typeof r.serif === "number";
}

/** R3: fail closed on anything that isn't exactly the expected shape. */
export function parseCeilings(raw: string): Ceilings {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("DESIGN DRIFT: tests/design-drift.ceilings.json is not valid JSON.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("DESIGN DRIFT: tests/design-drift.ceilings.json is not a JSON object.");
  }
  const obj = data as Record<string, unknown>;
  if (!obj.css || typeof obj.css !== "object" || Array.isArray(obj.css)) {
    throw new Error('DESIGN DRIFT: tests/design-drift.ceilings.json is missing a valid "css" object.');
  }
  if (!obj.tsx || typeof obj.tsx !== "object" || Array.isArray(obj.tsx)) {
    throw new Error('DESIGN DRIFT: tests/design-drift.ceilings.json is missing a valid "tsx" object.');
  }
  const cssEntries = obj.css as Record<string, unknown>;
  for (const file of Object.keys(cssEntries)) {
    if (!isCssCeilingRecord(cssEntries[file])) {
      throw new Error(`DESIGN DRIFT: tests/design-drift.ceilings.json's css record for "${file}" is wrongly shaped.`);
    }
  }
  const tsxEntries = obj.tsx as Record<string, unknown>;
  for (const file of Object.keys(tsxEntries)) {
    if (!isTsxCeilingRecord(tsxEntries[file])) {
      throw new Error(`DESIGN DRIFT: tests/design-drift.ceilings.json's tsx record for "${file}" is wrongly shaped.`);
    }
  }
  return { css: cssEntries as Ceilings["css"], tsx: tsxEntries as Ceilings["tsx"] };
}

/** R2: stable output -- keys sorted, two-space indent, a trailing newline, no timestamps, no sha. */
export function serializeCeilings(ceilings: Ceilings): string {
  const sortRecord = <T,>(rec: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.keys(rec).sort().map((k) => [k, rec[k]]));
  const stable = { css: sortRecord(ceilings.css), tsx: sortRecord(ceilings.tsx) };
  return `${JSON.stringify(stable, null, 2)}\n`;
}

// ---------------------------------------------------------------------------
// Test helpers (test-only; not part of the scanner's own exported surface)
// ---------------------------------------------------------------------------

function hit(line: number, snippet: string, index = 0): Hit {
  return { index, line, snippet };
}

function metric(count: number, hits: Hit[] = []): FileMetric {
  return { count, hits };
}

function measuredTsx(entries: Record<string, Partial<TsxMetrics>>): Measured {
  const tsx: Measured["tsx"] = {};
  for (const [file, m] of Object.entries(entries)) {
    tsx[file] = {
      styleBlocks: m.styleBlocks ?? metric(0),
      colours: m.colours ?? metric(0),
      styledButtons: m.styledButtons ?? metric(0),
    };
  }
  return { tsx, css: {} };
}

function measuredCss(entries: Record<string, Partial<CssMetrics>>): Measured {
  const css: Measured["css"] = {};
  for (const [file, m] of Object.entries(entries)) {
    css[file] = { important: m.important ?? metric(0), serif: m.serif ?? metric(0) };
  }
  return { tsx: {}, css };
}

// ===========================================================================
// Unit tests
// ===========================================================================

describe("maskSource -- one lexical pass, length-preserving (R5)", () => {
  it("blanks a block comment's contents but keeps newlines and the surrounding code", () => {
    const src = "const a = 1; /* comment\nline two */ const b = 2;";
    const masked = maskSource(src);
    expect(masked.length).toBe(src.length);
    expect(masked).not.toContain("comment");
    expect(masked).toContain("const a = 1;");
    expect(masked).toContain("const b = 2;");
    expect((masked.match(/\n/g) || []).length).toBe((src.match(/\n/g) || []).length);
  });

  it("masks a JSX comment's content but the count only ever sees the real hex outside it", () => {
    // real shape: StoreItemCard.tsx's comment cites #f3dce3, the real
    // gradient right after uses the same hex value for real
    const src =
      '<div className="thumb" style={{ display: "grid",\n' +
      "  /* #f3dce3 stays literal -- it's the cartridge.ts `blush` brand def, kept as data (S2) */\n" +
      '  background: "linear-gradient(135deg,#f3dce3,var(--lavender-soft))" }}>\n' +
      "</div>";
    const masked = maskSource(src);
    expect(findColourIndices(masked)).toHaveLength(1); // only the real one, not the comment's citation
  });

  it("does not touch a string containing what looks like a comment", () => {
    const src = 'const s = "/* not a real comment */"; const hex = "#123456";';
    const masked = maskSource(src);
    expect(masked).toContain("/* not a real comment */");
    expect(findColourIndices(masked)).toHaveLength(1);
  });

  it("a /* inside a double-quoted string never starts a comment (R9)", () => {
    const src = 'const s = "a /* not a comment"; const hex = "#ff0000";';
    const masked = maskSource(src);
    expect(findColourIndices(masked)).toHaveLength(1); // the hex after it must still be visible
  });

  it("a /* inside a template literal's raw text (a URL) never starts a comment (R9)", () => {
    const src = "const u = `http://example.com/*/logo.png`; const hex = \"#ff0000\";";
    const masked = maskSource(src);
    expect(findColourIndices(masked)).toHaveLength(1);
  });

  it("still masks a real comment sitting inside a template literal's ${} interpolation", () => {
    const src = "const s = `hi ${/* #abcdef */ 1 + 1}`; const hex = \"#123456\";";
    const masked = maskSource(src);
    expect(findColourIndices(masked)).toHaveLength(1); // only the real #123456, not the interpolation's comment
  });

  it("a numeric HTML entity is never miscounted as a hex colour (the & guard, R7)", () => {
    const src = "<p>curly quote &#8217; and a real one #abcdef</p>";
    const masked = maskSource(src);
    expect(findColourIndices(masked)).toHaveLength(1);
  });
});

describe("findMatchingBrace / findTagEnd -- the shared bracket-depth walker", () => {
  it("findMatchingBrace finds the object literal's own close, unaffected by a trailing cast (sections.tsx's real shape)", () => {
    const src = 'style={{ "--cols": "minmax(0,.8fr) minmax(0,1.2fr)" } as CSSProperties}';
    const objOpen = src.indexOf("{", src.indexOf("{") + 1);
    const close = findMatchingBrace(src, objOpen);
    expect(src.slice(objOpen, close + 1)).toBe('{ "--cols": "minmax(0,.8fr) minmax(0,1.2fr)" }');
  });

  it("findTagEnd spans a multi-line tag", () => {
    const src = '<button\n  className="btn btn-rose"\n  style={{ color: "red" }}\n>\n  Click\n</button>';
    const end = findTagEnd(src, 0);
    expect(src.slice(0, end + 1)).toBe('<button\n  className="btn btn-rose"\n  style={{ color: "red" }}\n>');
  });

  it("a title attribute's '>' inside a string never ends the tag early", () => {
    const src = '<div title="a > b" className="btn" style={{}}>x</div>';
    const end = findTagEnd(src, 0);
    expect(src[end]).toBe(">");
    expect(src.slice(0, end + 1)).toBe('<div title="a > b" className="btn" style={{}}>');
  });

  it("a comparison and an arrow function inside an attribute expression don't end the tag early (R9)", () => {
    const src = '<button className="btn" style={{}} onClick={() => count > 5 ? bump() : reset()}>Go</button>';
    expect(findStyledButtonIndices(maskSource(src))).toHaveLength(1);
  });

  it("a template literal whose interpolation itself contains a backtick string doesn't confuse the walk (R9)", () => {
    const src = "<button className=\"btn\" style={{}} data-label={`outer ${`inner ${1 + 1}`} done`}>Go</button>";
    expect(findStyledButtonIndices(maskSource(src))).toHaveLength(1);
  });

  it("escaped quotes inside a string don't end the string early (R9)", () => {
    const src = '<button className="btn" style={{}} title="she said \\"hi\\" then left">Go</button>';
    expect(findStyledButtonIndices(maskSource(src))).toHaveLength(1);
  });

  it("findMatchingBrace returns -1 on a stray close with no matching open (deterministic, never throws)", () => {
    expect(findMatchingBrace("}", 0)).toBe(-1);
  });

  it("findTagEnd returns -1 rather than mis-terminating on a stray '}' (R6)", () => {
    expect(findTagEnd("<Foo bar}>", 0)).toBe(-1);
  });
});

describe("false tags never inflate the styled-button count (R6/R9)", () => {
  it("a generic type instantiation (useState<Foo>) is not treated as a real tag", () => {
    const src = 'const [x, setX] = useState<Foo>(null); return <button className="btn" style={{}}>Go</button>;';
    expect(findStyledButtonIndices(maskSource(src))).toHaveLength(1);
  });

  it("a trailing-comma generic arrow (<T,>) does not create a false styled-button count", () => {
    const src = 'const identity = <T,>(x: T) => x; return <button className="btn" style={{}}>Go</button>;';
    expect(findStyledButtonIndices(maskSource(src))).toHaveLength(1);
  });

  it("a chained comparison never accidentally completes a fake tag with a real style=/className= inside it", () => {
    const src = 'const ok = a < b && c > d; return <button className="btn" style={{}}>Go</button>;';
    expect(findStyledButtonIndices(maskSource(src))).toHaveLength(1);
  });
});

describe("isCustomPropsOnly -- metric (a)'s exemption (R8)", () => {
  it("qualifies: every key is a custom property (sections.tsx:146's real shape)", () => {
    expect(isCustomPropsOnly('"--cols": "minmax(0,.8fr) minmax(0,1.2fr)"')).toBe(true);
  });

  it("does NOT qualify: a mixed block (CartTimePicker.tsx's real shape)", () => {
    expect(isCustomPropsOnly('"--chip-min": "128px", marginBottom: 12')).toBe(false);
  });

  it("does NOT qualify: a mixed block with the custom prop second (AdminWeekGrid.tsx's real shape)", () => {
    expect(
      isCustomPropsOnly(
        '"--size": "34px", background: "var(--glass)", borderColor: "rgba(139,118,196,.45)", color: "var(--info)", fontSize: "1rem"',
      ),
    ).toBe(false);
  });

  it("does NOT qualify: a mixed block (ImageLightbox.tsx's real shape, multi-line)", () => {
    expect(
      isCustomPropsOnly(
        '"--size": "44px", position: "absolute", left: 16, top: "50%",\n                  transform: "translateY(-50%)", fontSize: "1.3rem"',
      ),
    ).toBe(false);
  });

  it("a spread makes it NOT exempt, even alongside a real custom property (R8)", () => {
    expect(isCustomPropsOnly('...base, "--x": "1"')).toBe(false);
  });

  it("a computed key makes it NOT exempt (R8)", () => {
    expect(isCustomPropsOnly('[dynamicKey]: "1", "--x": "2"')).toBe(false);
  });

  it("tolerates a trailing comma when every real key is a custom property (R8)", () => {
    expect(isCustomPropsOnly('"--cols": "1fr",')).toBe(true);
  });

  it("an empty object is vacuously exempt", () => {
    expect(isCustomPropsOnly("")).toBe(true);
    expect(isCustomPropsOnly("   ")).toBe(true);
  });

  it("end to end: a spread in a style object is counted even though the other key is a custom property", () => {
    const src = 'const base = {}; const el = <div style={{ ...base, "--x": "1" }} />;';
    expect(findStyleBlockIndices(maskSource(src))).toHaveLength(1);
  });

  it("end to end: a computed key in a style object is counted", () => {
    const src = 'const k = "--x"; const el = <div style={{ [k]: "1" }} />;';
    expect(findStyleBlockIndices(maskSource(src))).toHaveLength(1);
  });

  it("end to end: a trailing comma plus a cast after the object is still exempt when every key is custom (R8)", () => {
    const src = 'const el = <div style={{ "--cols": "1fr", } as CSSProperties} />;';
    expect(findStyleBlockIndices(maskSource(src))).toHaveLength(0);
  });

  it("end to end: sections.tsx's real custom-props-only block is exempt", () => {
    const src = '<div className="two-col" style={{ "--cols": "minmax(0,.8fr) minmax(0,1.2fr)" } as CSSProperties}>x</div>';
    expect(findStyleBlockIndices(maskSource(src))).toHaveLength(0);
  });

  it("end to end: CartTimePicker.tsx's real mixed block is counted", () => {
    const src = '<ul className="chip-grid" style={{ "--chip-min": "128px", marginBottom: 12 } as React.CSSProperties}>x</ul>';
    expect(findStyleBlockIndices(maskSource(src))).toHaveLength(1);
  });
});

describe("what the guard does not see -- verified against real shapes (R10)", () => {
  it("a style object held in a variable is not `style={{` (DoorSheet.tsx's real shape)", () => {
    const src = 'const field: React.CSSProperties = {\n  width: "100%", boxSizing: "border-box",\n};';
    expect(findStyleBlockIndices(maskSource(src))).toHaveLength(0);
  });

  it("a style object chosen by a condition is not `style={{` (WildDoors.tsx's real shape)", () => {
    const src = '<span className="beast" style={d.beastInk ? { color: d.beastInk } : undefined}>{d.beast}</span>';
    expect(findStyleBlockIndices(maskSource(src))).toHaveLength(0);
  });

  it("a component invoked with style= but no className token at the call site is not a styled button (SignInCard.tsx's real shape)", () => {
    const src = '<Button type="submit" sm disabled={busy} style={{ width: "100%" }}>{cta}</Button>';
    expect(findStyledButtonIndices(maskSource(src))).toHaveLength(0);
  });

  it("adding a property inside an existing block does not move the count", () => {
    const before = '<div style={{ color: "red" }} />';
    const after = '<div style={{ color: "red", padding: 4 }} />';
    expect(findStyleBlockIndices(maskSource(before))).toHaveLength(1);
    expect(findStyleBlockIndices(maskSource(after))).toHaveLength(1);
  });
});

describe("findColourIndices -- metric (b) (R7)", () => {
  it("real: WildDoors.tsx's comment citation is masked, the real string value beside it still counts", () => {
    const src =
      "{\n" +
      "  /* the card-body literal #3f3a4e (the S21 ruling, 4.60:1 on this card's\n" +
      "     ground in BOTH themes) -- a drawn glyph obeys the same contrast law */\n" +
      '  beastInk: "#3f3a4e",\n' +
      '  ground: "linear-gradient(180deg,#e2f0da 0%,#a8cd9c 55%,#6f9e6e 100%)",\n' +
      "}";
    const masked = maskSource(src);
    expect(findColourIndices(masked)).toHaveLength(4); // beastInk's hex + the gradient's three stops
  });

  it("real: PopupHost.tsx's inline comment sits beside a real hex on the SAME line", () => {
    const src =
      'style={{ background: "none", color: "#D9D2E4", /* S2: pinned (always-night card) -- the --ink-body night value; the old #9a8fae muted failed contrast at 16px */ fontSize: 18 }}';
    const masked = maskSource(src);
    expect(findColourIndices(masked)).toHaveLength(1); // #D9D2E4 only, #9a8fae is inside the comment
  });

  it("real: a var() fallback hex counts (DoorSheet.tsx's real shape)", () => {
    const src = '<span style={{ color: "var(--ok, #7fb98f)" }}>text</span>';
    expect(findColourIndices(maskSource(src))).toHaveLength(1);
  });

  it("rgb/rgba/hsl/hsla all count, including inside color-mix()", () => {
    const src = 'style={{ a: "rgba(0,0,0,.5)", b: "hsl(200 40% 50%)", c: "color-mix(in oklab, rgb(1,2,3) 40%, transparent)" }}';
    expect(findColourIndices(maskSource(src))).toHaveLength(3);
  });

  it("exact-length runs only: a 5-digit run after # is not mistaken for a 4- or 3-digit hex", () => {
    const src = 'const x = "#abcde";'; // not 3/4/6/8 -- must not match at all
    expect(findColourIndices(maskSource(src))).toHaveLength(0);
  });

  it("3/4/6/8-digit hex all count", () => {
    const src = 'const a = "#abc"; const b = "#abcd"; const c = "#aabbcc"; const d = "#aabbccdd";';
    expect(findColourIndices(maskSource(src))).toHaveLength(4);
  });
});

describe("findStyledButtonIndices / isStyledButton -- metric (c) (Build 2c/R9)", () => {
  it("real: DoorSheet.tsx's <button> with a plain-string className", () => {
    const src = '<button className="btn btn-rose" type="submit" disabled={busy} style={{ width: "100%", boxSizing: "border-box" }}>Go</button>';
    expect(findStyledButtonIndices(maskSource(src))).toHaveLength(1);
  });

  it("real: MePanel.tsx's btn-quiet (a bare btn- token, no plain 'btn')", () => {
    const src = '<button type="button" className="btn-quiet" style={{ padding: 0, color: "var(--teal-bright, #8FD0D8)" }}>make active</button>';
    expect(findStyledButtonIndices(maskSource(src))).toHaveLength(1);
  });

  it("real: StudioHub.tsx's <a> proves the check isn't <button>-specific", () => {
    const src = '<a href="#studio-live" className="btn btn-sm btn-ghost" style={{ marginLeft: "auto" }}>Go to live controls</a>';
    expect(findStyledButtonIndices(maskSource(src))).toHaveLength(1);
  });

  it("real: SubscribeForm.tsx's template-literal className is correctly parsed, but the tag is NOT a styled button (no style=)", () => {
    const src = '<button className={`btn btn-rose${label ? " btn-sm" : ""}`} type="submit" disabled={state === "busy"}>Send</button>';
    const masked = maskSource(src);
    expect(findStyledButtonIndices(masked)).toHaveLength(0); // no style= at all
    // isolate the className parsing itself: it must still find the real tokens
    const tagEnd = findTagEnd(masked, 0);
    const tagText = masked.slice(0, tagEnd + 1);
    expect(hasButtonClassToken(extractClassNameText(tagText))).toBe(true);
  });

  it("synthetic (R9): a kit-btn token with a style attribute counts (no real example exists today)", () => {
    const src = '<button className="kit-btn-main" style={{ color: "red" }}>Click</button>';
    expect(findStyledButtonIndices(maskSource(src))).toHaveLength(1);
  });

  it("synthetic (R9): style={variable} counts just as much as style={{...}} (Build 2c)", () => {
    const src = '<button className="btn" style={statusStyle}>Save</button>';
    expect(findStyledButtonIndices(maskSource(src))).toHaveLength(1);
  });

  it("synthetic (R9): an anchor with a button class and a style attribute counts", () => {
    const src = '<a className="btn-ghost" style={{ padding: 4 }} href="/x">Go</a>';
    expect(findStyledButtonIndices(maskSource(src))).toHaveLength(1);
  });

  it("a plain className with no button token and no style= is not counted", () => {
    const src = '<div className="wrap">text</div>';
    expect(findStyledButtonIndices(maskSource(src))).toHaveLength(0);
  });

  it("a styled div with a non-button className is not counted", () => {
    const src = '<div className="card" style={{ padding: 4 }}>text</div>';
    expect(findStyledButtonIndices(maskSource(src))).toHaveLength(0);
  });
});

describe("findImportantIndices -- metric (d), css (R5)", () => {
  it("counts a real !important and ignores one sitting inside a comment", () => {
    const css = ".a{color:red!important} /* .b{color:blue!important} */";
    expect(findImportantIndices(maskSource(css))).toHaveLength(1);
  });

  it("counts more than one real occurrence", () => {
    const css = ".a{color:red!important;padding:0!important}";
    expect(findImportantIndices(maskSource(css))).toHaveLength(2);
  });
});

describe("findSerifIndices -- metric (d), css (Build 2/R10's --serif token-name trap)", () => {
  it("a real serif stack counts", () => {
    expect(findSerifIndices(maskSource(".a{font-family:Georgia,serif}"))).toHaveLength(1);
  });

  it("sans-serif is excluded", () => {
    expect(findSerifIndices(maskSource(".a{font-family:Arial,sans-serif}"))).toHaveLength(0);
  });

  it("a --serif custom-property NAME is never mistaken for a font-family declaration (real cartridges.css shape)", () => {
    const css = "--serif:ui-monospace,Menlo,Consolas,monospace;";
    expect(findSerifIndices(maskSource(css))).toHaveLength(0);
  });

  it("real: house.css's font-family:var(--serif) resolves to 0 -- the whole value is one var() call", () => {
    expect(findSerifIndices(maskSource('.stack-hero .sh-amp{font-family:var(--serif);font-weight:400}'))).toHaveLength(0);
  });

  it("real: globals.css's nested var() fallback strips entirely", () => {
    const css = '.mgmt-body h1 { font-family: var(--font-h1, var(--serif, inherit)); letter-spacing: 0; }';
    expect(findSerifIndices(maskSource(css))).toHaveLength(0);
  });

  it("a literal fallback OUTSIDE the var() call still counts as real drift", () => {
    const css = ".a{font-family: var(--special-font), serif;}";
    expect(findSerifIndices(maskSource(css))).toHaveLength(1);
  });

  it("shorthand font: with a real serif counts too (no real example exists today, per Ground)", () => {
    expect(findSerifIndices(maskSource(".a{font:bold 14px/1.4 Georgia,serif}"))).toHaveLength(1);
  });

  it("font-size/font-weight/font-style are never mistaken for the font: shorthand", () => {
    const css = ".a{font-size:14px;font-weight:700;font-style:italic}";
    expect(findSerifIndices(maskSource(css))).toHaveLength(0);
  });
});

describe("resolveWriteMode -- pure, no file IO (R2)", () => {
  it("defaults to check mode with no env var set", () => {
    expect(resolveWriteMode(undefined, true)).toEqual({ mode: "check" });
    expect(resolveWriteMode(undefined, false)).toEqual({ mode: "check" });
  });

  it("init is allowed, with no error, only when the ceilings file does not yet exist", () => {
    const r = resolveWriteMode("init", false);
    expect(r.mode).toBe("init");
    expect((r as { error?: string }).error).toBeUndefined();
  });

  it("init refuses with a sentence explaining why when the file already exists (R2)", () => {
    const r = resolveWriteMode("init", true);
    expect(r.mode).toBe("init");
    expect((r as { error?: string }).error).toMatch(/already exists/i);
  });

  it("WRITE=1 resolves to ratchet mode regardless of prior existence", () => {
    expect(resolveWriteMode("1", true)).toEqual({ mode: "ratchet" });
    expect(resolveWriteMode("1", false)).toEqual({ mode: "ratchet" });
  });
});

describe("mergeCeilings -- the pure merge function never raises a ceiling (R2, ORDER OF WORK item c)", () => {
  it("keeps the lower of the old ceiling and the freshly measured count, per metric", () => {
    const old: Ceilings = { css: {}, tsx: { "a.tsx": { styleBlocks: 5, colours: 2, styledButtons: 1 } } };
    const measured = measuredTsx({ "a.tsx": { styleBlocks: metric(9), colours: metric(0), styledButtons: metric(1) } });
    expect(mergeCeilings(old, measured).tsx["a.tsx"]).toEqual({ styleBlocks: 5, colours: 0, styledButtons: 1 });
  });

  it("never raises a ceiling even when every metric measures higher than before", () => {
    const old: Ceilings = { css: {}, tsx: { "a.tsx": { styleBlocks: 1, colours: 1, styledButtons: 1 } } };
    const measured = measuredTsx({ "a.tsx": { styleBlocks: metric(99), colours: metric(99), styledButtons: metric(99) } });
    expect(mergeCeilings(old, measured).tsx["a.tsx"]).toEqual({ styleBlocks: 1, colours: 1, styledButtons: 1 });
  });

  it("drops a recorded file that no longer exists in the tree", () => {
    const old: Ceilings = { css: {}, tsx: { "gone.tsx": { styleBlocks: 1, colours: 0, styledButtons: 0 } } };
    expect(mergeCeilings(old, measuredTsx({})).tsx["gone.tsx"]).toBeUndefined();
  });

  it("adds a brand-new .tsx file at min(measured, new-file allowance) per metric (R1)", () => {
    const old: Ceilings = { css: {}, tsx: {} };
    const measured = measuredTsx({ "new.tsx": { styleBlocks: metric(9), colours: metric(4), styledButtons: metric(2) } });
    expect(mergeCeilings(old, measured).tsx["new.tsx"]).toEqual({ styleBlocks: 3, colours: 0, styledButtons: 0 });
  });

  it("a brand-new css file gets ZERO allowance on both metrics (R4 -- no allowance for a new stylesheet)", () => {
    const old: Ceilings = { css: {}, tsx: {} };
    const measured = measuredCss({ "new.css": { important: metric(5), serif: metric(2) } });
    expect(mergeCeilings(old, measured).css["new.css"]).toEqual({ important: 0, serif: 0 });
  });

  it("output is stable regardless of input key order (serializeCeilings sorts keys)", () => {
    const ceilings: Ceilings = {
      css: { "b.css": { important: 1, serif: 0 }, "a.css": { important: 2, serif: 0 } },
      tsx: {},
    };
    const json = serializeCeilings(ceilings);
    expect(json.indexOf('"a.css"')).toBeLessThan(json.indexOf('"b.css"'));
    expect(json.endsWith("\n")).toBe(true);
  });
});

describe("compareCeilings + formatFailureMessage -- the ratchet's failure shape (ORDER OF WORK item a)", () => {
  it("flags a file whose measured count exceeds its committed ceiling, with the right message shape", () => {
    const ceilings: Ceilings = { css: {}, tsx: { "src/components/foo/Bar.tsx": { styleBlocks: 3, colours: 0, styledButtons: 0 } } };
    const measured = measuredTsx({
      "src/components/foo/Bar.tsx": {
        styleBlocks: metric(7, [hit(12, '<div style={{ color: "red" }}>'), hit(40, '<span style={{ padding: 4 }}>')]),
      },
    });
    const violations = compareCeilings(ceilings, measured);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      kind: "ceiling",
      file: "src/components/foo/Bar.tsx",
      metric: "styleBlocks",
      measured: 7,
      ceiling: 3,
    });
    const message = formatFailureMessage(violations);
    expect(message).toContain("DESIGN DRIFT CEILING EXCEEDED");
    expect(message).toContain("src/components/foo/Bar.tsx -- styleBlocks: measured 7, ceiling 3");
    expect(message).toContain("examples of matches in this file:");
    expect(message).toContain('12: <div style={{ color: "red" }}>');
    expect(message).toContain('40: <span style={{ padding: 4 }}>');
    expect(message).toContain("use a class from kit.css or house.css and a token from cartridge.css; never raise the ceiling.");
  });

  it("R11: the example lines are never phrased as \"the lines you added\"", () => {
    const violations: Violation[] = [{ kind: "ceiling", file: "a.tsx", metric: "colours", measured: 2, ceiling: 1, examples: [hit(1, "x")] }];
    const message = formatFailureMessage(violations);
    expect(message).not.toContain("the lines you added");
    expect(message).toContain("examples of matches in this file");
  });

  it("a .tsx file with no record passes under the new-file allowance", () => {
    const measured = measuredTsx({ "src/new/File.tsx": { styleBlocks: metric(2) } });
    expect(compareCeilings({ css: {}, tsx: {} }, measured)).toHaveLength(0);
  });

  it("a .tsx file with no record still fails past the new-file allowance", () => {
    const measured = measuredTsx({ "src/new/File.tsx": { styleBlocks: metric(4) } });
    const violations = compareCeilings({ css: {}, tsx: {} }, measured);
    expect(violations.some((v) => v.kind === "ceiling" && v.metric === "styleBlocks")).toBe(true);
  });

  it("a stylesheet with no record fails outright, even at zero (R4 -- no allowance)", () => {
    const measured = measuredCss({ "src/app/new-page.css": {} });
    const violations = compareCeilings({ css: {}, tsx: {} }, measured);
    expect(violations).toEqual([{ kind: "untracked-stylesheet", file: "src/app/new-page.css" }]);
  });

  it("a recorded file that no longer exists on disk fails closed (R3)", () => {
    const ceilings: Ceilings = { css: {}, tsx: { "src/gone/Old.tsx": { styleBlocks: 0, colours: 0, styledButtons: 0 } } };
    const violations = compareCeilings(ceilings, measuredTsx({}));
    expect(violations).toEqual([{ kind: "missing-file", file: "src/gone/Old.tsx" }]);
  });

  it("a recorded stylesheet that no longer exists on disk fails closed (R3)", () => {
    const ceilings: Ceilings = { css: { "src/gone/old.css": { important: 0, serif: 0 } }, tsx: {} };
    const violations = compareCeilings(ceilings, measuredCss({}));
    expect(violations).toEqual([{ kind: "missing-file", file: "src/gone/old.css" }]);
  });

  it("no violations when every measured count is within its ceiling", () => {
    const ceilings: Ceilings = { css: { "a.css": { important: 5, serif: 0 } }, tsx: { "a.tsx": { styleBlocks: 3, colours: 1, styledButtons: 0 } } };
    const measured: Measured = {
      tsx: { "a.tsx": { styleBlocks: metric(3), colours: metric(1), styledButtons: metric(0) } },
      css: { "a.css": { important: metric(5), serif: metric(0) } },
    };
    expect(compareCeilings(ceilings, measured)).toHaveLength(0);
  });
});

describe("parseCeilings -- fail closed on anything but the right shape (R3)", () => {
  it("throws on invalid JSON", () => {
    expect(() => parseCeilings("{not json")).toThrow(/not valid JSON/);
  });

  it("throws when css or tsx is missing", () => {
    expect(() => parseCeilings("{}")).toThrow(/"css"/);
    expect(() => parseCeilings('{"css":{}}')).toThrow(/"tsx"/);
  });

  it("throws when a record is wrongly shaped", () => {
    expect(() => parseCeilings('{"css":{},"tsx":{"a.tsx":{"styleBlocks":"nope"}}}')).toThrow(/wrongly shaped/);
  });

  it("accepts a well-formed file", () => {
    const raw = serializeCeilings({ css: { "a.css": { important: 1, serif: 0 } }, tsx: { "a.tsx": { styleBlocks: 1, colours: 0, styledButtons: 0 } } });
    expect(parseCeilings(raw)).toEqual({ css: { "a.css": { important: 1, serif: 0 } }, tsx: { "a.tsx": { styleBlocks: 1, colours: 0, styledButtons: 0 } } });
  });
});

// ===========================================================================
// The ratchet itself, against the real tree -- exactly one of these two
// `it`s exists per invocation, chosen by DESIGN_DRIFT_WRITE (never both:
// a write invocation does not also run the plain check in the same pass).
// ===========================================================================

const WRITE_ENV = process.env.DESIGN_DRIFT_WRITE;

if (WRITE_ENV === "init" || WRITE_ENV === "1") {
  describe(`design drift ceilings -- regenerating (DESIGN_DRIFT_WRITE=${WRITE_ENV})`, () => {
    it("writes tests/design-drift.ceilings.json from the live tree", () => {
      const exists = fs.existsSync(CEILINGS_PATH);
      const resolved = resolveWriteMode(WRITE_ENV, exists);
      if (resolved.mode !== "check" && resolved.error) throw new Error(resolved.error);

      const t0 = performance.now();
      const measured = scanTree(REPO_ROOT);
      const elapsedMs = performance.now() - t0;
      // R12: the scan's own run time belongs in the lane's report
      console.log(
        `[design-drift] scanTree: ${elapsedMs.toFixed(1)}ms over ${Object.keys(measured.tsx).length} .tsx files + ${Object.keys(measured.css).length} stylesheets`,
      );

      const next =
        resolved.mode === "init" ? buildInitialCeilings(measured) : mergeCeilings(parseCeilings(fs.readFileSync(CEILINGS_PATH, "utf8")), measured);

      fs.writeFileSync(CEILINGS_PATH, serializeCeilings(next));

      // round-trip check: what we just wrote must itself be well-formed
      const reparsed = parseCeilings(fs.readFileSync(CEILINGS_PATH, "utf8"));
      expect(Object.keys(reparsed.tsx).length).toBe(Object.keys(measured.tsx).length);
      expect(Object.keys(reparsed.css).length).toBe(Object.keys(measured.css).length);
    });
  });
} else {
  describe("design drift ceilings -- the ratchet check", () => {
    it("never exceeds the committed ceilings", () => {
      if (!fs.existsSync(CEILINGS_PATH)) {
        throw new Error(
          "DESIGN DRIFT: tests/design-drift.ceilings.json is missing -- run `DESIGN_DRIFT_WRITE=init npx vitest run tests/design-drift.test.ts` once to create it.",
        );
      }
      const ceilings = parseCeilings(fs.readFileSync(CEILINGS_PATH, "utf8"));

      const t0 = performance.now();
      const measured = scanTree(REPO_ROOT);
      const elapsedMs = performance.now() - t0;
      // R12: the scan's own run time belongs in the lane's report
      console.log(
        `[design-drift] scanTree: ${elapsedMs.toFixed(1)}ms over ${Object.keys(measured.tsx).length} .tsx files + ${Object.keys(measured.css).length} stylesheets`,
      );

      const violations = compareCeilings(ceilings, measured);
      if (violations.length > 0) throw new Error(formatFailureMessage(violations));
      expect(violations).toHaveLength(0);
    });
  });
}
