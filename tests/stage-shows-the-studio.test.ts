import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { RosterResult } from "@/components/rooms/RoomPresence";

const PAGE_SRC = readFileSync("src/app/rooms/[slug]/page.tsx", "utf8");

/**
 * TASK-245 (0018.06.23 a₿, the Admiral's ruling — "agreed with the first
 * version for the weekly reading. it's meant to be focused on her and her
 * reading. the others can be in a gallery area below."): the Heart Field's
 * Stage shows Love's own studio picture full-width when the site's meeting
 * rail is "vdo", and the people watching in a gallery below — the
 * follow-up ruling (civil 2026-09-14): "if they don't want to be on video
 * their profile picture should be displayed."
 *
 * Pins:
 *  · rail "vdo" + live renders BOTH frames — Love's own studio iframe
 *    (?view=host&room=<studioRoom>&cleanoutput&autostart, the "one
 *    publisher" view link T-243's studioVdoLinks hands the director's
 *    desk too) and, when anyone else is present, the gallery below it.
 *  · rail "jitsi" (or absent) is UNCHANGED — the exact bytes the pre-T-245
 *    slot rendered, still the on-site JitsiRoom embed.
 *  · the gallery is absent when the room is otherwise empty (only Love —
 *    the stage, never a "watcher" — is here): no roster souls, no gallery
 *    block at all, not even an empty one.
 *
 * renderToStaticMarkup never runs effects, so GalleryTile's npub lookup
 * and useNostrProfile both stay in their pre-effect state here — every
 * soul renders the house initial tile (PixelAvatar), the honest "no
 * signal yet" state, without a network mock. That's also, not
 * incidentally, this lane's real production default: nothing in this
 * codebase yet answers "is this soul on camera right now" (the studio
 * kit's live camera state is Phase 2, T-191's own docblock), so
 * `onCameraMxids` stays the seam — tested directly below by passing it.
 */

const rosterOk = (joined: Record<string, { display_name?: string }>): RosterResult => ({
  ok: true,
  count: Object.keys(joined).length,
  names: Object.values(joined).map((m) => m.display_name ?? ""),
  joined,
  presence: Object.fromEntries(Object.keys(joined).map((mxid) => [mxid, { presence: "online" }])),
});

describe("RoomVideoSlot — rail vdo", () => {
  it("renders Love's own studio frame on ?view=host&room=<studioRoom>, cleaned + autostarted", async () => {
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
    expect(html).toContain("cl-stage-embed");
    // TASK-260: &chat=0 — the fork's chat-suppress flag; the site's own
    // Matrix chat rides beside the stage
    expect(html).toContain(
      "https://vdo.onecocreation.com/?view=host&amp;room=onecocreation-studio&amp;cleanoutput&amp;autostart&amp;chat=0",
    );
    // TASK-260: "The Heart Field" is this room's own registered title —
    // the pill would only ever point back at the page already open, so it
    // no longer renders
    expect(html).not.toContain("● Join Live Session");
    // the Jitsi embed never mounts on this rail
    expect(html).not.toContain("meet.onecocreation.com");
  });

  it("renders the gallery below it — one tile per soul the room's OWN presence counts", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const roster = rosterOk({
      "@ada:onecocreation.com": { display_name: "Ada" },
      "@bee:onecocreation.com": { display_name: "Bee" },
    });
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        rail: "vdo",
        vdoHost: "vdo.onecocreation.com",
        studioRoom: "onecocreation-studio",
        roster,
      }),
    );
    expect(html).toContain("cl-stage-gallery");
    expect(html).toContain(">Ada<");
    expect(html).toContain(">Bee<");
    // no live signal yet (no onCameraMxids) — both watchers draw their
    // picture, never a bare VDO view attempt for someone who never opted in
    expect(html).not.toContain("view=ada&amp;room=onecocreation-studio");
    expect(html).not.toContain("view=bee&amp;room=onecocreation-studio");
  });

  it("a soul in onCameraMxids draws the addressable VDO view tile instead", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const roster = rosterOk({
      "@ada:onecocreation.com": { display_name: "Ada" },
      "@bee:onecocreation.com": { display_name: "Bee" },
    });
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        rail: "vdo",
        vdoHost: "vdo.onecocreation.com",
        studioRoom: "onecocreation-studio",
        roster,
        onCameraMxids: ["@ada:onecocreation.com"],
      }),
    );
    // ada is on camera — addressed by her own handle (the stream id a guest
    // publishes as `&push=<handle>`; the bare guest link is the next lane's seam)
    expect(html).toContain("cl-gallery-tile__frame");
    expect(html).toContain("https://vdo.onecocreation.com/?view=ada&amp;room=onecocreation-studio&amp;cleanoutput&amp;autostart&amp;chat=0");
    // bee stays camera-off — her tile is the picture branch, never a view iframe addressed to her
    expect(html).not.toContain("view=bee&amp;room=onecocreation-studio");
  });

  it("the director herself (stageMxids) never draws a gallery tile — she IS the frame above it", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const roster = rosterOk({
      "@love:onecocreation.com": { display_name: "Love" },
      "@bee:onecocreation.com": { display_name: "Bee" },
    });
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        rail: "vdo",
        vdoHost: "vdo.onecocreation.com",
        studioRoom: "onecocreation-studio",
        roster,
        stageMxids: ["@love:onecocreation.com"],
      }),
    );
    expect(html).toContain("cl-stage-gallery");
    expect(html).toContain(">Bee<");
    expect(html).not.toContain(">Love<");
    // and when she is the only one present, no gallery at all
    const alone = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        rail: "vdo",
        vdoHost: "vdo.onecocreation.com",
        studioRoom: "onecocreation-studio",
        roster: rosterOk({ "@love:onecocreation.com": { display_name: "Love" } }),
        stageMxids: ["@love:onecocreation.com"],
      }),
    );
    expect(alone).not.toContain("cl-stage-gallery");
  });

  it("hides the gallery entirely when the room is otherwise empty (only Love is here)", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        rail: "vdo",
        vdoHost: "vdo.onecocreation.com",
        studioRoom: "onecocreation-studio",
        roster: rosterOk({}),
      }),
    );
    expect(html).not.toContain("cl-stage-gallery");
  });

  it("without vdoHost/studioRoom (a rail:\"vdo\" config missing either half) degrades to the honest live-without-embed door, never a broken frame", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, { live: true, roomTitle: "The Heart Field", rail: "vdo" }),
    );
    expect(html).not.toContain("cl-stage-embed");
    expect(html).toContain("Love is live in The Heart Field now");
    // TASK-260: "The Heart Field" is this room's own registered title —
    // the pill would only ever point back at the page already open
    expect(html).not.toContain("● Join Live Session");
  });

  it("the sign-in and package doors still gate the vdo rail exactly as they gate Jitsi", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const signin = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        rail: "vdo",
        vdoHost: "vdo.onecocreation.com",
        studioRoom: "onecocreation-studio",
        door: "signin",
      }),
    );
    expect(signin).not.toContain("cl-stage-embed");
    expect(signin).toContain("Sign in");
  });
});

