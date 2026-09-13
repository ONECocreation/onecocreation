import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-216 (0018.06.23 a₿, #12 — "the dark grounds re-swap": pages Love
 * asked to be all dark still carried swapped grounds at dawn; the
 * 0018.06.17 fix did not land as she meant it).
 *
 * Root cause found by reading the actual formulas, not by re-guessing: two
 * keep-dark surfaces — `.hero` (the home page's hero, sections.tsx, ALWAYS
 * keep-dark) and `.about-story-sky` (the /about page's opening hero) —
 * both end their background gradient with `var(--band-2)`, a token
 * cartridge.css redefines for `html[data-oc-theme="light"]` (dawn
 * lavender, #ECEAF6). `main .keep-dark{…}` pins eight OTHER tokens
 * (ink/glass/rose family) against exactly this kind of drift, but never
 * covered `--band-1/2/3` — so the gradient's LAST stop still flipped to
 * dawn even though the section is marked keep-dark. Separately,
 * `.hero::after`'s dawn override painted the home hero's bottom fade cream
 * with no `:not(.keep-dark)` exclusion, even though `.hero` never exists
 * without `.keep-dark` — every OTHER repaint rule in the file carries that
 * exclusion; this one didn't.
 *
 * These tests read the real cartridge.css text (no re-typed copies) so a
 * future edit that removes the pin or the exclusion fails loud.
 */
const root = process.cwd();
const read = (rel: string) => fs.readFile(path.join(root, rel), "utf8");

describe("TASK-216 — main .keep-dark pins the bands too, so no keep-dark ground can leak dawn light", () => {
  it("main .keep-dark pins --band-1/2/3 to their NIGHT values", async () => {
    const css = await read("src/app/cartridge.css");
    const block = css.match(/main \.keep-dark\{([\s\S]*?)\}/)?.[1] ?? "";
    expect(block, "main .keep-dark block not found").not.toBe("");
    expect(block).toMatch(/--band-1:#1a1428/);
    expect(block).toMatch(/--band-2:#241a33/);
    expect(block).toMatch(/--band-3:#1e1a2f/);
  });

  it("those three values are byte-identical to the real NIGHT band values (:root,.oc-pv-dark) — never a re-typed guess", async () => {
    const css = await read("src/app/cartridge.css");
    // two `:root,.oc-pv-dark{…}` blocks exist in this file (the base token
    // pour, and the band family) — find the ONE that actually holds --band-1
    const night = [...css.matchAll(/:root,\.oc-pv-dark\{([\s\S]*?)\}/g)]
      .map((m) => m[1]).find((block) => /--band-1:/.test(block)) ?? "";
    const keepDark = css.match(/main \.keep-dark\{([\s\S]*?)\}/)?.[1] ?? "";
    expect(night, "the band-family :root,.oc-pv-dark block not found").not.toBe("");
    for (const name of ["band-1", "band-2", "band-3"]) {
      const nightVal = night.match(new RegExp(`--${name}:(#[0-9a-f]+)`, "i"))?.[1];
      const pinVal = keepDark.match(new RegExp(`--${name}:(#[0-9a-f]+)`, "i"))?.[1];
      expect(pinVal, `--${name} missing from the pin`).toBeTruthy();
      expect(pinVal?.toLowerCase()).toBe(nightVal?.toLowerCase());
    }
  });

  it("the two vulnerable formulas (.hero, .about-story-sky) both still read var(--band-2) — proving the pin is what protects them, not a rewrite of the formula itself", async () => {
    const house = await read("src/app/house.css");
    expect(house).toMatch(/\.hero\{[\s\S]*?var\(--band-2\)/);
    expect(house).toMatch(/main \.about-story-sky\{[\s\S]*?var\(--band-2\)/);
  });

  it(".hero::after's dawn repaint excludes .keep-dark, like every other repaint rule in the file", async () => {
    const css = await read("src/app/cartridge.css");
    expect(css).toMatch(/html\[data-oc-theme="light"\] \.hero:not\(\.keep-dark\)::after/);
  });

  it("sections.tsx never renders .hero without .keep-dark — the exclusion above is provably a no-op guard, not a live behavior change", async () => {
    const sections = await read("src/components/sections.tsx");
    const heroLines = sections.split("\n").filter((l) => /className="[^"]*\bhero\b[^"]*"/.test(l));
    expect(heroLines.length).toBeGreaterThan(0);
    for (const line of heroLines) expect(line).toMatch(/\bkeep-dark\b/);
  });
});

describe("TASK-216 — PopupHost's hand-carried night pins match main .keep-dark, byte for byte (the drift guard)", () => {
  it("the 8 shared keys agree between cartridge.css's main .keep-dark and PopupHost.tsx's POPUP_NIGHT_PINS", async () => {
    const css = await read("src/app/cartridge.css");
    const popup = await read("src/components/PopupHost.tsx");
    const keepDark = css.match(/main \.keep-dark\{([\s\S]*?)\}/)?.[1] ?? "";
    const pinsBlock = popup.match(/const POPUP_NIGHT_PINS = \{([\s\S]*?)\} as CSSProperties;/)?.[1] ?? "";
    expect(keepDark).not.toBe("");
    expect(pinsBlock).not.toBe("");

    const SHARED_KEYS = ["ink-strong", "ink-body", "muted", "rose", "gold-deep", "teal-bright", "glass", "glass-edge"];
    for (const key of SHARED_KEYS) {
      // the last property in the CSS block has no trailing `;` before `}`
      // (and the capture group itself already strips the closing `}`)
      const cssVal = keepDark.match(new RegExp(`--${key}:([^;}]+)(?:[;}]|$)`))?.[1]?.trim();
      const popupVal = pinsBlock.match(new RegExp(`"--${key}":\\s*"([^"]+)"`))?.[1]?.trim();
      expect(cssVal, `--${key} missing from main .keep-dark`).toBeTruthy();
      expect(popupVal, `--${key} missing from POPUP_NIGHT_PINS`).toBeTruthy();
      expect(popupVal, `--${key} drifted: main .keep-dark=${cssVal}, popup pin=${popupVal}`).toBe(cssVal);
    }
  });
});
