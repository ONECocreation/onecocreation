import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-398 (block 968,140) — the grey-paint family's other two fixes
 * (W-01's `main .keep-dark` token pins live in tests/keep-dark-bands.test.ts,
 * extended in its own byte-equality idiom; this file covers the other two):
 *
 * B12's header clause: `house.css:286`'s `.site-header` painted a bare
 * literal (`rgba(14,12,24,.86)`) — no token poured it, so the bar could
 * never follow the theme at all. ONE token, `--header-bg`, is now poured in
 * the night pour (`:root,.oc-pv-dark`, byte-identical to the literal it
 * replaces — the night no-op proof) and in the dawn block (named decision A,
 * RULED by Number One at block 968,136: PLUM LIFT — `rgba(36,26,51,.86)`,
 * the palette's own `--band-2` family at the night bar's own `.86` alpha,
 * never the cream flip); `.site-header` now consumes `var(--header-bg)`.
 *
 * W-07's sticky-footer law: no bare `main{}` rule and no `100vh`/`100dvh`
 * existed anywhere in house.css, so a short page's `.site-footer` (a fixed
 * `margin-top:30px`) stopped wherever the content ended — B14's mid-screen
 * footer on `/retreats`. `body` is now a flex column (`100vh` first as the
 * old-engine fallback, `100dvh` the real rule, W-07's Build step); `.site-footer`
 * trades the fixed margin for `auto` — intentional in BOTH themes (the
 * footer's own paint stays night by design; only its position moves).
 *
 * R6 (block 968,141, Number One's walk after the first hand-back): the
 * first draft grew `<main>` with a BARE `main{flex:1 0 auto;display:flex;
 * flex-direction:column}` rule — it also reached the console's
 * `main.min-h-screen` (no site chrome, nested under `.console-ground`/
 * `.scar-frame`/`.scar-main`) and shrank its `mx-auto` content columns.
 * Replaced with two rules scoped to the real chrome: `.site-header ~ main`
 * (the designer road — header/main/footer as siblings) only grows, never
 * becomes a flex container itself; `main:has(> .site-footer)` (the
 * hand-built road — the footer sits inside main) is both the grower and
 * its own flex column, so `.site-footer{margin-top:auto}` has a flex
 * parent. Neither matches a `<main>` with no site chrome.
 *
 * Same idiom as tests/keep-dark-bands.test.ts: read the real cartridge.css/
 * house.css text (no re-typed copies), rgba()-aware value capture (up to
 * the terminating `;`/`}`), never a hex-only regex.
 */
const root = process.cwd();
const read = (rel: string) => fs.readFile(path.join(root, rel), "utf8");

describe("TASK-398 (B12) — --header-bg is poured in both themes and consumed at .site-header, night byte-preserved", () => {
  it("the night pour (:root,.oc-pv-dark) carries --header-bg, byte-identical to the literal it replaces (the night no-op proof)", async () => {
    const css = await read("src/app/cartridge.css");
    // two `:root,.oc-pv-dark{…}` blocks exist in this file (the base token
    // pour, and the band family) — find the ONE that actually holds --panel
    const night = [...css.matchAll(/:root,\.oc-pv-dark\{([\s\S]*?)\}/g)]
      .map((m) => m[1]).find((block) => /--panel:/.test(block)) ?? "";
    expect(night, "the base :root,.oc-pv-dark block not found").not.toBe("");
    const val = night.match(/--header-bg:([^;}]+)(?:[;}]|$)/)?.[1]?.trim();
    expect(val, "--header-bg missing from the night pour").toBeTruthy();
    expect(val).toBe("rgba(14,12,24,.86)");
  });

  it("the dawn block carries --header-bg poured to the ruled PLUM LIFT value (named decision A, block 968,136)", async () => {
    const css = await read("src/app/cartridge.css");
    // two `html[data-oc-theme="light"],.oc-pv-light{…}` blocks exist too
    // (the base dawn pour, and the dawn band family) — same disambiguation
    const dawn = [...css.matchAll(/html\[data-oc-theme="light"\],\.oc-pv-light\{([\s\S]*?)\}/g)]
      .map((m) => m[1]).find((block) => /--panel:/.test(block)) ?? "";
    expect(dawn, "the base dawn html[data-oc-theme=\"light\"],.oc-pv-light block not found").not.toBe("");
    const val = dawn.match(/--header-bg:([^;}]+)(?:[;}]|$)/)?.[1]?.trim();
    expect(val, "--header-bg missing from the dawn block").toBeTruthy();
    expect(val).toBe("rgba(36,26,51,.86)");
  });

  it("house.css's .site-header consumes var(--header-bg), never the bare literal", async () => {
    const house = await read("src/app/house.css");
    const rule = house.match(/\.site-header\{([^}]*)\}/)?.[1] ?? "";
    expect(rule, ".site-header rule not found").not.toBe("");
    expect(rule).toMatch(/background:var\(--header-bg\)/);
  });

  it("the night literal rgba(14,12,24,.86) survives ONLY inside the token pour — the flip is a pour, never a rewrite of the night look", async () => {
    const house = await read("src/app/house.css");
    const rule = house.match(/\.site-header\{([^}]*)\}/)?.[1] ?? "";
    expect(rule, ".site-header rule not found").not.toBe("");
    expect(rule).not.toMatch(/rgba\(14,12,24,\.86\)/);
  });
});

