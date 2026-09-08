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
 * stacked top-to-bottom, uniform across a row. These pin:
 *  1. CARD ORDER — Heart Field Commons · Weekly Intuitive · Observer ·
 *     Evening Star (the shelf maps groupRoomsByPackage's order unchanged).
 *  2. THE DOOR COLUMN — every card ends in ONE `.room-card-doors` column;
 *     who-you-are first (the name line signed in, the sign-in door signed
 *     out), the enter/see door last; the column follows the rooms list.
 *  3. THE STAGE HREF — "Enter the Heart Field Commons" lands on
 *     /rooms/heart-field, and the bare room URL IS the Stage's address:
 *     ROOM_VANTAGE_SITE_DEFAULT is "stage" (T-149/T-174 made the Stage the
 *     gated door; no `?v=` param exists anywhere in the room route).
 *  4. THE NAME LINE — a fixture session ("love") paints "you're in as
 *     @love"; signed out, the sign-in door stands in its place. A feed
 *     that won't say the name paints nothing (derive-or-dash).
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
  opts: { signedIn: boolean; name?: string | null },
) {
  return renderToStaticMarkup(
    createElement(PackageRoomsCard, { pkg, signedIn: opts.signedIn, name: opts.name ?? null }),
  );
}

describe("the card order — Commons first, then the packages by tier", () => {
  it("Heart Field Commons · Weekly Intuitive · Observer · Evening Star, in the shelf's own mapping order", () => {
    const pkgs = groupRoomsByPackage(feedRooms(true, "C"));
    expect(pkgs.map((p) => p.name)).toEqual([
      "Heart Field Commons",
      "Weekly Intuitive",
      "Observer",
      "Evening Star",
    ]);
    /* the cards render in that exact order — the shelf maps the array as-is */
    const html = pkgs.map((p) => render(p, { signedIn: true, name: "love" })).join("");
    const idx = pkgs.map((p) => html.indexOf(p.name));
    expect(idx.every((v) => v >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx); // strictly in package order
  });
});

describe("the Stage door — Enter the Heart Field Commons", () => {
  it("the Commons' ENTER door names the room and lands on /rooms/heart-field", () => {
    const commons = groupRoomsByPackage(feedRooms(true, "C"))[0];
    const html = render(commons, { signedIn: true, name: "love" });
    expect(html).toContain("Enter the Heart Field Commons");
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
      const html = render(p, { signedIn: true, name: "love" });
      expect(html).toContain(`href="/rooms/${p.primary.slug}"`);
    }
  });
});

describe("the door column — the doors hug the bottom, one column, one order", () => {
  it("every card ends in ONE .room-card-doors column, after the rooms list", () => {
    const pkgs = groupRoomsByPackage(feedRooms(true, "A")); // mixed open/locked
    for (const p of pkgs) {
      const html = render(p, { signedIn: true, name: "love" });
      expect(html.match(/room-card-doors/g)).toHaveLength(1);
      expect(html.indexOf("room-card-doors")).toBeGreaterThan(html.indexOf("<ul")); // below the rooms
      /* the doors are the LAST thing in the card — nothing floats below them */
      expect(html.trimEnd().endsWith("</div></div>")).toBe(true);
    }
  });

  it("signed in, the name line rides the TOP of the door column, the door below it", () => {
    const commons = groupRoomsByPackage(feedRooms(true, "C"))[0];
    const html = render(commons, { signedIn: true, name: "love" });
    const col = html.slice(html.indexOf("room-card-doors"));
    expect(col.indexOf("you&#x27;re in as")).toBeGreaterThanOrEqual(0);
    expect(col.indexOf("you&#x27;re in as")).toBeLessThan(col.indexOf("Enter the Heart Field Commons"));
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

describe("the name line — which name the visitor wears", () => {
  it("a fixture session paints “you're in as @love” on every card", () => {
    const pkgs = groupRoomsByPackage(feedRooms(true, "A"));
    for (const p of pkgs) {
      const html = render(p, { signedIn: true, name: "love" });
      expect(html).toContain("you&#x27;re in as");
      expect(html).toContain("@love");
    }
  });

  it("signed out paints NO name line — the sign-in door stands in its place", () => {
    const pkgs = groupRoomsByPackage(feedRooms(false, null));
    for (const p of pkgs) {
      const html = render(p, { signedIn: false, name: "love" });
      expect(html).not.toContain("in as");
      expect(html).not.toContain("@love");
      expect(html).toContain('href="/login"');
    }
  });

  it("a feed that won't say the name paints nothing — derive-or-dash", () => {
    const commons = groupRoomsByPackage(feedRooms(true, "C"))[0];
    const html = render(commons, { signedIn: true, name: null });
    expect(html).not.toContain("in as");
  });
});

describe("source-level pins — the shelf threads the name; the CSS is the additive .room-card block", () => {
  it("RoomsShelf hands the feed's handle to every card", async () => {
    const src = await fs.readFile(
      path.join(process.cwd(), "src/components/rooms/RoomsShelf.tsx"),
      "utf8",
    );
    expect(src).toContain("name={feed.handle}");
  });

  it("house.css carries the .room-card contract — the fill, the bottom column, the full-width doors", async () => {
    const css = await fs.readFile(path.join(process.cwd(), "src/app/house.css"), "utf8");
    expect(css).toContain(".room-card{height:100%}");
    expect(css).toMatch(/\.room-card-doors\{[^}]*margin-top:auto[^}]*\}/);
    expect(css).toMatch(/\.room-card-doors \.btn\{[^}]*width:100%[^}]*\}/);
  });
});
