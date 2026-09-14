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
 * tests/switch-pages-dynamic.test.ts.
 *
 * Second pass (coordinator catch, verified in the worktree): the month
 * grid's cell is a <button className="cal-cell"> (DayCell.tsx — it takes
 * onSelectDay), the week ribbon's is a plain <div> (WeekAltitude.tsx never
 * wires onSelectDay). Inside the admin shell (SiteConsoleShell.tsx's
 * <main className="mgmt-body">), globals.css's `.mgmt-body button{
 * border-radius:999px}` is specificity (0,1,1) — it outranks the bare
 * `.cal-cell` class rule at (0,1,0), so the token never reached the
 * button-rendered month cell even though it reached the div-rendered week
 * cell. Fixed inside this file only (never globals.css) with a
 * `.cal-scroll .cal-cell, .cal-scroll button.cal-cell` rule — two classes,
 * (0,2,0)/(0,2,1) — that outranks the shell rule for both element shapes
 * regardless of stylesheet order. */

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

  it("carries a higher-specificity override so a button.cal-cell (the month grid's clickable cell) also reads the token — outranking .mgmt-body button{border-radius:999px}", () => {
    const overrideRule = css.match(/\.cal-scroll \.cal-cell,\s*\.cal-scroll button\.cal-cell\{[^}]*\}/)?.[0] ?? "";
    expect(overrideRule).not.toBe("");
    expect(overrideRule).toMatch(/border-radius\s*:\s*var\(--cal-cell-radius/);
  });
});
