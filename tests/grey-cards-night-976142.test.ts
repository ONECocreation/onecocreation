import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Grey cards at night (block 976,142, the Admiral's A: "Both go dark at
 * night, like the cards around them"; dawn unchanged exactly).
 *
 * Two literal white fills had no theme scope, so over the night ground
 * they read grey:
 *  - `.wild-card` (cartridge.css), the three door cards on Home and
 *    /support (White Lions, Love on Instagram, Read with Love);
 *  - `.mgmt-body [class*="bg-panel"]` (house.css), the panels inside the
 *    site-page shell (member profile, /artist, /media, /bb).
 *
 * Door cards: NIGHT-ONLY rules (`html:not([data-oc-theme="light"])`) read
 * existing house tokens: the card takes --panel and --glass-edge (what the
 * house .card, i.e. the "More Ways" cards on /support, wears) and the door
 * words take the night inks. The base rules stay byte-for-byte, and dawn
 * can never match a night rule.
 *
 * Site-page panels: the base rule carries `!important` (it must beat
 * Tailwind's bg-panel), and house.css may not gain another `!important`
 * (tests/design-drift ceilings). So the base rule now reads one token,
 * --mgmt-panel: --panel in the night pour, and the very literal it replaced
 * (rgba(255,255,255,.62)) in the dawn pour. Same selector, same weight,
 * same dawn fill. Same idiom as tests/grey-paint-family.test.ts: read the
 * real CSS text, never a re-typed copy.
 */
const root = process.cwd();
const cartridge = readFileSync(path.join(root, "src/app/cartridge.css"), "utf8");
const house = readFileSync(path.join(root, "src/app/house.css"), "utf8");
const NIGHT = 'html:not([data-oc-theme="light"])';
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
/** the night token pour (the :root,.oc-pv-dark block that holds --panel) */
const night = [...strip(cartridge).matchAll(/:root,\.oc-pv-dark\{([\s\S]*?)\}/g)]
  .map((m) => m[1]).find((b) => /--panel:/.test(b)) ?? "";
/** the dawn token pour */
const dawn = [...strip(cartridge).matchAll(/html\[data-oc-theme="light"\],\.oc-pv-light\{([\s\S]*?)\}/g)]
  .map((m) => m[1]).find((b) => /--panel:/.test(b)) ?? "";
const tok = (block: string, name: string) => block.match(new RegExp(`${name}:([^;}]+)`))?.[1]?.trim();

/** every `selector{body}` whose selector is exactly `sel` */
function rulesFor(css: string, sel: string): string[] {
  const out: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const s = m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim();
    if (s === sel) out.push(m[2].trim());
  }
  return out;
}

const nightRules: Array<[string, string, string]> = [
  [cartridge, `${NIGHT} .wild-card`, "background:var(--panel);border-color:var(--glass-edge);color:var(--ink)"],
  [cartridge, `${NIGHT} .wild-body h3`, "color:var(--ink-strong)"],
  [cartridge, `${NIGHT} .wild-body p`, "color:var(--muted)"],
  [cartridge, `${NIGHT} .wild-cta`, "color:var(--gold-deep)"],
  [cartridge, `${NIGHT} .wild-cta--soon`, "color:var(--muted)"],
];

describe("grey cards at night: the night rules", () => {
  it.each(nightRules.map(([css, sel, body]) => [sel, body, css]))("%s is { %s }", (sel, body, css) => {
    expect(rulesFor(css as string, sel as string)).toEqual([body]);
  });

  it("the night rules use only house tokens (no new colour literal)", () => {
    for (const [, , body] of nightRules) {
      expect(body).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
    }
  });

  it("every token the night rules read is poured in the night token block", () => {
    expect(night).not.toBe("");
    for (const t of ["--panel", "--glass-edge", "--ink", "--ink-strong", "--muted", "--gold-deep"]) {
      expect(night, `${t} missing from the night pour`).toMatch(new RegExp(`${t}:`));
    }
  });

  it("the door card's night card is the same fill and rim as the house .card (the More Ways cards)", () => {
    const card = rulesFor(house, ".card").find((b) => /background:/.test(b)) ?? "";
    expect(card).toContain("background:var(--panel)");
    expect(card).toContain("border:1px solid var(--glass-edge)");
  });

  it("the site-page panel reads --mgmt-panel, which is the night panel (--panel) at night", () => {
    expect(rulesFor(house, '.mgmt-body [class*="bg-panel"]')).toEqual([
      "background:var(--mgmt-panel)!important;border-radius:20px",
    ]);
    expect(tok(night, "--mgmt-panel")).toBe("var(--panel)");
    expect(tok(night, "--panel")).toBe("rgba(24,19,44,.72)");
  });

  it("the picture band is untouched at night (no night rule names .habitat)", () => {
    expect(cartridge).not.toMatch(/html:not\(\[data-oc-theme="light"\]\)[^{]*\.habitat/);
  });
});

describe("grey cards at night: dawn is unchanged", () => {
  it("the base door-card rules keep their dawn literals byte for byte", () => {
    expect(rulesFor(cartridge, ".wild-card")).toEqual([
      "display:block;border-radius:22px;background:rgba(255,255,255,.72);border:1px solid rgba(255,255,255,.9);\n  box-shadow:var(--soft);text-decoration:none;color:var(--btn-ink);transition:transform .25s ease",
    ]);
    expect(rulesFor(cartridge, ".wild-body h3")).toEqual(["font-weight:400;font-size:1.1rem;margin:0 0 2px;color:#3f3a4e"]);
    expect(rulesFor(cartridge, ".wild-body p")).toEqual(["color:#4E4860;font-size:.85rem;margin:0 0 10px"]);
    expect(rulesFor(cartridge, ".wild-cta")).toEqual([
      "font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#614411",
    ]);
    expect(rulesFor(cartridge, ".wild-cta--soon")).toEqual(["color:#4E4860"]);
  });

  it("the site-page panel's dawn fill is the old literal byte for byte (rgba(255,255,255,.62))", () => {
    expect(dawn).not.toBe("");
    expect(tok(dawn, "--mgmt-panel")).toBe("rgba(255,255,255,.62)");
    // the selector and its weight are unchanged: still exactly one rule, still !important
    expect(rulesFor(house, '.mgmt-body [class*="bg-panel"]')).toHaveLength(1);
    expect(rulesFor(house, '.mgmt-body [class*="bg-panel"]')[0]).toMatch(/^background:var\(--mgmt-panel\)!important;border-radius:20px$/);
  });

  it("--mgmt-panel is poured nowhere but the night and dawn token blocks", () => {
    const decls = [...strip(cartridge + house).matchAll(/--mgmt-panel:/g)];
    expect(decls).toHaveLength(2);
  });

  it("no dawn rule was added for these cards (dawn reads only the base rules)", () => {
    for (const css of [cartridge, house]) {
      const dawnSelectors = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{/g)]
        .flatMap((m) => m[1].split(","))
        .map((s) => s.trim())
        .filter((s) => s.includes('[data-oc-theme="light"]') && !s.includes(":not("));
      for (const s of dawnSelectors) {
        expect(s).not.toMatch(/\.wild-(card|body|cta)/);
        expect(s).not.toContain('.mgmt-body [class*="bg-panel"]');
      }
    }
  });

  it("every night rule is scoped so a dawn document can never match it", () => {
    for (const [, sel] of nightRules) expect(sel.startsWith(NIGHT)).toBe(true);
  });
});
