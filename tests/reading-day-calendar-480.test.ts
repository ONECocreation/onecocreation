import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readingDayPartsMarksLookup } from "@/components/calendar/reading-marks";
import DayCell from "@/components/calendar/DayCell";
import BftMonthGrid from "@/components/calendar/BftMonthGrid";
import WeekRibbon from "@/components/calendar/WeekRibbon";
import { bftMonthGrid, type CalendarDayCell } from "@/lib/calendar-view";
import { DEFAULT_READING_SCHEDULE, readingOccurrencesBetween, type ReadingSchedule } from "@/lib/reading-schedule";
import { HOUSEWARMING_TIME, ENCORE_TIME, QA_TIME, sameDayAt } from "@/lib/reading-day";
import { zonedDateParts } from "@/lib/booking-time";
import { AGENDA_ROW_TITLES, parseReadingPart, readingPartHref, type ReadingPart } from "@/lib/reading-parts";

/**
 * TASK-480 (block 968,624+) — the Admiral's report: "the month and week
 * calendar in the /me area doesnt show the events for today. it only
 * shows the 12:12 reading, and it's not clickable." This suite pins:
 *  - all FOUR reading-day parts appear (both grid views), correctly
 *    timed and titled (AGENDA_ROW_TITLES) and linked (readingPartHref);
 *  - the UTC-day trap (calendar-view.ts's own honesty note: "evening
 *    Mountain events land on the next day's cell") never bites here;
 *  - `parseReadingPart`'s "1".."4"-only validation.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

// The same fixed "now" member-calendar.test.ts already anchors its own
// booking fixtures to — September 2026, safely inside America/Denver's
// MDT (UTC-6) season, so every clock computed below is deterministic.
const NOW = Date.parse("2026-09-01T00:00:00Z");

function cellMatching(pred: (c: CalendarDayCell) => boolean): CalendarDayCell {
  const cell = bftMonthGrid(18, 6, { nowMs: NOW }).cells.find(pred);
  if (!cell) throw new Error("no matching cell in the fixture grid");
  return cell;
}

/** The exact format `readingDayPartsMarksLookup`'s own (unexported)
 *  `partClockWords` uses — reproduced here so the expectation is
 *  self-consistent regardless of the TEST BOX's own timezone (both sides
 *  of every comparison below run through the SAME Intl call, in the SAME
 *  process, so they always agree with each other — the exact "pin the
 *  shape, not the digits" law tests/reading-on-the-calendars.test.ts
 *  already keeps for readingPillLabel). */
/** react-dom/server HTML-escapes "&" — match the rendered form. */
const htmlEscaped = (s: string): string => s.replace(/&/g, "&amp;");

function expectedLabel(ms: number, title: string): string {
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hour12: true }).format(
    new Date(ms),
  );
  return `${time} · ${title}`;
}

/** The occurrence a schedule lands on THIS cell's own civil day (the
 *  schedule's own tz) — independently derived (never re-imports
 *  `readingDayPartsMarksLookup`'s internals), used as this suite's own
 *  "ground truth" for the four expected clock times. */
function occurrenceOnCell(schedule: ReadingSchedule, cell: CalendarDayCell) {
  const netFrom = cell.civilDate.getTime() - 86_400_000;
  const netTo = cell.civilDate.getTime() + 2 * 86_400_000;
  return readingOccurrencesBetween(schedule, netFrom, netTo).find(
    (o) => zonedDateParts(new Date(o.startsAtMs), schedule.tz).date === cell.civilKey,
  );
}

