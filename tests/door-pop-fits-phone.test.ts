import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * TASK-386 (block 968,061) — the header's popup (the sign-in sheet AND the
 * signed-in member's own menu) fits a phone. Both wrappers shared one
 * inline `pop` object in DoorButton.tsx, right-anchored (`right:0`) to the
 * narrow "Log in"/name button — the Admiral's own phone walk measured the
 * sheet landing ~39px past the LEFT edge of a 375px screen (Ground, part A
 * of the brief). This lane moves the POSITION half of that recipe (the
 * COLOR half already rode --pop-bg/--pop-edge/--pop-shadow, cartridge.css:
 * 95-98's own "once" jug) out of the inline object and into two house.css
 * base rules, `.door-anchor`/`.door-pop` — the same shape `.nav-sub`
 * already uses — so a phone-width override can re-anchor it: the SAME
 * `position:static`-breaks-the-containing-block technique `.nav-menu`
 * already uses on `.nav-items` at this exact breakpoint (house.css:661,
 * :671-673), proven live today. A second, independent fix (`.door-pop--
 * menu`) caps the signed-in member menu's own width, since a long
 * unbroken claimed name inherits `white-space:nowrap` from `.nav-tail`
 * and the menu wrapper carried no `max-width` of its own (Astra's review).
 *
 * This repo's tests run in a node environment (no jsdom, vitest.config.ts)
 * and DoorButton is never rendered anywhere in this suite (every existing
 * reference to it is a source-text check — Ground, part D of the brief).
 * These are source pins, the same idiom `tests/chrome-trio.test.ts` and
 * `tests/lions-gate-dawn.test.ts` already use for CSS/positioning fixes —
 * a source pin is a tripwire, not proof of geometry: the gutter math is
 * Ground's job, the actual pixels are Number One's own browser check
 * (the brief's "Number One's own check, before the push"), not this file's.
 */

const src = readFileSync("src/components/door/DoorButton.tsx", "utf8");
const house = readFileSync("src/app/house.css", "utf8");

describe("DoorButton.tsx no longer positions its own popup inline (TASK-386)", () => {
  it("no inline position:absolute survives anywhere in the file", () => {
    expect(src).not.toMatch(/position:\s*"absolute"/);
  });

  it("the ref div carries the new class and is genuinely bare — no style= left beside it", () => {
    expect(src).toContain('<div ref={ref} className="door-anchor">');
    const tag = src.match(/className="door-anchor"[^>]*>/)?.[0] ?? "";
    expect(tag).not.toMatch(/style=/);
  });

  it("both popup call sites share the base class; the menu call site alone also carries the second", () => {
    expect((src.match(/className="door-pop/g) ?? []).length).toBe(2);
    expect(src).toContain('className="door-pop door-pop--menu"');
  });

  it("the sheet's width literal really moved, not just changed in spirit", () => {
    expect(src).toContain("calc(100vw - 20px)");
    expect(src).not.toContain("calc(100vw - 32px)");
  });
});

describe("house.css carries the moved recipe (TASK-386)", () => {
  it("the base rule reads the same --pop-* tokens .nav-sub reads, right-anchored, once", () => {
    expect(house).toMatch(
      /\.door-pop\{position:absolute;top:calc\(100% \+ 10px\);right:0;\s*background:var\(--pop-bg\)/,
    );
  });

  it("the phone override — the anchor, the sheet's gutter, and the menu's cap — lives inside the ONE pre-existing @media(max-width:1000px) block that also holds .nav-tail a{, never a new one", () => {
    /* two @media(max-width:1000px){ blocks exist in house.css today —
       tests/lions-gate-dawn.test.ts:38-39 pins that exact COUNT at 2; that
       guard belongs solely to that test, and this one rides beside it
       rather than replacing it. This search finds the right block by its
       CONTENT (the same technique tests/chrome-trio.test.ts already uses),
       which proves the anchor/gutter/cap sit in the header's own phone
       block — it does not itself prove only two such blocks exist. */
    const starts = [...house.matchAll(/@media\(max-width:1000px\)\{/g)].map((m) => m.index!);
    const navBlockStart = starts.find((s) => house.slice(s, house.indexOf("\n}", s)).includes(".nav-tail a{"));
    expect(navBlockStart).toBeDefined();
    const block = house.slice(navBlockStart!, house.indexOf("\n}", navBlockStart!));
    expect(block).toContain(".door-anchor{position:static}");
    expect(block).toContain(".door-pop{right:10px}");
    expect(block).toMatch(/\.door-pop--menu\{/);
  });
});
