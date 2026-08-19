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
 */

export const IDENTITY_FIELDS = [
  "logo.lockup", "logo.mark", "logo.consciouscuts",
  "hero.moon", "hero.nebula", "hero.meteors",
  "hero.heavenEarth", "hero.loveSidelook", "hero.lionsGate",
  "doors.timeTipUrl",
  "copy.productName", "copy.tagline", "copy.memberNoun",
  "nav.accent",
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

/* the structural read side — no import of the cartridge, so this module
   stays FS-pure and the route passes in whatever cartridge it holds */
type CartridgeLike = {
  logo: Record<"lockup" | "mark" | "consciouscuts", string>;
  hero: Record<"moon" | "nebula" | "meteors" | "heavenEarth" | "loveSidelook" | "lionsGate", string>;
  doors: { timeTipUrl: string };
  copy: Record<"productName" | "tagline" | "memberNoun", string>;
  nav: { accent: string };
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
  };
}
