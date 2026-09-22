import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PackageRoomsCard, {
  type PackageRoomLine,
} from "@/components/rooms/PackageRoomsCard";
import {
  ROOMS,
  groupRoomsByPackage,
  type RoomPackage,
} from "@/lib/matrix-rooms";
import { TIERS, tierSatisfies, type Tier } from "@/lib/entitlement";
import { ROOM_VANTAGE_SITE_DEFAULT } from "@/components/rooms/vantage";

/**
 * TASK-183 (0018.06.18 a₿ · block 966,098) — THE /classes ROOM CARDS,
 * UNIFORM. The Admiral (0018.06.17): "the buttons are not even, this looks
 * like slop" — the law: buttons and doors HUG THE BOTTOM of every card,
 * stacked top-to-bottom, uniform across a row. TASK-401 (block 968,141):
 * the per-card "you're in as <name>" line came back OUT — it repeated on
 * every card; the shelf's own foot note names the signed-in account once,
 * below the cards, with the fuller truth (the full Matrix id and whose
 * server it lives on). These pin:
 *  1. CARD ORDER — Heart Field · Weekly Intuitive · Observer ·
 *     Evening Star (the shelf maps groupRoomsByPackage's order unchanged).
 *  2. THE DOOR COLUMN — every card ends in ONE `.room-card-doors` column;
 *     signed in, the ENTER/SEE door alone; signed out, the sign-in door in
 *     its place — the column follows the rooms list, nothing rides above
 *     the door any more.
 *  3. THE STAGE HREF — "Enter the Heart Field" lands on
 *     /rooms/heart-field, and the bare room URL IS the Stage's address:
 *     ROOM_VANTAGE_SITE_DEFAULT is "stage" (T-149/T-174 made the Stage the
 *     gated door; no `?v=` param exists anywhere in the room route).
 *  4. THE NAME READS ONCE — a signed-in card paints NO "in as" line and no
 *     `.room-card-name` element, locked or open, any package. The `name`
 *     prop is gone from PackageRoomsCard entirely (decision C) — nothing
 *     is left to feed it. RoomsShelf's own wiring (read from its real
 *     source, not assumed — Astra's R1) no longer threads a handle into
 *     the card; its foot note stays the surface's one mention, unchanged.
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

function render(
  pkg: RoomPackage<PackageRoomLine & { minTier: string }>,
  opts: { signedIn: boolean },
) {
  return renderToStaticMarkup(
    createElement(PackageRoomsCard, { pkg, signedIn: opts.signedIn }),
  );
}

describe("the card order — Commons first, then the packages by tier", () => {
  it("Heart Field · Weekly Intuitive · Observer · Evening Star, in the shelf's own mapping order", () => {
    const pkgs = groupRoomsByPackage(feedRooms(true, "C"));
    expect(pkgs.map((p) => p.name)).toEqual([
      "Heart Field",
      "Weekly Intuitive",
      "Observer",
      "Evening Star",
    ]);
    /* the cards render in that exact order — the shelf maps the array as-is */
    const html = pkgs.map((p) => render(p, { signedIn: true })).join("");
    const idx = pkgs.map((p) => html.indexOf(p.name));
    expect(idx.every((v) => v >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx); // strictly in package order
  });
});

describe("the Stage door — Enter the Heart Field", () => {
  it("the Heart Field's ENTER door names the room and lands on /rooms/heart-field", () => {
    const commons = groupRoomsByPackage(feedRooms(true, "C"))[0];
    const html = render(commons, { signedIn: true });
    expect(html).toContain("Enter the Heart Field");
    expect(html).toContain('href="/rooms/heart-field"');
  });

  it("the bare room URL IS the Stage's address — the site default vantage is the Stage", () => {
    /* T-149/T-174 made the Stage the gated door; no ?v= param exists — the
       default vantage decides where /rooms/<slug> lands */
    expect(ROOM_VANTAGE_SITE_DEFAULT).toBe("stage");
  });

  it("every open package's ENTER door lands on that package's first room", () => {
    const pkgs = groupRoomsByPackage(feedRooms(true, "C"));
    for (const p of pkgs) {
      const html = render(p, { signedIn: true });
      expect(html).toContain(`href="/rooms/${p.primary.slug}"`);
    }
  });
});

