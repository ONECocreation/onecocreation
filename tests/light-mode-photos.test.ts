import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ROOMS, groupRoomsByPackage } from "@/lib/matrix-rooms";
import { cartridge } from "@/brand/cartridge";

/**
 * TASK-396 (block 968,132) — B15: "the pictures dissappear from the room
 * cards when in light mode." The mechanism (K96/Astra, decision B): the
 * room-package banners (RoomsShelf.tsx) and the store's meditations band
 * (ShelfSection.tsx) used to hard-code their whole scrim — gradient AND
 * photo URL — as ONE dark inline `background:` literal, in both themes.
 * The blanket light-mode repaint (cartridge.css:415) then beat that plain
 * inline declaration with its own `!important`, wiping the photo flat
 * cream at dawn. The fix moves the photo URL to a CSS custom property
 * (still inline, so it still wins as the URL source) and the scrim
 * composition to two new classes (.room-photo-scrim / .shelf-photo-scrim),
 * each with a real dawn twin, both exempted from the blanket the same way
 * `.lions-gate` already is.
 *
 * THE LINTABLE (the brief's own words): "the EFFECTIVE background-image
 * retains the same expected photo URL in dark AND light, while its
 * gradient layer changes to the specified dawn scrim. Evaluate the
 * computed cascade... a class-presence or selector-count check does NOT
 * satisfy this." vitest.config.ts runs environment "node" — no jsdom, no
 * computed-style harness anywhere in tests/ (checked: the only DOM-shaped
 * tool in this tree is react-dom/server's renderToStaticMarkup, which
 * gives markup, not resolved CSS). So this file IS the harness: a small,
 * general CSS cascade evaluator (selector parse -> specificity -> match
 * -> winner-takes-property, exactly the four cascade steps a browser
 * runs) over cartridge.css's REAL text, read fresh every run. It is
 * deliberately general — it does not know the names `.room-photo-scrim`
 * or `.shelf-photo-scrim` going in; it discovers whichever rules actually
 * match the simulated element from the live stylesheet, the same way a
 * selector-count check could NOT (that would only prove the class exists
 * somewhere, never that it wins).
 *
 * WHAT THIS EVALUATOR DOES NOT MODEL (honest, scoped to what cartridge.css
 * actually contains today — verified by `grep -n "section"` and
 * `grep -n "@media\|@keyframes"` against the live file before writing
 * this): child/sibling combinators (none in this file's rules), grouped
 * selectors with internal whitespace inside `:not()` or an attribute value
 * (none here), more than one simple selector inside a single `:not()`
 * (none here — every `:not()` in this file wraps exactly one class), and
 * `@media`/`@keyframes` bodies (three such blocks exist; none sets
 * `background` on `section`/`main` — skipped wholesale, verified by
 * reading them). A rename or a new combinator shape would need this
 * evaluator extended, not silently trusted — same posture as
 * design-drift.test.ts's own "what this guard does not see."
 */

const ROOT = process.cwd();
const CARTRIDGE_PATH = path.join(ROOT, "src/app/cartridge.css");
const ROOMS_SHELF_PATH = path.join(ROOT, "src/components/rooms/RoomsShelf.tsx");
const SHELF_SECTION_PATH = path.join(ROOT, "src/components/store/ShelfSection.tsx");

// ---------------------------------------------------------------------------
// The cascade evaluator: selector parse -> specificity -> match -> winner
// ---------------------------------------------------------------------------

interface Compound {
  type: string | null;
  classes: string[];
  ids: string[];
  attrs: { name: string; value: string }[];
  nots: Compound[];
}

interface ParsedSelector {
  compounds: Compound[]; // left = outermost ancestor requirement, right = the element itself
}

interface Rule {
  selectors: ParsedSelector[]; // comma-separated variants share one declaration set
  body: string;
  order: number;
}

interface Node {
  type: string;
  classes: string[];
  id?: string;
  attrs: Record<string, string>;
}