describe("readingDayPartsMarksLookup — all FOUR reading-day parts, correctly timed, titled, linked", () => {
  const cell = cellMatching((c) => c.civilDate.getUTCDay() === DEFAULT_READING_SCHEDULE.weekday);
  const occ = occurrenceOnCell(DEFAULT_READING_SCHEDULE, cell);

  it("finds the reading's own occurrence on the fixture's matching weekday", () => {
    expect(occ).toBeTruthy();
  });

  it("emits exactly four gold pills, in order (Housewarming, Reading, Book Talk, Q&A with Love)", () => {
    const marks = readingDayPartsMarksLookup(DEFAULT_READING_SCHEDULE)(cell);
    expect(marks?.pills).toHaveLength(4);
    expect(marks?.pills?.every((p) => p.variant === "gold")).toBe(true);
  });

  it("each pill's label carries the RIGHT time (sameDayAt) and the RIGHT title (AGENDA_ROW_TITLES) — the exact words /reading itself shows", () => {
    const marks = readingDayPartsMarksLookup(DEFAULT_READING_SCHEDULE)(cell);
    const expected: { part: ReadingPart; ms: number }[] = [
      { part: 1, ms: sameDayAt(occ!.startsAtMs, DEFAULT_READING_SCHEDULE.tz, HOUSEWARMING_TIME) },
      { part: 2, ms: occ!.startsAtMs },
      { part: 3, ms: sameDayAt(occ!.startsAtMs, DEFAULT_READING_SCHEDULE.tz, ENCORE_TIME) },
      { part: 4, ms: sameDayAt(occ!.startsAtMs, DEFAULT_READING_SCHEDULE.tz, QA_TIME) },
    ];
    expected.forEach(({ part, ms }, i) => {
      expect(marks!.pills![i].label).toBe(expectedLabel(ms, AGENDA_ROW_TITLES[part]));
    });
  });

  it("each pill links to its own /reading?part=N#stage deep link — the same one /reading reads back", () => {
    const marks = readingDayPartsMarksLookup(DEFAULT_READING_SCHEDULE)(cell);
    [1, 2, 3, 4].forEach((part, i) => {
      expect(marks!.pills![i].href).toBe(readingPartHref(part as ReadingPart));
      expect(marks!.pills![i].href).toBe(`/reading?part=${part}#stage`);
    });
  });

  it("schedule: null answers undefined for every cell", () => {
    const lookup = readingDayPartsMarksLookup(null);
    expect(bftMonthGrid(18, 6, { nowMs: NOW }).cells.every((c) => lookup(c) === undefined)).toBe(true);
  });

  it("on: false answers undefined for every cell, even the schedule's own weekday", () => {
    const lookup = readingDayPartsMarksLookup({ ...DEFAULT_READING_SCHEDULE, on: false });
    expect(lookup(cell)).toBeUndefined();
  });

  it("every cell that ISN'T the schedule's own weekday stays unmarked (a weekly rule repeats — the 28-day grid holds four Wednesdays, not one)", () => {
    const lookup = readingDayPartsMarksLookup(DEFAULT_READING_SCHEDULE);
    const { cells } = bftMonthGrid(18, 6, { nowMs: NOW });
    const offWeekday = cells.filter((c) => c.civilDate.getUTCDay() !== DEFAULT_READING_SCHEDULE.weekday);
    expect(offWeekday.length).toBeGreaterThan(0);
    expect(offWeekday.every((c) => lookup(c) === undefined)).toBe(true);
  });
});

describe("the UTC-day trap (calendar-view.ts's own honesty note) never bites the reading-day parts", () => {
  const cell = cellMatching((c) => c.civilDate.getUTCDay() === DEFAULT_READING_SCHEDULE.weekday);
  const occ = occurrenceOnCell(DEFAULT_READING_SCHEDULE, cell)!;

  it("a 3:33 PM MDT event (QA_TIME) sits on the SAME local (Mountain) day as the reading itself — not the next UTC day", () => {
    const qaMs = sameDayAt(occ.startsAtMs, DEFAULT_READING_SCHEDULE.tz, QA_TIME);
    expect(zonedDateParts(new Date(qaMs), DEFAULT_READING_SCHEDULE.tz).date).toBe(cell.civilKey);
  });

  it("a schedule whose own time crosses UTC midnight (8:11 PM MDT → 2:11 AM UTC the next day) still lands its pill on the CORRECT Mountain-day cell, never the day-later UTC cell", () => {
    const eveningSchedule: ReadingSchedule = { ...DEFAULT_READING_SCHEDULE, time: "20:11" };
    const lookup = readingDayPartsMarksLookup(eveningSchedule);

    // the Mountain Wednesday itself carries the pill…
    const onDay = lookup(cell);
    expect(onDay?.pills).toHaveLength(4);
    expect(onDay!.pills![1].label).toContain(AGENDA_ROW_TITLES[2]); // "The Reading" itself

    // …and the UTC-shifted NEXT cell (where a naive [civilDate, +86_400_000) UTC
    // window would have wrongly caught this 02:11 UTC instant) carries nothing.
    const { cells } = bftMonthGrid(18, 6, { nowMs: NOW });
    const nextCell = cells[cells.indexOf(cell) + 1];
    expect(lookup(nextCell)).toBeUndefined();
  });
});

