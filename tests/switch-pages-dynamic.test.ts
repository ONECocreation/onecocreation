import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/* T-229 follow-through: every page that reads the site switches from KV must
 * render per request — a statically baked page shows the switches as they
 * were at build time, so a flip on /a never lands until the next deploy. */
const pages = ["src/app/packages/page.tsx", "src/app/memberships/page.tsx", "src/app/page.tsx", "src/app/store/page.tsx"];

describe("switch-reading pages render per request", () => {
  for (const p of pages) {
    it(`${p} declares force-dynamic`, () => {
      expect(readFileSync(p, "utf8")).toContain('export const dynamic = "force-dynamic"');
    });
  }
});
