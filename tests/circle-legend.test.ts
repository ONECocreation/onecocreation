import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-189 (0018.06.18 a₿, cut from the T-184 review) — A MEMBER NEVER
 * SEES BLACKOUT, so the Circle's legend never NAMES it for a member
 * either. CircleView.tsx's buildPublicMarks (pinned in
 * tests/classroom-three-rooms.test.ts) already paints a blocked day
 * plain — no wash, no mark — but the shared BftMonthGrid's legend row
 * still said the word "blackout" out loud underneath, unconditionally,
 * for every mount including the Circle's. Now BftMonthGrid takes a
 * `legendBlackout` prop (default true — Love's own /a calendar,
 * console/LovesDesk.tsx, passes no prop and keeps the swatch), and
 * CircleView is the one caller that passes false.
 *
 * Pins BOTH sides real-rendered (server-side, no jsdom needed —
 * useSyncExternalStore falls through to its getServerSnapshot when there
 * is no DOM, same as any other server render in this suite):
 *  1. BftMonthGrid itself: legendBlackout default/true names it,
 *     false hides only that one swatch (multi-day/today/28-days stand);
 *  2. CircleView's own JSX wires legendBlackout={false} into its
 *     BftMonthGrid mount — the operator's LovesDesk passes no such prop,
 *     so its calendar keeps the word, unchanged.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

describe("BftMonthGrid — the legend's blackout swatch is optional", () => {
  it("default (no prop) names blackout, alongside multi-day/today/28-days", async () => {
    const { default: BftMonthGrid } = await import("@/components/calendar/BftMonthGrid");
    const html = renderToStaticMarkup(createElement(BftMonthGrid, { bftYear: 18, bftMonth: 6 }));
    expect(html).toContain("blackout");
    expect(html).toContain("multi-day");
    expect(html).toContain("today");
    expect(html).toContain("28 days, always");
  });

  it("legendBlackout={false} drops ONLY the blackout swatch — the rest of the legend stands", async () => {
    const { default: BftMonthGrid } = await import("@/components/calendar/BftMonthGrid");
    const html = renderToStaticMarkup(
      createElement(BftMonthGrid, { bftYear: 18, bftMonth: 6, legendBlackout: false }),
    );
    expect(html).not.toContain("blackout");
    expect(html).toContain("multi-day");
    expect(html).toContain("today");
    expect(html).toContain("28 days, always");
  });

  it("legend={false} still suppresses the whole row, blackout included", async () => {
    const { default: BftMonthGrid } = await import("@/components/calendar/BftMonthGrid");
    const html = renderToStaticMarkup(createElement(BftMonthGrid, { bftYear: 18, bftMonth: 6, legend: false }));
    expect(html).not.toContain("cal-legend");
    expect(html).not.toContain("blackout");
  });
});

describe("the Circle's own mount hides the word; the operator's desk keeps it", () => {
  it("CircleView.tsx wires legendBlackout={false} into its BftMonthGrid", async () => {
    const src = await read("src/components/rooms/CircleView.tsx");
    expect(src).toMatch(/<BftMonthGrid[^>]*legendBlackout=\{false\}/);
  });

  it("LovesDesk.tsx (the operator's /a calendar) passes no legendBlackout prop — the default (true) stands", async () => {
    const src = await read("src/components/console/LovesDesk.tsx");
    const match = src.match(/<BftMonthGrid[\s\S]*?\/>/);
    expect(match, "LovesDesk lost its BftMonthGrid mount").toBeTruthy();
    expect(match![0]).not.toContain("legendBlackout");
  });
});
