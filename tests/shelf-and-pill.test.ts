import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * TASK-404 (block 968,146) — the post-398 stylesheet sweep: the shelf and
 * pill fixes. Decision B: these four pins live in their OWN file, not
 * appended to tests/grey-paint-family.test.ts (398's family, its own
 * docblock history) — a different fix family. Same idiom as that file and
 * as tests/design-drift.test.ts: read the REAL stylesheet/tree text (no
 * re-typed copies), plain node:fs, synchronous, no cascade evaluator.
 *
 * AMENDMENT R4 (block 968,146, after Astra's plan review) gives the four
 * pins their exact lexical contracts, adopted verbatim here:
 *   (a) after stripping CSS comments, the base `.roomrow{…}` declaration
 *       block in house.css contains `flex-wrap:wrap` (CSS whitespace
 *       allowed) — a SOURCE pin only. It proves nothing about rendered
 *       containment; that walk (390 / ~760 / desktop, both themes) is
 *       Number One's, not this file's (R1).
 *   (b) the literal `room-card-name` occurs NOWHERE under src/, INCLUDING
 *       comments (R4) — reads src/ only, so this test file's own string
 *       (it lives under tests/, outside the scanned tree) never
 *       self-matches. A survivor's path:line is named in the failure text.
 *       No tombstone comment for the retired class exists under src/ either
 *       — the retirement note lives only in work-claims/task-404.md and
 *       here.
 *   (c) the literal `never theme-flips` occurs nowhere in cartridge.css,
 *       including comments — decision C keeps "Always night" for the
 *       dropdown itself; only the false header clause was banned.
 *   (d) `Higher specificity than the blanket` occurs nowhere in
 *       cartridge.css, AND the single docblock beginning `THE FOUR SKIES,
 *       at dawn` contains the exact marker `never win` exactly once
 *       (whitespace-normalised) — SCOPED to that docblock, not a global
 *       count (R2's two other rewords, at `:425` and inside the TASK-400
 *       services comment, use "lose"/"never wins" on purpose — and "never
 *       wins" contains "never win" as a raw substring, so a global count
 *       would over-count; scoping to the docblock is what keeps this pin
 *       honest).
 */

const root = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

/**
 * Blanks /* ... *\/ CSS comment bodies to spaces (newlines preserved) so a
 * declaration-block regex never accidentally reads INTO a comment. Only
 * used for pin (a)'s "after stripping CSS comments" contract — never for
 * any byte-length-sensitive check.
 */
function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

describe("TASK-404 (a) — .roomrow wraps: the base rule carries flex-wrap:wrap", () => {
  it("after stripping CSS comments, house.css's base .roomrow{…} block contains flex-wrap:wrap", () => {
    const css = stripCssComments(read("src/app/house.css"));
    const rule = css.match(/\.roomrow\{([^}]*)\}/)?.[0] ?? "";
    expect(rule, ".roomrow rule not found in house.css").not.toBe("");
    expect(rule).toMatch(/flex-wrap:\s*wrap/);
  });
});

describe("TASK-404 (b) — the room-card-name retirement: 401 dropped the last consumer, the sweep drops the rules (and leaves no tombstone)", () => {
  it('"room-card-name" occurs nowhere under src/, including comments', () => {
    const hits = findLiteralUnderDir(path.join(root, "src"), "room-card-name");
    const message = hits
      .map((h) => `\`room-card-name\` survives at ${h.path}:${h.line} — the retirement is incomplete`)
      .join("\n");
    expect(hits.length, message).toBe(0);
  });
});

describe('TASK-404 (c) — the stale header comment is corrected; the dropdown\'s own "always night" truth stays', () => {
  it('"never theme-flips" occurs nowhere in cartridge.css, including comments', () => {
    const css = read("src/app/cartridge.css");
    expect(css).not.toContain("never theme-flips");
  });
});

describe("TASK-404 (d) — the dawn skies docblock is re-trued: the four rules never win against the blanket where both match", () => {
  it('"Higher specificity than the blanket" occurs nowhere in cartridge.css', () => {
    const css = read("src/app/cartridge.css");
    expect(css).not.toContain("Higher specificity than the blanket");
  });

  it('the marker phrase "never win" appears exactly once, scoped to the "THE FOUR SKIES, at dawn" docblock (not a global count)', () => {
    const css = read("src/app/cartridge.css");
    const docblock = css.match(/\/\*\s*THE FOUR SKIES, at dawn[\s\S]*?\*\//)?.[0] ?? "";
    expect(docblock, 'the "THE FOUR SKIES, at dawn" docblock was not found in cartridge.css').not.toBe("");
    const normalised = docblock.replace(/\s+/g, " ");
    const count = (normalised.match(/\bnever win\b/g) ?? []).length;
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// helper — plain node:fs, synchronous, no third-party walker (mirrors the
// tests/design-drift.test.ts idiom: fs.readdirSync + an explicit stack)
// ---------------------------------------------------------------------------
type Hit = { path: string; line: number };

function findLiteralUnderDir(dir: string, literal: string): Hit[] {
  const hits: Hit[] = [];
  const stack: string[] = [dir];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      let text: string;
      try {
        text = fs.readFileSync(full, "utf8");
      } catch {
        continue;
      }
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(literal)) {
          hits.push({ path: path.relative(root, full), line: i + 1 });
        }
      }
    }
  }
  return hits.sort((a, b) => (a.path === b.path ? a.line - b.line : a.path.localeCompare(b.path)));
}
