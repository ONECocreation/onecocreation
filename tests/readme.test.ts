import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * TASK-263 D2 (0018.06.24 a₿, block 967,065) — the README wears her name.
 * The old template README opened "# frens.earth — claim your player tag"
 * and described the registration template, not Love's site. This pin keeps
 * the rewrite honest:
 *   1. the title is "# ONE Cocreation"
 *   2. the player-tag words never come back
 *   3. the template's setup steps stay out — the only frens.earth mention
 *      is the sanctioned Lineage line (bin D)
 */

const readme = () => readFileSync(join(__dirname, "..", "README.md"), "utf8");

describe("TASK-263 D2 — the README wears her name", () => {
  it("starts with # ONE Cocreation", () => {
    expect(readme().startsWith("# ONE Cocreation\n")).toBe(true);
  });

  it("never contains 'claim your player tag'", () => {
    expect(readme()).not.toContain("claim your player tag");
  });

  it("carries no player-tag words at all — no 'PICK YOUR TAG', no tag-claim ceremony steps", () => {
    const src = readme();
    expect(src).not.toContain("PICK YOUR TAG");
    expect(src).not.toContain("GET YOUR KEYS");
    expect(src).not.toContain("LOCK IT IN");
  });

  it("frens.earth appears exactly once — the sanctioned Lineage line", () => {
    const hits = readme().match(/frens\.earth/g) ?? [];
    expect(hits).toHaveLength(1);
    expect(readme()).toContain("Built on the Pac's Arcade template");
    expect(readme()).toContain("github.com/PacsArcade/frens.earth");
  });
});
