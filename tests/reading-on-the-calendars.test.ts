import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  readingMarksLookup,
  readingPillLabel,
  mergeDayMarks,
  normalizeReadingResponse,
} from "@/components/calendar/reading-marks";
import BftMonthGrid from "@/components/calendar/BftMonthGrid";
import { bftMonthGrid, type CalendarDayCell } from "@/lib/calendar-view";
import { DEFAULT_READING_SCHEDULE, type ReadingSchedule } from "@/lib/reading-schedule";
import { buildPublicMarks } from "@/components/rooms/CircleView";
import { buildBookingMarks } from "@/components/me/MemberCalendar";

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

/**
 * TASK-385 (block 968,061+) — the weekly reading's mark-merging half:
 * readingMarksLookup/mergeDayMarks (the per-cell union), readingPillLabel
 * (the viewer-zone words), and normalizeReadingResponse (the hook's
 * I/O-free decision logic). CircleView.tsx/MemberCalendar.tsx wiring pins
 * and the pill-order render proof land further down this file, added once
 * both surfaces carry this lane's wiring.
 */

const LIVE_WEEKDAYS = new Set([1, 3, 5]); // Mon/Wed/Fri — live.ts's LIVE_SCHEDULE projection

/** A real cell off the real grid math — same idiom
 *  tests/classroom-three-rooms.test.ts already uses for this fixture grid. */
function cellMatching(pred: (c: CalendarDayCell) => boolean): CalendarDayCell {
  const cell = bftMonthGrid(18, 6).cells.find(pred);
  if (!cell) throw new Error("no matching cell in the fixture grid");
  return cell;
}

describe("readingMarksLookup", () => {
  it('a matched cell gets exactly one gold pill whose label ends in " reading"', () => {
    const cell = cellMatching((c) => c.civilDate.getUTCDay() === DEFAULT_READING_SCHEDULE.weekday);
    const marks = readingMarksLookup(DEFAULT_READING_SCHEDULE)(cell);
    expect(marks?.pills).toHaveLength(1);
    expect(marks?.pills?.[0].variant).toBe("gold");
    expect(marks?.pills?.[0].label).toMatch(/ reading$/);
  });

  it("schedule: null answers undefined for every cell", () => {
    const { cells } = bftMonthGrid(18, 6);
    const lookup = readingMarksLookup(null);
    expect(cells.every((c) => lookup(c) === undefined)).toBe(true);
  });

  it("on: false answers undefined for every cell, even on the schedule's own weekday", () => {
    const { cells } = bftMonthGrid(18, 6);
    const lookup = readingMarksLookup({ ...DEFAULT_READING_SCHEDULE, on: false });
    expect(cells.every((c) => lookup(c) === undefined)).toBe(true);
  });

  it("the default schedule's Wednesday is one of the three live weekdays (Named decision D — the shared day is the NORMAL first sight)", () => {
    expect(LIVE_WEEKDAYS.has(DEFAULT_READING_SCHEDULE.weekday)).toBe(true);
  });

  it("that shared Wednesday carries both the live pill and the reading pill, distinguishable by label", () => {
    const cell = cellMatching((c) => c.civilDate.getUTCDay() === DEFAULT_READING_SCHEDULE.weekday);
    const merged = mergeDayMarks(
      buildPublicMarks({ ok: true, overrides: [] }, { liveNowCivilKey: null, liveRoomTitle: null }),
      readingMarksLookup(DEFAULT_READING_SCHEDULE),
    )(cell);
    expect(merged?.pills).toHaveLength(2);
    expect(merged?.pills?.some((p) => p.label === "~11:11 live")).toBe(true);
    expect(merged?.pills?.some((p) => p.label.endsWith(" reading"))).toBe(true);
  });

  it("Ruling 5 — a blocked, non-retreat Wednesday shows the reading pill with the live pill absent", () => {
    const cell = cellMatching((c) => c.civilDate.getUTCDay() === DEFAULT_READING_SCHEDULE.weekday);
    const merged = mergeDayMarks(
      buildPublicMarks(
        { ok: true, overrides: [{ date: cell.civilKey, kind: "blocked", isRetreat: false }] },
        { liveNowCivilKey: null, liveRoomTitle: null },
      ),
      readingMarksLookup(DEFAULT_READING_SCHEDULE),
    )(cell);
    expect(merged?.pills?.some((p) => p.label === "~11:11 live")).toBe(false);
    expect(merged?.pills?.some((p) => p.label.endsWith(" reading"))).toBe(true);
  });
});

describe("mergeDayMarks", () => {
  it("returns undefined when every lookup does", () => {
    const cell = cellMatching(() => true);
    const alwaysUndefined = (): undefined => undefined;
    expect(mergeDayMarks(alwaysUndefined, alwaysUndefined)(cell)).toBeUndefined();
  });

  it("never invents blackout/multiDay when no lookup set them", () => {
    const cell = cellMatching(() => true);
    const pillsOnly = () => ({ pills: [{ id: "x", label: "x", variant: "gold" as const }] });
    const marks = mergeDayMarks(pillsOnly)(cell);
    expect(marks?.blackout).toBeUndefined();
    expect(marks?.multiDay).toBeUndefined();
  });
});

