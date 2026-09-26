import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-211 (0018.06.23 a₿, Love's call #9, #18) — the member's calendar:
 * "My sessions" → "Calendar", week view leads (the DEFAULT), a week/month
 * toggle, and the visitor's booked items ride the grid. #9 (01:34:18): the
 * member's month view squares were wrong — the fix REUSES the community
 * calendar's own shared grid (BftMonthGrid/WeekRibbon, src/components/
 * calendar), never a rebuilt one. This pins the model (buildBookingMarks,
 * pure) and the reuse (an import assertion + a real render of the shared
 * component with member marks), the same idiom circle-legend.test.ts uses
 * for CircleView's own BftMonthGrid mount.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

describe("MemberCalendar reuses the shared month grid — it never rebuilds one", () => {
  it("imports BftMonthGrid + WeekRibbon from the shared @/components/calendar module", async () => {
    const src = await read("src/components/me/MemberCalendar.tsx");
    const importBlock = src.slice(0, src.indexOf(";", src.indexOf("from \"@/components/calendar\"")) + 1);
    expect(importBlock).toContain("BftMonthGrid");
    expect(importBlock).toContain("WeekRibbon");
    expect(importBlock).toContain('from "@/components/calendar"');
  });

  it("defines no month-grid CSS class of its own (cal-month-grid stays BftMonthGrid's alone)", async () => {
    const src = await read("src/components/me/MemberCalendar.tsx");
    expect(src).not.toContain("cal-month-grid");
  });
});

describe("week view is the default; a week/month toggle sits above the grid", () => {
  it("view state initializes to \"week\"", async () => {
    const src = await read("src/components/me/MemberCalendar.tsx");
    expect(src).toMatch(/useState<"week" \| "month">\("week"\)/);
  });

  it("both Week and Month buttons are present, toggling the view", async () => {
    const src = await read("src/components/me/MemberCalendar.tsx");
    expect(src).toMatch(/onClick=\{\(\) => setView\("week"\)\}/);
    expect(src).toMatch(/onClick=\{\(\) => setView\("month"\)\}/);
  });
});

describe("buildBookingMarks — pure, pins the model (not the render)", () => {
  it("no bookings → no marks anywhere", async () => {
    const { buildBookingMarks } = await import("@/components/me/MemberCalendar");
    const { bftMonthGrid } = await import("@/lib/calendar-view");
    const marks = buildBookingMarks(null);
    const { cells } = bftMonthGrid(18, 6, { nowMs: Date.parse("2026-09-01T00:00:00Z") });
    expect(cells.every((c) => marks(c) === undefined)).toBe(true);
  });

  it("a booking on day X becomes a gold pill on that civil day, keyed by the booking id", async () => {
    const { buildBookingMarks } = await import("@/components/me/MemberCalendar");
    const { bftMonthGrid } = await import("@/lib/calendar-view");
    const nowMs = Date.parse("2026-09-01T00:00:00Z");
    const { cells } = bftMonthGrid(18, 6, { nowMs });
    const target = cells[3];
    const bookings = [
      { bookingId: "b1", title: "Discovery call", startUtc: `${target.civilKey}T15:00:00Z`, endUtc: `${target.civilKey}T15:30:00Z`, state: "confirmed", meetingUrl: null, location: null },
    ];
    const marks = buildBookingMarks(bookings);
    const hit = marks(target);
    /* TASK-480 — every pill is clickable now: the booking pill carries
       its own receipt-page href. */
    expect(hit?.pills).toEqual([
      { id: "b1", label: "Discovery call", variant: "gold", href: "/book/receipt/b1" },
    ]);
    // every OTHER cell in the grid stays unmarked
    expect(cells.filter((c) => c !== target).every((c) => marks(c) === undefined)).toBe(true);
  });

  it("caps at 3 pills for a day with more bookings than that", async () => {
    const { buildBookingMarks } = await import("@/components/me/MemberCalendar");
    const { bftMonthGrid } = await import("@/lib/calendar-view");
    const nowMs = Date.parse("2026-09-01T00:00:00Z");
    const { cells } = bftMonthGrid(18, 6, { nowMs });
    const target = cells[0];
    const bookings = Array.from({ length: 5 }, (_, i) => ({
      bookingId: `b${i}`, title: `Session ${i}`, startUtc: `${target.civilKey}T1${i}:00:00Z`,
      endUtc: `${target.civilKey}T1${i}:30:00Z`, state: "confirmed", meetingUrl: null, location: null,
    }));
    const marks = buildBookingMarks(bookings);
    expect(marks(target)?.pills).toHaveLength(3);
  });
});

describe("the shared grid really renders a member's booked pill (real render, server-side)", () => {
  it("BftMonthGrid + buildBookingMarks together paint the booking's own day", async () => {
    const { buildBookingMarks } = await import("@/components/me/MemberCalendar");
    const { default: BftMonthGrid } = await import("@/components/calendar/BftMonthGrid");
    const nowMs = Date.parse("2026-09-01T00:00:00Z");
    const { bftMonthGrid } = await import("@/lib/calendar-view");
    const { cells } = bftMonthGrid(18, 6, { nowMs });
    const target = cells[5];
    const bookings = [
      { bookingId: "b1", title: "Weekly Intuitive", startUtc: `${target.civilKey}T15:00:00Z`, endUtc: `${target.civilKey}T15:30:00Z`, state: "confirmed", meetingUrl: null, location: null },
    ];
    const marks = buildBookingMarks(bookings);
    const html = renderToStaticMarkup(createElement(BftMonthGrid, { bftYear: 18, bftMonth: 6, marks, nowMs }));
    expect(html).toContain("Weekly Intuitive");
    expect(html).toContain("cal-pill--gold");
  });
});
