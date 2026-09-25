import { describe, it, expect } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import StudioHub, { type StudioHubProps } from "@/components/console/StudioHub";
import { defaultStudioDoc } from "@/lib/studio/doc";
import { STUDIO_SCENES, type StudioSceneId } from "@/lib/studio/scenes";
import type { GoLiveMeeting } from "@/app/a/live/go-live-room";
import type { DoorRoom } from "@/components/console/LiveDoorCard";

/**
 * TASK-330 (0018.06.26/27 a₿ — RULED Studio 0018.06.26 · 11:20 a₿; folded
 * in after review, Ms. Kimi REVIEW-DRAFTS-330-333 + Astra r4 §4): the new
 * coverage the brief's Build step 6 names — "the Studio page renders the
 * go-live section." StudioHub is the wrapper; these pins prove it mounts
 * BOTH the director's desk (StudioRoom) and the go-live door (GoLiveRoom)
 * unchanged, stacked DESK FIRST THEN LIVE (never a tab switcher), with
 * the room-state line, the relay-readiness line, and the jump link the
 * folded-in ruling names.
 */

const read = (rel: string) => readFileSync(rel, "utf8");

const overlayUrls = Object.fromEntries(
  STUDIO_SCENES.map((s) => [s.id, null]),
) as Record<StudioSceneId, string | null>;

const MEETING: GoLiveMeeting = {
  rail: "jitsi",
  jitsiDomain: "meet.onecocreation.com",
  jitsiPrefix: "onecocreation-",
  vdoRoomPrefix: "onecocreation",
  vdoHost: "vdo.onecocreation.com",
  siteOrigin: "https://onecocreation.test",
};

const ROOM_FIXTURES: DoorRoom[] = [
  { slug: "heart-field", title: "The Heart Field", kind: "community" },
];

const props: StudioHubProps = {
  initial: defaultStudioDoc(),
  overlayUrls,
  overlayReady: true,
  vdo: { room: "onecocreation_studio", push: "https://vdo.onecocreation.com/?room=onecocreation_studio&push=host", guest: "https://vdo.onecocreation.com/?room=onecocreation_studio&webcam" },
  director: "https://onecocreation.test/a/studio/room/onecocreation_studio",
  showInStudioUrls: overlayUrls,
  showTitleFallback: "One Cocreation",
  roomTitle: "Heart Field · the studio",
  roomKeyed: false,
  guestDoor: "https://onecocreation.test/meet/studio/onecocreation_studio",
  goLiveRooms: ROOM_FIXTURES,
  goLiveSessions: [],
  meeting: MEETING,
  youtube: "https://www.youtube.com/@Onecocreation",
};

const render = (overrides: Partial<StudioHubProps> = {}) =>
  renderToStaticMarkup(h(StudioHub, { ...props, ...overrides }));

describe("StudioHub — the merged Studio room (TASK-330)", () => {
  it("renders BOTH the director's desk and the go-live door, unchanged", () => {
    const html = render();
    // the desk (StudioRoom, unchanged — its own SectionHead + door cards)
    expect(html).toContain("your director&#x27;s desk");
    expect(html).toContain("Heart Field · the studio");
    // the go-live door (GoLiveRoom, unchanged — its own four doors)
    expect(html).toContain("Read live on the site");
    expect(html).toContain("YouTube live");
    expect(html).toContain("Discovery call · 1:1");
    expect(html).toContain("Co-create with a guest");
  });

  it("stacks DESK FIRST, LIVE SECOND (Astra r4 §4) — never side by side, never a tab switcher", () => {
    const html = render();
    const deskAt = html.indexOf("your director&#x27;s desk");
    const liveAt = html.indexOf("Read live on the site");
    expect(deskAt).toBeGreaterThan(-1);
    expect(liveAt).toBeGreaterThan(-1);
    expect(deskAt).toBeLessThan(liveAt);
  });

  it("the room-state line reads honestly before the client fetch resolves (SSR: 'reading…', never a guessed Live/Not live)", () => {
    const html = render();
    expect(html).toContain("Studio · reading…");
  });

  it("relay readiness rides its own separate line, straight from the page's own overlayReady — never re-derived", () => {
    expect(render({ overlayReady: true })).toContain("Relay ready");
    expect(render({ overlayReady: false })).toContain("Relay not configured");
  });

  it('"Go to live controls" jumps to the live section by plain anchor — no JS required', () => {
    const html = render();
    expect(html).toContain('href="#studio-live"');
    expect(html).toContain('id="studio-live"');
    expect(html).toContain("Go to live controls");
  });

  it("opening the room never fires a write — no fetch to /api/admin/live with method POST anywhere in this file's source", () => {
    const src = read("src/components/console/StudioHub.tsx");
    expect(src).toContain('fetch("/api/admin/live"');
    expect(src).not.toContain('method: "POST"');
  });

  it("mounts GoLiveRoom and StudioRoom unchanged — imported, not re-implemented", () => {
    const src = read("src/components/console/StudioHub.tsx");
    expect(src).toContain('import StudioRoom from "@/components/studio-overlay/StudioRoom"');
    expect(src).toContain('import GoLiveRoom, { type GoLiveMeeting } from "@/app/a/live/go-live-room"');
  });
});

describe("/a/studio/page.tsx mounts StudioHub (the desk + the go-live door, one room)", () => {
  it("renders <StudioHub .../> with the desk's own props AND the go-live door's props", () => {
    const src = read("src/app/a/studio/page.tsx");
    expect(src).toContain("<StudioHub");
    // TASK-465 (block 968,561): hidden rooms are never offered to go live in
    expect(src).toContain("goLiveRooms={ROOMS.filter((r) => !r.hidden).map((r) => ({ slug: slugOfRoom(r), title: r.title, kind: r.kind, minTier: r.minTier }))}");
    expect(src).toContain("goLiveSessions={confirmedToday(bookings)}");
    expect(src).toContain("youtube={LIVE_YOUTUBE}");
  });
});