describe("both calendar views actually SHOW all four parts (BftMonthGrid + WeekRibbon, real <a> links, maxPills override)", () => {
  const cell = cellMatching((c) => c.civilDate.getUTCDay() === DEFAULT_READING_SCHEDULE.weekday);
  const marks = readingDayPartsMarksLookup(DEFAULT_READING_SCHEDULE);

  it("BftMonthGrid renders all four agenda titles as real <a href> pills when maxPills lifts the cap", () => {
    const html = renderToStaticMarkup(
      createElement(BftMonthGrid, { bftYear: 18, bftMonth: 6, marks, nowMs: NOW, maxPills: 6 }),
    );
    for (const title of Object.values(AGENDA_ROW_TITLES)) {
      expect(html).toContain(htmlEscaped(title));
    }
    expect(html).toContain('href="/reading?part=1#stage"');
    expect(html).toContain('href="/reading?part=4#stage"');
    expect(html).not.toContain("<button");
  });

  it("WeekRibbon renders the same four, in the week containing the reading's own day", () => {
    const weekOfMonth = Math.ceil(cell.bftDay / 7);
    const html = renderToStaticMarkup(
      createElement(WeekRibbon, { bftYear: 18, bftMonth: 6, weekOfMonth, marks, nowMs: NOW, maxPills: 6 }),
    );
    for (const title of Object.values(AGENDA_ROW_TITLES)) {
      expect(html).toContain(htmlEscaped(title));
    }
  });

  it("WITHOUT the maxPills override, the T-319 cap of 2 still folds the rest into an honest +N more (proves the override is load-bearing, not decorative)", () => {
    const html = renderToStaticMarkup(createElement(BftMonthGrid, { bftYear: 18, bftMonth: 6, marks, nowMs: NOW }));
    expect(html).toContain("+2 more");
  });
});

describe("DayCell — a pill carrying href (no onSelectPill wired) is a real <a>, never a <button> or an inert <span>", () => {
  it("renders <a class=\"cal-pill cal-pill--gold\" href=\"...\">", () => {
    const cell = cellMatching(() => true);
    const html = renderToStaticMarkup(
      createElement(DayCell, {
        cell,
        primary: "bft",
        counts: false,
        marks: { pills: [{ id: "x", label: "12:12 PM · The Housewarming", variant: "gold", href: "/reading?part=1#stage" }] },
      }),
    );
    expect(html).toMatch(/<a[^>]*class="cal-pill cal-pill--gold"/);
    expect(html).toContain('href="/reading?part=1#stage"');
    expect(html).not.toContain("<button");
  });

  it("onSelectPill still wins over href when both are somehow present (the LovesDesk law, untouched)", () => {
    const cell = cellMatching(() => true);
    const html = renderToStaticMarkup(
      createElement(DayCell, {
        cell,
        primary: "bft",
        counts: false,
        marks: { pills: [{ id: "x", label: "hi", variant: "gold", href: "/reading?part=1#stage" }] },
        onSelectPill: () => {},
      }),
    );
    expect(html).toMatch(/<button[^>]*class="cal-pill cal-pill--gold"/);
    expect(html).not.toContain("<a ");
  });

  it("a day cell that is itself a button (onSelect wired) never nests the href pill as an <a>", () => {
    const cell = cellMatching(() => true);
    const html = renderToStaticMarkup(
      createElement(DayCell, {
        cell,
        primary: "bft",
        counts: false,
        marks: { pills: [{ id: "x", label: "hi", variant: "gold", href: "/reading?part=1#stage" }] },
        onSelect: () => {},
      }),
    );
    expect(html).not.toContain("<a ");
    expect(html).toMatch(/<span class="cal-pill cal-pill--gold">hi<\/span>/);
  });
});

