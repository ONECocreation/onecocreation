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

/**
 * TASK-398 (W-01, block 968,140) — the grey-paint family. `main .keep-dark`
 * (cartridge.css:437-440) already pinned eight tokens against the dawn
 * repaint; it never covered `--panel`/`--edge`/`--ghost-bg`/`--ghost-ink`, so
 * a keep-dark frame's `.card` (the book picture under "Join the Weekly
 * Reading", B6) and `.btn-ghost` (`/book`'s "more info", B12) still read the
 * dawn grey inside an always-dark frame. Same idiom as the TASK-216 tests
 * above: read the real cartridge.css text, assert the four pins exist, and
 * prove byte-equality to the real night pour — but rgba()-aware (these four
 * values are `rgba(...)` and one hex, not the band family's hex-only shape),
 * so the match captures up to the terminating `;`/`}` rather than a
 * hex-only regex retyped from memory.
 */
describe("TASK-398 (W-01) — main .keep-dark pins --panel/--edge/--ghost-bg/--ghost-ink too, so dawn cannot grey a keep-dark card or ghost button", () => {
  const FOUR_KEYS = ["panel", "edge", "ghost-bg", "ghost-ink"];

  it("main .keep-dark pins all four tokens", async () => {
    const css = await read("src/app/cartridge.css");
    const block = css.match(/main \.keep-dark\{([\s\S]*?)\}/)?.[1] ?? "";
    expect(block, "main .keep-dark block not found").not.toBe("");
    for (const key of FOUR_KEYS) {
      expect(block, `--${key} missing from main .keep-dark`).toMatch(new RegExp(`--${key}:`));
    }
  });

  it("those four values are byte-identical to the real NIGHT pour (:root,.oc-pv-dark) — rgba()-aware, never a re-typed guess", async () => {
    const css = await read("src/app/cartridge.css");
    // two `:root,.oc-pv-dark{…}` blocks exist in this file (the base token
    // pour, and the band family) — find the ONE that actually holds --panel
    const night = [...css.matchAll(/:root,\.oc-pv-dark\{([\s\S]*?)\}/g)]
      .map((m) => m[1]).find((block) => /--panel:/.test(block)) ?? "";
    const keepDark = css.match(/main \.keep-dark\{([\s\S]*?)\}/)?.[1] ?? "";
    expect(night, "the base :root,.oc-pv-dark block not found").not.toBe("");
    for (const key of FOUR_KEYS) {
      // rgba()-aware: capture up to the terminating `;` or `}`, unlike the
      // band test's hex-only regex above — --panel/--edge/--ghost-bg are
      // rgba(), --ghost-ink alone is hex
      const nightVal = night.match(new RegExp(`--${key}:([^;}]+)(?:[;}]|$)`))?.[1]?.trim();
      const pinVal = keepDark.match(new RegExp(`--${key}:([^;}]+)(?:[;}]|$)`))?.[1]?.trim();
      expect(nightVal, `--${key} missing from the night pour`).toBeTruthy();
      expect(pinVal, `--${key} missing from the pin`).toBeTruthy();
      expect(pinVal, `--${key} drifted: night=${nightVal}, pin=${pinVal}`).toBe(nightVal);
    }
  });

  /**
   * AMENDMENT R1 (Astra finding 1, block 968,140): the lion page's dawn
   * exception (`html[data-oc-theme="light"] main.lions-gate-dark
   * .keep-dark{…inherit}`) resets every token `main .keep-dark` pins back to
   * `inherit`, so the memberships page reads its OWN dawn values instead of
   * the night pin. Rather than a hardcoded key list (which silently rots the
   * next time either ruleset grows), this reads BOTH blocks and asserts the
   * exception's key set is a superset of the pin's key set — so a future pin
   * addition that forgets the lion's exception fails loud, exactly the
   * "cannot bypass the lion's dawn contract" Astra asked for.
   */
  it("the lion page's dawn exception (main.lions-gate-dark .keep-dark) resets to inherit every key main .keep-dark pins, except the known pre-existing --band-1/2/3 gap (TASK-216, named in Seams — not this lane's fix)", async () => {
    const css = await read("src/app/cartridge.css");
    const keepDark = css.match(/main \.keep-dark\{([\s\S]*?)\}/)?.[1] ?? "";
    const lionException = css
      .match(/html\[data-oc-theme="light"\] main\.lions-gate-dark \.keep-dark\{([\s\S]*?)\}/)?.[1] ?? "";
    expect(keepDark, "main .keep-dark block not found").not.toBe("");
    expect(lionException, "the lion page's dawn .keep-dark exception not found").not.toBe("");

    // TASK-216 pinned --band-1/2/3 into main .keep-dark but never extended
    // this exception to match it — found while writing this test (Astra
    // §4's ask), pre-existing (present before this lane touched anything),
    // and out of this lane's OWNS (widened by exactly ONE additive edit,
    // the four W-01 tokens — AMENDMENT R1). Likely inert today: neither
    // `.hero` nor `.about-story-sky` (the only two `var(--band-2)`
    // consumers) render on the lion page, and its own
    // `main.lions-gate-dark section{background:transparent!important}`
    // already blanks section backgrounds regardless — but not verified by
    // a walk, and not silently dropped from view: named in SUMMARY's Seams
    // for a future pin-audit lane. This allowlist is the one place that
    // follow-on would also need to update.
    const KNOWN_PRE_EXISTING_GAP = ["band-1", "band-2", "band-3"];

    const pinKeys = [...keepDark.matchAll(/--([a-z0-9-]+):/g)].map((m) => m[1]);
    expect(pinKeys.length, "no keys parsed from main .keep-dark").toBeGreaterThan(0);
    for (const key of pinKeys) {
      if (KNOWN_PRE_EXISTING_GAP.includes(key)) continue;
      expect(lionException, `--${key} is pinned by main .keep-dark but not reset to inherit in the lion's dawn exception`)
        .toMatch(new RegExp(`--${key}:inherit\\b`));
    }
  });
});
