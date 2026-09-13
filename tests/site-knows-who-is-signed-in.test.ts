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
 *      rooms' Stage reads (fren-auth over the raw header), asks the vault
 *      for the soul's package, and threads both to the hero (source pin —
 *      an async server component never renders in the node env).
 *   2. THE HERO DOOR FOLLOWS THE VISITOR — a known guest's door leads to
 *      the sign-in card with ?next= back to the Stage (the words say so);
 *      a member goes straight in; a member whose key opens the room is
 *      told THAT, never sold the package; the T-178 render (no visitor
 *      said) keeps the bare Stage.
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
const src = (html: string, needle: string) => html.indexOf(needle);

describe("TASK-210 — the home page reads the session (source pin)", () => {
  it("page.tsx reads the RAW cookie header (never cookies() — it URL-encodes an email handle's @ and the token fails its own signature), parses it with fren-auth, reads the tier, and hands the hero a known visitor (null for a guest)", async () => {
    const page = await read("src/app/page.tsx");
    expect(page).toContain("export default async function Home()");
    expect(page).toContain('(await headers()).get("cookie")');
    expect(page).not.toContain('import { cookies }'); // the encoding store stays out
    expect(page).toContain('from "@/lib/fren-auth"');
    expect(page).toContain("sessionsFromCookieHeader(");
    expect(page).toContain("tierForSubject(");
    expect(page).toContain("<Hero session={session} />");
    expect(page).toMatch(/:\s*null;/); // a guest is a KNOWN null, never undefined
  });
});

describe("TASK-210 — the hero's reading door follows the visitor", () => {
  it("a known guest's door leads to the sign-in card with ?next= back to the Stage, and the words say so", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    const door = weeklyReadingDoor(undefined, null)!;
    expect(door.href).toBe(`/login?next=${encodeURIComponent("/rooms/weekly-reading")}`);
    expect(door.words).toContain("Sign in and the room knows you");
    expect(door.words).toContain("with the Observer"); // the tier words still ride — honest about the key
  });

  it("a member goes straight to the Stage; without the room's key the words name the package", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    const door = weeklyReadingDoor(undefined, { handle: "firefly@example.com", space: "email", tier: null })!;
    expect(door.href).toBe("/rooms/weekly-reading");
    expect(door.words).toContain("with the Observer membership");
    expect(door.words).not.toContain("Sign in");
    // tier A holds no key to a tier-B room — the same ladder as the Stage's gate
    expect(weeklyReadingDoor(undefined, { handle: "a", space: "email", tier: "A" })!.words).toContain("with the Observer");
  });

  it("a member whose key opens the room is told THAT — never sold the package (B and C both open a B room)", async () => {
    const { weeklyReadingDoor } = await import("@/components/sections");
    for (const tier of ["B", "C"] as const) {
      const door = weeklyReadingDoor(undefined, { handle: "firefly@example.com", space: "email", tier })!;
      expect(door.href).toBe("/rooms/weekly-reading");
      expect(door.words).toContain("key opens it");
      expect(door.words).not.toContain("with the Observer membership");
    }
  });

  it("no visitor said (the T-178 render) → the bare Stage and the tier words, unchanged", async () => {
    const { weeklyReadingDoor, Hero } = await import("@/components/sections");
    expect(weeklyReadingDoor()!.href).toBe("/rooms/weekly-reading");
    const guest = renderToStaticMarkup(createElement(Hero, { session: null }));
    expect(guest).toContain(`href="/login?next=${encodeURIComponent("/rooms/weekly-reading")}"`);
    expect(guest).toContain("Sign in and the room knows you");
    const member = renderToStaticMarkup(createElement(Hero, { session: { handle: "f", space: "email", tier: "B" } }));
    expect(member).toContain('href="/rooms/weekly-reading"');
    expect(src(member, "key opens it")).toBeGreaterThan(-1);
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
