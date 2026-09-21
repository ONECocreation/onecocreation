import { describe, expect, it } from "vitest";
import {
  validateReadingSchedule,
  nextReading,
  DEFAULT_READING_SCHEDULE,
  READING_MAX_DURATION_MIN,
  type ReadingSchedule,
} from "@/lib/reading-schedule";
import { zonedDateParts } from "@/lib/booking-time";

/**
 * TASK-381 (block 968,047+) — the reading schedule's pure half: validation
 * (every malformed shape refused IN WORDS) and `nextReading`'s civil-date
 * walk (the look-back, the DST boundaries, the year rollover).
 *
 * Every UTC fixture below was cross-checked against the system tz database
 * before writing (`TZ=America/Denver date -d …` / a standalone node repro
 * of booking-time.ts's own offset algorithm) — not hand-derived. September
 * and Denver's 13:11 MDT instant (19:11Z) and November's MST instant
 * (20:11Z) match the brief's own measured numbers exactly.
 */

const BASE: ReadingSchedule = { on: true, weekday: 3, time: "13:11", tz: "America/Denver", durationMin: 60 };

describe("validateReadingSchedule — every malformed shape refused in words", () => {
  it("the DEFAULT_READING_SCHEDULE itself is valid (Wednesday, 1:11 PM, Denver, on)", () => {
    expect(DEFAULT_READING_SCHEDULE).toEqual(BASE);
    const r = validateReadingSchedule(DEFAULT_READING_SCHEDULE);
    expect(r).toEqual({ ok: true, value: BASE });
  });

  it.each([
    ["not an object at all", "a plain string", "the reading schedule must be an object"],
    ["null", null, "the reading schedule must be an object"],
  ] as const)("%s → refused", (_label, raw, reason) => {
    const r = validateReadingSchedule(raw);
    expect(r).toEqual({ ok: false, reason });
  });

  it.each([
    ["on: \"yes\" (not boolean)", { ...BASE, on: "yes" }, "on/off must be true or false"],
    ["on: undefined", { ...BASE, on: undefined }, "on/off must be true or false"],
    ["weekday: 7 (out of range)", { ...BASE, weekday: 7 }, "the day must be a whole number from 0 (Sunday) to 6 (Saturday)"],
    ["weekday: -1 (out of range)", { ...BASE, weekday: -1 }, "the day must be a whole number from 0 (Sunday) to 6 (Saturday)"],
    ["weekday: 2.5 (not an integer)", { ...BASE, weekday: 2.5 }, "the day must be a whole number from 0 (Sunday) to 6 (Saturday)"],
    ["time: \"24:00\" (not a real hour)", { ...BASE, time: "24:00" }, "the time must be HH:MM in 24-hour time, 00:00 through 23:59"],
    ["time: \"7:5\" (not zero-padded)", { ...BASE, time: "7:5" }, "the time must be HH:MM in 24-hour time, 00:00 through 23:59"],
    ["tz: 42 (not a string)", { ...BASE, tz: 42 }, "the time zone must be a real time zone name"],
    ["tz: \"Not/AZone\" (not a real IANA zone)", { ...BASE, tz: "Not/AZone" }, "the time zone must be a real time zone name"],
    ["durationMin: 0 (below the floor)", { ...BASE, durationMin: 0 }, `how long it runs must be a whole number of minutes, from 1 to ${READING_MAX_DURATION_MIN}`],
    ["durationMin: -5 (negative)", { ...BASE, durationMin: -5 }, `how long it runs must be a whole number of minutes, from 1 to ${READING_MAX_DURATION_MIN}`],
    ["durationMin: 1.5 (not an integer)", { ...BASE, durationMin: 1.5 }, `how long it runs must be a whole number of minutes, from 1 to ${READING_MAX_DURATION_MIN}`],
    ["durationMin: 721 (above the cap)", { ...BASE, durationMin: 721 }, `how long it runs must be a whole number of minutes, from 1 to ${READING_MAX_DURATION_MIN}`],
  ] as const)("%s", (_label, raw, reason) => {
    const r = validateReadingSchedule(raw);
    expect(r).toEqual({ ok: false, reason });
  });

  it("durationMin's own bounds are inclusive — 1 and READING_MAX_DURATION_MIN both validate", () => {
    expect(validateReadingSchedule({ ...BASE, durationMin: 1 }).ok).toBe(true);
    expect(validateReadingSchedule({ ...BASE, durationMin: READING_MAX_DURATION_MIN }).ok).toBe(true);
  });
});

