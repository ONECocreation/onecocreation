import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/* TASK-240 (0018.06.23 a₿, cut from the call: "the monthly calendar is too
 * round compared to the week squares"). One cell component (DayCell.tsx)
 * mounts in both BftMonthGrid (7-column month) and WeekRibbon (7-wide
 * week) — the pill-vs-square read was a CSS radius mismatch, not a
 * component split. Fix: one token, `--cal-cell-radius`, declared on
 * `.cal-scroll` (the shared wrapper both grids render into) and read by
 * `.cal-cell`; and both grids' `gap` at the same value so the two read as
 * one lattice. Source-text pin, the house idiom for CSS-only lanes — see
 * tests/switch-pages-dynamic.test.ts. */

const CSS_PATH = "src/components/calendar/calendar-view.css";
const css = readFileSync(CSS_PATH, "utf8");

describe("calendar-view.css — day-cell radius token", () => {
  it("declares --cal-cell-radius on the shared .cal-scroll wrapper", () => {
    const scrollRule = css.match(/\.cal-scroll\{[^}]*\}/)?.[0] ?? "";
    expect(scrollRule).toMatch(/--cal-cell-radius\s*:\s*6px/);
  });

  it(".cal-cell reads its radius from the --cal-cell-radius token, not a literal", () => {
    const cellRule = css.match(/\.cal-cell\{[\s\S]*?\}/)?.[0] ?? "";
    expect(cellRule).toMatch(/border-radius\s*:\s*var\(--cal-cell-radius/);
    expect(cellRule).not.toMatch(/border-radius\s*:\s*14px/);
  });

  it("leaves the popover (16px) and pills (999px) radii untouched", () => {
    expect(css).toMatch(/\.cal-options__panel\{[^}]*border-radius:16px/);
    expect(css).toMatch(/\.cal-pill\{[^}]*border-radius:999px/);
  });

  it("the month grid and week ribbon declare the same gap — one lattice", () => {
    const monthGap = css.match(/\.cal-month-grid\{[^}]*\bgap:(\d+px)/)?.[1];
    const weekGap = css.match(/\.cal-week-ribbon\{[^}]*\bgap:(\d+px)/)?.[1];
    expect(monthGap).toBeDefined();
    expect(weekGap).toBeDefined();
    expect(monthGap).toBe(weekGap);
    expect(monthGap).toBe("6px");
  });
});
