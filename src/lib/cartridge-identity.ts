import { readFile, writeFile } from "fs/promises";
import path from "path";

/**
 * Cartridge identity — the dressing room's write rail (S8, cartridge
 * hardening, lane 3). The Brand Board's identity section edits the
 * cartridge FILE (src/brand/cartridge.ts) one literal at a time: every
 * field has ONE anchor regex on its unique key line, and the write only
 * lands when that anchor matches the file EXACTLY once — a drifted or
 * doubled anchor fails honestly instead of guessing at a partial edit.
 *
 * Values are validated before disk is ever touched, and every rule
 * rejects `"` `\` and line breaks — so the substituted literal can never
 * break out of its quotes or its line. The edit is injection-safe by
 * construction, not by escaping.
 *
 * Honesty law: a read-only deployment (serverless) gets the FS error in a
 * structured result the board can show verbatim — nothing pretends a save
 * happened. And after a good write the RUNTIME import of the cartridge is
 * stale until a reload (dev's watcher) or a redeploy (prod): STALE_NOTE
 * says so plainly and rides every successful response.
 *
 * S9 (the cartridges become real, 0018.05.28 a₿) finished the room: the
 * sign-in copy, the meta pair, the portraits and tier art, the thank-you,
 * and VOICES — the one list in the cartridge. A list is not a scalar, so
 * it gets its own honest machinery below (writeVoiceRow): ONE block anchor
 * pins the whole `voices: [ … ]` literal exactly once, every row inside it
 * must parse as the one-line row shape the file actually uses, and add /
 * edit / remove operate on the row INDEX inside that pinned block — never
 * a file-wide guess. The registry moved pacman and earthside into their
 * own files (src/brand/cartridges/) so every anchor here still matches
 * cartridge.ts exactly once; the rail reads THAT file alone, always.
 */

export const IDENTITY_FIELDS = [
  "logo.lockup", "logo.mark", "logo.consciouscuts",
  "hero.moon", "hero.nebula", "hero.meteors",
  "hero.heavenEarth", "hero.loveSidelook", "hero.lionsGate",
  "doors.timeTipUrl",
  "copy.productName", "copy.tagline", "copy.memberNoun",
  "nav.accent",
  "signIn.copy.returningTitle", "signIn.copy.returningBlurb",
  "signIn.copy.signInCta", "signIn.copy.signingCta",
  "signIn.copy.doorsHeading", "signIn.copy.doorsFootnote",
  "meta.title", "meta.description",
  "portraits.headshot",
  "portraits.cuts.women", "portraits.cuts.wax", "portraits.cuts.men",
  "tierArt.A", "tierArt.B", "tierArt.C",
  "thanks.video", "thanks.poster", "thanks.heading", "thanks.message",
] as const;
export type IdentityField = (typeof IDENTITY_FIELDS)[number];

export function isIdentityField(v: unknown): v is IdentityField {
  return typeof v === "string" && (IDENTITY_FIELDS as readonly string[]).includes(v);
}

export const STALE_NOTE =
  "Saved into src/brand/cartridge.ts. This running server still holds the previous dressing — a reload (dev reloads on its own) or a fresh deploy brings the new one to the door.";

/* the one law every field shares: never `"` `\` or a line break, so the
   value stays inside the quotes it was poured into */
