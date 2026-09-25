import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReadingSchedule } from "@/lib/reading-schedule";

/**
 * TASK-178 (0018.06.18 a₿ · block 966098) — the home page's second door:
 * join the weekly reading. **RE-TRUED by TASK-437 (block 968,221 a₿)** — the
 * Admiral (block 968,215): "send them to the /reading." Until this lane the
 * door derived the PAID Chronicles room (tier B, "…with the Observer
 * membership"); Love's Saturday reading is FREE and lives at `/reading`
 * (T-391). Pins:
 *
 *   1. THE DOOR IS /reading — for every visitor, derived-or-dashed from the
 *      LIVE reading schedule (never a hardcoded fake; schedule off or
 *      invalid → null → no door). The full visitor matrix and the words
 *      pins ride tests/hero-door-to-reading.test.ts beside this file.
 *   2. THE RENDER — Hero() puts the door on the page: href "/reading", the
 *      schedule's words, under the meditation door.
 *   3. THE PAID ROOM ITSELF IS UNTOUCHED (the brief's Build 4) — the
 *      registry still holds the weekly-reading room at minTier B, and the
 *      Stage gate behind it (T-174) behaves exactly as before: it stays
 *      the paid Chronicles room, reachable from its own package.
 */

/** A fixture on a NON-Saturday day — derivation, never hardcoding. */
const TUESDAY: ReadingSchedule = { on: true, weekday: 2, time: "09:45", tz: "America/Denver", durationMin: 45 };

describe("the join-the-reading door, re-pointed to /reading (TASK-178 → TASK-437)", () => {
  it("the door leads to /reading — the free reading's own page — derived from the schedule, not faked", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    const door = weeklyReadingDoor();
    expect(door).toBeTruthy(); // the standing default schedule is on — the door derives, it is never a fake link
    expect(door!.href).toBe("/reading");
    expect(door!.href).not.toContain("/rooms/");
  });

  it("the words follow the SCHEDULE — weekday, clock and free — never a tier's name", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    const door = weeklyReadingDoor(TUESDAY)!;
    expect(door.words).toContain("Every Tuesday");
    expect(door.words).toContain("9:45 AM");
    expect(door.words).toContain("free");
    expect(door.words).not.toContain("Observer");
    expect(door.words).not.toContain("membership");
  });

  it("derive-or-dash: no published reading time → NO door (never a fake link)", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    expect(weeklyReadingDoor({ ...TUESDAY, on: false })).toBeNull();
    expect(weeklyReadingDoor({ ...TUESDAY, weekday: 9 })).toBeNull(); // invalid is no schedule
  });
});

describe("the hero render (TASK-178, re-trued TASK-437)", () => {
  it("the door renders under the meditation door with the /reading href and the schedule's words", async () => {
    const { Hero } = await import("@/components/sections");
    const html = renderToStaticMarkup(createElement(Hero, { reading: TUESDAY }));
    const meditation = html.indexOf("Receive the Free Meditation");
    const words = html.indexOf("Every Tuesday");
    const reading = html.indexOf("Join the Weekly Reading");
    expect(meditation).toBeGreaterThan(-1);
    expect(words).toBeGreaterThan(meditation); // the words sit between the doors
    expect(reading).toBeGreaterThan(words); // the reading door comes UNDER the meditation door
    expect(html).toContain('href="/reading"');
  });
});

describe("the paid room itself is untouched (TASK-437, the brief's Build 4)", () => {
  it("the registry still holds the weekly-reading room at minTier B (TASK-465, block 968,561 re-trued: its title is The Playground now)", async () => {
    const { ROOMS } = await import("@/lib/matrix-rooms");
    const room = ROOMS.find((r) => r.id.slice(1, r.id.indexOf(":")) === "weekly-reading");
    expect(room).toBeTruthy();
    expect(room!.minTier).toBe("B");
    expect(room!.title).toBe("The Playground");
  });

  it("the Stage gate behind it (T-174) is byte-identical behavior: signed-out → sign-in door, below B → package door, B/C walk in", async () => {
    const { roomGate, signInDoorHref, signInDoorLine } = await import("@/lib/room-access");
    expect(roomGate("B", { signedIn: false, tier: null })).toBe("signin");
    expect(signInDoorHref("weekly-reading")).toBe(`/login?next=${encodeURIComponent("/rooms/weekly-reading")}`);
    expect(signInDoorLine("Chronicles: Weekly Reading")).toContain("Chronicles: Weekly Reading");
    expect(roomGate("B", { signedIn: true, tier: null })).toBe("package");
    expect(roomGate("B", { signedIn: true, tier: "A" })).toBe("package");
    expect(roomGate("B", { signedIn: true, tier: "B" })).toBe("open");
    expect(roomGate("B", { signedIn: true, tier: "C" })).toBe("open");
  });
});
