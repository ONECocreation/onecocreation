import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-210 (0018.06.23 a₿ — Love's 0018.06.18 call, items #3 #5 #13): THE
 * SITE KNOWS WHO IS SIGNED IN. Pins, model not render (the house idiom):
 *
 *   1. THE HOME PAGE READS THE SESSION — page.tsx reads the cookie the
 *      rooms' Stage reads (member-auth over the raw header), asks the vault
 *      for the soul's package, and threads both to the hero (source pin —
 *      an async server component never renders in the node env).
 *   2. THE HERO DOOR IS ONE DOOR FOR EVERY VISITOR (RE-TRUED by TASK-437,
 *      block 968,221 a₿ — the Admiral: "send them to the /reading") — the
 *      door no longer follows the visitor's tier: guest, member without a
 *      package, and tiers A/B/C all get href "/reading" (Love's FREE
 *      reading page, which routes each visitor onward itself), the words
 *      come from the live schedule and say free, and nobody is sold a
 *      package. The page still reads the session and threads it (pin 1) —
 *      the door simply no longer needs it.
 *   3. ONE READING ROOM — the free reading's room derives ONCE
 *      (lib/reading-room.ts, T-174's minTier "all" rule) and the home card,
 *      the member menu's "The reading room" row and the nav's Heart Field
 *      row all read it — the two links Love watched land in the wrong
 *      place (01:11:02, 01:53:35) now lead to the Commons' Stage, and a
 *      saved nav row pointing at any room survives sanitize.
 *   4. CLIENT-SAFE — the home card (a client component) imports the pure
 *      module, never sections.tsx (server-only: booking/store/site-config)
 *      — the Turbopack lesson; Chief O'Brien's WIP broke the dev build
 *      exactly this way (nodemailer in the browser bundle).
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

describe("TASK-210 — the home page reads the session (source pin)", () => {
  it("page.tsx reads the RAW cookie header (never cookies() — it URL-encodes an email handle's @ and the token fails its own signature), parses it with member-auth, reads the tier, and hands the hero a known visitor (null for a guest)", async () => {
    const page = await read("src/app/page.tsx");
    expect(page).toContain("export default async function Home()");
    expect(page).toContain('(await headers()).get("cookie")');
    expect(page).not.toContain('import { cookies }'); // the encoding store stays out
    expect(page).toContain('from "@/lib/member-auth"');
    expect(page).toContain("sessionsFromCookieHeader(");
    expect(page).toContain("tierForSubject(");
    expect(page).toContain("(await getSiteConfig()).reading ?? DEFAULT_READING_SCHEDULE"); // TASK-437: the hero door's words ride the live schedule
    expect(page).toContain("<Hero session={session} reading={reading} />");
    expect(page).toMatch(/:\s*null;/); // a guest is a KNOWN null, never undefined
  });
});

describe("TASK-437 — the hero's reading door is ONE door for every visitor", () => {
  it("a known guest gets /reading — never the paid room, never a sign-in detour named on the door", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    const door = weeklyReadingDoor()!;
    expect(door.href).toBe("/reading"); // /reading itself carries the guest onward to sign-in (reading-room.ts)
    expect(door.href).not.toContain("/login");
    expect(door.href).not.toContain("/rooms/weekly-reading");
    expect(door.words).toContain("free");
    expect(door.words).not.toContain("with the Observer"); // no package is ever named on the hero
  });

  it("a member without a package and each tier A/B/C get the SAME door — the words never sell a package", async () => {
    const { weeklyReadingDoor, Hero } = await import("@/components/sections");
    const { DEFAULT_READING_SCHEDULE } = await import("@/lib/reading-schedule");
    const door = weeklyReadingDoor(DEFAULT_READING_SCHEDULE)!;
    for (const tier of [null, "A", "B", "C"] as const) {
      const html = renderToStaticMarkup(
        createElement(Hero, { session: { handle: "firefly@example.com", space: "email", tier } }),
      );
      expect(html).toContain('href="/reading"');
      expect(html).toContain(door.words); // identical words for every visitor
      expect(html).not.toContain("membership");
      expect(html).not.toContain("key opens it"); // the retired tier-following words are gone
    }
  });

  it("the words carry the live schedule's own day and clock — a fixture schedule proves they are derived", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    const door = weeklyReadingDoor({ on: true, weekday: 2, time: "09:45", tz: "America/Denver", durationMin: 45 })!;
    expect(door.words).toContain("Tuesday");
    expect(door.words).toContain("9:45 AM");
    expect(door.words).not.toContain("Saturday");
  });

  it("schedule off → no door for anyone (derive-or-dash); the T-178 bare render keeps the standing door", async () => {
    const { weeklyReadingDoor, Hero } = await import("@/components/sections");
    const { DEFAULT_READING_SCHEDULE } = await import("@/lib/reading-schedule");
    expect(weeklyReadingDoor({ ...DEFAULT_READING_SCHEDULE, on: false })).toBeNull();
    const bare = renderToStaticMarkup(createElement(Hero));
    expect(bare).toContain('href="/reading"'); // no visitor, no schedule said → the standing default
    const guest = renderToStaticMarkup(createElement(Hero, { session: null }));
    expect(guest).toContain('href="/reading"');
    expect(guest).not.toContain("/rooms/weekly-reading");
  });
});

