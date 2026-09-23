import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReadingSchedule } from "@/lib/reading-schedule";

/**
 * TASK-437 (block 968,221 a₿ — the Admiral, block 968,215: "send them to the
 * /reading") — THE HERO'S ROSE DOOR LEADS TO LOVE'S FREE READING. Until this
 * lane "Join the Weekly Reading" derived the PAID Chronicles room (tier B)
 * and sent guests to a paywall; T-210 moved every other reading door to the
 * free room and the hero door was never moved. Pins (the brief's Tests
 * section, verbatim):
 *
 *   1. ONE DOOR FOR EVERY VISITOR — href "/reading" for a guest
 *      (visitor === null), a member without a package, and each tier A/B/C.
 *      `/reading` routes each visitor onward (sign-in or straight into the
 *      free room); the hero never names a package.
 *   2. THE WORDS COME FROM THE LIVE SCHEDULE, NEVER HARDCODED — they carry
 *      the schedule's weekday and time (in the schedule's zone) and "free";
 *      a fixture schedule on a NON-Saturday day proves they are derived.
 *      Never "Observer", "membership", "$" or "sats".
 *   3. DERIVE-OR-DASH — schedule `on: false` → the door is null and the
 *      rendered hero has no "Join the Weekly Reading" (the T-228 book
 *      picture rides the same gate, so it goes too).
 *   4. THE RENDER — the rose button's href is "/reading"; Love's book
 *      picture still sits after the button inside the same gate.
 *   5. EVERY READING DOOR'S TARGET THROUGH reading-room.ts (the brief's
 *      lintable candidate check) — the hero door leads to the `/reading`
 *      PAGE, and the page's own onward door derives ONCE from
 *      lib/reading-room.ts (readingDoorHref over READING_ROOM_PATH), so the
 *      whole chain — hero → /reading → the free room — can never disagree.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

/** A fixture schedule on a NON-Saturday day at a non-default time — if the
 *  words follow it, they are derived, never hardcoded. */
const TUESDAY: ReadingSchedule = { on: true, weekday: 2, time: "09:45", tz: "America/Denver", durationMin: 45 };

const MEMBER = { handle: "firefly@example.com", space: "email" };

describe("the door is /reading for EVERY visitor (TASK-437)", () => {
  it("the model: href is /reading — the free reading's own page", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    expect(weeklyReadingDoor()!.href).toBe("/reading");
    expect(weeklyReadingDoor(TUESDAY)!.href).toBe("/reading");
  });

  it("the render: a guest, a member without a package, and each tier A/B/C all get the SAME /reading door", async () => {
    const { Hero } = await import("@/components/sections");
    const visitors = [
      null,
      { ...MEMBER, tier: null },
      { ...MEMBER, tier: "A" as const },
      { ...MEMBER, tier: "B" as const },
      { ...MEMBER, tier: "C" as const },
    ];
    for (const session of visitors) {
      const html = renderToStaticMarkup(createElement(Hero, { session, reading: TUESDAY }));
      expect(html).toContain('href="/reading"');
      expect(html).not.toContain("/rooms/weekly-reading"); // never the paid Chronicles wall
    }
  });
});

describe("the words come from the live schedule, never hardcoded (TASK-437)", () => {
  it("a Tuesday 09:45 fixture says Tuesday at 9:45 AM — never Saturday, never 1:11", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    const door = weeklyReadingDoor(TUESDAY)!;
    expect(door.words).toContain("Tuesday");
    expect(door.words).toContain("9:45 AM");
    expect(door.words).not.toContain("Saturday");
    expect(door.words).not.toContain("1:11");
  });

  it("the words say free, in the schedule's own zone — and NEVER name a package or a price", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    for (const schedule of [TUESDAY, undefined]) {
      const door = weeklyReadingDoor(schedule)!;
      expect(door.words).toContain("free");
      expect(door.words).toContain("Mountain"); // the house zone's friendly name (America/Denver)
      expect(door.words).not.toContain("Observer");
      expect(door.words).not.toContain("membership");
      expect(door.words).not.toContain("$");
      expect(door.words).not.toContain("sats");
    }
  });

  it("the weekday and the clock track the schedule's own fields (a second fixture, another day and an evening hour)", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    const door = weeklyReadingDoor({ on: true, weekday: 6, time: "19:11", tz: "America/Denver", durationMin: 60 })!;
    expect(door.words).toContain("Saturday");
    expect(door.words).toContain("7:11 PM");
  });

  it("a zone outside the house map prints its IANA name rather than a guessed abbreviation", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    const door = weeklyReadingDoor({ on: true, weekday: 4, time: "13:11", tz: "America/Chicago", durationMin: 60 })!;
    expect(door.words).toContain("Thursday");
    expect(door.words).toContain("1:11 PM");
    expect(door.words).toContain("America/Chicago");
  });
});

describe("derive-or-dash (TASK-437)", () => {
  it("schedule on: false → the door is null and the rendered hero has no door and no book picture", async () => {
    const { weeklyReadingDoor, Hero } = await import("@/components/sections");
    const off: ReadingSchedule = { ...TUESDAY, on: false };
    expect(weeklyReadingDoor(off)).toBeNull();
    const html = renderToStaticMarkup(createElement(Hero, { session: null, reading: off }));
    expect(html).not.toContain("Join the Weekly Reading");
    expect(html).not.toContain("reading-book.webp"); // the T-228 picture rides the same gate
  });

  it("an invalid schedule is no schedule — null, never a fake door", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    expect(weeklyReadingDoor({ on: true, weekday: 9, time: "13:11", tz: "America/Denver", durationMin: 60 })).toBeNull();
    expect(weeklyReadingDoor({ on: true, weekday: 6, time: "25:00", tz: "America/Denver", durationMin: 60 })).toBeNull();
  });
});

describe("the rendered hero (TASK-437)", () => {
  it("the rose button's href is /reading; Love's book picture still sits after the button inside the same gate", async () => {
    const { Hero } = await import("@/components/sections");
    const html = renderToStaticMarkup(createElement(Hero, { session: null, reading: TUESDAY }));
    expect(html).toContain('class="btn btn-rose" href="/reading"');
    const button = html.indexOf("Join the Weekly Reading");
    const picture = html.indexOf('src="/images/reading-book.webp"');
    expect(button).toBeGreaterThan(-1);
    expect(picture).toBeGreaterThan(button); // the picture still follows the door
    const words = html.indexOf("Tuesday");
    expect(words).toBeGreaterThan(-1);
    expect(words).toBeLessThan(button); // the schedule words ride above the button, as before
  });
});

describe("every reading door's target through reading-room.ts (the lintable candidate check)", () => {
  it("the chain: hero → /reading → the free room, ONE derivation", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    const { READING_ROOM_PATH, readingDoorHref } = await import("@/lib/reading-room");
    // the hero door leads to the page …
    expect(weeklyReadingDoor()!.href).toBe("/reading");
    // … and the page's onward door derives from reading-room.ts alone:
    expect(READING_ROOM_PATH).toBe("/rooms/heart-field"); // the free room, minTier "all"
    expect(readingDoorHref(true)).toBe(READING_ROOM_PATH);
    expect(readingDoorHref(false)).toBe(`/login?next=${encodeURIComponent(READING_ROOM_PATH!)}`);
  });

  it("source pin: sections.tsx's door is the /reading door — no /rooms/weekly-reading anywhere in the file", async () => {
    const src = await read("src/components/sections.tsx");
    expect(src).toContain('href: "/reading"');
    expect(src).not.toContain("/rooms/weekly-reading");
  });
});
