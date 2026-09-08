import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-178 (0018.06.18 a₿ · block 966098) — the home page's second door:
 * join the weekly reading. Pins:
 *
 *   1. THE DOOR, DERIVED — sections.tsx's weeklyReadingDoor() finds the
 *      Weekly Reading room in the rooms registry (never a hardcoded fake;
 *      derive-or-dash: no registry entry → null → no door) and points at
 *      its Stage, /rooms/weekly-reading.
 *   2. THE WORDS FOLLOW THE TIER — the room is minTier B today, so the
 *      words name TIERS' package for B ("Observer") and NEVER say "free
 *      for every member" (that line is reserved for a minTier "all" room).
 *   3. THE RENDER — Hero() puts the door on the page: the right href, the
 *      right words, under the meditation door.
 *   4. THE GATE BEHIND THE DOOR (T-174) — a signed-out visitor who knocks
 *      meets the sign-in door: roomGate says "signin", the door carries
 *      the room's own name and a ?next= back to the Stage.
 */

describe("the join-the-reading door, derived (TASK-178)", () => {
  it("derives the Weekly Reading room from the registry — href is its Stage", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    const { ROOMS } = await import("@/lib/matrix-rooms");
    const room = ROOMS.find((r) => r.id.slice(1, r.id.indexOf(":")) === "weekly-reading");
    expect(room).toBeTruthy(); // the registry KNOWS the room — the door is derived, not faked
    const door = weeklyReadingDoor();
    expect(door).toBeTruthy();
    expect(door!.href).toBe("/rooms/weekly-reading");
  });

  it("the words follow the room's OWN tier — with the Observer, never 'free for every member'", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    const { ROOMS } = await import("@/lib/matrix-rooms");
    const { TIERS } = await import("@/lib/entitlement");
    const room = ROOMS.find((r) => r.id.slice(1, r.id.indexOf(":")) === "weekly-reading")!;
    expect(room.minTier).toBe("B"); // verified at cut: the room is tier B
    const tierName = room.minTier === "all" ? null : TIERS[room.minTier].name;
    const door = weeklyReadingDoor()!;
    expect(door.words).toContain(`with the ${tierName}`);
    expect(door.words).toContain("with the Observer");
    expect(door.words).not.toContain("free for every member");
    expect(door.words).toContain("Every week"); // the room's standing cadence
  });

  it("a minTier \"all\" room WOULD say free for every member — the words track the tier", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    const door = weeklyReadingDoor([
      { id: "#weekly-reading:onecocreation.com", title: "Chronicles: Weekly Reading", kind: "class", minTier: "all" },
    ]);
    expect(door!.words).toContain("free for every member");
  });

  it("derive-or-dash: no weekly-reading room in the registry → NO door (never a fake link)", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    expect(weeklyReadingDoor([])).toBeNull();
    expect(
      weeklyReadingDoor([
        { id: "#heart-field:onecocreation.com", title: "The Heart Field — Commons", kind: "community", minTier: "all" },
      ]),
    ).toBeNull();
  });
});

describe("the hero render (TASK-178)", () => {
  it("the door renders under the meditation door with the right href and words", async () => {
    const { Hero } = await import("@/components/sections");
    const html = renderToStaticMarkup(createElement(Hero));
    const meditation = html.indexOf("Receive the Free Meditation");
    const words = html.indexOf("with the Observer");
    const reading = html.indexOf("Join the Weekly Reading");
    expect(meditation).toBeGreaterThan(-1);
    expect(words).toBeGreaterThan(meditation); // the words sit between the doors
    expect(reading).toBeGreaterThan(words); // the reading door comes UNDER the meditation door
    expect(html).toContain('href="/rooms/weekly-reading"');
  });
});

describe("the Stage gate behind the door (T-174, pinned for this room)", () => {
  it("signed-out → the sign-in door, the room's name on it, ?next= back to the Stage", async () => {
    const { roomGate, signInDoorHref, signInDoorLine } = await import("@/lib/room-access");
    expect(roomGate("B", { signedIn: false, tier: null })).toBe("signin");
    expect(signInDoorHref("weekly-reading")).toBe(`/login?next=${encodeURIComponent("/rooms/weekly-reading")}`);
    expect(signInDoorLine("Chronicles: Weekly Reading")).toContain("Chronicles: Weekly Reading");
  });

  it("a member below tier B meets the package door; tier B and above walk in muted by the room's defaults", async () => {
    const { roomGate } = await import("@/lib/room-access");
    expect(roomGate("B", { signedIn: true, tier: null })).toBe("package");
    expect(roomGate("B", { signedIn: true, tier: "A" })).toBe("package");
    expect(roomGate("B", { signedIn: true, tier: "B" })).toBe("open");
    expect(roomGate("B", { signedIn: true, tier: "C" })).toBe("open");
  });
});
