import { describe, it, expect, vi, beforeEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ROOMS } from "@/lib/matrix-rooms";
import { TIERS } from "@/lib/entitlement";
import type { StoreItem } from "@/lib/store";
import { getItem } from "@/lib/store";

/**
 * TASK-465 (block 968,561) — THE PLAYGROUND MOVES TO OBSERVER.
 *
 * The Admiral, verbatim: "the playground is for members of the observer
 * or better package" (ruling A); "weekly intuitive room for clair senses
 * room can be hidden for now. we are only going to have the playground in
 * that room area. it will replace that stage button title called the
 * playground" (ruling B — REVERSES TASK-460/968,543's clair-senses pick);
 * "the big - needs to be replaced ... this would be considered slop"
 * (ruling C — no em dash in visible copy).
 *
 * These pins are RED against the unchanged base: STAGE2_MIN_TIER is "A",
 * `#clair-senses` carries "The Playground"/no hidden flag, `#weekly-reading`
 * carries "Chronicles: Weekly Reading", PLAYGROUND_ROOM_SLUG is
 * "clair-senses", and every listed visible string still reads the old
 * words (several with the banned em dash).
 */

vi.mock("@/lib/store", () => ({ getItem: vi.fn() }));
const mockGetItem = vi.mocked(getItem);

function weekItem(over: Partial<StoreItem>): StoreItem {
  return {
    id: "observer-one-week",
    schemaVersion: 2,
    title: "Observer — One Week Pass",
    blurb: "one week of the Observer package",
    images: [],
    kind: "package",
    price: { fiat: { amount: 2200, currency: "USD" }, sats: 22_222 },
    fulfillment: "package",
    status: "live",
    ...over,
  };
}

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

beforeEach(() => {
  mockGetItem.mockReset();
  mockGetItem.mockResolvedValue(null);
});

describe("STAGE2_MIN_TIER — ruling A/B, block 968,561: the floor moves to Observer", () => {
  it('is "B" (Observer), not "A" (Weekly Intuitive)', async () => {
    const { STAGE2_MIN_TIER } = await import("@/lib/stage2-access");
    expect(STAGE2_MIN_TIER).toBe("B");
  });

  it("STAGE2_FLOOR_NAME reads the floor's own display name — Observer, not Weekly Intuitive", async () => {
    const { STAGE2_FLOOR_NAME } = await import("@/lib/stage2-access");
    expect(STAGE2_FLOOR_NAME).toBe("Observer");
  });

  it("decideStage2: tier A alone no longer satisfies the floor (package); B and C do (open)", async () => {
    const { decideStage2 } = await import("@/lib/stage2-access");
    expect(decideStage2(true, { signedIn: true, tier: "A" })).toBe("package");
    expect(decideStage2(true, { signedIn: true, tier: "B" })).toBe("open");
    expect(decideStage2(true, { signedIn: true, tier: "C" })).toBe("open");
  });

  it("stage2PackageDoor names Observer and points at its own tier page — never Weekly Intuitive", async () => {
    const { stage2PackageDoor } = await import("@/lib/stage2-access");
    const door = await stage2PackageDoor();
    expect(door.name).toBe("Observer");
    expect(door.href).toBe("/packages/observer");
  });

  it("stage2PackageDoor's week offer reads the OBSERVER one-week item, never weekly-one-week", async () => {
    mockGetItem.mockResolvedValue(weekItem({}));
    const { stage2PackageDoor } = await import("@/lib/stage2-access");
    const door = await stage2PackageDoor();
    expect(mockGetItem).toHaveBeenCalledWith("observer-one-week");
    expect(door.week).toEqual({ itemId: "observer-one-week", price: "$22" });
  });
});

