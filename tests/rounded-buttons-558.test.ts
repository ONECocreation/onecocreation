import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-558 - the Admiral's pin (block 970,055): slightly rounded corners on
 * every button, about the forge's 6px arc. Source pins on the CSS files.
 */
const read = (f: string) => fs.readFile(path.join(process.cwd(), "src/app", f), "utf8");

/** The declaration block of a selector, from its first `{` to the next `}`. */
function rule(css: string, selector: string): string {
  const at = css.indexOf(selector + "{");
  expect(at, `${selector} is declared`).toBeGreaterThan(-1);
  return css.slice(at, css.indexOf("}", at));
}

describe("rounded buttons (TASK-558)", () => {
  it("the cartridge carries one token, 6px, on the root", async () => {
    const css = await read("cartridge.css");
    const root = css.slice(css.indexOf(":root,.oc-pv-dark{"));
    expect(root.slice(0, root.indexOf("}"))).toMatch(/--btn-radius:\s*6px;/);
    expect(css.match(/--btn-radius:/g)).toHaveLength(1);
  });

  it("the kit main and second buttons read the token", async () => {
    const css = await read("kit.css");
    for (const sel of [".kit-btn-main", ".kit-btn-second"]) {
      const r = rule(css, sel);
      expect(r).toContain("border-radius:var(--btn-radius)");
      expect(r).not.toMatch(/border-radius:0[;}]/);
    }
  });

  it("the house .btn reads the token", async () => {
    const r = rule(await read("house.css"), ".btn");
    expect(r).toContain("border-radius:var(--btn-radius)");
    expect(r).not.toMatch(/border-radius:0[;}]/);
  });

  it("no button class in kit.css or house.css is left at a literal 0 radius", async () => {
    for (const f of ["kit.css", "house.css"]) {
      const css = await read(f);
      expect(css).not.toMatch(/\.(kit-)?btn[a-z-]*\{[^}]*border-radius:0[;}]/);
    }
  });

  it("pills, round buttons and chips keep their own shape", async () => {
    const house = await read("house.css");
    expect(rule(house, ".chip-select")).toContain("border-radius:999px");
    expect(rule(house, ".btn-round")).toContain("border-radius:50%");
  });
});
