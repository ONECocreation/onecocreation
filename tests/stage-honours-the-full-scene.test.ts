import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const PAGE_SRC = readFileSync("src/app/rooms/[slug]/page.tsx", "utf8");

/* the /api/live tests below stub getStudioDoc so a scene can be set
   without touching the vault or the dev file — mockDoc/vi.mock live at
   module scope (not inside a describe) so vitest's hoist of vi.mock never
   outruns this declaration. */
let mockDoc: Record<string, unknown> | null = null;

vi.mock("@/lib/studio/roster", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/studio/roster")>();
  return {
    ...actual,
    getStudioDoc: async () => mockDoc ?? actual.defaultStudioDoc(),
  };
});

/**
 * TASK-251 (0018.06.23 a₿) — THE STAGE HONOURS THE FULL SCENE. Love's
 * three full-frame scenes (starting soon / be right back / thank you,
 * `src/lib/studio/scenes.ts`'s `kind: "full"` rows) only ever reached OBS
 * as a VDO `&website=` push — the Heart Field Stage never watched the
 * doc's own `activeScene`, so "live 20 minutes early, camera off" left
 * viewers looking at an empty host frame. Pins:
 *
 *  · the room page derives `fullScene` INSIDE the existing vdo-rail gate
 *    (rail "vdo" && door "open" && roster.ok, the same block that already
 *    reads the studio doc for the gallery) — `studioSceneKind` is the
 *    overlay route's one branch point, read here too, so a scene chip
 *    Love left on an overlay pick (solo/duo/phone) never leaks onto the
 *    Stage;
 *  · RoomVideoSlot's vdo branch renders the site's own FullScene INLINE
 *    (`SceneFrame`, wearing `.cl-scene-frame`) when `fullScene` is set,
 *    the `?view=host` iframe exactly as before when it isn't — no overlay
 *    token rides either way, this is a public page;
 *  · `GET /api/live` carries the SAME derivation (`scene`) so
 *    ClassroomView's existing 20s poll can react while a viewer watches;
 *  · the Jitsi branch (`tests/stage-shows-the-studio.test.ts`'s pin) and
 *    the overlay route's own snapshot (`tests/studio-full-scenes.test.ts`)
 *    are UNTOUCHED — `fixed` defaults to `true` (FullScene.tsx), so a
 *    caller that never passes it (the overlay route) renders byte-
 *    identical to before this lane.
 */

describe("the room page — fullScene derives inside the vdo-rail gate, never a stray read", () => {
  it("imports studioSceneKind alongside the studio doc read", () => {
    expect(PAGE_SRC).toContain('import { studioSceneKind, type StudioSceneId } from "@/lib/studio/scenes"');
  });

  it("the derivation sits inside the SAME gate the gallery derivation already uses", () => {
    const gateAt = PAGE_SRC.indexOf('if (switches.meeting.rail === "vdo" && door === "open" && roster?.ok)');
    const sceneKindAt = PAGE_SRC.indexOf('studioSceneKind(doc.activeScene) === "full"');
    const docReadAt = PAGE_SRC.indexOf("await getStudioDoc()");
    expect(gateAt).toBeGreaterThan(-1);
    expect(sceneKindAt).toBeGreaterThan(-1);
    // the scene check reads the SAME doc the gate already fetched, and both
    // live after the gate opens — never a second getStudioDoc() call
    expect(docReadAt).toBeGreaterThan(gateAt);
    expect(sceneKindAt).toBeGreaterThan(docReadAt);
    expect(PAGE_SRC.match(/await getStudioDoc\(\)/g)?.length).toBe(1);
  });

  it("fullScene is null unless the doc's own activeScene is a full-kind id", () => {
    expect(PAGE_SRC).toMatch(
      /fullScene = doc\.activeScene as Extract<StudioSceneId, "starting" \| "brb" \| "ending">;/,
    );
  });

  it("threads fullScene and its three text fields down to ClassroomView, exactly like stageMxids", () => {
    expect(PAGE_SRC).toContain("fullScene={fullScene}");
    expect(PAGE_SRC).toContain("fullSceneShowTitle={fullSceneShowTitle}");
    expect(PAGE_SRC).toContain("fullSceneStartsAt={fullSceneStartsAt}");
    expect(PAGE_SRC).toContain("fullSceneAfterHoursLine={fullSceneAfterHoursLine}");
  });
});

describe("RoomVideoSlot — vdo rail, fullScene swaps the host iframe for the inline scene", () => {
  it("fullScene set: renders the site's own scene inline, not the host iframe", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        rail: "vdo",
        vdoHost: "vdo.onecocreation.com",
        studioRoom: "onecocreation-studio",
        fullScene: "starting",
        fullSceneShowTitle: "The Evening Show",
        fullSceneStartsAt: new Date(Date.now() + 20 * 60_000).toISOString(),
      }),
    );
    expect(html).toContain("cl-scene-frame");
    expect(html).toContain('data-scene="starting"');
    expect(html).toContain("The Evening Show");
    // the host iframe never mounts once a full scene is active
    expect(html).not.toContain("view=host&amp;room=onecocreation-studio");
    // the gallery/camera-door/pill below the frame stay exactly as they are
    expect(html).toContain("● Join Live Session");
  });

  it("fullScene null (absent): the ?view=host iframe exactly as today", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        rail: "vdo",
        vdoHost: "vdo.onecocreation.com",
        studioRoom: "onecocreation-studio",
      }),
    );
    expect(html).toContain(
      "https://vdo.onecocreation.com/?view=host&amp;room=onecocreation-studio&amp;cleanoutput&amp;autostart",
    );
    expect(html).not.toContain("cl-scene-frame");
  });

  it("no music track invented — the note stays a note", () => {
    const src = readFileSync("src/components/rooms/RoomVideoSlot.tsx", "utf8");
    expect(src).not.toMatch(/\.(mp3|wav|ogg)/);
  });
});

describe("GET /api/live — carries the studio's active full scene", () => {
  beforeEach(() => {
    mockDoc = null;
  });

  it("no doc on record (defaults to 'solo', an overlay-kind scene): scene is null", async () => {
    const { GET } = await import("@/app/api/live/route");
    const res = await GET();
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.scene).toBeNull();
  });

  it("the doc's own activeScene rides the field when its kind is full", async () => {
    const { defaultStudioDoc } = await import("@/lib/studio/roster");
    mockDoc = { ...defaultStudioDoc(), activeScene: "ending" };
    const { GET } = await import("@/app/api/live/route");
    const res = await GET();
    const json = await res.json();
    expect(json.scene).toBe("ending");
  });

  it("an overlay-kind pick (duo) never rides the field as a full scene", async () => {
    const { defaultStudioDoc } = await import("@/lib/studio/roster");
    mockDoc = { ...defaultStudioDoc(), activeScene: "duo" };
    const { GET } = await import("@/app/api/live/route");
    const res = await GET();
    const json = await res.json();
    expect(json.scene).toBeNull();
  });

  it("the cache header is untouched (s-maxage=15, same breath as the rest of the payload)", async () => {
    const { GET } = await import("@/app/api/live/route");
    const res = await GET();
    expect(res.headers.get("Cache-Control")).toBe("public, s-maxage=15, stale-while-revalidate=30");
  });
});