describe("matrix-rooms.ts — the room title swap + the hidden flag (ruling B)", () => {
  it('#weekly-reading now reads "The Playground" (tier B untouched)', () => {
    const room = ROOMS.find((r) => r.id === "#weekly-reading:onecocreation.com");
    expect(room, "weekly-reading room missing").toBeDefined();
    expect(room!.title).toBe("The Playground");
    expect(room!.minTier).toBe("B");
    expect(room!.hidden).toBeUndefined();
  });

  it('#clair-senses reads "Clair Senses" (no dash) and carries hidden: true — id/kind/minTier untouched', () => {
    const room = ROOMS.find((r) => r.id === "#clair-senses:onecocreation.com");
    expect(room, "clair-senses room missing").toBeDefined();
    expect(room!.title).toBe("Clair Senses");
    expect(room!.title).not.toContain("—");
    expect(room!.hidden).toBe(true);
    expect(room!.kind).toBe("class");
    expect(room!.minTier).toBe("A");
  });

  it("no room title anywhere still reads the old assignments", () => {
    expect(ROOMS.some((r) => r.title === "Chronicles: Weekly Reading")).toBe(false);
    expect(ROOMS.some((r) => r.id === "#clair-senses:onecocreation.com" && r.title === "The Playground")).toBe(false);
  });
});

describe("reading-room.ts — PLAYGROUND_ROOM_SLUG moves with the door (ruling B)", () => {
  it('is "weekly-reading", not "clair-senses"', async () => {
    const { PLAYGROUND_ROOM_SLUG, READING_ROOM_SLUG } = await import("@/lib/reading-room");
    expect(PLAYGROUND_ROOM_SLUG).toBe("weekly-reading");
    expect(PLAYGROUND_ROOM_SLUG).not.toBe("clair-senses");
    expect(READING_ROOM_SLUG).not.toBe(PLAYGROUND_ROOM_SLUG);
  });
});

describe("/api/matrix/rooms — the hidden room never rides the public feed", () => {
  it("GET's rooms array excludes clair-senses entirely", async () => {
    vi.resetModules();
    const { GET } = await import("@/app/api/matrix/rooms/route");
    const res = await GET(new Request("http://test.local/api/matrix/rooms"));
    const data = await res.json();
    expect(data.ok).toBe(true);
    const slugs = (data.rooms as Array<{ slug: string }>).map((r) => r.slug);
    expect(slugs).not.toContain("clair-senses");
    expect(slugs).toContain("weekly-reading");
    expect(slugs).toContain("heart-field");
  });
});

