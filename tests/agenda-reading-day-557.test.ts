import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { isReadingDay, dayAgendaShows, nextReading, type ReadingSchedule } from "@/lib/reading-schedule";
import { wallClockToUtc } from "@/lib/booking-time";

/**
 * TASK-557 (block 970,051) - the Admiral, on a Monday: "the /reading page
 * on onecocreation is showing the days agenda right now. and it's not a
 * reading day. that should be turned off."
 *
 * This suite pins:
 *  - `isReadingDay`: the whole civil day of the schedule's weekday, in the
 *    schedule's OWN zone, midnight to midnight; never another day; never
 *    for a schedule that is off or malformed;
 *  - the day outlives the reading's own window (the Book Talk and the Q&A
 *    come after `nextReading` has already rolled to next week);
 *  - `dayAgendaShows`: a reading day, a running window (a late reading
 *    across midnight), or an open door - and nothing else;
 *  - the page's own source: ONE decision, read on the page's one clock
 *    read, and the SECTION rides it (no empty band on the other days).
 */

const TZ = "America/Denver";
/** Love's live schedule at block 970,051: Saturdays, 1:11 PM Mountain, one hour */
const SATURDAYS: ReadingSchedule = { on: true, weekday: 6, time: "13:11", tz: TZ, durationMin: 60 };
/** a wall-clock moment in the schedule's zone, as an instant */
const at = (y: number, m: number, d: number, hh: number, mm: number, tz = TZ) => wallClockToUtc(y, m, d, hh, mm, tz).getTime();

describe("TASK-557 isReadingDay: the schedule's weekday, in the schedule's zone", () => {
  it("the Admiral's own moment (Monday, October 5, 2026, mid-morning) is not a reading day", () => {
    expect(isReadingDay(SATURDAYS, at(2026, 10, 5, 11, 6))).toBe(false);
  });

  it("every other day of that week is not one either", () => {
    for (const d of [4, 5, 6, 7, 8, 9, 11]) {
      expect(isReadingDay(SATURDAYS, at(2026, 10, d, 13, 11)), `October ${d}`).toBe(false);
    }
  });

  it("the whole Saturday is one: its first minute, the reading's own minute, its last minute", () => {
    expect(isReadingDay(SATURDAYS, at(2026, 10, 10, 0, 0))).toBe(true);
    expect(isReadingDay(SATURDAYS, at(2026, 10, 10, 13, 11))).toBe(true);
    expect(isReadingDay(SATURDAYS, at(2026, 10, 10, 23, 59))).toBe(true);
  });

  it("the minute before and the minute after that Saturday are not", () => {
    expect(isReadingDay(SATURDAYS, at(2026, 10, 9, 23, 59))).toBe(false);
    expect(isReadingDay(SATURDAYS, at(2026, 10, 11, 0, 0))).toBe(false);
  });

  it("the day is the schedule's zone's day, never UTC's and never the visitor's", () => {
    // Saturday 11:30 PM Mountain is already Sunday in UTC - still the reading day
    expect(new Date(at(2026, 10, 10, 23, 30)).getUTCDay()).toBe(0);
    expect(isReadingDay(SATURDAYS, at(2026, 10, 10, 23, 30))).toBe(true);
    // Saturday 2:00 AM in UTC is still Friday evening Mountain - not yet
    expect(isReadingDay(SATURDAYS, Date.UTC(2026, 9, 10, 2, 0))).toBe(false);
    // a visitor in Sydney on their Sunday morning, while it is still Saturday Mountain: the day is on
    expect(isReadingDay(SATURDAYS, at(2026, 10, 11, 9, 0, "Australia/Sydney"))).toBe(true);
  });

  it("holds across the clock change (Saturday October 31 on daylight time, Saturday November 7 on standard time)", () => {
    expect(isReadingDay(SATURDAYS, at(2026, 10, 31, 15, 33))).toBe(true);
    expect(isReadingDay(SATURDAYS, at(2026, 11, 1, 1, 30))).toBe(false);
    expect(isReadingDay(SATURDAYS, at(2026, 11, 7, 12, 12))).toBe(true);
  });

  it("a schedule that is off, malformed, or asked at no real moment has no reading day", () => {
    expect(isReadingDay({ ...SATURDAYS, on: false }, at(2026, 10, 10, 13, 11))).toBe(false);
    expect(isReadingDay({ ...SATURDAYS, weekday: 9 }, at(2026, 10, 10, 13, 11))).toBe(false);
    expect(isReadingDay({ ...SATURDAYS, tz: "Mars/Olympus" }, at(2026, 10, 10, 13, 11))).toBe(false);
    expect(isReadingDay(SATURDAYS, Number.NaN)).toBe(false);
  });
});