/** One simple/compound selector, e.g. `section.sky-warm:not(.keep-dark)` or `html[data-oc-theme="light"]`. */
function parseCompound(text: string): Compound {
  let rest = text;
  let type: string | null = null;
  const typeMatch = /^[A-Za-z][\w-]*/.exec(rest);
  if (typeMatch) {
    type = typeMatch[0];
    rest = rest.slice(typeMatch[0].length);
  }
  const classes: string[] = [];
  const ids: string[] = [];
  const attrs: { name: string; value: string }[] = [];
  const nots: Compound[] = [];
  const tokenRe = /\.([\w-]+)|#([\w-]+)|\[([\w-]+)="([^"]*)"\]|:not\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(rest))) {
    if (m[1] !== undefined) classes.push(m[1]);
    else if (m[2] !== undefined) ids.push(m[2]);
    else if (m[3] !== undefined) attrs.push({ name: m[3], value: m[4] });
    else if (m[5] !== undefined) nots.push(parseCompound(m[5].trim()));
  }
  return { type, classes, ids, attrs, nots };
}

/** Splits a selector on top-level commas (none of cartridge.css's real selectors need this, kept for honesty). */
function parseSelectorGroup(selectorText: string): ParsedSelector[] {
  return selectorText
    .split(",")
    .map((variant) => variant.trim())
    .filter(Boolean)
    .map((variant) => ({
      compounds: variant.split(/\s+/).filter(Boolean).map(parseCompound),
    }));
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * Walks the stylesheet once: ordinary `selector{body}` rules are collected;
 * `@`-prefixed blocks (`@media`, `@keyframes`) are skipped WHOLESALE via
 * brace-depth balancing (their own nested rules never leak out as if they
 * were top-level) — see the docblock above for why that's safe here.
 */
function extractRules(cssRaw: string): Rule[] {
  const css = stripComments(cssRaw);
  const rules: Rule[] = [];
  let i = 0;
  let order = 0;
  while (i < css.length) {
    if (/\s/.test(css[i])) {
      i++;
      continue;
    }
    if (css[i] === "@") {
      const braceIdx = css.indexOf("{", i);
      const semiIdx = css.indexOf(";", i);
      if (braceIdx === -1 || (semiIdx !== -1 && semiIdx < braceIdx)) {
        i = semiIdx === -1 ? css.length : semiIdx + 1;
        continue;
      }
      let depth = 0;
      let j = braceIdx;
      while (j < css.length) {
        if (css[j] === "{") depth++;
        else if (css[j] === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
        j++;
      }
      i = j;
      continue;
    }
    const openBrace = css.indexOf("{", i);
    if (openBrace === -1) break;
    const selectorText = css.slice(i, openBrace).trim();
    const closeBrace = css.indexOf("}", openBrace);
    if (closeBrace === -1) break;
    const body = css.slice(openBrace + 1, closeBrace);
    if (selectorText.length > 0) {
      rules.push({ selectors: parseSelectorGroup(selectorText), body, order: order++ });
    }
    i = closeBrace + 1;
  }
  return rules;
}

function matchCompound(c: Compound, node: Node): boolean {
  if (c.type && c.type.toLowerCase() !== node.type.toLowerCase()) return false;
  for (const cls of c.classes) if (!node.classes.includes(cls)) return false;
  for (const id of c.ids) if (node.id !== id) return false;
  for (const a of c.attrs) if (node.attrs[a.name] !== a.value) return false;
  for (const notSel of c.nots) if (matchCompound(notSel, node)) return false;
  return true;
}

/** Descendant-combinator matching: the rightmost compound must match the element; each earlier compound must match SOME earlier ancestor, in order (not necessarily contiguous). */
function matchesChain(compounds: Compound[], chain: Node[]): boolean {
  if (compounds.length === 0 || chain.length === 0) return false;
  const target = chain[chain.length - 1];
  if (!matchCompound(compounds[compounds.length - 1], target)) return false;
  let chainIdx = chain.length - 2;
  for (let ci = compounds.length - 2; ci >= 0; ci--) {
    let found = false;
    while (chainIdx >= 0) {
      if (matchCompound(compounds[ci], chain[chainIdx])) {
        found = true;
        chainIdx--;
        break;
      }
      chainIdx--;
    }
    if (!found) return false;
  }
  return true;
}

function specificityOf(compounds: Compound[]): number {
  let ids = 0;
  let classes = 0;
  let types = 0;
  const addNot = (n: Compound) => {
    ids += n.ids.length;
    classes += n.classes.length + n.attrs.length;
    if (n.type) types++;
  };
  for (const comp of compounds) {
    ids += comp.ids.length;
    classes += comp.classes.length + comp.attrs.length;
    if (comp.type) types++;
    for (const n of comp.nots) addNot(n);
  }
  return ids * 1_000_000 + classes * 1_000 + types;
}

function extractDeclarations(body: string, prop: string): { value: string; important: boolean }[] {
  const decls = body
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  const out: { value: string; important: boolean }[] = [];
  for (const d of decls) {
    const colonAt = d.indexOf(":");
    if (colonAt === -1) continue;
    const key = d.slice(0, colonAt).trim();
    if (key !== prop) continue;
    let value = d.slice(colonAt + 1).trim();
    let important = false;
    if (/!important\s*$/.test(value)) {
      important = true;
      value = value.slice(0, value.lastIndexOf("!important")).trim();
    }
    out.push({ value, important });
  }
  return out;
}

/** The cascade itself: important beats non-important, then specificity, then source order — the same three steps a browser runs. Returns the winning declaration's raw value text, or undefined if nothing matches. */
function cascadeWinner(rules: Rule[], chain: Node[], prop: string): string | undefined {
  type Candidate = { value: string; important: boolean; specificity: number; order: number };
  const candidates: Candidate[] = [];
  for (const rule of rules) {
    let bestSpecificity = -1;
    let matched = false;
    for (const sel of rule.selectors) {
      if (matchesChain(sel.compounds, chain)) {
        matched = true;
        bestSpecificity = Math.max(bestSpecificity, specificityOf(sel.compounds));
      }
    }
    if (!matched) continue;
    for (const decl of extractDeclarations(rule.body, prop)) {
      candidates.push({ value: decl.value, important: decl.important, specificity: bestSpecificity, order: rule.order });
    }
  }
  if (candidates.length === 0) return undefined;
  candidates.sort((x, y) => {
    if (x.important !== y.important) return x.important ? -1 : 1;
    if (x.specificity !== y.specificity) return y.specificity - x.specificity;
    return y.order - x.order;
  });
  return candidates[0].value;
}

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Evaluator self-checks — small synthetic stylesheets, not the real file
// ---------------------------------------------------------------------------

describe("the cascade evaluator's own primitives", () => {
  it("a plain class beats nothing; a later same-specificity rule beats an earlier one (source order)", () => {
    const css = ".a{background:red} .a{background:blue}";
    const rules = extractRules(css);
    const chain: Node[] = [{ type: "section", classes: ["a"], attrs: {} }];
    expect(cascadeWinner(rules, chain, "background")).toBe("blue");
  });

  it("higher specificity wins regardless of source order", () => {
    const css = "html[data-x=\"y\"] .a{background:blue} .a{background:red}";
    const rules = extractRules(css);
    const chainNoAttr: Node[] = [
      { type: "html", classes: [], attrs: {} },
      { type: "section", classes: ["a"], attrs: {} },
    ];
    const chainWithAttr: Node[] = [
      { type: "html", classes: [], attrs: { "data-x": "y" } },
      { type: "section", classes: ["a"], attrs: {} },
    ];
    expect(cascadeWinner(rules, chainNoAttr, "background")).toBe("red"); // the attr rule never matches — no attr on html
    expect(cascadeWinner(rules, chainWithAttr, "background")).toBe("blue"); // now it does, and wins on specificity
  });

  it("!important beats higher specificity", () => {
    const css = "html .a{background:red!important} .weirdly.specific.selector.a{background:blue}";
    const rules = extractRules(css);
    const chain: Node[] = [
      { type: "html", classes: [], attrs: {} },
      { type: "section", classes: ["a", "weirdly", "specific", "selector"], attrs: {} },
    ];
    expect(cascadeWinner(rules, chain, "background")).toBe("red");
  });

  it(":not() excludes a matching element, the way cartridge.css's own exemption list works", () => {
    const css = "main section:not(.keep-out){background:cream}";
    const rules = extractRules(css);
    const kept: Node[] = [
      { type: "main", classes: [], attrs: {} },
      { type: "section", classes: [], attrs: {} },
    ];
    const excluded: Node[] = [
      { type: "main", classes: [], attrs: {} },
      { type: "section", classes: ["keep-out"], attrs: {} },
    ];
    expect(cascadeWinner(rules, kept, "background")).toBe("cream");
    expect(cascadeWinner(rules, excluded, "background")).toBeUndefined();
  });

  it("a @media/@keyframes block is skipped wholesale, never mistaken for top-level rules", () => {
    const css = "@keyframes spin{from{background:red}to{background:blue}} .a{background:green}";
    const rules = extractRules(css);
    expect(rules).toHaveLength(1);
    expect(rules[0].selectors[0].compounds[0].classes).toEqual(["a"]);
  });
});

// ---------------------------------------------------------------------------
// The real cascade, over the real stylesheet
// ---------------------------------------------------------------------------

const cartridgeCss = readFileSync(CARTRIDGE_PATH, "utf8");
const cartridgeRules = extractRules(cartridgeCss);

function htmlNode(theme: "dark" | "light"): Node {
  // the boot script (layout.tsx) and ThemeLantern.tsx: dark = the attribute
  // is ABSENT (removeAttribute), light = data-oc-theme="light" — never any
  // other value.
  return { type: "html", classes: [], attrs: theme === "light" ? { "data-oc-theme": "light" } : {} };
}
const mainNode: Node = { type: "main", classes: [], attrs: {} };

describe("the room banners keep their photo in both themes (B15, the room half)", () => {
  // real packages, real banners — the same fixture rooms-shelf.test.ts uses
  // (groupRoomsByPackage(ROOMS...)), never an invented URL.
  const packages = groupRoomsByPackage(ROOMS.map((r) => ({ ...r })));

  it("every package carries a banner, and none share one (sanity: we're about to test all four)", () => {
    expect(packages.length).toBe(4);
    expect(new Set(packages.map((p) => p.banner)).size).toBe(4);
  });

  for (const pkg of packages) {
    it(`${pkg.tier} (${pkg.banner}): effective background keeps the photo dark AND light, gradient swaps to the dawn scrim`, () => {
      const sectionNode: Node = { type: "section", classes: ["reveal", "room-photo-scrim"], attrs: {} };

      const nightChain = [htmlNode("dark"), mainNode, sectionNode];
      const lightChain = [htmlNode("light"), mainNode, sectionNode];

      const nightWinner = cascadeWinner(cartridgeRules, nightChain, "background");
      const lightWinner = cascadeWinner(cartridgeRules, lightChain, "background");
      expect(nightWinner, "no rule in cartridge.css resolved a background for the room section at night").toBeDefined();
      expect(lightWinner, "no rule in cartridge.css resolved a background for the room section at dawn").toBeDefined();

      // it must be OUR class's rule that won, not the blanket repaint or a
      // sky rule — proven by the var() reference surviving in the winner
      expect(nightWinner).toContain("var(--room-photo)");
      expect(lightWinner).toContain("var(--room-photo)");

      // the component's own inline custom property (source pin below proves
      // it's wired unconditionally to p.banner, not theme-gated) — resolve
      // var(--room-photo) with the REAL banner this package carries
      const resolvedNight = normalizeWs(nightWinner!.replace("var(--room-photo)", `url(${pkg.banner})`));
      const resolvedLight = normalizeWs(lightWinner!.replace("var(--room-photo)", `url(${pkg.banner})`));

      expect(resolvedNight).toContain(`url(${pkg.banner})`);
      expect(resolvedLight).toContain(`url(${pkg.banner})`);
      expect(resolvedNight).toContain("rgba(14,10,28,.6)");
      expect(resolvedNight).toContain("rgba(14,10,28,.8)");
      expect(resolvedLight).toContain("rgba(251,246,239,.82)");
      expect(resolvedLight).toContain("rgba(251,246,239,.9)");
      expect(resolvedNight).not.toBe(resolvedLight); // the veil actually changes
    });
  }
});

describe("the meditations shelf band keeps its photo in both themes (B15, the shelf half)", () => {
  it(`the nebula (${cartridge.hero.nebula}): effective background keeps the photo dark AND light, gradient swaps to the dawn scrim`, () => {
    const sectionNode: Node = { type: "section", classes: ["shelf-photo-scrim"], id: "meditations", attrs: {} };
    const nightChain = [htmlNode("dark"), mainNode, sectionNode];
    const lightChain = [htmlNode("light"), mainNode, sectionNode];

    const nightWinner = cascadeWinner(cartridgeRules, nightChain, "background");
    const lightWinner = cascadeWinner(cartridgeRules, lightChain, "background");
    expect(nightWinner).toBeDefined();
    expect(lightWinner).toBeDefined();
    expect(nightWinner).toContain("var(--shelf-photo)");
    expect(lightWinner).toContain("var(--shelf-photo)");

    const resolvedNight = normalizeWs(nightWinner!.replace("var(--shelf-photo)", `url(${cartridge.hero.nebula})`));
    const resolvedLight = normalizeWs(lightWinner!.replace("var(--shelf-photo)", `url(${cartridge.hero.nebula})`));

    expect(resolvedNight).toContain(`url(${cartridge.hero.nebula})`);
    expect(resolvedLight).toContain(`url(${cartridge.hero.nebula})`);
    expect(resolvedNight).toContain("rgba(14,10,28,.66)");
    expect(resolvedNight).toContain("rgba(14,10,28,.78)");
    expect(resolvedLight).toContain("rgba(251,246,239,.82)");
    expect(resolvedLight).toContain("rgba(251,246,239,.9)");
    expect(resolvedNight).not.toBe(resolvedLight);
  });

  it("the OTHER shelf bands (sessions/memberships/wares) are untouched — no scrim class, the blanket still repaints them exactly as before", () => {
    for (const cls of [[], ["some-other-class"]]) {
      const sectionNode: Node = { type: "section", classes: cls, attrs: {} };
      const lightChain = [htmlNode("light"), mainNode, sectionNode];
      const winner = cascadeWinner(cartridgeRules, lightChain, "background");
      expect(winner).toBe("linear-gradient(180deg,#FCF7F0,#F3EEF4)"); // the blanket, unexempted
    }
  });
});

// ---------------------------------------------------------------------------
// Source pins (the house readFileSync idiom — supporting, not sufficient
// on their own; the cascade tests above are the lintable)
// ---------------------------------------------------------------------------

describe("source pins", () => {
  const roomsShelfSrc = readFileSync(ROOMS_SHELF_PATH, "utf8");
  const shelfSectionSrc = readFileSync(SHELF_SECTION_PATH, "utf8");

  it("no composed rgba(14,10,28 background literal remains in either .tsx (the scrim lives in the stylesheet now)", () => {
    expect(roomsShelfSrc).not.toContain("rgba(14,10,28");
    expect(shelfSectionSrc).not.toContain("rgba(14,10,28");
  });

  it("RoomsShelf.tsx: the room section wears room-photo-scrim and carries --room-photo wired to p.banner, unconditionally (no theme gate)", () => {
    expect(roomsShelfSrc).toContain('className="reveal room-photo-scrim"');
    expect(roomsShelfSrc).toContain('"--room-photo": `url(${p.banner})`');
  });

  it("ShelfSection.tsx: SHELF_BANDS.meditations names its photo (no bg string), the section wears shelf-photo-scrim only when a band has a photo", () => {
    expect(shelfSectionSrc).toContain("photo: cartridge.hero.nebula");
    expect(shelfSectionSrc).toContain('className={band?.photo ? "shelf-photo-scrim" : undefined}');
    expect(shelfSectionSrc).toContain('"--shelf-photo": band?.photo ? `url(${band.photo})` : undefined');
  });

  it("cartridge.css carries both new class pairs (night + the dawn twin) and both class names in the :415 exemption list", () => {
    expect(cartridgeCss).toContain(".room-photo-scrim{");
    expect(cartridgeCss).toContain('html[data-oc-theme="light"] .room-photo-scrim{');
    expect(cartridgeCss).toContain(".shelf-photo-scrim{");
    expect(cartridgeCss).toContain('html[data-oc-theme="light"] .shelf-photo-scrim{');
    const i = cartridgeCss.indexOf('html[data-oc-theme="light"] main section:not(');
    expect(i).toBeGreaterThan(-1);
    const line = cartridgeCss.slice(i, cartridgeCss.indexOf("\n", i));
    expect(line).toContain(":not(.keep-dark)");
    expect(line).toContain(":not(.lions-gate)");
    expect(line).toContain(":not(.room-photo-scrim)");
    expect(line).toContain(":not(.shelf-photo-scrim)");
  });
});

// ---------------------------------------------------------------------------
// Diff-exclusion pins — the lion "must NOT improve" (Astra §2), :422 untouched
// ---------------------------------------------------------------------------

describe("the lion regresses not", () => {
  it("the plain .lions-gate pair (:288-297, this lane's own template) is byte-identical", () => {
    const i = cartridgeCss.indexOf(".lions-gate{");
    expect(i).toBeGreaterThan(-1);
    const nightRule = cartridgeCss.slice(i, cartridgeCss.indexOf("}", i) + 1);
    expect(nightRule).toBe(
      '.lions-gate{\n  background:\n    linear-gradient(rgba(18,13,30,.8), rgba(20,16,33,.9)),\n    url("/images/lions-gate.webp") center top / cover no-repeat;\n}',
    );
    const j = cartridgeCss.indexOf('html[data-oc-theme="light"] .lions-gate{');
    expect(j).toBeGreaterThan(-1);
    const dawnRule = cartridgeCss.slice(j, cartridgeCss.indexOf("}", j) + 1);
    expect(dawnRule).toBe(
      'html[data-oc-theme="light"] .lions-gate{\n  background:\n    linear-gradient(rgba(251,246,239,.82), rgba(251,246,239,.9)),\n    url("/images/lions-gate.webp") center top / cover no-repeat;\n}',
    );
  });

  it("the memberships-specific lion rules (:468-495, .lions-gate-dark) are untouched — spot pins beyond lions-gate-dawn.test.ts's own coverage", () => {
    expect(cartridgeCss).toContain(
      '.lions-gate-dark{\n  background:\n    linear-gradient(rgba(10,10,20,.62), rgba(10,10,20,.78)),\n    url("/images/lions-gate.webp") center top / cover no-repeat;\n}',
    );
    expect(cartridgeCss).toContain(".lions-gate-dark .sec-h{color:#F4ECFF}");
    expect(cartridgeCss).toContain(".lions-gate-dark p{color:#D9D2E4}");
    // TASK-398 AMENDMENT R1 (block 968,140, Astra finding 1): main .keep-dark
    // gained --panel/--edge/--ghost-bg/--ghost-ink, so this exception now
    // resets those four to inherit too, after the original eight (a comment
    // explaining why sits between the two groups in the real file — split
    // into two pins here so this regression check doesn't couple to that
    // comment's wording).
    expect(cartridgeCss).toContain(
      'html[data-oc-theme="light"] main.lions-gate-dark .keep-dark{--ink-strong:inherit;--ink-body:inherit;--muted:inherit;\n  --rose:inherit;--gold-deep:inherit;--teal-bright:inherit;--glass:inherit;--glass-edge:inherit;',
    );
    expect(cartridgeCss).toContain("--panel:inherit;--edge:inherit;--ghost-bg:inherit;--ghost-ink:inherit}");
  });

  it(":422 (the <main> repaint, not a descendant section) is untouched", () => {
    expect(cartridgeCss).toContain('html[data-oc-theme="light"] main:not(.lions-gate-dark){background:#FCF7F0!important}');
  });

  it("the four skies (:426-429) are untouched, and never match a plain section (no sky-* class on either owned surface)", () => {
    expect(cartridgeCss).toContain(
      'html[data-oc-theme="light"] main section.sky-night:not(.keep-dark):not(.lions-gate){background:linear-gradient(180deg,#FCF7F0 0%,#F3EEF4 100%)!important}',
    );
    expect(cartridgeCss).toContain(
      'html[data-oc-theme="light"] main section.sky-warm:not(.keep-dark):not(.lions-gate){background:linear-gradient(180deg,var(--sky-warm-dawn-0) 0%,var(--sky-warm-dawn-1) 100%)!important}',
    );
    const roomSection: Node = { type: "section", classes: ["reveal", "room-photo-scrim"], attrs: {} };
    const winner = cascadeWinner(cartridgeRules, [htmlNode("light"), mainNode, roomSection], "background");
    expect(winner).not.toContain("sky-warm-dawn"); // a sky rule never won this
  });
});
