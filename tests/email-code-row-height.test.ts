import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * TASK-478 (block 968,624+) — the row-alignment law: a button beside/under
 * a text field shares its height (±1px), both themes, error state
 * included. Measured with `~/dev/shortcuts/oc-row-align.cjs` and a real
 * headless Chromium against the local dev server AND production
 * (read-only): every "Email me a code" field+button pair carried a
 * 9.2px gap (`.kit-field-input` measuring 51.2px against a same-size
 * `.kit-btn-main.kit-btn-sm`'s 42px) everywhere the pair rendered
 * STACKED (SignInCard.tsx's /login and /me tabs, DoorSheet.tsx's /login
 * fallback) or briefly at iPhone/iPad-narrow widths (≤640px) on
 * ReadingSignInBox's /reading row, where the `.kit-inline-form` grid
 * that normally stretches the button to match the field collapses to a
 * single column and drops the stretch (kit.css:396-397).
 *
 * ROOT CAUSE: `.kit-field-input` never declared its own `line-height`,
 * so it inherited the page's ambient copy line-height (globals.css body
 * rule, 1.0625rem/1.6 — sized for paragraphs, not a one-line pill).
 * `.kit-btn-main` already pins an explicit `line-height:1.25` and never
 * had this problem. FIX: `.kit-field-input{line-height:normal}` — the
 * SAME decoupling discipline, verified in a real browser to land the
 * field at exactly 42.0px, matching the button exactly (0.0px gap,
 * every width, both themes, the failed-submit state included).
 *
 * DoorSheet.tsx's and EmailDoor.tsx's own email inputs are plain inline
 * styles (never `.kit-field-input`), so the kit.css fix cannot reach
 * them — each carries the identical one-line `lineHeight: "normal"` fix
 * inline, same reasoning, same value.
 */

const ROOT = path.join(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("kit.css — .kit-field-input carries an explicit line-height (the row-alignment fix)", () => {
  it("the base .kit-field-input rule sets line-height:normal", () => {
    const src = read("src/app/kit.css");
    const rule = src.match(/\.kit-field-input\{[^}]*\}/)?.[0] ?? "";
    expect(rule, "the base .kit-field-input rule").toBeTruthy();
    expect(rule).toMatch(/line-height:\s*normal/);
  });

  it("the nested .kit-inline-form .kit-field-input row-layout rule (kit-inline-form's own grid fix) is untouched — this lane adds a line-height, it does not touch the grid law", () => {
    const src = read("src/app/kit.css");
    expect(src).toContain(
      ".kit-inline-form .kit-field-input{grid-column:1;grid-row:2;min-width:0;box-sizing:border-box;width:100%}",
    );
  });
});

describe("DoorSheet.tsx / EmailDoor.tsx — the raw inline email field carries the same fix", () => {
  it("DoorSheet.tsx's shared `field` style object sets lineHeight to \"normal\"", () => {
    const src = read("src/components/door/DoorSheet.tsx");
    const block = src.match(/const field: React\.CSSProperties = \{[\s\S]*?\};/)?.[0] ?? "";
    expect(block, "the field style object").toBeTruthy();
    expect(block).toMatch(/lineHeight:\s*"normal"/);
  });

  it("EmailDoor.tsx's inputStyle object sets lineHeight to \"normal\"", () => {
    const src = read("src/components/EmailDoor.tsx");
    const block = src.match(/const inputStyle: React\.CSSProperties = \{[\s\S]*?\};/)?.[0] ?? "";
    expect(block, "the inputStyle object").toBeTruthy();
    expect(block).toMatch(/lineHeight:\s*"normal"/);
  });

  it("DoorSheet's code-step input spreads the SAME field style (letterSpacing/fontSize override only) — it inherits the fix, no separate patch needed", () => {
    const src = read("src/components/door/DoorSheet.tsx");
    expect(src).toMatch(/style=\{\{\s*\.\.\.field,\s*letterSpacing:/);
  });
});
