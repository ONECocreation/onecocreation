import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * TASK-257 (0018.06.24 a₿) — the Admiral: "the lion on light view used to
 * brighten up the background. it's not doing that now. i'm also seeing a bad
 * wrapping job on the menu." Two pins: the lion page flips at dawn (cream
 * veil, ink text, Love's night-held band transparent on it), and the desktop
 * header is one row (no wrap above the burger, which now begins at 1000px).
 */
const cartridge = readFileSync("src/app/cartridge.css", "utf8");
const house = readFileSync("src/app/house.css", "utf8");

describe("lions gate at dawn (TASK-257)", () => {
  it("the lion page brightens in light with the home section's cream veil over the same lion", () => {
    const i = cartridge.indexOf('html[data-oc-theme="light"] main.lions-gate-dark{');
    expect(i).toBeGreaterThan(-1);
    const rule = cartridge.slice(i, cartridge.indexOf("}", i));
    expect(rule).toMatch(/rgba\(251,246,239,\.82\), rgba\(251,246,239,\.9\)/);
    expect(rule).toMatch(/lions-gate\.webp/);
  });
  it("the words go ink at dawn (no pale-on-cream), the kicker keeps its rose", () => {
    expect(cartridge).toMatch(/html\[data-oc-theme="light"\] \.lions-gate-dark \.sec-h\{color:var\(--ink-strong\)\}/);
    expect(cartridge).toMatch(/html\[data-oc-theme="light"\] \.lions-gate-dark p:not\(\.kicker\)\{color:var\(--ink-body\)!important\}/);
  });
  it("the designer page's bands sit transparent on the lion at dawn, night-held ones included, with the page's own tokens", () => {
    expect(cartridge).toMatch(/html\[data-oc-theme="light"\] main\.lions-gate-dark section\{background:transparent!important\}/);
    expect(cartridge).toMatch(/html\[data-oc-theme="light"\] main\.lions-gate-dark \.keep-dark\{--ink-strong:inherit;--ink-body:inherit;--muted:inherit;/);
  });
  it("the night telling is untouched", () => {
    expect(cartridge).toMatch(/\.lions-gate-dark\{\n  background:\n    linear-gradient\(rgba\(10,10,20,\.62\), rgba\(10,10,20,\.78\)\)/);
  });
});

describe("one-row desktop header (TASK-257)", () => {
  it("above the burger the bar never wraps, the nav tightens, the name clips", () => {
    const i = house.indexOf("@media(min-width:1001px){");
    expect(i).toBeGreaterThan(-1);
    const block = house.slice(i, house.indexOf("\n}", i));
    expect(block).toMatch(/\.site-header \.bar\{flex-wrap:nowrap\}/);
    expect(block).toMatch(/\.site-nav \.nav-link\{font-size:\.9rem;letter-spacing:\.02em;white-space:nowrap\}/);
    expect(block).toMatch(/\.nav-tail>\*\{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\}/);
  });
  it("the burger begins at 1000px (six links + a signed-in name overflowed the row between 920 and 1000)", () => {
    expect(house.split("@media(max-width:1000px){").length - 1).toBe(2);
    expect(house).not.toMatch(/@media\(max-width:920px\)/);
    expect(house).not.toMatch(/@media\(min-width:921px\)/);
  });
});