const NO_BREAK = /^[^"\\\n\r]*$/;

/** a logo or hero path: root-relative, one line, quotable */
function assetPath(v: string): string | null {
  if (!v.startsWith("/")) return "an asset path starts with / — e.g. /brand/my-mark.svg";
  if (v.length > 240) return "that path is longer than 240 characters";
  if (!NO_BREAK.test(v)) return `a path cannot contain " \\ or a line break`;
  return null;
}

/** the arcade's time door: "" empties the ladder rung, else an https URL */
function timeTip(v: string): string | null {
  if (v === "") return null;
  if (!NO_BREAK.test(v)) return `the time door cannot contain " \\ or a line break`;
  if (!/^https:\/\/\S+$/.test(v)) return "the time door is an https:// address — or left empty to sail on its own seam";
  if (v.length > 240) return "that address is longer than 240 characters";
  return null;
}

/** a copy token: the short words the site speaks */
function copyLine(v: string): string | null {
  if (v.length < 1 || v.length > 120) return "keep the words between 1 and 120 characters";
  if (!NO_BREAK.test(v)) return `the words cannot contain " \\ or a line break`;
  return null;
}

/** the nav accent: gold is Love's original, dawn is the kit's retint */
function accent(v: string): string | null {
  return v === "gold" || v === "dawn" ? null : `the nav accent is "gold" or "dawn"`;
}

/** the meta description — a search snippet runs longer than a copy token,
 *  so the ceiling is raised for THIS field alone (240, the snippet's real
 *  budget), deliberately and per-field: the shared copy ceiling stays at
 *  120 and every other field keeps it */
function metaDescription(v: string): string | null {
  if (v.length < 1 || v.length > 240) return "keep the description between 1 and 240 characters";
  if (!NO_BREAK.test(v)) return `the description cannot contain " \\ or a line break`;
  return null;
}

type Spec = { anchor: RegExp; validate: (v: string) => string | null };

/* one anchor per field, pinned to its unique key line. nav.accent carries
   its ` as "gold" | "dawn` tail so it cannot be confused with the sign-in
   door's own `accent: "pink"` — the group-3 tail is re-emitted untouched. */
const SPECS: Record<IdentityField, Spec> = {
  "logo.lockup":        { anchor: /(lockup:\s*")([^"]*)(")/,        validate: assetPath },
  "logo.mark":          { anchor: /(mark:\s*")([^"]*)(")/,          validate: assetPath },
  "logo.consciouscuts": { anchor: /(consciouscuts:\s*")([^"]*)(")/, validate: assetPath },
  "hero.moon":          { anchor: /(moon:\s*")([^"]*)(")/,          validate: assetPath },
  "hero.nebula":        { anchor: /(nebula:\s*")([^"]*)(")/,        validate: assetPath },
  "hero.meteors":       { anchor: /(meteors:\s*")([^"]*)(")/,       validate: assetPath },
  "hero.heavenEarth":   { anchor: /(heavenEarth:\s*")([^"]*)(")/,   validate: assetPath },
  "hero.loveSidelook":  { anchor: /(loveSidelook:\s*")([^"]*)(")/,  validate: assetPath },
  "hero.lionsGate":     { anchor: /(lionsGate:\s*")([^"]*)(")/,     validate: assetPath },
  "doors.timeTipUrl":   { anchor: /(timeTipUrl:\s*")([^"]*)(")/,    validate: timeTip },
  "copy.productName":   { anchor: /(productName:\s*")([^"]*)(")/,   validate: copyLine },
  "copy.tagline":       { anchor: /(tagline:\s*")([^"]*)(")/,       validate: copyLine },
  "copy.memberNoun":    { anchor: /(memberNoun:\s*")([^"]*)(")/,    validate: copyLine },
  "nav.accent":         { anchor: /(accent:\s*")([^"]*)(" as "gold" \| "dawn")/, validate: accent },
  /* the sign-in ceremony's six strings; the two long ones (returningBlurb,
     doorsFootnote) break onto a continuation line in the file — `\s*`
     crosses the line break and group 1 re-emits it untouched */
  "signIn.copy.returningTitle": { anchor: /(returningTitle:\s*")([^"]*)(")/, validate: copyLine },
  "signIn.copy.returningBlurb": { anchor: /(returningBlurb:\s*")([^"]*)(")/, validate: copyLine },
  "signIn.copy.signInCta":      { anchor: /(signInCta:\s*")([^"]*)(")/,      validate: copyLine },
  "signIn.copy.signingCta":     { anchor: /(signingCta:\s*")([^"]*)(")/,     validate: copyLine },
  "signIn.copy.doorsHeading":   { anchor: /(doorsHeading:\s*")([^"]*)(")/,   validate: copyLine },
  "signIn.copy.doorsFootnote":  { anchor: /(doorsFootnote:\s*")([^"]*)(")/,  validate: copyLine },
  "meta.title":       { anchor: /(title:\s*")([^"]*)(")/,       validate: copyLine },
  "meta.description": { anchor: /(description:\s*")([^"]*)(")/, validate: metaDescription },
  /* nested keys pin their own indentation inside group 1, so a short key
     can never drift to a same-named line in another block — and `men:`
     can never land inside `women:`, which contains it as a substring */
  "portraits.headshot":   { anchor: /(headshot:\s*")([^"]*)(")/,      validate: assetPath },
  "portraits.cuts.women": { anchor: /(      women:\s*")([^"]*)(")/,   validate: assetPath },
  "portraits.cuts.wax":   { anchor: /(      wax:\s*")([^"]*)(")/,     validate: assetPath },
  "portraits.cuts.men":   { anchor: /(      men:\s*")([^"]*)(")/,     validate: assetPath },
  "tierArt.A": { anchor: /(    A:\s*")([^"]*)(")/, validate: assetPath },
  "tierArt.B": { anchor: /(    B:\s*")([^"]*)(")/, validate: assetPath },
  "tierArt.C": { anchor: /(    C:\s*")([^"]*)(")/, validate: assetPath },
  "thanks.video":   { anchor: /(video:\s*")([^"]*)(")/,   validate: assetPath },
  "thanks.poster":  { anchor: /(poster:\s*")([^"]*)(")/,  validate: assetPath },
  "thanks.heading": { anchor: /(heading:\s*")([^"]*)(")/, validate: copyLine },
  "thanks.message": { anchor: /(message:\s*")([^"]*)(")/, validate: copyLine },
};

export type IdentityWrite =
  | { ok: true; field: IdentityField; value: string; note: string }
  | { ok: false; reason: string; status: number };

function cartridgePath(): string {
  return path.join(process.cwd(), "src", "brand", "cartridge.ts");
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Validate, then replace ONE literal in the cartridge file and write it
 *  back. Exactly-once or not at all; FS trouble comes back as an honest
 *  structured error, never a thrown surprise. */
export async function writeIdentityField(field: IdentityField, value: string): Promise<IdentityWrite> {
  const spec = SPECS[field];
  const invalid = spec.validate(value);
  if (invalid) return { ok: false, reason: invalid, status: 400 };

  let source: string;
  try {
    source = await readFile(cartridgePath(), "utf8");
  } catch (e) {
    return { ok: false, status: 500, reason: `the cartridge file could not be read — ${errText(e)}` };
  }

  const found = source.match(new RegExp(spec.anchor.source, "g"));
  if (!found || found.length !== 1) {
    return {
      ok: false, status: 500,
      reason: `the anchor for ${field} matched ${found?.length ?? 0} times, not exactly once — the cartridge has drifted, so no edit was made`,
    };
  }

  /* function replacement: the value is poured in literally, never
     interpreted ($&, $1 and friends stay ordinary characters) */
  const next = source.replace(spec.anchor, (_m, g1: string, _g2: string, g3: string) => `${g1}${value}${g3}`);
  try {
    await writeFile(cartridgePath(), next, "utf8");
  } catch (e) {
    return { ok: false, status: 500, reason: `the cartridge file would not take the write (a read-only deployment says no) — ${errText(e)}` };
  }
  return { ok: true, field, value, note: STALE_NOTE };
}

/* ── VOICES — the one list in the cartridge ─────────────────────────────
   The scalar rail above is one-anchor-per-literal; a list is not a
   literal, so it gets its own honest machinery rather than a giant regex
   pretending. ONE block anchor pins the whole `voices: [ … ]` literal and
   must match the file EXACTLY once; every row inside must parse as the
   one-line row shape the file actually uses (a reformatted or doubled row
   fails the block match honestly, and no edit is made); add / edit /
   remove then operate on the row INDEX inside that pinned block — the
   file-wide search space never enters it. */

export type VoiceRow = { quote: string; name: string; who: string; href: string };
export type VoiceOp = "add" | "edit" | "remove";

/** a bounded list — the shelf holds a dozen voices; more is a redesign,
 *  not a save */
export const VOICE_LIMIT = 12;

export function isVoiceRow(v: unknown): v is VoiceRow {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return ["quote", "name", "who", "href"].every((k) => typeof r[k] === "string");
}

/** the words a voice speaks — a quote can run longer than a copy token,
 *  so it gets the snippet budget; the naming is per-field, the ceiling is
 *  this list's alone */
function voiceQuote(v: string): string | null {
  if (v.length < 1 || v.length > 240) return "keep the quote between 1 and 240 characters";
  if (!NO_BREAK.test(v)) return `the quote cannot contain " \\ or a line break`;
  return null;
}

/** a name or a handle: short, one line, quotable */
function voiceName(v: string): string | null {
  if (v.length < 1 || v.length > 60) return "keep the name and the handle between 1 and 60 characters";
  if (!NO_BREAK.test(v)) return `the name cannot contain " \\ or a line break`;
  return null;
}

/** where the voice lives: an https:// address, always — a voice without a
 *  source is not a voice */
function voiceHref(v: string): string | null {
  if (!NO_BREAK.test(v)) return `the link cannot contain " \\ or a line break`;
  if (!/^https:\/\/\S+$/.test(v)) return "the link is an https:// address — a voice points at the video it lives under";
  if (v.length > 240) return "that address is longer than 240 characters";
  return null;
}

const VOICE_ROW_SOURCE = '    \\{ quote: "[^"\\\\]*", name: "[^"\\\\]*", who: "[^"\\\\]*", href: "[^"\\\\]*" \\},\\n';
const VOICE_ROW = new RegExp(VOICE_ROW_SOURCE, "g");
/* `*` not `+`: an emptied shelf (`voices: [\n  ],`) still matches, so the
   last voice can be removed and the first one added back */
const VOICES_BLOCK = new RegExp(`(  voices: \\[\\n)((?:${VOICE_ROW_SOURCE})*)(  \\],)`);

/** a row poured back into the file's own one-line shape; every value has
 *  already been proven free of `"` `\` and line breaks, so the pour is
 *  injection-safe by construction — the same law the scalar rail keeps */
function renderVoiceRow(r: VoiceRow): string {
  return `    { quote: "${r.quote}", name: "${r.name}", who: "${r.who}", href: "${r.href}" },\n`;
}

export type VoiceWrite =
  | { ok: true; op: VoiceOp; index: number; note: string }
  | { ok: false; reason: string; status: number };

/** Add (appends), edit or remove ONE voice row by index. The block anchor
 *  must match exactly once and every existing row must parse; validation
 *  runs before disk is ever touched; FS trouble comes back honest. */
export async function writeVoiceRow(op: VoiceOp, index: number, row?: VoiceRow): Promise<VoiceWrite> {
  if (op !== "remove") {
    if (!row) return { ok: false, status: 400, reason: "a voice row is { quote, name, who, href }" };
    const invalid = voiceQuote(row.quote) ?? voiceName(row.name) ?? voiceName(row.who) ?? voiceHref(row.href);
    if (invalid) return { ok: false, reason: invalid, status: 400 };
  }

  let source: string;
  try {
    source = await readFile(cartridgePath(), "utf8");
  } catch (e) {
    return { ok: false, status: 500, reason: `the cartridge file could not be read — ${errText(e)}` };
  }

  const found = source.match(new RegExp(VOICES_BLOCK.source, "g"));
  if (!found || found.length !== 1) {
    return {
      ok: false, status: 500,
      reason: `the voices block matched ${found?.length ?? 0} times, not exactly once — the cartridge has drifted, so no edit was made`,
    };
  }

  const m = source.match(VOICES_BLOCK)!;
  const rows = m[2].match(VOICE_ROW) ?? [];
  if (op === "add" && rows.length >= VOICE_LIMIT) {
    return { ok: false, status: 400, reason: `the shelf holds ${VOICE_LIMIT} voices — curate, do not pile` };
  }
  if (op !== "add" && (index < 0 || index >= rows.length)) {
    return { ok: false, status: 400, reason: `no voice sits at index ${index} — the shelf holds ${rows.length}` };
  }

  const nextRows =
    op === "add" ? [...rows, renderVoiceRow(row!)] :
    op === "edit" ? rows.map((r, i) => (i === index ? renderVoiceRow(row!) : r)) :
    rows.filter((_, i) => i !== index);

  /* function replacement again: the poured rows are literal text, never
     interpreted ($&, $1 and friends stay ordinary characters) */
  const next = source.replace(VOICES_BLOCK, (_m, g1: string, _g2: string, g3: string) => `${g1}${nextRows.join("")}${g3}`);
  try {
    await writeFile(cartridgePath(), next, "utf8");
  } catch (e) {
    return { ok: false, status: 500, reason: `the cartridge file would not take the write (a read-only deployment says no) — ${errText(e)}` };
  }
  return { ok: true, op, index: op === "add" ? rows.length : index, note: STALE_NOTE };
}

/* the structural read side — no import of the cartridge, so this module
   stays FS-pure and the route passes in whatever cartridge it holds */
type CartridgeLike = {
  logo: Record<"lockup" | "mark" | "consciouscuts", string>;
  hero: Record<"moon" | "nebula" | "meteors" | "heavenEarth" | "loveSidelook" | "lionsGate", string>;
  doors: { timeTipUrl: string };
  copy: Record<"productName" | "tagline" | "memberNoun", string>;
  nav: { accent: string };
  signIn: { copy: Record<"returningTitle" | "returningBlurb" | "signInCta" | "signingCta" | "doorsHeading" | "doorsFootnote", string> };
  meta: Record<"title" | "description", string>;
  portraits: { headshot: string; cuts: Record<"women" | "wax" | "men", string> };
  tierArt: Record<"A" | "B" | "C", string>;
  thanks: Record<"video" | "poster" | "heading" | "message", string>;
};

/** the current identity values, read from the cartridge the runtime
 *  imported (possibly staler than the file on disk — see STALE_NOTE). */
export function identitySnapshot(c: CartridgeLike): Record<IdentityField, string> {
  return {
    "logo.lockup": c.logo.lockup,
    "logo.mark": c.logo.mark,
    "logo.consciouscuts": c.logo.consciouscuts,
    "hero.moon": c.hero.moon,
    "hero.nebula": c.hero.nebula,
    "hero.meteors": c.hero.meteors,
    "hero.heavenEarth": c.hero.heavenEarth,
    "hero.loveSidelook": c.hero.loveSidelook,
    "hero.lionsGate": c.hero.lionsGate,
    "doors.timeTipUrl": c.doors.timeTipUrl,
    "copy.productName": c.copy.productName,
    "copy.tagline": c.copy.tagline,
    "copy.memberNoun": c.copy.memberNoun,
    "nav.accent": c.nav.accent,
    "signIn.copy.returningTitle": c.signIn.copy.returningTitle,
    "signIn.copy.returningBlurb": c.signIn.copy.returningBlurb,
    "signIn.copy.signInCta": c.signIn.copy.signInCta,
    "signIn.copy.signingCta": c.signIn.copy.signingCta,
    "signIn.copy.doorsHeading": c.signIn.copy.doorsHeading,
    "signIn.copy.doorsFootnote": c.signIn.copy.doorsFootnote,
    "meta.title": c.meta.title,
    "meta.description": c.meta.description,
    "portraits.headshot": c.portraits.headshot,
    "portraits.cuts.women": c.portraits.cuts.women,
    "portraits.cuts.wax": c.portraits.cuts.wax,
    "portraits.cuts.men": c.portraits.cuts.men,
    "tierArt.A": c.tierArt.A,
    "tierArt.B": c.tierArt.B,
    "tierArt.C": c.tierArt.C,
    "thanks.video": c.thanks.video,
    "thanks.poster": c.thanks.poster,
    "thanks.heading": c.thanks.heading,
    "thanks.message": c.thanks.message,
  };
}
