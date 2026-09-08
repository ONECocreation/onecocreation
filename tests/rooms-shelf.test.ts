import { describe, it, expect } from "vitest";
import {
  ROOMS,
  COMMONS_PACKAGE_NAME,
  groupRoomsByPackage,
  shelfRoomsForRoom,
} from "@/lib/matrix-rooms";
import { TIERS, tierSatisfies, type Tier } from "@/lib/entitlement";

/**
 * TASK-150 (0018.06.17 a₿) — Love: the rooms shelf has "too many buttons
 * on the bottom" — every package painted two cards, two doors. These pin
 * the grouping the new shelf rides: one card per package (Commons first,
 * then Weekly Intuitive / Observer / Evening Star), the card naming the
 * package with its rooms inside, and under a class calendar only THAT
 * class's package plus the Commons. Derive-or-dash: names come from the
 * feed's neededName (server-derived from TIERS), never invented.
 */

/** the same mapping /api/matrix/rooms serves (route.ts), fixture-ized */
function feedRooms(signedIn: boolean, tier: Tier | null) {
  return ROOMS.map((r) => ({
    slug: r.id.slice(1, r.id.indexOf(":")),
    alias: r.id,
    title: r.title,
    kind: r.kind,
    minTier: r.minTier as string,
    neededName: r.minTier === "all" ? null : TIERS[r.minTier as Tier].name,
    open: r.minTier === "all" ? signedIn : !!tier && tierSatisfies(tier, r.minTier as Tier),
  }));
}

describe("groupRoomsByPackage — one card per package", () => {
  it("Love's seven rooms group into exactly four packages, Commons first, then A · B · C", () => {
    const pkgs = groupRoomsByPackage(feedRooms(true, "A"));
    expect(pkgs.map((p) => p.tier)).toEqual(["all", "A", "B", "C"]);
    expect(pkgs.map((p) => p.rooms.map((r) => r.slug))).toEqual([
      ["heart-field"],
      ["clair-senses", "tune-up"],
      ["weekly-reading", "observers-circle"],
      ["quantum-healing", "inner-sanctum"],
    ]);
  });

  it("names the package from the feed's neededName; the Commons is membership itself", () => {
    const pkgs = groupRoomsByPackage(feedRooms(true, "C"));
    expect(pkgs.map((p) => p.name)).toEqual([
      "Heart Field Commons",
      "Weekly Intuitive",
      "Observer",
      "Evening Star",
    ]);
    expect(COMMONS_PACKAGE_NAME).toBe("Heart Field Commons");
  });

  it("the SEE door's /packages/[slug] — null for the Commons, real slugs for the packages", () => {
    const pkgs = groupRoomsByPackage(feedRooms(false, null));
    expect(pkgs.map((p) => p.packageSlug)).toEqual([
      null,
      "weekly-intuitive",
      "observer",
      "evening-star",
    ]);
  });

  it("ENTER only when the visitor holds the tier — a Weekly Intuitive member's doors", () => {
    const pkgs = groupRoomsByPackage(feedRooms(true, "A"));
    expect(pkgs.map((p) => p.open)).toEqual([true, true, false, false]);
  });

  it("signed out, every door is softly locked — the Commons included", () => {
    const pkgs = groupRoomsByPackage(feedRooms(false, null));
    expect(pkgs.every((p) => !p.open)).toBe(true);
  });

  it("a higher package opens the lower rooms too (progressive tiers)", () => {
    const pkgs = groupRoomsByPackage(feedRooms(true, "C"));
    expect(pkgs.every((p) => p.open)).toBe(true);
  });

  it("the ENTER door targets the package's first room — the class leads", () => {
    const pkgs = groupRoomsByPackage(feedRooms(true, "C"));
    expect(pkgs.map((p) => p.primary.slug)).toEqual([
      "heart-field",
      "clair-senses",
      "weekly-reading",
      "quantum-healing",
    ]);
  });

  it("packages with no rooms in the feed are skipped, order holds", () => {
    const only = feedRooms(true, "A").filter((r) => r.minTier === "all" || r.minTier === "B");
    const pkgs = groupRoomsByPackage(only);
    expect(pkgs.map((p) => p.tier)).toEqual(["all", "B"]);
  });

  it("pure ROOMS data (no feed flags) falls back to the package names and reports locked", () => {
    const pkgs = groupRoomsByPackage(ROOMS.map((r) => ({ ...r })));
    expect(pkgs.map((p) => p.name)).toEqual([
      "Heart Field Commons",
      "Weekly Intuitive",
      "Observer",
      "Evening Star",
    ]);
    expect(pkgs.every((p) => !p.open)).toBe(true);
  });
});

describe("shelfRoomsForRoom — under a class calendar, that class's package + the Commons", () => {
  const feed = feedRooms(true, "A");

  it("Clair Senses (Weekly Intuitive) sees the Commons + its own two rooms — never the whole house", () => {
    const rooms = shelfRoomsForRoom(feed, "clair-senses");
    expect(rooms.map((r) => r.slug)).toEqual(["heart-field", "clair-senses", "tune-up"]);
    const pkgs = groupRoomsByPackage(rooms);
    expect(pkgs.map((p) => p.tier)).toEqual(["all", "A"]);
  });

  it("Chronicles (Observer) sees the Commons + the Observer pair", () => {
    const rooms = shelfRoomsForRoom(feed, "weekly-reading");
    expect(rooms.map((r) => r.slug)).toEqual(["heart-field", "weekly-reading", "observers-circle"]);
  });

  it("an Evening Star classroom sees the Commons + the Evening Star pair", () => {
    const rooms = shelfRoomsForRoom(feed, "inner-sanctum");
    expect(rooms.map((r) => r.slug)).toEqual(["heart-field", "quantum-healing", "inner-sanctum"]);
  });

  it("the Commons' own calendar shows the Commons alone; an unknown slug degrades the same way", () => {
    expect(shelfRoomsForRoom(feed, "heart-field").map((r) => r.slug)).toEqual(["heart-field"]);
    expect(shelfRoomsForRoom(feed, "no-such-room").map((r) => r.slug)).toEqual(["heart-field"]);
  });
});
