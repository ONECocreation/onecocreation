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
 * already uses on `.nav-items` at this exact breakpoint, proven live
 * today. A second, independent fix (`.door-pop--menu`) caps the
 * signed-in member menu's own width, since a long unbroken claimed name
 * inherits `white-space:nowrap` from `.nav-tail` and the menu wrapper
 * carried no `max-width` of its own (Astra's review).
 *
 * REVIEW FIX (Number One's Chrome walk, a 320/360/375-wide frame with a
 * real 15px desktop scrollbar): the sheet's own WIDTH literal rode
 * `calc(100vw - Npx)`, but `100vw` counts a classic scrollbar's own
 * width while the containing block (`.site-header`, once `.door-anchor`
 * is `position:static`) does not — so on a desktop window under 1000px
 * wide (never on a phone, which has no scrollbar), the sheet sat a few
 * pixels wider than the header actually was. The width literal moved
 * out of DoorButton.tsx entirely into a THIRD class, `.door-pop--sheet`
 * (base rule rides `vw`, byte-equivalent to the old inline value above
 * 1000px; the phone override rides `%` instead — the real available
 * width). `.door-pop--menu`'s own cap gets the same `%` swap, same
 * reason. `.nav-items` carries the identical `vw` flaw at this same
 * breakpoint and is untouched here — reported as its own seam, not this
 * lane's fix (it owns `.nav-items`, not `DoorButton`/`house.css`'s new
 * classes).
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

describe("DoorButton.tsx no longer positions or sizes its own popup inline (TASK-386)", () => {
  it("no inline position:absolute survives anywhere in the file", () => {
    expect(src).not.toMatch(/position:\s*"absolute"/);
  });

  it("the ref div carries the new class and is genuinely bare — no style= left beside it", () => {
    expect(src).toContain('<div ref={ref} className="door-anchor">');
    const tag = src.match(/className="door-anchor"[^>]*>/)?.[0] ?? "";
    expect(tag).not.toMatch(/style=/);
  });

  it("the sheet wrapper carries door-pop door-pop--sheet; the menu wrapper carries door-pop door-pop--menu, exactly one of each", () => {
    expect(src).toContain('<div className="door-pop door-pop--sheet" style={{ padding: 10 }}>');
    expect(src).toContain('<div role="menu" className="door-pop door-pop--menu" style={{ minWidth: 190, padding: "10px 0" }}>');
    expect((src.match(/className="door-pop door-pop--sheet"/g) ?? []).length).toBe(1);
    expect((src.match(/className="door-pop door-pop--menu"/g) ?? []).length).toBe(1);
    expect((src.match(/className="door-pop/g) ?? []).length).toBe(2);
  });

  it("neither wrapper sets an inline width — the sheet's width rides the new class now; the menu wrapper's minWidth is not a width", () => {
    const sheetTag = src.match(/<div className="door-pop door-pop--sheet"[^>]*>/)?.[0] ?? "";
    const menuTag = src.match(/<div role="menu" className="door-pop door-pop--menu"[^>]*>/)?.[0] ?? "";
    expect(sheetTag).toBeTruthy();
    expect(menuTag).toBeTruthy();
    expect(sheetTag).not.toContain("width:");
    expect(menuTag).not.toContain("width:");
  });

  it("no 100vw survives anywhere in the file — a classic desktop scrollbar counts toward vw but not toward the header's own width (Number One's Chrome walk)", () => {
    expect(src).not.toContain("calc(100vw");
  });
});

describe("house.css carries the moved recipe, the desktop width included, once (TASK-386)", () => {
  it("the base rule reads the same --pop-* tokens .nav-sub reads, right-anchored, once", () => {
    expect(house).toMatch(
      /\.door-pop\{position:absolute;top:calc\(100% \+ 10px\);right:0;\s*background:var\(--pop-bg\)/,
    );
  });

  it("the base (desktop) width rule rides vw — byte-equivalent to the old inline value above 1000px, where the 360px cap binds and no scrollbar-vs-header fight exists", () => {
    expect(house).toContain(".door-pop--sheet{width:min(360px,calc(100vw - 20px))}");
  });

  it("the phone override — the anchor, the sheet's gutter, the sheet's OWN width, and the menu's cap — lives inside the ONE pre-existing @media(max-width:1000px) block that also holds .nav-tail a{, never a new one", () => {
    /* two @media(max-width:1000px){ blocks exist in house.css today —
       tests/lions-gate-dawn.test.ts:38-39 pins that exact COUNT at 2; that
       guard belongs solely to that test, and this one rides beside it
       rather than replacing it. This search finds the right block by its
       CONTENT (the same technique tests/chrome-trio.test.ts already uses),
       which proves the anchor/gutter/width/cap sit in the header's own
       phone block — it does not itself prove only two such blocks exist. */
    const starts = [...house.matchAll(/@media\(max-width:1000px\)\{/g)].map((m) => m.index!);
    const navBlockStart = starts.find((s) => house.slice(s, house.indexOf("\n}", s)).includes(".nav-tail a{"));
    expect(navBlockStart).toBeDefined();
    const block = house.slice(navBlockStart!, house.indexOf("\n}", navBlockStart!));
    expect(block).toContain(".door-anchor{position:static}");
    expect(block).toContain(".door-pop{right:10px}");
    expect(block).toContain(".door-pop--sheet{width:min(360px,calc(100% - 20px))}");
    expect(block).toContain(".door-pop--menu{max-width:calc(100% - 20px)");
  });

  it("the phone-block width rules ride % (the containing block's own width), never vw (the scrollbar catch)", () => {
    const starts = [...house.matchAll(/@media\(max-width:1000px\)\{/g)].map((m) => m.index!);
    const navBlockStart = starts.find((s) => house.slice(s, house.indexOf("\n}", s)).includes(".nav-tail a{"));
    const block = house.slice(navBlockStart!, house.indexOf("\n}", navBlockStart!));
    expect(block).not.toContain("door-pop--sheet{width:min(360px,calc(100vw");
    expect(block).not.toContain("door-pop--menu{max-width:calc(100vw");
  });
});