describe("nextReading — inputs it refuses outright", () => {
  it("a non-finite nowMs → null (NaN and Infinity both)", () => {
    expect(nextReading(BASE, NaN)).toBeNull();
    expect(nextReading(BASE, Infinity)).toBeNull();
    expect(nextReading(BASE, -Infinity)).toBeNull();
  });

  it("on: false → null — nothing published, never confused with a real occurrence", () => {
    expect(nextReading({ ...BASE, on: false }, Date.parse("2026-09-23T12:00:00Z"))).toBeNull();
  });

  it("an invalid tz → null, same as any other malformed schedule", () => {
    expect(nextReading({ ...BASE, tz: "Not/AZone" }, Date.parse("2026-09-23T12:00:00Z"))).toBeNull();
  });
});

describe("nextReading — the exact boundary instants", () => {
  // Wednesday 2026-09-23, 13:11 Mountain Daylight Time = 19:11Z (measured,
  // matches the brief). endsAtMs = 19:11 + 60min = 20:11Z.
  const startsAtMs = Date.parse("2026-09-23T19:11:00.000Z");
  const endsAtMs = Date.parse("2026-09-23T20:11:00.000Z");

  it("the exact start instant reads as \"window\", not \"upcoming\"", () => {
    const r = nextReading(BASE, startsAtMs);
    expect(r).toEqual({ startsAtMs, endsAtMs, phase: "window" });
  });

  it("Astra's pin: mid-window, nextReading stays on THIS occurrence — it does not roll to next week", () => {
    const r = nextReading(BASE, startsAtMs + 30 * 60_000);
    expect(r).toEqual({ startsAtMs, endsAtMs, phase: "window" });
  });

  it("the exact end instant rolls to NEXT WEEK's occurrence, as \"upcoming\" — the window is [start, end)", () => {
    const r = nextReading(BASE, endsAtMs);
    // next Wednesday, 2026-09-30, same MDT offset → 19:11Z
    const nextStartsAtMs = Date.parse("2026-09-30T19:11:00.000Z");
    expect(r).toEqual({ startsAtMs: nextStartsAtMs, endsAtMs: nextStartsAtMs + 60 * 60_000, phase: "upcoming" });
  });

  it("well before the start reads as \"upcoming\"", () => {
    const r = nextReading(BASE, startsAtMs - 3600_000);
    expect(r).toEqual({ startsAtMs, endsAtMs, phase: "upcoming" });
  });
});

describe("nextReading — the look-back (a window crossing midnight)", () => {
  it("a reading starting 23:00 the night before is still \"window\" after midnight, local time", () => {
    // Wednesday 2026-09-23, 23:00 Denver (MDT, -6h) = 2026-09-24T05:00:00Z;
    // a 120-minute reading ends at 2026-09-24T07:00:00Z. "Now" sits at
    // 2026-09-24T06:30:00Z — 00:30 AM Thursday in Denver's own civil date,
    // one day past the schedule's own Wednesday weekday, so only the
    // look-back (i = -1) finds it.
    const schedule: ReadingSchedule = { on: true, weekday: 3, time: "23:00", tz: "America/Denver", durationMin: 120 };
    const nowMs = Date.parse("2026-09-24T06:30:00.000Z");
    const r = nextReading(schedule, nowMs);
    expect(r).toEqual({
      startsAtMs: Date.parse("2026-09-24T05:00:00.000Z"),
      endsAtMs: Date.parse("2026-09-24T07:00:00.000Z"),
      phase: "window",
    });
  });

  it("once that same crossed-midnight window has ended, it rolls to next week, not to \"tomorrow\"", () => {
    const schedule: ReadingSchedule = { on: true, weekday: 3, time: "23:00", tz: "America/Denver", durationMin: 120 };
    const nowMs = Date.parse("2026-09-24T07:00:00.000Z"); // the exact end instant
    const r = nextReading(schedule, nowMs);
    // next Wednesday 2026-09-30, 23:00 Denver (MDT, -6h) = 2026-10-01T05:00:00Z
    expect(r?.startsAtMs).toBe(Date.parse("2026-10-01T05:00:00.000Z"));
    expect(r?.phase).toBe("upcoming");
  });
});

