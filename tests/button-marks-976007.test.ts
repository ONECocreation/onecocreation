import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* The button marks (block 976,007, Lumen's walk list D, the Admiral's "Go").
   R-071 and the house buttons ruling: no arrow in a label, a label never
   wraps, one height in a package page's card. Pins on the source; the
   pictures and the measured widths are in the lane's forge set. */
const src = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");
const ARROWS = /[←-⇿➔➡⬅-⬇]/;

describe("button marks: no arrow inside a button's words", () => {
  for (const f of [
    "src/components/store/StoreItemCard.tsx",
    "src/components/store/FreeMeditationCard.tsx",
  ]) {
    it(`${f}: "Full view" carries no arrow`, () => {
      const labels = [...src(f).matchAll(/>(Full view[^<]*)</g)].map((m) => m[1]);
      expect(labels).toEqual(["Full view", "Full view"]);
    });
  }

  it('ShelfSection: "see the whole shelf" carries no arrow', () => {
    const m = src("src/components/store/ShelfSection.tsx").match(/>(see the whole shelf[^<]*)</);
    expect(m?.[1]).toBe("see the whole shelf");
  });

  it("WildDoors: the doors that leave the site carry the kit's outward icon beside the words, not a glyph in them", () => {
    const s = src("src/components/WildDoors.tsx");
    const ctas = [...s.matchAll(/cta: "([^"]*)"/g)].map((m) => m[1]);
    expect(ctas).toEqual(["Give to the lions", "Follow along"]);
    for (const c of ctas) expect(c).not.toMatch(ARROWS);
    expect(s).toMatch(/<span className="kit-out" aria-hidden="true" \/>/);
    expect(src("src/app/kit.css")).toMatch(/\.kit-out\{/);
  });
});

describe("button marks: one size on a phone, one height in a package card", () => {
  const house = src("src/app/house.css");

  it("the big .btn takes one smaller phone size; .btn-sm keeps its own", () => {
    expect(house).toMatch(/@media\(max-width:480px\)\{\.btn:not\(\.btn-sm\)\{padding:16px;font-size:\.95rem;letter-spacing:1px\}\}/);
  });

  it("the package card's doors share one row height while every child is a button", () => {
    expect(src("src/app/packages/[slug]/page.tsx")).toMatch(/<div className="tier-doors">/);
    expect(house).toMatch(/\.tier-doors:not\(:has\(>:not\(\.btn\)\)\)\{grid-auto-rows:1fr\}/);
  });
});
