import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadingStageDoorBody, CLOSED, type ReadingStageDoorBodyProps } from "@/components/reading/ReadingStageDoor";
import { opensWords, sameDayAt, HOUSEWARMING_TIME, ENCORE_TIME, QA_TIME } from "@/lib/reading-day";
import { nextReading, type ReadingSchedule } from "@/lib/reading-schedule";
import { wallClockToUtc } from "@/lib/booking-time";

/**
 * TASK-557, second ask (block 970,060) - the closed top card on a day that
 * is not a reading day read "The Housewarming is not live yet. Opens
 * 12:12 PM MDT." with no day. The Admiral: it "should say opens the next
 * time the site is set to go live. so if she doesnt have a live scheduled
 * for the week after next, it would react to that as well."
 *
 * So the card names the day whenever the part is not today, and every word
 * comes off the schedule's own next reading: a new weekday or time moves
 * the words with nothing typed. On a reading day the words stay the clock
 * alone, as that day has always read.
 */

const TZ = "America/Denver";
/* Love's schedule at block 970,060: Saturdays, 1:11 PM Mountain, one hour */
const SATURDAYS: ReadingSchedule = { on: true, weekday: 6, time: "13:11", tz: TZ, durationMin: 60 };
const at = (y: number, m: number, d: number, hh: number, mm: number, tz = TZ) => wallClockToUtc(y, m, d, hh, mm, tz).getTime();

/** what the page does: the part's start, off the schedule's next reading */
function partStart(schedule: ReadingSchedule, nowMs: number, hhmm: string): number {
  const next = nextReading(schedule, nowMs);
  if (!next) throw new Error("fixture: the schedule has no next reading");
  return sameDayAt(next.startsAtMs, schedule.tz, hhmm);
}

describe("TASK-557 opensWords: the day is named whenever the part is not today", () => {
  it("Monday (the day he saw it): the Housewarming opens Saturday, October 10", () => {
    const now = at(2026, 10, 5, 11, 30);
    expect(opensWords(SATURDAYS, now, partStart(SATURDAYS, now, HOUSEWARMING_TIME))).toBe("Saturday, October 10 at 12:12\u00a0PM\u00a0MDT");
    expect(opensWords(SATURDAYS, now, partStart(SATURDAYS, now, ENCORE_TIME))).toBe("Saturday, October 10 at 2:22\u00a0PM\u00a0MDT");
    expect(opensWords(SATURDAYS, now, partStart(SATURDAYS, now, QA_TIME))).toBe("Saturday, October 10 at 3:33\u00a0PM\u00a0MDT");
  });

  it("the Friday before, and the Sunday after (which names the NEXT Saturday)", () => {
    const fri = at(2026, 10, 9, 23, 59);
    expect(opensWords(SATURDAYS, fri, partStart(SATURDAYS, fri, HOUSEWARMING_TIME))).toBe("Saturday, October 10 at 12:12\u00a0PM\u00a0MDT");
    const sun = at(2026, 10, 11, 0, 0);
    expect(opensWords(SATURDAYS, sun, partStart(SATURDAYS, sun, HOUSEWARMING_TIME))).toBe("Saturday, October 17 at 12:12\u00a0PM\u00a0MDT");
  });

  it("the clock's three words are tied together, so a narrow screen wraps before the time and never inside it", () => {
    const now = at(2026, 10, 5, 11, 30);
    const words = opensWords(SATURDAYS, now, partStart(SATURDAYS, now, HOUSEWARMING_TIME));
    expect(words.split(" ").at(-1)).toBe("12:12\u00a0PM\u00a0MDT");
    expect(words.replace(/\u00a0/g, " ")).toBe("Saturday, October 10 at 12:12 PM MDT");
  });

  it("on the reading day the clock alone says it, morning to night", () => {
    for (const [hh, mm] of [[0, 0], [9, 0], [12, 11], [13, 11], [23, 59]] as const) {
      const now = at(2026, 10, 10, hh, mm);
      expect(opensWords(SATURDAYS, now, partStart(SATURDAYS, now, HOUSEWARMING_TIME))).toBe("12:12 PM MDT");
    }
  });

  it("the reading has ended and the next reading is a week out: today's Book Talk and Q&A still read as today's", () => {
    const now = at(2026, 10, 10, 14, 15); // 2:15 PM, four minutes after the reading's hour ended
    expect(nextReading(SATURDAYS, now)?.startsAtMs).toBe(at(2026, 10, 17, 13, 11));
    expect(opensWords(SATURDAYS, now, partStart(SATURDAYS, now, ENCORE_TIME))).toBe("2:22 PM MDT");
    expect(opensWords(SATURDAYS, now, partStart(SATURDAYS, now, QA_TIME))).toBe("3:33 PM MDT");
  });

  it("it follows her schedule: move the reading to Wednesday and the card says Wednesday", () => {
    const wednesdays = { ...SATURDAYS, weekday: 3 };
    const now = at(2026, 10, 5, 11, 30);
    expect(opensWords(wednesdays, now, partStart(wednesdays, now, HOUSEWARMING_TIME))).toBe("Wednesday, October 7 at 12:12\u00a0PM\u00a0MDT");
  });

  it("it names the day of whatever start it is handed, so a later reading (two weeks out) reads as that date", () => {
    const now = at(2026, 10, 5, 11, 30);
    expect(opensWords(SATURDAYS, now, at(2026, 10, 17, 12, 12))).toBe("Saturday, October 17 at 12:12\u00a0PM\u00a0MDT");
    expect(opensWords(SATURDAYS, now, at(2026, 10, 24, 12, 12))).toBe("Saturday, October 24 at 12:12\u00a0PM\u00a0MDT");
  });

  it("the day is read in the schedule's own zone, and the zone's letters follow the clock change", () => {
    const now = at(2026, 11, 2, 9, 0); // a Monday, the day after the clocks go back
    expect(opensWords(SATURDAYS, now, partStart(SATURDAYS, now, HOUSEWARMING_TIME))).toBe("Saturday, November 7 at 12:12\u00a0PM\u00a0MST");
    const sydney: ReadingSchedule = { on: true, weekday: 6, time: "13:11", tz: "Australia/Sydney", durationMin: 60 };
    const friDenver = at(2026, 10, 9, 20, 0); // already Saturday in Sydney: a reading day there
    expect(opensWords(sydney, friDenver, partStart(sydney, friDenver, HOUSEWARMING_TIME))).toMatch(/^12:12 PM /);
  });
});

