import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * TASK-269 — the /a headline fix. Every /a room used to render its own h1
 * in `font-arcade` + `glow-cyan` (SCAR·LET OVERVIEW, BRIDGE, DUTY ROSTER,
 * CREW BOARD, SIMULATOR, BOT DECK, FLEET MAP) regardless of console chrome,
 * and `house.css`'s `.mgmt-body` neutralisation stripped `font-pixel` /
 * `glow-*` but not `font-arcade` — so Love could still meet the template's
 * display face and room names by URL. This pins the fix at the source
 * level: no `/a/**` page h1 carries `font-arcade`, the matching house.css
 * rule exists, and the four operator panels' old template-brand strings
 * are gone (bin A words only — no identifier/class/key renamed, HB-7 held).
 */

function findPageFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...findPageFiles(full));
    else if (entry === "page.tsx") out.push(full);
  }
  return out;
}

describe("no /a room h1 carries font-arcade", () => {
  const pages = findPageFiles("src/app/a");
  expect(pages.length).toBeGreaterThan(20); // sanity: the walk found the tree

  for (const p of pages) {
    it(`${p}: every <h1 ...> line is free of font-arcade`, () => {
      const src = readFileSync(p, "utf8");
      const h1Lines = src.split("\n").filter((l) => l.includes("<h1"));
      for (const line of h1Lines) {
        expect(line).not.toContain("font-arcade");
      }
    });
  }
});

describe("house.css neutralises font-arcade under .mgmt-body (the ONE forced line)", () => {
  it('the .mgmt-body [class*="font-arcade"] rule exists, matching the font-pixel rule it rides beside', () => {
    const css = readFileSync("src/app/house.css", "utf8");
    expect(css).toContain('.mgmt-body [class*="font-arcade"]{font-family:var(--sans)!important;letter-spacing:.04em}');
    expect(css).toContain('.mgmt-body [class*="font-pixel"]{font-family:var(--sans)!important;letter-spacing:.04em}');
  });
});

describe("the four operator panels' old template-brand strings are gone", () => {
  it("TicketsPanel.tsx: the crew subtitle and the @frens tag are re-voiced", () => {
    const src = readFileSync("src/components/TicketsPanel.tsx", "utf8");
    expect(src).not.toContain("FROM THE FRENS");
    expect(src).not.toContain("@frens");
    expect(src).toContain("FROM THE MEMBERS");
    expect(src).toContain("@onecocreation");
  });

  it("SpacesPanel.tsx: the @frens nostr mentions are re-voiced", () => {
    const src = readFileSync("src/components/SpacesPanel.tsx", "utf8");
    expect(src).not.toContain("@frens");
    expect(src).not.toContain("Welcome home, fren");
    expect(src).toContain("@onecocreation");
  });

  it("ChatPanel.tsx: the fren-gate copy is re-voiced and the URL is consumed from the lib default", () => {
    const src = readFileSync("src/components/ChatPanel.tsx", "utf8");
    expect(src).not.toContain("THE FREN GATE");
    expect(src).not.toContain('placeholder="https://chat.frens.earth"');
    expect(src).not.toContain("frens bounce on");
    expect(src).toContain("THE SIGN-IN GATE");
    expect(src).toContain("CHAT_URL_DEFAULT");
  });

  it("DeployPanel.tsx: the Vercel project reference is re-voiced", () => {
    const src = readFileSync("src/components/DeployPanel.tsx", "utf8");
    expect(src).not.toContain("frens-earth");
    expect(src).toContain("onecocreation");
  });
});