describe("the door column — the doors hug the bottom, one column, one order", () => {
  it("every card ends in ONE .room-card-doors column, after the rooms list", () => {
    const pkgs = groupRoomsByPackage(feedRooms(true, "A")); // mixed open/locked
    for (const p of pkgs) {
      const html = render(p, { signedIn: true });
      expect(html.match(/room-card-doors/g)).toHaveLength(1);
      expect(html.indexOf("room-card-doors")).toBeGreaterThan(html.indexOf("<ul")); // below the rooms
      /* the doors are the LAST thing in the card — nothing floats below them */
      expect(html.trimEnd().endsWith("</div></div>")).toBe(true);
    }
  });

  it("signed in, the ENTER door is the door column's first (and only) row — no who-you-are row precedes it", () => {
    const commons = groupRoomsByPackage(feedRooms(true, "C"))[0];
    const html = render(commons, { signedIn: true });
    const col = html.slice(html.indexOf("room-card-doors"));
    expect(col).not.toContain("room-card-name");
    const firstTag = col.indexOf("<a");
    expect(firstTag).toBeGreaterThan(-1);
    // the FIRST anchor the column opens on is the ENTER link itself
    expect(col.slice(firstTag, firstTag + 200)).toContain('href="/rooms/heart-field"');
  });

  it("signed out, the sign-in door stands FIRST, the See door below it — never the other way", () => {
    const observer = groupRoomsByPackage(feedRooms(false, null))[2];
    const html = render(observer, { signedIn: false });
    const col = html.slice(html.indexOf("room-card-doors"));
    expect(col.indexOf('href="/login"')).toBeGreaterThanOrEqual(0);
    expect(col.indexOf('href="/login"')).toBeLessThan(col.indexOf("See Observer"));
    expect(col).toContain('href="/packages/observer"');
  });

  it("signed out at the Commons, the single door is the welcome path — sign in · join free", () => {
    const commons = groupRoomsByPackage(feedRooms(false, null))[0];
    const html = render(commons, { signedIn: false });
    const col = html.slice(html.indexOf("room-card-doors"));
    expect(col).toContain("Sign in · join free");
    expect(col).toContain('href="/login"');
    expect(col).not.toContain("See ");
    expect(col.match(/<a /g)).toHaveLength(1); // one door, not two
  });
});

describe("the name reads once — not on every card (TASK-401)", () => {
  /* Astra's R1 (walk-968036/ASTRA-REVIEW-T401.md): PackageRoomsCard.tsx's
     `name` prop is GONE (decision C) — a helper that simply stops passing
     `name` would pass a zero-line check even on the UNTOUCHED card, since
     the prop defaulted to null there too (a render alone never proved the
     WIRING changed). The real signal is whether RoomsShelf still hands the
     card a handle — read from its own source, not assumed. This test
     fails on the untouched tree (RoomsShelf.tsx there still mounts
     `name={feed.handle}`, four times) and passes once TASK-401 lands. */
  it("RoomsShelf's real wiring never threads a handle into any of the four real cards; the foot note stays the one account mention", async () => {
    const shelfSrc = await fs.readFile(
      path.join(process.cwd(), "src/components/rooms/RoomsShelf.tsx"),
      "utf8",
    );

    // the wiring itself: RoomsShelf's real <PackageRoomsCard ... /> mount,
    // sliced from its own source — this is what actually painted the line
    // on every card; it must carry no `name=` of any kind
    const mountIdx = shelfSrc.indexOf("<PackageRoomsCard");
    const mountEnd = shelfSrc.indexOf("/>", mountIdx);
    expect(mountIdx, "RoomsShelf no longer mounts PackageRoomsCard where expected").toBeGreaterThan(-1);
    const mount = shelfSrc.slice(mountIdx, mountEnd);
    expect(mount).not.toMatch(/\bname=/);

    // the render half: the four real packages (mixed open/locked — the old
    // bug painted regardless of lock state), signed in, through the real
    // card component — zero .room-card-name, zero "in as", for any of them
    const pkgs = groupRoomsByPackage(feedRooms(true, "A"));
    const cardsHtml = pkgs.map((p) => render(p, { signedIn: true })).join("");
    expect(cardsHtml).not.toContain("in as");
    expect((cardsHtml.match(/room-card-name/g) ?? []).length).toBe(0);

    // the foot note — the surface's ONE mention — counted from the real
    // file, not reconstructed: the account-id interpolation appears
    // exactly once, carrying the fuller truth
    const idHits = shelfSrc.match(/@\{feed\.handle\}:onecocreation\.com/g) ?? [];
    expect(idHits).toHaveLength(1);
    expect(shelfSrc).toContain("lives on Love");
  });

  it("signed out, no name-adjacent line — the sign-in door stands in its place, unchanged", () => {
    const pkgs = groupRoomsByPackage(feedRooms(false, null));
    for (const p of pkgs) {
      const html = render(p, { signedIn: false });
      expect(html).not.toContain("in as");
      expect(html).not.toContain("room-card-name");
      expect(html).toContain('href="/login"');
    }
  });
});

describe("source-level pins — the shelf no longer threads the name; the CSS is the additive .room-card block", () => {
  it("RoomsShelf does not hand a handle to the card any more, and still carries the foot note's account line", async () => {
    const src = await fs.readFile(
      path.join(process.cwd(), "src/components/rooms/RoomsShelf.tsx"),
      "utf8",
    );
    expect(src).not.toContain("name={feed.handle}");
    expect(src).toContain("lives on Love");
  });

  it("house.css carries the .room-card contract — the fill, the bottom column, the full-width doors", async () => {
    const css = await fs.readFile(path.join(process.cwd(), "src/app/house.css"), "utf8");
    // TASK-216 (#37): the padding recipe joined this rule (moved off the
    // component's inline ternary — see tests/room-card-grammar.test.ts) —
    // `height:100%` is still the load-bearing fill this test names.
    expect(css).toMatch(/\.room-card\{[^}]*height:100%[^}]*\}/);
    expect(css).toMatch(/\.room-card-doors\{[^}]*margin-top:auto[^}]*\}/);
    expect(css).toMatch(/\.room-card-doors \.btn\{[^}]*width:100%[^}]*\}/);
  });
});
