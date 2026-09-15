import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-268 (0018.06.24 a₿ · block 967,054) — the L1 meta lane's own pin:
 * package.json's description must name ONE Cocreation, and the ONLY field
 * allowed to still say "frens.earth" or "player tag" is the sanctioned
 * lineage line at :64 ("cloned from the frens.earth store framework" — the
 * T-263 census rules it bin D, keep verbatim, description already leads
 * with the house name). Every OTHER field — name, scripts, dependency
 * keys, overrides, browserslist — must be clean of that old-brand language.
 * This does NOT pin the `@frens-earth/*` dependency package names/tarball
 * URLs themselves: those were bin B (HOLD, cards HB-1…HB-10, executed by
 * TASK-285-C) and are out of this lane's scope.
 */
describe("package.json meta voice — ONE Cocreation, not frens.earth", () => {
  it("names ONE Cocreation in the description, and keeps the lineage line as the one sanctioned exception", async () => {
    const raw = await fs.readFile(
      path.join(process.cwd(), "package.json"),
      "utf8",
    );
    const pkg = JSON.parse(raw);

    expect(pkg.description).toMatch(/one cocreation/i);

    const lineageLine =
      "One Cocreation — Love's site, cloned from the frens.earth store framework.";
    expect(pkg.description).toBe(lineageLine);

    // Walk every field EXCEPT `description` (the sanctioned lineage line
    // lives there) and EXCEPT `dependencies` (the @frens-earth/* names/URLs
    // are a separate lane's card, not this one's).
    for (const [key, value] of Object.entries(pkg)) {
      if (key === "description" || key === "dependencies") continue;
      const serialized = JSON.stringify(value);
      expect(
        /frens\.earth/i.test(serialized),
        `pkg.${key} should not say "frens.earth" (bin D lineage line only lives in description): ${serialized}`,
      ).toBe(false);
      expect(
        /player tag/i.test(serialized),
        `pkg.${key} should not say "player tag": ${serialized}`,
      ).toBe(false);
    }
  });
});
