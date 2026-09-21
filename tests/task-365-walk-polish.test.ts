import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ROOMS } from "@/lib/matrix-rooms";
import { TIERS, tierSatisfies, type Tier } from "@/lib/entitlement";

/**
 * TASK-365 (0018.07.02 a₿, block 967,919/967,926/967,927) — three small
 * fixes from one production walk. Source-string pins follow this repo's
 * own `tests/me-signed-in-tabs.test.ts` idiom (vitest.config.ts runs
 * `environment: "node"`, no jsdom — pin the model, not the render); the
 * Part 2 render pin follows `tests/classroom-three-rooms.test.ts`'s own
 * renderToStaticMarkup idiom.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

describe("Part 1 — the night grey: /login door and /me field wear sky-glass", () => {
  it("login/page.tsx's door section reads sky-glass, not sky-night", async () => {
    const src = await read("src/app/login/page.tsx");
    expect(src).toContain('className="sky-glass"');
    // login-galaxy hero band keeps its own sky-veil untouched — only the
    // door section's own sky-night is gone
    expect(src).not.toMatch(/className="sky-night"/);
  });

  it("me/page.tsx's field section reads sky-glass, not sky-night", async () => {
    const src = await read("src/app/me/page.tsx");
    expect(src).toContain('className="sky-glass"');
    expect(src).not.toMatch(/className="sky-night"/);
  });

  it("the two matching Puck-seed band() calls (me, lg) read sky-glass", async () => {
    const src = await read("src/lib/puck-seeds.ts");
    expect(src).toContain('me.band("sky-glass", "theme", [\n    { type: "MeSwitch"');
    expect(src).toContain('lg.band("sky-glass", "theme", [\n    { type: "LoginDoor"');
  });

  it("classes/page.tsx and contact/page.tsx keep their OWN sky-night sections — out of this lane's scope", async () => {
    // named so nobody assumes this lane's sweep touched every sky-night on the site
    const classes = await read("src/app/classes/page.tsx");
    const contact = await read("src/app/contact/page.tsx");
    expect(classes).toContain('className="sky-night"');
    expect(contact).toContain('className="sky-night"');
  });
});

describe("Part 2 — the rooms strip stops offering a dead Enter door to itself", () => {
  it("source pin: RoomCardsGrid filters out the package whose primary room is the active one", async () => {
    const src = await read("src/components/rooms/CircleView.tsx");
    expect(src).toContain("p.primary.slug !== activeSlug");
  });

  /** the same feed shape /api/matrix/rooms serves, fixture-ized (rooms-shelf.test.ts idiom) */
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
  const feed = { signedIn: true, handle: "ada", tier: "A", tierName: "Weekly Intuitive", rooms: feedRooms(true, "A") };
  const BASE = { live: null, door: "open" as const };

  it("Heart Field's own page: the ONLY in-range package is Heart Field itself — no 'The rooms' at all", async () => {
    const CircleView = (await import("@/components/rooms/CircleView")).default;
    const html = renderToStaticMarkup(
      createElement(CircleView, { ...BASE, feed, activeSlug: "heart-field", slug: "heart-field", title: "The Heart Field" }),
    );
    expect(html).not.toContain("The rooms");
  });

  it("Clair Senses' own page: its OWN package card is gone, the Commons' real Enter stays — 'The rooms' still renders", async () => {
    const CircleView = (await import("@/components/rooms/CircleView")).default;
    const html = renderToStaticMarkup(
      createElement(CircleView, { ...BASE, feed, activeSlug: "clair-senses", slug: "clair-senses", title: "Clair Senses — Foundations" }),
    );
    expect(html).toContain("The rooms");
    expect(html).toContain("Heart Field"); // the Commons card, a real link elsewhere
  });

  it("a non-primary room's own page (Daily Tune-Up): every card is a real, different link — unaffected", async () => {
    const CircleView = (await import("@/components/rooms/CircleView")).default;
    const html = renderToStaticMarkup(
      createElement(CircleView, { ...BASE, feed, activeSlug: "tune-up", slug: "tune-up", title: "Daily Tune-Up & Check-ins" }),
    );
    expect(html).toContain("The rooms");
  });

  it("loading state (feed: null) still renders 'The rooms' — classroom-three-rooms.test.ts's own pin holds", async () => {
    const CircleView = (await import("@/components/rooms/CircleView")).default;
    const html = renderToStaticMarkup(
      createElement(CircleView, { ...BASE, feed: null, activeSlug: "clair-senses", slug: "clair-senses", title: "Clair Senses — Foundations" }),
    );
    expect(html).toContain("The rooms");
    expect(html).toContain("opening the rooms");
  });
});

describe("Part 3 — /me Purchases Quick doors: even width, no tripled classroom loop", () => {
  it("the classroom loop and its paragraph are gone", async () => {
    const src = await read("src/components/me/MemberQuickCards.tsx");
    expect(src).not.toContain("Matrix classrooms");
    expect(src).not.toContain("classes.map");
    expect(src).not.toMatch(/const classes = ROOMS\.filter/);
    expect(src).not.toContain('import { ROOMS } from "@/lib/matrix-rooms"');
  });

  it("all four real doors remain, once each", async () => {
    const src = await read("src/components/me/MemberQuickCards.tsx");
    expect(src).toContain('href="/memberships"');
    expect(src).toContain('href="/book"');
    expect(src).toContain('href="/store"');
    expect((src.match(/href="\/classes"/g) ?? []).length).toBe(1);
  });

  it("the doors wrapper uses a grid (equal width), not flexWrap", async () => {
    const src = await read("src/components/me/MemberQuickCards.tsx");
    expect(src).toContain("gridTemplateColumns");
    // the OLD flex-wrap row (the uneven-width markup) is gone from the quick-doors block
    expect(src).not.toContain('display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14');
  });

  it("the four static doors wear the kit's own no-wrap button classes", async () => {
    const src = await read("src/components/me/MemberQuickCards.tsx");
    expect((src.match(/className="kit-btn kit-btn-second kit-btn-sm"/g) ?? []).length).toBe(4);
  });
});