describe("TASK-557 the closed card says the words it is handed", () => {
  const props = (o: Partial<ReadingStageDoorBodyProps>): ReadingStageDoorBodyProps => ({
    wire: CLOSED,
    jitsiDomain: "meet.opens-words-fixture.invalid",
    whenWords: null,
    label: "the Housewarming",
    partLabel: null,
    notOwned: null,
    left: false,
    onEnded: () => {},
    onRejoin: () => {},
    ...o,
  });
  const render = (p: ReadingStageDoorBodyProps) => renderToStaticMarkup(createElement(ReadingStageDoorBody, p));

  it("a day that is not a reading day: the day and the time, once", () => {
    const html = render(props({ whenWords: "12:12 PM MDT", opensWords: "Saturday, October 10 at 12:12 PM MDT" }));
    expect(html).toContain("The Housewarming is not live yet.");
    expect(html).toContain("Opens Saturday, October 10 at 12:12 PM MDT.");
    expect(html.match(/Opens /g)?.length).toBe(1);
  });

  it("no opensWords handed in (every caller before this lane): the clock, as before", () => {
    expect(render(props({ whenWords: "12:12 PM MDT" }))).toContain("Opens 12:12 PM MDT.");
    expect(render(props({ whenWords: "12:12 PM MDT", opensWords: null }))).toContain("Opens 12:12 PM MDT.");
  });

  it("the schedule is off: no 'Opens' line at all", () => {
    expect(render(props({}))).not.toContain("Opens");
  });
});

describe("TASK-557 the words reach all three doors from the page's one clock read", () => {
  const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

  it("the page asks opensWords once per door, with the same clock read as the rest of the page", async () => {
    const src = await read("src/app/reading/page.tsx");
    expect(src).toContain("opensWords: housewarmingStartsAtMs !== null ? opensWords(schedule, asOfMs, housewarmingStartsAtMs) : null,");
    expect(src).toContain("opensWords: encoreStartsAtMs !== null ? opensWords(schedule, asOfMs, encoreStartsAtMs) : null,");
    expect(src).toContain("opensWords: qaStartsAtMs !== null ? opensWords(schedule, asOfMs, qaStartsAtMs) : null,");
  });

  it("each part hands the words on, and its chip label still reads the clock alone", async () => {
    for (const n of [1, 3, 4]) {
      const src = await read(`src/components/reading/ReadingStagePart${n}.tsx`);
      expect(src).toContain("opensWords={opensWords}");
      expect(src).toMatch(/const partLabel = whenWords \? `\$\{whenWords\} · /);
    }
  });
});