describe("nextReading — a year rollover (a late-December Wednesday into January)", () => {
  it("Dec 30 2026's occurrence already ended → the next Wednesday is Jan 6 2027, crossing the year boundary cleanly", () => {
    // Dec 30 2026 and Jan 6 2027 are both Wednesdays, both MST (-7h, no
    // DST in Denver in winter): 13:11 Denver = 20:11Z either side.
    const nowMs = Date.parse("2026-12-31T12:00:00.000Z"); // Thursday, after Dec 30's reading ended
    const r = nextReading(BASE, nowMs);
    expect(r).toEqual({
      startsAtMs: Date.parse("2027-01-06T20:11:00.000Z"),
      endsAtMs: Date.parse("2027-01-06T21:11:00.000Z"),
      phase: "upcoming",
    });
  });
});

describe("nextReading — every weekday, generically (not just Wednesday)", () => {
  it.each([0, 1, 2, 3, 4, 5, 6] as const)("weekday %i lands on that same weekday in America/Denver", (weekday) => {
    const schedule: ReadingSchedule = { on: true, weekday, time: "13:11", tz: "America/Denver", durationMin: 60 };
    const nowMs = Date.parse("2026-06-15T12:00:00Z"); // a fixed Monday anchor, mid-June
    const r = nextReading(schedule, nowMs);
    expect(r).not.toBeNull();
    if (!r) return;
    expect(Number.isFinite(r.startsAtMs)).toBe(true);
    expect(zonedDateParts(new Date(r.startsAtMs), "America/Denver").weekday).toBe(weekday);
  });
});

describe("nextReading — the DST boundaries (Found, not fixed: booking-time.ts is READ-ONLY here)", () => {
  /**
   * booking-time.ts's own comment claims a spring-gap wall time "resolves
   * forward." Measured (both by hand against the tz database and by this
   * test): a reading scheduled at 02:30 on 2026-03-08 — the day Denver's
   * clocks spring forward, when 02:00–03:00 local never happens — actually
   * resolves to 2026-03-08T08:30:00Z. This is a FINDING, reported in the
   * SUMMARY for a later lane; this lane doesn't touch booking-time.ts. What
   * this test pins is nextReading's own honest contract regardless of which
   * direction the gap resolves: a finite instant, never NaN.
   */
  it("the spring gap (2026-03-08, Denver springs forward at 2am): a 02:30 Sunday reading resolves to a finite instant, pinned at the measured value", () => {
    const schedule: ReadingSchedule = { on: true, weekday: 0, time: "02:30", tz: "America/Denver", durationMin: 60 };
    const nowMs = Date.parse("2026-03-04T12:00:00.000Z"); // the preceding Wednesday
    const r = nextReading(schedule, nowMs);
    expect(r).not.toBeNull();
    expect(r && Number.isFinite(r.startsAtMs)).toBe(true);
    expect(r?.startsAtMs).toBe(Date.parse("2026-03-08T08:30:00.000Z"));
    expect(r?.phase).toBe("upcoming");
  });

  /**
   * The autumn repeat: 2026-11-01, Denver falls back at 2am, so 01:00–02:00
   * local happens TWICE. Measured: a 01:30 Sunday reading resolves to the
   * FIRST occurrence (2026-11-01T07:30:00Z, i.e. still-daylight -6h), not
   * the second (which would be 08:30Z). Same finding as above — pinned
   * through nextReading, not asserted against booking-time.ts directly.
   */
  it("the autumn repeat (2026-11-01, Denver falls back at 2am): a 01:30 Sunday reading resolves to the FIRST occurrence, pinned at the measured value", () => {
    const schedule: ReadingSchedule = { on: true, weekday: 0, time: "01:30", tz: "America/Denver", durationMin: 60 };
    const nowMs = Date.parse("2026-10-29T12:00:00.000Z"); // the preceding Thursday
    const r = nextReading(schedule, nowMs);
    expect(r).not.toBeNull();
    expect(r && Number.isFinite(r.startsAtMs)).toBe(true);
    expect(r?.startsAtMs).toBe(Date.parse("2026-11-01T07:30:00.000Z"));
    expect(r?.phase).toBe("upcoming");
  });

  it("both boundaries also validate cleanly on their own — DST alone never fails validateReadingSchedule", () => {
    expect(validateReadingSchedule({ ...BASE, weekday: 0, time: "02:30" }).ok).toBe(true);
    expect(validateReadingSchedule({ ...BASE, weekday: 0, time: "01:30" }).ok).toBe(true);
  });
});