describe("the room page — onCameraMxids derives from the director's OWN guest roster, never a guessed live signal", () => {
  it("passes rail, vdoHost, studioRoom and onCameraMxids down, all from real config/store reads", () => {
    // TASK-305: the import gains studioRoomKey — the string pin updates,
    // the intent (this page reads its VDO builders from @/lib/live) holds.
    expect(PAGE_SRC).toContain(
      'import { liveRoomName, studioVdoLinks, studioGuestCameraLink, studioRoomKey } from "@/lib/live"',
    );
    expect(PAGE_SRC).toContain('import { getStudioDoc } from "@/lib/studio/roster"');
    expect(PAGE_SRC).toMatch(/studioVdoLinks\(switches\.meeting\.vdoRoomPrefix, switches\.meeting\.vdoHost\)/);
    expect(PAGE_SRC).toContain("rail={switches.meeting.rail}");
    expect(PAGE_SRC).toContain("vdoHost={switches.meeting.vdoHost}");
    expect(PAGE_SRC).toContain("studioRoom={studioVdo.room}");
    expect(PAGE_SRC).toContain("onCameraMxids={onCameraMxids}");
    expect(PAGE_SRC).toContain("stageMxids={stageMxids}");
  });

  it("the host's name puts her on the STAGE list, never the on-camera list — only named guests go on camera", () => {
    expect(PAGE_SRC).toMatch(/if \(hostName !== "" && name === hostName\) stageMxids\.push\(mxid\);/);
    expect(PAGE_SRC).toMatch(/else if \(guestNames\.has\(name\)\) onCameraMxids\.push\(mxid\);/);
  });

  it("only reads the studio doc on the vdo rail, live, with the room open — never a stray read", () => {
    expect(PAGE_SRC).toMatch(/if \(switches\.meeting\.rail === "vdo" && door === "open" && roster\?\.ok\)/);
    expect(PAGE_SRC).toContain("await getStudioDoc()");
  });
});

describe("RoomVideoSlot — rail jitsi stays byte-identical", () => {
  it("renders the on-site JitsiRoom embed exactly as before, rail absent", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const withoutRail = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        jitsiDomain: "meet.onecocreation.com",
        liveRoom: "onecocreation-heart-field",
      }),
    );
    const withRail = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        jitsiDomain: "meet.onecocreation.com",
        liveRoom: "onecocreation-heart-field",
        rail: "jitsi",
      }),
    );
    expect(withoutRail).toBe(withRail);
    expect(withRail).toContain("cl-stage-embed");
    expect(withRail).not.toContain("cl-stage-gallery");
    expect(withRail).not.toContain("vdo.onecocreation.com");
  });

  it("rail jitsi ignores a stray roster — no gallery ever rides the Jitsi branch", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const roster = rosterOk({ "@ada:onecocreation.com": { display_name: "Ada" } });
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        jitsiDomain: "meet.onecocreation.com",
        liveRoom: "onecocreation-heart-field",
        rail: "jitsi",
        roster,
      }),
    );
    expect(html).not.toContain("cl-stage-gallery");
  });
});
