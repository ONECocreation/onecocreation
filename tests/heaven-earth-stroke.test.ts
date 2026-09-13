import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-215 (0018.06.23 a₿, Love's call #10) — "'Where heaven and earth
 * meet' stroke — the 0018.06.17 ask was 1 weight; today it is far too
 * thick and blurred." Halved to .5px (the crisp four-drop-shadow corner
 * technique unchanged, blur radius stays 0 — never a soft glow, which
 * would BE the "blurred" complaint, not its fix). Pins the rule's exact
 * value, the house's read-the-source pattern (cuts-style.test.ts).
 */
const HOUSE_CSS = "src/app/house.css";
const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

describe("TASK-215 — the heaven-and-earth stroke is thin, crisp, and legible", () => {
  it("the stroke is a HALF-pixel offset on all four sides — thinner than the old 1px", async () => {
    const src = await read(HOUSE_CSS);
    const m = src.match(/\.about-script\{filter:([^}]+)\}/);
    expect(m, "the .about-script filter rule went missing").not.toBeNull();
    const filter = m![1];
    expect(filter).toContain("drop-shadow(.5px 0 0 #fff)");
    expect(filter).toContain("drop-shadow(-.5px 0 0 #fff)");
    expect(filter).toContain("drop-shadow(0 .5px 0 #fff)");
    expect(filter).toContain("drop-shadow(0 -.5px 0 #fff)");
    // never a 1px (or larger) offset left over from the old rule
    expect(filter).not.toMatch(/drop-shadow\(-?1px/);
  });

  it("crisp corners, never blurred — every drop-shadow's blur radius is 0", async () => {
    const src = await read(HOUSE_CSS);
    const m = src.match(/\.about-script\{filter:([^}]+)\}/);
    const filter = m![1];
    // drop-shadow(<x> <y> <blur> <color>) — the third token is the blur radius
    const shadows = [...filter.matchAll(/drop-shadow\(([^)]+)\)/g)].map((s) => s[1].trim().split(/\s+/));
    expect(shadows.length).toBe(4);
    for (const parts of shadows) {
      // [x, y, blur, ...color] — a bare "0" for blur, never a soft radius
      expect(parts[2]).toBe("0");
    }
  });

  it("still WHITE — the stroke's color never drifted while thinning it", async () => {
    const src = await read(HOUSE_CSS);
    const m = src.match(/\.about-script\{filter:([^}]+)\}/);
    expect(m![1].match(/#fff/gi)?.length).toBe(4);
  });
});