describe("/app/rooms/[slug]/page.tsx — a hidden room's own slug is excluded from bySlug (source pin)", () => {
  it("bySlug's ROOMS.find guards on !r.hidden — a direct /rooms/clair-senses visit notFounds", async () => {
    const src = await read("src/app/rooms/[slug]/page.tsx");
    expect(src).toMatch(/const bySlug = \(slug: string\) => ROOMS\.find\(\(r\) => !r\.hidden && /);
  });
});

describe("door-machine.ts — continueLabel excludes hidden rooms too", () => {
  it("a next=/rooms/clair-senses never names the hidden room", async () => {
    const { continueLabel } = await import("@/components/door/door-machine");
    expect(continueLabel("/rooms/clair-senses")).toBe("Continue");
    expect(continueLabel("/rooms/weekly-reading")).toBe("Continue to The Playground");
  });
});

describe("puck-seeds.ts — the Classes column matches the new rooms (ruling B, hidden not listed)", () => {
  it('carries "✦ The Playground · Observer" and drops the clair-senses line entirely', async () => {
    const src = await read("src/lib/puck-seeds.ts");
    expect(src).toContain(`✦ The Playground · ${TIERS.B.name}`);
    expect(src).not.toContain(`✦ The Playground · ${TIERS.A.name}`);
    expect(src).not.toContain("Chronicles: Weekly Reading");
  });
});

describe("VantageSwitcher — the Stage tab reads The Playground only when told to (ruling B)", () => {
  it("with no stageLabel prop, the Stage tab reads plain Stage", async () => {
    const VantageSwitcher = (await import("@/components/rooms/VantageSwitcher")).default;
    const html = renderToStaticMarkup(h(VantageSwitcher));
    expect(html).toContain(">Stage<");
    expect(html).not.toContain("The Playground");
  });

  it('with stageLabel="The Playground", the Stage tab reads it — the other two tabs unchanged', async () => {
    const VantageSwitcher = (await import("@/components/rooms/VantageSwitcher")).default;
    const html = renderToStaticMarkup(h(VantageSwitcher, { stageLabel: "The Playground" } as never));
    expect(html).toContain(">The Playground<");
    expect(html).not.toContain(">Stage<");
    expect(html).toContain(">Lesson Path<");
    expect(html).toContain(">Events<");
  });
});

describe("ClassroomView — mounts the Playground's own Stage label only in weekly-reading (source pin)", () => {
  it("passes stageLabel keyed off PLAYGROUND_ROOM_SLUG, imported from reading-room.ts", async () => {
    const src = await read("src/components/rooms/ClassroomView.tsx");
    expect(src).toContain('import { PLAYGROUND_ROOM_SLUG } from "@/lib/reading-room"');
    expect(src).toMatch(/stageLabel=\{slug === PLAYGROUND_ROOM_SLUG \? "The Playground" : undefined\}/);
  });
});

describe("PlaygroundDoor.tsx — Observer floor, no em dash (ruling A/C)", () => {
  it("renders no mention of Weekly Intuitive and no em dash", async () => {
    const PlaygroundDoor = (await import("@/components/rooms/PlaygroundDoor")).default;
    const html = renderToStaticMarkup(h(PlaygroundDoor));
    expect(html).not.toContain("Weekly Intuitive");
    expect(html).not.toContain("—");
    expect(html).toContain('href="/reading/playground"');
    expect(html).toContain("Join the Playground call");
    expect(html).toContain("kit-btn kit-btn-main kit-btn-sm");
  });
});

describe("Stage2Door.tsx — no em dash anywhere visible, no Weekly Intuitive as the floor (ruling A/C)", () => {
  const DOOR = "src/components/rooms/Stage2Door.tsx";

  async function renderBody(props: Record<string, unknown>) {
    const { Stage2DoorBody } = await import("@/components/rooms/Stage2Door");
    return renderToStaticMarkup(
      h(Stage2DoorBody, {
        decision: "hidden",
        reachable: null,
        pkg: null,
        joining: false,
        weekBusy: false,
        note: null,
        onJoinClick: () => {},
        onTryWeek: () => {},
        ...props,
      } as never),
    );
  }

  it("package + week: two sentences, no dash, and 'Try one week for $price' (no dash in the button either)", async () => {
    const html = await renderBody({
      decision: "package",
      pkg: { name: "Observer", href: "/packages/observer", week: { itemId: "observer-one-week", price: "$22" } },
    });
    expect(html).toContain("The Playground comes with every membership from Observer up.");
    expect(html).toContain("Or try it with a one-week pass.");
    expect(html).toContain("Try one week for $22");
    expect(html).not.toContain("—");
  });

  it("package without week: one plain sentence, no dash", async () => {
    const html = await renderBody({
      decision: "package",
      pkg: { name: "Observer", href: "/packages/observer", week: null },
    });
    expect(html).toContain("The Playground comes with every membership from Observer up.");
    expect(html).not.toContain("—");
  });

  it("the click-failure note reads two sentences, no dash", async () => {
    const src = await read(DOOR);
    expect(src).toContain("The Playground couldn't be reached just now. Try again.");
    expect(src).not.toContain("couldn't be reached just now — try again");
  });

  it("no visible em dash survives in the states this lane's words touch (package, Try-one-week, unreachable)", async () => {
    /* the "signin" state's dash (signInDoorLine, room-access.ts) is a
       SHARED helper across five room doors — out of this lane's OWNS,
       untouched, and not part of the Admiral's block 968,561 example */
    const states = [
      { decision: "package", pkg: { name: "Observer", href: "/packages/observer", week: null } },
      { decision: "package", pkg: { name: "Observer", href: "/packages/observer", week: { itemId: "observer-one-week", price: "$22" } } },
      { decision: "open", reachable: true },
      { decision: "open", reachable: false },
    ];
    for (const props of states) {
      const html = await renderBody(props);
      expect(html, JSON.stringify(props)).not.toContain("—");
    }
  });

  it("never names Weekly Intuitive as the floor", async () => {
    const src = await read(DOOR);
    expect(src).not.toContain("Weekly Intuitive");
  });
});

describe("PlaygroundIsland.tsx — Observer floor, no em dash (ruling A/C)", () => {
  const ISLAND = "src/components/reading/playground/PlaygroundIsland.tsx";

  it("the signin and package paragraphs render the passed observerName, never a hardcoded Weekly Intuitive", async () => {
    const { PlaygroundIslandBody } = await import("@/components/reading/playground/PlaygroundIsland");
    const base = {
      joinedRoom: null,
      left: false,
      nameSnapshot: "Guest",
      joining: false,
      weekBusy: false,
      note: null,
      jitsiDomain: "meet.test.invalid",
      observerHref: "/packages/observer",
      observerName: "OBSERVER-FIXTURE",
      stage2Rows: null,
      onJoinClick: () => {},
      onTryWeek: () => {},
      onCallEnded: () => {},
    };
    const signin = renderToStaticMarkup(
      h(PlaygroundIslandBody, { ...base, wire: { decision: "signin", reachable: null, pkg: null } } as never),
    );
    expect(signin).toContain("OBSERVER-FIXTURE");
    expect(signin).not.toContain("Weekly Intuitive");
    const pkg = renderToStaticMarkup(
      h(PlaygroundIslandBody, {
        ...base,
        wire: { decision: "package", reachable: null, pkg: { name: "x", href: "/x", week: null } },
      } as never),
    );
    expect(pkg).toContain("OBSERVER-FIXTURE");
    expect(pkg).not.toContain("Weekly Intuitive");
  });

  it("the Try-one-week button label carries no em dash", async () => {
    const src = await read(ISLAND);
    expect(src).not.toContain("Try one week —");
    expect(src).toContain("Try one week for");
  });

  it("the click-failure notes read two sentences, no dash", async () => {
    const src = await read(ISLAND);
    expect(src).toContain("The Playground couldn't be reached just now. Try again.");
    expect(src).not.toContain("couldn't be reached just now — try again");
  });
});

describe("/reading and /reading/playground — the floor name is DERIVED, never a Weekly Intuitive literal", () => {
  it("/reading's list line derives stage2-access.ts's STAGE2_FLOOR_NAME (never entitlement.ts's TIERS directly — this page's own no-tier-logic law)", async () => {
    const src = await read("src/app/reading/page.tsx");
    expect(src).not.toContain("from Weekly Intuitive up");
    expect(src).toMatch(/STAGE2_FLOOR_NAME/);
    expect(src).not.toMatch(/\bTIERS\b/);
  });

  it("/reading/playground's list line uses the page's own observerName, never a literal Weekly Intuitive", async () => {
    const src = await read("src/app/reading/playground/page.tsx");
    expect(src).not.toContain("from Weekly Intuitive up");
    expect(src).toMatch(/\$\{observerName\} up/);
  });
});

describe("week-pass.ts — deriveWeekPass follows Stage 2's own floor, never a hardcoded weekly-one-week", () => {
  it("reads the floor tier's own item id via STAGE2_MIN_TIER + TIER_PAGES", async () => {
    const src = await read("src/lib/week-pass.ts");
    expect(src).not.toContain('getItem("weekly-one-week")');
    expect(src).toContain("STAGE2_MIN_TIER");
    expect(src).toMatch(/TIER_PAGES\.find\(\(p\) => p\.tier === STAGE2_MIN_TIER\)/);
  });

  it("behaviorally resolves the Observer one-week item, not Weekly Intuitive's", async () => {
    mockGetItem.mockResolvedValue(weekItem({}));
    const { deriveWeekPass } = await import("@/lib/week-pass");
    const pass = await deriveWeekPass();
    expect(mockGetItem).toHaveBeenCalledWith("observer-one-week");
    expect(pass).toEqual({ name: "Observer — One Week Pass", price: "$22" });
  });
});