describe("TASK-557 the day outlives the reading's own window", () => {
  it("at 3:33 PM on the Saturday nextReading already points at next week, and the day is still on", () => {
    const qaTime = at(2026, 10, 10, 15, 33);
    const next = nextReading(SATURDAYS, qaTime);
    expect(next?.startsAtMs).toBe(at(2026, 10, 17, 13, 11));
    expect(next?.phase).toBe("upcoming");
    expect(isReadingDay(SATURDAYS, qaTime)).toBe(true);
    expect(dayAgendaShows(SATURDAYS, qaTime, false)).toBe(true);
  });

  it("before the Housewarming on the Saturday morning the day is on too", () => {
    expect(dayAgendaShows(SATURDAYS, at(2026, 10, 10, 7, 0), false)).toBe(true);
  });
});

describe("TASK-557 dayAgendaShows", () => {
  it("no on a day that is not a reading day, with every door closed (the Admiral's Monday)", () => {
    expect(dayAgendaShows(SATURDAYS, at(2026, 10, 5, 11, 6), false)).toBe(false);
    expect(dayAgendaShows(SATURDAYS, at(2026, 10, 9, 23, 59), false)).toBe(false);
    expect(dayAgendaShows(SATURDAYS, at(2026, 10, 11, 0, 0), false)).toBe(false);
  });

  it("yes on another day while a door is open (a door opened by hand still needs its rows)", () => {
    expect(dayAgendaShows(SATURDAYS, at(2026, 10, 7, 19, 0), true)).toBe(true);
  });

  it("a late reading that crosses midnight keeps its agenda until its window ends, then lets go", () => {
    const late: ReadingSchedule = { ...SATURDAYS, time: "22:00", durationMin: 240 };
    const sundayEarly = at(2026, 10, 11, 0, 30);
    expect(isReadingDay(late, sundayEarly)).toBe(false);
    expect(nextReading(late, sundayEarly)?.phase).toBe("window");
    expect(dayAgendaShows(late, sundayEarly, false)).toBe(true);
    expect(dayAgendaShows(late, at(2026, 10, 11, 2, 30), false)).toBe(false);
  });

  it("never with the schedule off or malformed, open door or not (the card has no day to hang its times on)", () => {
    expect(dayAgendaShows({ ...SATURDAYS, on: false }, at(2026, 10, 10, 13, 11), false)).toBe(false);
    expect(dayAgendaShows({ ...SATURDAYS, on: false }, at(2026, 10, 10, 13, 11), true)).toBe(false);
    expect(dayAgendaShows({ ...SATURDAYS, time: "25:99" }, at(2026, 10, 10, 13, 11), true)).toBe(false);
    expect(dayAgendaShows(SATURDAYS, Number.NaN, true)).toBe(false);
  });
});

describe("TASK-557 /reading's own source", () => {
  const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

  it("makes ONE decision, on the page's one clock read, off the doors it already read", async () => {
    const src = await read("src/app/reading/page.tsx");
    expect(src).toContain("const agendaOn = dayAgendaShows(schedule, asOfMs, anyDoorOpen);");
    expect(src).toContain("anyDoorOpen = doors.some((d) => d.open);");
    expect(src.match(/dayAgendaShows\(/g)?.length).toBe(1);
  });

  it("the agenda's SECTION rides the decision, so the other days leave no empty band", async () => {
    const src = await read("src/app/reading/page.tsx");
    expect(src).toMatch(/\{agendaOn && \(\s*<section className="kitx-section">\s*<div className="wrap">\s*<ReadingDay \/>\s*<\/div>\s*<\/section>\s*\)\}/);
    expect(src.match(/<ReadingDay \/>/g)?.length).toBe(1);
  });

  it("the sign-up box above it is not touched by the decision (it works without a date, K122 item 13)", async () => {
    const src = await read("src/app/reading/page.tsx");
    expect(src).toMatch(/<section className="kitx-section kitx-section-first" id="keep-posted">\s*<div className="wrap">\s*<ReadingSignInBox \/>/);
    expect(src).not.toMatch(/agendaOn &&[^]{0,80}ReadingSignInBox/);
  });
});
