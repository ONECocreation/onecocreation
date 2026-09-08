import { describe, it, expect, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-174 (0018.06.17 a₿ · block 966094) — THE READING ROOM'S DOORS MATCH.
 * Pins:
 *  1. THE PICKER — LiveDoorCard lists EVERY room in ROOMS (class AND
 *     community), grouped, the Heart Field Commons (minTier "all") first.
 *  2. /live embeds whichever room is live, ANY kind — a live Commons
 *     mounts the same Jitsi embed a live class does.
 *  3. THE FREE PATH — ReadWithLove's slug is the Commons (pinned in
 *     tests/free-reading-path.test.ts, where the door's pins live).
 *  4. THE STAGE GATE — room-access.ts's ONE roomGate decision: signed-out
 *     → the sign-in door with the room's name; lower tier → "opens with
 *     the <package>" in words; allowed → the embed. The video slot and the
 *     chat read the same helper, so the two doors can never disagree.
 */

/* the /live render mocks: the flag says the COMMONS is live, the switches
   answer a meeting domain — the vault and the file rail stay out of it */
vi.mock("@/lib/live", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/live")>();
  return {
    ...actual,
    getLiveState: async () => ({ live: true, kind: "community", room: "heart-field", startedAt: 1750000000 }),
  };
});
vi.mock("@/lib/site-config", () => ({
  getSiteConfig: async () => ({ meeting: { jitsiDomain: "meet.onecocreation.com" } }),
}));

describe("roomGate — the ONE door decision", () => {
  it("a signed-out visitor always meets the sign-in door, even at the free Commons", async () => {
    const { roomGate } = await import("@/lib/room-access");
    expect(roomGate("all", { signedIn: false, tier: null })).toBe("signin");
    expect(roomGate("B", { signedIn: false, tier: null })).toBe("signin");
  });

  it("the free room opens for any signed-in member; tiered rooms follow the ladder", async () => {
    const { roomGate } = await import("@/lib/room-access");
    expect(roomGate("all", { signedIn: true, tier: null })).toBe("open");
    expect(roomGate("B", { signedIn: true, tier: "A" })).toBe("package"); // below
    expect(roomGate("B", { signedIn: true, tier: "B" })).toBe("open"); // the package itself
    expect(roomGate("B", { signedIn: true, tier: "C" })).toBe("open"); // above
    expect(roomGate("B", { signedIn: true, tier: null })).toBe("package"); // keyed, no grant
  });

  it("the door words: the sign-in door names the room, the package door names the package", async () => {
    const { signInDoorLine, signInDoorHref, packageDoorLine } = await import("@/lib/room-access");
    expect(signInDoorLine("The Heart Field — Commons")).toContain("The Heart Field — Commons");
    expect(signInDoorHref("heart-field")).toBe(`/login?next=${encodeURIComponent("/rooms/heart-field")}`);
    expect(signInDoorHref(null)).toBe("/login");
    expect(packageDoorLine("Observer")).toBe("This stage opens with the Observer package — and everything above it.");
    expect(packageDoorLine(null)).toBe("This door opens with a higher package.");
  });
});

describe("the class door picker — every room, grouped, the Commons first", () => {
  it("lists class AND community rooms, the free room leading its own group", async () => {
    const { doorRoomGroups } = await import("@/components/console/LiveDoorCard");
    const { ROOMS } = await import("@/lib/matrix-rooms");
    const feed = ROOMS.map((r) => ({ slug: r.id.slice(1, r.id.indexOf(":")), title: r.title, kind: r.kind }));
    const groups = doorRoomGroups(feed);
    const listed = groups.flatMap((g) => g.rooms.map((r) => r.slug));
    expect(listed).toHaveLength(ROOMS.length); // every room, none dropped
    expect(new Set(listed).size).toBe(ROOMS.length); // none twice
    expect(listed[0]).toBe("heart-field"); // the Commons first
    expect(groups[0].rooms.every((r) => r.slug === "heart-field")).toBe(true);
    // community rooms beyond the Commons are listed too — the old class-only filter is gone
    expect(listed).toContain("tune-up");
    expect(listed).toContain("observers-circle");
    expect(listed).toContain("inner-sanctum");
    expect(listed).toContain("clair-senses"); // classes still list
  });
});

describe("/live — whichever room is live, any kind, embeds", () => {
  it("a live COMMUNITY room (the Commons) mounts the Jitsi embed", async () => {
    const LivePage = (await import("@/app/live/page")).default;
    const html = renderToStaticMarkup(await LivePage());
    expect(html).toContain("opening the room"); // JitsiRoom's first-paint state — the embed mounted
    expect(html).toContain("/rooms/heart-field"); // the door leads to the room's own Stage
  });
});

describe("the Stage's video slot follows the SAME gate as the chat", () => {
  const PROPS = {
    live: true,
    roomTitle: "Chronicles: Weekly Reading",
    jitsiDomain: "meet.onecocreation.com",
    liveRoom: "onecocreation-weekly-reading",
  };

  it("signed-out → the sign-in door with the room's name, never the embed", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(createElement(RoomVideoSlot, { ...PROPS, door: "signin" as const }));
    expect(html).toContain("Chronicles: Weekly Reading opens for members");
    expect(html).toContain(`/login?next=${encodeURIComponent("/rooms/weekly-reading")}`);
    expect(html).not.toContain("opening the room"); // no embed
    expect(html).not.toContain("Join Live Session");
  });

  it("a lower tier → “opens with the <package>” in words, never the embed", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, { ...PROPS, door: "package" as const, doorPackage: "Observer" }),
    );
    expect(html).toContain("opens with the Observer package");
    expect(html).toContain("/memberships");
    expect(html).not.toContain("opening the room");
    expect(html).not.toContain("Join Live Session");
  });

  it("allowed → the embed mounts, and the join door leads to the room's OWN Stage", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, { ...PROPS, door: "open" as const, doorPackage: "Observer" }),
    );
    expect(html).toContain("opening the room");
    expect(html).toContain('href="/rooms/weekly-reading"'); // never /live
    expect(html).not.toContain('href="/live"');
  });

  it("no door prop (the unthreaded vantages) → the pre-gate behavior, byte-identical", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(createElement(RoomVideoSlot, PROPS));
    expect(html).toContain("opening the room");
    expect(html).toContain("Join Live Session");
  });
});

describe("source-level pins — the gate is threaded from the room page", () => {
  it("rooms/[slug]/page.tsx decides ONCE via room-access.ts and threads it down", async () => {
    const src = await fs.readFile(path.join(process.cwd(), "src/app/rooms/[slug]/page.tsx"), "utf8");
    expect(src).toContain('from "@/lib/room-access"');
    expect(src).toMatch(/roomGate\(room\.minTier/);
    expect(src).toContain("door={door}");
  });

  it("RoomView's door words come from the SAME helper (additive)", async () => {
    const src = await fs.readFile(path.join(process.cwd(), "src/components/rooms/RoomView.tsx"), "utf8");
    expect(src).toContain('from "@/lib/room-access"');
    expect(src).toContain("signInDoorLine(title)");
    expect(src).toContain("packageDoorLine(");
  });
});
