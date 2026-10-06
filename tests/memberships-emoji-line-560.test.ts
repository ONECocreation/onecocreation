import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-560 - the Admiral's pin (block 970,084) on /memberships: "these 3
 * emojies should be on the next line. and they should be much larger, and
 * they should have suffecient padding on the top and bottom. take sample
 * from the /book page." Source pins on the page and on house.css.
 */
const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

/** The declaration block of a selector, from its first `{` to the next `}`. */
function rule(css: string, selector: string): string {
  const at = css.indexOf(selector + "{");
  expect(at, `${selector} is declared`).toBeGreaterThan(-1);
  return css.slice(at, css.indexOf("}", at));
}

describe("the memberships emoji line (TASK-560)", () => {
  it("the three glyphs ride their own line, in the /book header's own class", async () => {
    const src = await read("src/app/memberships/page.tsx");
    expect(src).toContain('<div className="constellation constellation-lg" aria-hidden>🌈 💕 🦁</div>');
  });

  it("the sentence above no longer carries them", async () => {
    const src = await read("src/app/memberships/page.tsx");
    expect(src).not.toMatch(/connection with you\s*🌈/);
    expect(src).toMatch(/connection with you\s*<\/p>/);
    /* once on the page, never twice */
    expect(src.match(/🦁/g)).toHaveLength(1);
  });

  it("the large size is much larger than the header's and has room above and below", async () => {
    const css = await read("src/app/house.css");
    const base = rule(css, ".constellation");
    const large = rule(css, ".constellation-lg");
    const size = (r: string) => Number(/font-size:([\d.]+)rem/.exec(r)?.[1]);
    expect(size(base)).toBe(1.25);
    expect(size(large)).toBeGreaterThanOrEqual(2);
    const margin = /margin:(\d+)px 0[;}]?/.exec(large + "}");
    expect(Number(margin?.[1])).toBeGreaterThanOrEqual(24);
    expect(large).toContain("text-align:center");
  });

  it("the /book header's own line is left as it was", async () => {
    const css = await read("src/app/house.css");
    expect(css).toContain(".constellation{font-size:1.25rem;letter-spacing:.4em;margin:12px 0 0}");
    const hero = await read("src/components/StackedHero.tsx");
    expect(hero).toContain('<div className="constellation" aria-hidden>{cartridge.constellation}</div>');
  });
});