describe("TASK-210 — one reading room, three doors", () => {
  it("the derivation: the FREE room (minTier all), the Commons — its Stage is the path", async () => {
    const { READING_ROOM_SLUG, READING_ROOM_PATH, freeRoom, roomPath } = await import("@/lib/reading-room");
    const { ROOMS } = await import("@/lib/matrix-rooms");
    const free = ROOMS.find((r) => r.minTier === "all")!;
    expect(freeRoom()).toBe(free);
    expect(READING_ROOM_SLUG).toBe("heart-field");
    expect(READING_ROOM_PATH).toBe("/rooms/heart-field");
    expect(roomPath(free.id)).toBe(READING_ROOM_PATH);
    expect(freeRoom([])).toBeNull(); // derive-or-dash
  });

  it("the member menu's 'The reading room' row leads to the free room's Stage — never the tier-B Chronicles wall (01:11:02)", async () => {
    const { MEMBER_MENU } = await import("@/components/door/door-machine");
    const { READING_ROOM_PATH } = await import("@/lib/reading-room");
    const row = MEMBER_MENU.find((i) => i.label === "The reading room")!;
    expect(row).toBeTruthy();
    expect(row.href).toBe(READING_ROOM_PATH);
    expect(row.href).toBe("/rooms/heart-field");
    expect(row.href).not.toBe("/rooms/weekly-reading");
  });

  it("the nav's Heart Field row leads to the Commons' Stage, not back to its own header (01:53:35) — and survives sanitize", async () => {
    const { buildDefaultMenu } = await import("@/components/NavMenu");
    const { defaultSiteConfig, KNOWN_NAV_HREFS } = await import("@/lib/site-config");
    const { ROOMS } = await import("@/lib/matrix-rooms");
    const { roomPath } = await import("@/lib/reading-room");
    const memberships = buildDefaultMenu(defaultSiteConfig()).find((m) => m.label === "Memberships")!;
    const heart = memberships.subs!.find((s) => s.label === "Heart Field")!;
    expect(heart.href).toBe("/rooms/heart-field");
    expect(heart.href).not.toBe(memberships.href);
    // every room's Stage is a known nav href — derived, so a saved row pointing at a room survives sanitize
    for (const r of ROOMS) expect(KNOWN_NAV_HREFS).toContain(roomPath(r.id));
    expect(KNOWN_NAV_HREFS).toContain("/rooms/heart-field");
  });

  it("the home card reads the same derivation and stays client-safe (imports the pure module, never sections.tsx)", async () => {
    const card = await read("src/components/ReadWithLove.tsx");
    expect(card.startsWith('"use client"')).toBe(true);
    expect(card).toContain('from "@/lib/reading-room"');
    expect(card).not.toContain('from "@/components/sections"');
    expect(card).not.toContain("weeklyReadingDoor");
    const pure = await read("src/lib/reading-room.ts");
    // one import, the registry — with the .ts extension node's loader needs (scripts/*.test.mjs walk site-config)
    expect(pure.match(/^import .* from "(.+)";$/gm)).toEqual(['import { ROOMS, type MatrixRoom } from "./matrix-rooms.ts";']);
  });
});
