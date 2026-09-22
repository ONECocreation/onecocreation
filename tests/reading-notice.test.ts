import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReadingNotice, { noticeState, type ReadingNoticeProps } from "@/components/rooms/ReadingNotice";
import type { ReadingSchedule } from "@/lib/reading-schedule";

/**
 * TASK-382 (block 968,061) — the reading room's next-reading notice.
 * `noticeState` is the one place the four-state boundary lives (RULED —
 * TESTS, Astra point 4): tested here at the exact boundaries, cross-checked
 * against tests/reading-schedule.test.ts's own measured fixtures (same
 * BASE schedule, same Wednesday-2026-09-23 instant) rather than re-deriving
 * new UTC numbers by hand. Static rendering (renderToStaticMarkup, mirroring
 * tests/a-site-rooms-wear-the-gate.test.ts's idiom) covers ONLY the
 * deterministic initial markup from a fixed snapshot, one fixture per state
 * — never a live transition (Node's renderToStaticMarkup runs no effects,
 * so it can't exercise thisRoomLive, the visitor-zone effect, or
 * ROLLOVER's timers; that is Number One's Chrome walk).
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

// The SAME BASE schedule and measured Wednesday-2026-09-23 instant
// tests/reading-schedule.test.ts cross-checked against the system tz
// database (America/Denver, 13:11 MDT = 19:11Z) — reused, not re-derived.
const BASE: ReadingSchedule = { on: true, weekday: 3, time: "13:11", tz: "America/Denver", durationMin: 60 };
const STARTS = Date.parse("2026-09-23T19:11:00.000Z");
const ENDS = Date.parse("2026-09-23T20:11:00.000Z");
const ONE_DAY_MS = 24 * 3600_000;

describe("noticeState — the exact boundaries (RULED, block 968,061, TESTS/Astra point 4)", () => {
  it("off: schedule.on === false → kind off, whatever nowMs is", () => {
    expect(noticeState({ ...BASE, on: false }, STARTS)).toEqual({ kind: "off" });
  });

  it("24h before start (inclusive): kind soon", () => {
    expect(noticeState(BASE, STARTS - ONE_DAY_MS)).toEqual({ kind: "soon", startsAtMs: STARTS, endsAtMs: ENDS });
  });

  it("one beat past 24h before start: kind upcoming", () => {
    expect(noticeState(BASE, STARTS - ONE_DAY_MS - 1)).toEqual({
      kind: "upcoming",
      startsAtMs: STARTS,
      endsAtMs: ENDS,
    });
  });

  it("the exact start instant: kind window, never soon", () => {
    expect(noticeState(BASE, STARTS)).toEqual({ kind: "window", startsAtMs: STARTS, endsAtMs: ENDS });
  });

  it("inside the window: kind window", () => {
    expect(noticeState(BASE, STARTS + 30 * 60_000)).toEqual({ kind: "window", startsAtMs: STARTS, endsAtMs: ENDS });
  });

  it("the exact end instant rolls to NEXT WEEK's occurrence — kind upcoming, never stuck on window (the rollover Astra flagged)", () => {
    const nextStarts = Date.parse("2026-09-30T19:11:00.000Z");
    expect(noticeState(BASE, ENDS)).toEqual({
      kind: "upcoming",
      startsAtMs: nextStarts,
      endsAtMs: nextStarts + 60 * 60_000,
    });
  });

  it("a DST week (the spring gap, 2026-03-08 — Denver springs forward at 2am): still buckets soon/upcoming correctly across it", () => {
    const schedule: ReadingSchedule = { on: true, weekday: 0, time: "02:30", tz: "America/Denver", durationMin: 60 };
    // measured in tests/reading-schedule.test.ts: resolves to 2026-03-08T08:30:00Z
    const starts = Date.parse("2026-03-08T08:30:00.000Z");
    expect(noticeState(schedule, starts - 12 * 3600_000)).toEqual({
      kind: "soon",
      startsAtMs: starts,
      endsAtMs: starts + 60 * 60_000,
    });
    expect(noticeState(schedule, starts - ONE_DAY_MS - 3600_000)).toEqual({
      kind: "upcoming",
      startsAtMs: starts,
      endsAtMs: starts + 60 * 60_000,
    });
  });

  it("differing visitor/schedule calendar dates: a window crossing local midnight in the schedule's own zone still reads window — raw ms, never a civil-date mixup", () => {
    // tests/reading-schedule.test.ts's own look-back fixture: a 23:00
    // Wednesday Denver reading, 120min, still running at 00:30 AM Thursday
    // Denver time (2026-09-24T06:30:00Z). Denver's OWN calendar date has
    // already rolled to Thursday while a UTC-dated (or a far-flung
    // visitor's) read of "today" could easily disagree; noticeState must
    // not care, since it never compares calendar dates, only raw instants.
    const schedule: ReadingSchedule = { on: true, weekday: 3, time: "23:00", tz: "America/Denver", durationMin: 120 };
    const nowMs = Date.parse("2026-09-24T06:30:00.000Z");
    expect(noticeState(schedule, nowMs)).toEqual({
      kind: "window",
      startsAtMs: Date.parse("2026-09-24T05:00:00.000Z"),
      endsAtMs: Date.parse("2026-09-24T07:00:00.000Z"),
    });
  });
});

describe("ReadingNotice — deterministic initial markup, one fixture per state (renderToStaticMarkup)", () => {
  it("off: 'Stay tuned, with love.' and nothing else — no button, no link, no letters door", () => {
    const props: ReadingNoticeProps = { schedule: { ...BASE, on: false }, next: null, asOfMs: STARTS };
    const html = renderToStaticMarkup(createElement(ReadingNotice, props));
    expect(html).toContain("Stay tuned, with love.");
    expect(html).not.toContain("Next reading.");
    expect(html).not.toContain("Love:");
    expect(html).not.toContain("Join the letters");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<button");
  });

  it("window: 'Starting soon.' alone", () => {
    const props: ReadingNoticeProps = {
      schedule: BASE,
      next: { startsAtMs: STARTS, endsAtMs: ENDS },
      asOfMs: STARTS + 30 * 60_000,
    };
    const html = renderToStaticMarkup(createElement(ReadingNotice, props));
    expect(html).toContain("Starting soon.");
    expect(html).not.toContain("Next reading.");
    expect(html).not.toContain("Love:");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<button");
  });

  it("upcoming: Next reading. + the weekday/date + Love's time — the visitor's own time is ABSENT from the first paint (DETERMINISTIC HYDRATION)", () => {
    const asOfMs = STARTS - 3 * ONE_DAY_MS;
    const props: ReadingNoticeProps = { schedule: BASE, next: { startsAtMs: STARTS, endsAtMs: ENDS }, asOfMs };
    const html = renderToStaticMarkup(createElement(ReadingNotice, props));
    expect(html).toContain("Next reading.");
    expect(html).toContain("Wednesday, September 23");
    expect(html).toContain("Love: 1:11");
    expect(html).toContain("MDT");
    expect(html).not.toContain("Your time");
    expect(html).not.toContain("Starts in");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<button");
  });

  it("soon: the same lines, plus the Countdown's own initial server-rendered value", () => {
    const asOfMs = STARTS - 3600_000;
    const props: ReadingNoticeProps = { schedule: BASE, next: { startsAtMs: STARTS, endsAtMs: ENDS }, asOfMs };
    const html = renderToStaticMarkup(createElement(ReadingNotice, props));
    expect(html).toContain("Next reading.");
    expect(html).toContain("Starts in");
    // Countdown.tsx (read-only, consumed as-is) ticks off the REAL wall
    // clock even for its initial server render — never asOfMs — so only
    // the shape is pinned here, not exact digits (it depends on the actual
    // instant this test runs).
    expect(html).toMatch(/Starts in[\s\S]{0,80}\d{1,4}:\d{2}(:\d{2})?/);
    expect(html).not.toContain("Your time");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<button");
  });
});

describe("ReadingNotice.tsx — the lintable checks named in the brief", () => {
  it("never references RoomView (T-380's boundary)", async () => {
    const src = await read("src/components/rooms/ReadingNotice.tsx");
    expect(src).not.toMatch(/RoomView/);
  });

  it("carries no literal hex colour — every colour rides a var(--token)", async () => {
    const src = await read("src/components/rooms/ReadingNotice.tsx");
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });
});

describe("ClassroomView.tsx — the live-gated mount line (Build 4, mirrors room-doors.test.ts:140-145's idiom)", () => {
  it("mounts <ReadingNotice> only inside a reading && !thisRoomLive gate — a literal-substring pin, since thisRoomLive derives from ClassroomView's own poll state (unreachable via props in a static render, LIVE INITIAL STATE)", async () => {
    const src = await read("src/components/rooms/ClassroomView.tsx");
    expect(src).toContain(
      "{reading && !thisRoomLive && <ReadingNotice schedule={reading.schedule} next={reading.next} asOfMs={reading.asOfMs} />}",
    );
  });

  it("the new reading prop rides in immediately before cameraDoor in the destructuring — preserves named-guest-camera-door.test.ts's \"cameraDoor }: Props\" substring pin", async () => {
    const src = await read("src/components/rooms/ClassroomView.tsx");
    expect(src).toContain("reading, cameraDoor }: Props");
    expect(src).toContain("cameraDoor }: Props"); // the pre-existing pin, still intact
  });
});

describe("rooms/[slug]/page.tsx — reading is null for a non-reading-room slug (source pin)", () => {
  it("computeReading returns null unless slug === READING_ROOM_SLUG, so <ReadingNotice> never mounts off the reading room", async () => {
    const src = await read("src/app/rooms/[slug]/page.tsx");
    expect(src).toContain("if (slug !== READING_ROOM_SLUG) return null;");
    expect(src).toContain("const reading = computeReading(slug, switches.reading ?? DEFAULT_READING_SCHEDULE);");
    expect(src).toContain("reading={reading}");
  });
});