describe("readingPillLabel (Named decision C)", () => {
  it('the default call\'s shape: a ":"-time, an am/pm marker, and the " reading" suffix (pin the shape, not the digits — the real digits depend on the test box\'s own zone)', () => {
    const label = readingPillLabel(Date.parse("2026-09-23T19:11:00.000Z"));
    expect(label).toMatch(/^\d{1,2}:\d{2} (am|pm) reading$/i);
  });

  it("hour12 overrides the locale rather than merely hinting at it — en-GB's own 24-hour default still shows an am/pm marker", () => {
    const label = readingPillLabel(Date.parse("2026-09-23T19:11:00.000Z"), "en-GB");
    expect(label).toMatch(/\b(am|pm)\b/i);
  });
});

describe("normalizeReadingResponse (Ruling 4 — five distinct outcomes)", () => {
  const VALID_RAW: ReadingSchedule = { on: true, weekday: 2, time: "09:00", tz: "America/Denver", durationMin: 45 };

  it("a non-2xx status → null", () => {
    expect(normalizeReadingResponse(401, { ok: true, config: { reading: VALID_RAW } })).toBeNull();
    expect(normalizeReadingResponse(500, { ok: true, config: { reading: VALID_RAW } })).toBeNull();
  });

  it("a 2xx status with ok !== true → null", () => {
    expect(normalizeReadingResponse(200, { ok: false })).toBeNull();
    expect(normalizeReadingResponse(200, {})).toBeNull();
  });

  it("config.reading absent (never saved) → DEFAULT_READING_SCHEDULE", () => {
    expect(normalizeReadingResponse(200, { ok: true, config: {} })).toEqual(DEFAULT_READING_SCHEDULE);
  });

  it("config.reading present but invalid → null, NEVER the default (a bad save must stay distinguishable from an untouched one)", () => {
    const bad = { ...VALID_RAW, weekday: 9 }; // out of range
    const result = normalizeReadingResponse(200, { ok: true, config: { reading: bad } });
    expect(result).toBeNull();
    expect(result).not.toEqual(DEFAULT_READING_SCHEDULE);
  });

  it("config.reading present and valid → that exact schedule", () => {
    expect(normalizeReadingResponse(200, { ok: true, config: { reading: VALID_RAW } })).toEqual(VALID_RAW);
  });
});

describe("Ruling 1 — the pill-order/visibility proof (a static render, not just a unit test on the pure functions)", () => {
  it("BftMonthGrid fed mergeDayMarks(readingMarksLookup, buildBookingMarks) shows the reading pill even on a day already busy with two bookings", () => {
    // MemberCalendar's own order (Build 4): the reading lookup goes FIRST,
    // so it survives DayCell's two-pill display cap even when the day
    // already carries two of the member's own bookings.
    const cell = cellMatching((c) => c.civilDate.getUTCDay() === DEFAULT_READING_SCHEDULE.weekday);
    const bookings = [
      {
        bookingId: "b1", title: "Booking One", startUtc: `${cell.civilKey}T01:00:00Z`,
        endUtc: `${cell.civilKey}T01:30:00Z`, state: "confirmed", meetingUrl: null, location: null,
      },
      {
        bookingId: "b2", title: "Booking Two", startUtc: `${cell.civilKey}T02:00:00Z`,
        endUtc: `${cell.civilKey}T02:30:00Z`, state: "confirmed", meetingUrl: null, location: null,
      },
    ];
    const marks = mergeDayMarks(readingMarksLookup(DEFAULT_READING_SCHEDULE), buildBookingMarks(bookings));
    const readingLabel = readingMarksLookup(DEFAULT_READING_SCHEDULE)(cell)?.pills?.[0]?.label;
    expect(readingLabel).toBeTruthy();

    const html = renderToStaticMarkup(createElement(BftMonthGrid, { bftYear: 18, bftMonth: 6, marks }));
    expect(html).toContain(readingLabel!);
    expect(html).toContain("Booking One");
    expect(html).toContain("+1 more"); // the cap is real — Booking Two folds
    expect(html).not.toContain("Booking Two"); // …never swallowing the reading pill instead
  });
});

describe("source pins — CircleView.tsx and MemberCalendar.tsx wiring never touches what T-364's brief promised to leave alone", () => {
  it("buildPublicMarks's and buildBookingMarks's exported signatures are unchanged, verbatim", async () => {
    const circleSrc = await read("src/components/rooms/CircleView.tsx");
    expect(circleSrc).toMatch(
      /export function buildPublicMarks\(\s*feed: MarksFeed \| null,\s*opts: \{ liveNowCivilKey: string \| null; liveRoomTitle: string \| null \},\s*\): CalendarDayMarksLookup \{/,
    );
    const memberSrc = await read("src/components/me/MemberCalendar.tsx");
    expect(memberSrc).toContain(
      "export function buildBookingMarks(bookings: MemberBooking[] | null): CalendarDayMarksLookup {",
    );
  });

  it("CircleView.tsx and MemberCalendar.tsx both call useReadingSchedule() and mergeDayMarks(", async () => {
    const circleSrc = await read("src/components/rooms/CircleView.tsx");
    const memberSrc = await read("src/components/me/MemberCalendar.tsx");
    for (const src of [circleSrc, memberSrc]) {
      expect(src).toContain("useReadingSchedule()");
      expect(src).toContain("mergeDayMarks(");
    }
  });
});