describe("TASK-398 (W-07) — one sticky-footer law: body is a flex column, main grows, the footer margin is auto", () => {
  it("the body rule carries display:flex;flex-direction:column and the 100vh/100dvh pair, 100vh first as the old-engine fallback", async () => {
    const house = await read("src/app/house.css");
    // anchor on a line that STARTS with `body{` so the dawn twin
    // (`html[data-oc-theme="light"] body{`) is never matched instead
    const rule = house.match(/^body\{([^}]*)\}/m)?.[1] ?? "";
    expect(rule, "the base body{} rule not found").not.toBe("");
    expect(rule).toMatch(/display:flex/);
    expect(rule).toMatch(/flex-direction:column/);
    expect(rule).toMatch(/min-height:100vh/);
    expect(rule).toMatch(/min-height:100dvh/);
    const vhAt = rule.indexOf("min-height:100vh");
    const dvhAt = rule.indexOf("min-height:100dvh");
    expect(vhAt, "100vh must appear before 100dvh (the old-engine fallback reads first)").toBeGreaterThanOrEqual(0);
    expect(vhAt).toBeLessThan(dvhAt);
  });

  it("R6: .site-header ~ main only grows (the designer road — header/main/footer as siblings) — never becomes a flex container itself", async () => {
    const house = await read("src/app/house.css");
    const rule = house.match(/\.site-header ~ main\{([^}]*)\}/)?.[1] ?? "";
    expect(rule, ".site-header ~ main rule not found").not.toBe("");
    // exact match, not toMatch: this selector must carry ONLY flex:1 0 auto
    // — the console regression (R6) was exactly an extra display:flex here
    expect(rule).toBe("flex:1 0 auto");
  });

  it("R6: main:has(> .site-footer) is both the grower and its own flex column (the hand-built road — the footer sits inside main)", async () => {
    const house = await read("src/app/house.css");
    const rule = house.match(/main:has\(> \.site-footer\)\{([^}]*)\}/)?.[1] ?? "";
    expect(rule, "main:has(> .site-footer) rule not found").not.toBe("");
    expect(rule).toBe("flex:1 0 auto;display:flex;flex-direction:column");
  });

  it("R6: no bare main{} rule in house.css carries display:flex (the console regression this rule replaced)", async () => {
    const house = await read("src/app/house.css");
    // `^main\{` (no space, no dot) would match only a truly bare rule —
    // never `.site-header ~ main{`, `main:has(...)`  or a descendant
    // selector like `main .about-story-sky{`. None should exist post-R6,
    // but this stays a real scan (not just "not found") so a FUTURE bare
    // main{} — however it gets added — fails loud the moment it carries
    // display:flex, the exact shape that reached the console.
    const bareRules = [...house.matchAll(/^main\{([^}]*)\}/gm)].map((m) => m[1]);
    for (const rule of bareRules) {
      expect(rule, `a bare main{} rule carries display:flex: "${rule}"`).not.toMatch(/display:flex/);
    }
  });

  it(".site-footer carries margin-top:auto, not the old fixed margin-top:30px — intentional in both themes", async () => {
    const house = await read("src/app/house.css");
    const rule = house.match(/\.site-footer\{([^}]*)\}/)?.[1] ?? "";
    expect(rule, ".site-footer rule not found").not.toBe("");
    expect(rule).toMatch(/margin-top:auto/);
    expect(rule).not.toMatch(/margin-top:30px/);
  });

  it("the dawn body twin is untouched by the flex law — only the base body{} rule gained it", async () => {
    const house = await read("src/app/house.css");
    const dawnBody = house.match(/html\[data-oc-theme="light"\] body\{([^}]*)\}/)?.[1] ?? "";
    expect(dawnBody, "the dawn body twin not found").not.toBe("");
    expect(dawnBody).not.toMatch(/flex-direction/);
    expect(dawnBody).not.toMatch(/min-height/);
  });
});