describe("a.cal-pill gets a visible :focus-visible outline (kit css, the shared component sheet)", () => {
  it("calendar-view.css carries the anchor rule, mirroring button.cal-pill's own", async () => {
    const css = await read("src/components/calendar/calendar-view.css");
    expect(css).toMatch(/a\.cal-pill:focus-visible\{outline:2px solid var\(--info\);outline-offset:2px\}/);
    expect(css).toMatch(/a\.cal-pill\{[^}]*color:inherit/);
    expect(css).toMatch(/a\.cal-pill\{[^}]*text-decoration:none/);
  });
});

describe("MemberCalendar.tsx wiring — reads the four-part lookup, lifts the pill cap", () => {
  it("imports readingDayPartsMarksLookup (not the old single-pill readingMarksLookup) and passes maxPills to both grid mounts", async () => {
    const src = await read("src/components/me/MemberCalendar.tsx");
    expect(src).toContain("readingDayPartsMarksLookup");
    expect(src).toMatch(/<WeekRibbon[\s\S]*?maxPills=\{MEMBER_CALENDAR_MAX_PILLS\}/);
    expect(src).toMatch(/<BftMonthGrid[\s\S]*?maxPills=\{MEMBER_CALENDAR_MAX_PILLS\}/);
  });

  it("buildBookingMarks's own pills carry a real receipt-page href", async () => {
    const src = await read("src/components/me/MemberCalendar.tsx");
    expect(src).toContain("href: `/book/receipt/${b.bookingId}`");
  });
});

describe("readingMarksLookup (the old single-pill lookup) stays byte-identical — CircleView.tsx's own surface is untouched", () => {
  it("CircleView.tsx still imports and calls readingMarksLookup, not the new four-part lookup", async () => {
    const src = await read("src/components/rooms/CircleView.tsx");
    expect(src).toContain("readingMarksLookup");
    expect(src).not.toContain("readingDayPartsMarksLookup");
  });
});

describe("parseReadingPart — the ?part= deep link's own validator: 1-4 only, else null", () => {
  it("accepts exactly \"1\" through \"4\"", () => {
    expect(parseReadingPart("1")).toBe(1);
    expect(parseReadingPart("2")).toBe(2);
    expect(parseReadingPart("3")).toBe(3);
    expect(parseReadingPart("4")).toBe(4);
  });

  it("rejects out-of-range digits", () => {
    expect(parseReadingPart("0")).toBeNull();
    expect(parseReadingPart("5")).toBeNull();
    expect(parseReadingPart("9")).toBeNull();
  });

  it("rejects a leading zero, a decimal, and any non-single-digit shape", () => {
    expect(parseReadingPart("01")).toBeNull();
    expect(parseReadingPart("1.0")).toBeNull();
    expect(parseReadingPart("1 ")).toBeNull();
    expect(parseReadingPart(" 1")).toBeNull();
    expect(parseReadingPart("")).toBeNull();
    expect(parseReadingPart("abc")).toBeNull();
  });

  it("rejects undefined, null, and a repeated-query-key array — never a guessed part", () => {
    expect(parseReadingPart(undefined)).toBeNull();
    expect(parseReadingPart(null)).toBeNull();
    expect(parseReadingPart(["1", "2"])).toBeNull();
  });
});

describe("readingPartHref — the one deep-link shape every reading pill points at", () => {
  it("builds /reading?part=N#stage for every part", () => {
    expect(readingPartHref(1)).toBe("/reading?part=1#stage");
    expect(readingPartHref(4)).toBe("/reading?part=4#stage");
  });
});

describe("/reading/page.tsx — the ONE permitted edit: reads and validates ?part=, overrides the door-computed default", () => {
  it("declares searchParams and reads it through parseReadingPart", async () => {
    const src = await read("src/app/reading/page.tsx");
    expect(src).toMatch(/searchParams:\s*Promise<\{\s*part\?:\s*string\s*\}>/);
    expect(src).toContain("parseReadingPart((await searchParams).part)");
  });

  it("only overrides defaultPart when requestedPart validates (never unconditionally)", async () => {
    const src = await read("src/app/reading/page.tsx");
    expect(src).toMatch(/if \(requestedPart !== null\) defaultPart = requestedPart;/);
  });
});
