import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * TASK-276 (0018.06.25 a₿, H111 A) — the sweep's own grep-zero gate, pinned
 * so it can't silently regress. `--font-arcade`/`.font-arcade`/`ArcadeFonts`
 * are retired site-wide in favour of `--font-display`/`.font-display`/
 * `DisplayFonts` (same font files, same cascade — token/class/component
 * names only). Two things pinned here:
 *  1. the brief's own verbatim gate (`grep -rn "font-arcade\|ArcadeFonts"
 *     src` returns ZERO) — walked in-process instead of shelling out, so it
 *     runs everywhere `vitest run` does;
 *  2. the house.css neutralisation rule (T-269, renamed by this sweep) —
 *     `.mgmt-body [class*="font-display"]{...}` — because it's an
 *     attribute-substring CSS selector, not a symbol, so nothing else in
 *     the toolchain (tsc/eslint) would ever catch it silently going dark.
 */

const SRC_ROOT = join(process.cwd(), "src");
const RETIRED = /font-arcade|ArcadeFonts/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

describe("the font-arcade -> font-display sweep (TASK-276 grep-zero pin)", () => {
  it("no file under src/ carries font-arcade or ArcadeFonts any more", () => {
    const hits: string[] = [];
    for (const file of walk(SRC_ROOT)) {
      const text = readFileSync(file, "utf8");
      if (RETIRED.test(text)) {
        const lines = text.split("\n");
        lines.forEach((line, i) => {
          if (RETIRED.test(line)) hits.push(`${file}:${i + 1}: ${line.trim()}`);
        });
      }
    }
    expect(hits).toEqual([]);
  });

  it("house.css still neutralises the display face inside /a with the renamed selector", () => {
    const houseCss = readFileSync(join(SRC_ROOT, "app", "house.css"), "utf8");
    expect(houseCss).toContain(
      '.mgmt-body [class*="font-display"]{font-family:var(--sans)!important;letter-spacing:.04em}'
    );
    // the retired selector must not have merely grown a second, still-live copy
    expect(houseCss).not.toContain('[class*="font-arcade"]');
  });
});
