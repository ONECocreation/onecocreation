import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { MaterialItem } from "@/lib/class-materials";

/**
 * TASK-213 (0018.06.23 a₿) — THE READING DOOR. Love's call #19/#20/#21:
 *
 *  19. the reading gets its own door under Community — split off the old
 *      combined "Classes & rooms" into two doors, Classes and The reading
 *      room, both editable in the menu editor (PAGE_CATALOG), reusing the
 *      ONE string source (reading-room.ts's READING_ROOM_PATH) already fed
 *      to ReadWithLove, the member menu, and the Heart Field row — never a
 *      second spelling.
 *  20. who's-here — ALREADY LANDED (T-184): RoomPresence/soulsOnline feeds
 *      from the page's one roster read. This lane pins that it rides the
 *      reading room specifically.
 *  21. the classroom layout pass — a resources region joins the Stage
 *      between video and chat/people (the Lesson Path's own ResourcesCard,
 *      reused, never re-spelled), so the Stage reads video → resources →
 *      chat → people, in that order.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

describe("19 · the reading gets its own door under Community", () => {
  it("the door reuses reading-room.ts's ONE string source — never a second spelling", async () => {
    const src = await read("src/components/NavMenu.tsx");
    expect(src).toContain('import { READING_PAGE_PATH, READING_ROOM_PATH } from "@/lib/reading-room"');
    // both PAGE_CATALOG and buildDefaultMenu's Community subs read the SAME constant
    const catalogIdx = src.indexOf("export const PAGE_CATALOG");
    const menuIdx = src.indexOf("export function buildDefaultMenu");
    expect(src.slice(catalogIdx, menuIdx)).toContain("READING_ROOM_PATH");
    expect(src.slice(menuIdx)).toContain('label: "Read with Love", href: READING_PAGE_PATH');
  });

  it("buildDefaultMenu: Community carries Classes AND The reading room as two separate doors", async () => {
    const { buildDefaultMenu, buildMenu } = await import("@/components/NavMenu");
    const { defaultSiteConfig } = await import("@/lib/site-config");
    const c = defaultSiteConfig();
    c.features.classes = true;
    const community = buildDefaultMenu(c).find((m) => m.label === "Community");
    expect(community?.subs?.map((s) => s.label)).toContain("Classes");
    expect(community?.subs?.map((s) => s.label)).toContain("Read with Love");
    expect(community?.subs?.find((s) => s.label === "Classes")?.href).toBe("/classes");
    expect(community?.subs?.find((s) => s.label === "Read with Love")?.href).toBe("/reading");
    // classes OFF: Classes drops, the reading room stays — its own, independent door
    c.features.classes = false;
    const community2 = buildMenu(c).find((m) => m.label === "Community");
    expect(community2?.subs?.map((s) => s.label)).not.toContain("Classes");
    expect(community2?.subs?.map((s) => s.label)).toContain("Read with Love");
  });

  it("the reading room is editable in the menu editor — PAGE_CATALOG carries it with no feature gate", async () => {
    const { PAGE_CATALOG } = await import("@/components/NavMenu");
    const { READING_ROOM_PATH } = await import("@/lib/reading-room");
    const entry = PAGE_CATALOG.find((p) => p.href === READING_ROOM_PATH);
    expect(entry).toBeTruthy();
    expect(entry?.label).toBe("Heart Field");
    expect(entry?.feature).toBeUndefined(); // gated only by the room's own presence, not a switch
  });

  it("the reading-room href survives the saved-nav sanitize round-trip (KNOWN_NAV_HREFS)", async () => {
    const { KNOWN_NAV_HREFS } = await import("@/lib/site-config");
    const { READING_ROOM_PATH } = await import("@/lib/reading-room");
    expect(READING_ROOM_PATH).toBeTruthy();
    expect(KNOWN_NAV_HREFS).toContain(READING_ROOM_PATH);
  });

  it("a saved custom nav with the reading room's own row round-trips through buildMenu untouched", async () => {
    const { buildMenu } = await import("@/components/NavMenu");
    const { defaultSiteConfig } = await import("@/lib/site-config");
    const c = defaultSiteConfig();
    c.nav = {
      items: [
        {
          id: "community", label: "Community", href: "/classes",
          children: [{ id: "reading", label: "The reading room", href: "/rooms/heart-field" }],
        },
      ],
    };
    const menu = buildMenu(c);
    expect(menu[0].label).toBe("Community");
    expect(menu[0].subs?.[0]).toEqual({ label: "The reading room", href: "/rooms/heart-field" });
  });
});

describe("20 · who's-here rides the reading room (T-184's roster, pinned for this room)", () => {
  it("the room page's one roster read feeds the Stage's people region for the Heart Field", async () => {
    const src = await read("src/app/rooms/[slug]/page.tsx");
    expect(src).toContain('door === "open" ? await rosterForRequest(room.id) : null');
    // the derivation is the SAME room reading-room.ts names — no second lookup
    const { ROOMS } = await import("@/lib/matrix-rooms");
    const { READING_ROOM_SLUG } = await import("@/lib/reading-room");
    const room = ROOMS.find((r) => r.id.slice(1, r.id.indexOf(":")) === READING_ROOM_SLUG);
    expect(room?.minTier).toBe("all");
  });

  it("empty truth dashes honestly — an empty roster reads '— nobody here yet', never a fake count", async () => {
    const RoomPresence = (await import("@/components/rooms/RoomPresence")).default;
    const html = renderToStaticMarkup(
      createElement(RoomPresence, { roster: { ok: true, count: 0, names: [], joined: {}, presence: {} } }),
    );
    expect(html).toContain("— nobody here yet");
  });

  it("StageView folds RoomPresence in as the people region beside the chat — the reading room rides the same Stage", async () => {
    const StageView = (await import("@/components/rooms/StageView")).default;
    const html = renderToStaticMarkup(
      createElement(StageView, {
        slug: "heart-field",
        alias: "#heart-field:onecocreation.com",
        title: "The Heart Field",
        kind: "community" as const,
        live: false,
        roster: { ok: true, count: 1, names: ["Ada"], joined: { "@ada:onecocreation.com": { display_name: "Ada" } }, presence: { "@ada:onecocreation.com": { presence: "online" } } },
      }),
    );
    expect(html).toContain("Ada");
    expect(html).toContain('data-region="people"');
  });
});

describe("21 · the classroom layout pass — video → resources → chat, who's-here beside", () => {
  const item = (id: string): MaterialItem => ({
    id, roomSlug: "heart-field", name: id, kind: "pdf", url: `/vault/${id}`, attachedTo: { kind: "shelf" }, addedAtMs: 1,
  });

  it("StageView reuses the Lesson Path's own ResourcesCard — never a second spelling of the list", async () => {
    const src = await read("src/components/rooms/StageView.tsx");
    expect(src).toContain('import { deriveResources, ResourcesCard } from "./LessonPathView"');
    expect(src).toContain("<ResourcesCard resources={resources} />");
  });

  it("empty resources render no region at all — derive-or-dash, never an empty box", async () => {
    const StageView = (await import("@/components/rooms/StageView")).default;
    const html = renderToStaticMarkup(
      createElement(StageView, {
        slug: "heart-field", alias: "#heart-field:onecocreation.com", title: "The Heart Field",
        kind: "community" as const, live: false, roster: null,
      }),
    );
    expect(html).not.toContain('data-region="resources"');
    for (const region of ["video", "chat", "people"]) {
      expect(html).toContain(`data-region="${region}"`);
    }
  });

  it("the classroom.css grid declares the resources row between video and chat/people", async () => {
    const css = await read("src/components/rooms/classroom.css");
    const stage = css.match(/\.cl-grid-stage\s*\{[\s\S]*?\}/);
    expect(stage).not.toBeNull();
    const areas = stage![0];
    expect(areas.indexOf('"video video"')).toBeLessThan(areas.indexOf('"resources resources"'));
    expect(areas.indexOf('"resources resources"')).toBeLessThan(areas.indexOf('"chat people"'));
    expect(css).toContain(".cl-area-resources { grid-area: resources; }");
  });

  it("deriveResources is shared, pure, and identical to the Lesson Path's own split", async () => {
    const { deriveResources } = await import("@/components/rooms/LessonPathView");
    const items = [item("guide-1"), { ...item("lesson-1"), attachedTo: { kind: "session" as const, sessionKey: "bk_1" } }];
    expect(deriveResources(items).map((m) => m.id)).toEqual(["guide-1"]);
  });
});
