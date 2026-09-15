import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { studioGuestCameraLink } from "@/lib/live";

/**
 * TASK-249 — a named guest's own camera door. T-245 (merged 655c1b0) drew
 * a gallery tile addressed at `?view=<handle>&room=<studioRoom>` for a
 * present soul Love NAMED as today's guest, but nothing published a stream
 * under that id — T-243's `studioVdoLinks().guest` stays bare (VDO assigns
 * a random id), so the tile could never find them. Pins:
 *
 *  · `studioGuestCameraLink(host, room, handle)` — pure, the same
 *    `push=` shape T-243 uses for `host`, encoding both halves, built from
 *    whatever host it's given (never a hardcoded scheme or vdo.ninja);
 *  · `studioVdoLinks().guest` is UNTOUCHED — Love's own copyable off-site
 *    guest link on `/a/studio` and `/a/live` stays bare;
 *  · RoomVideoSlot's vdo branch renders the door ONLY when `cameraDoor` is
 *    set — grep-pin: "Step on camera" appears zero times when the prop is
 *    absent — never gold (`btn-ghost`, not `btn-gold`);
 *  · the Jitsi branch never renders it, even when a stray `cameraDoor` is
 *    passed (the byte-identical branch T-245 pinned stays byte-identical);
 *  · the room page derives `cameraDoor` only on the same gate the
 *    `onCameraMxids` derivation already sits in, comparing the viewer's
 *    own session handle against a mxid in `onCameraMxids` (handleOf-style,
 *    lowercase), and threads it down exactly the way `stageMxids` was
 *    threaded (ClassroomView → StageView → RoomVideoSlot).
 */

const PAGE_SRC = readFileSync("src/app/rooms/[slug]/page.tsx", "utf8");
const CLASSROOM_SRC = readFileSync("src/components/rooms/ClassroomView.tsx", "utf8");
const STAGE_SRC = readFileSync("src/components/rooms/StageView.tsx", "utf8");

describe("studioGuestCameraLink — pure, the push= shape T-243 uses for host", () => {
  it("encodes room and handle, built from the host it's given", () => {
    const link = studioGuestCameraLink("vdo.onecocreation.com", "onecocreation-studio", "ada");
    expect(link).toBe("https://vdo.onecocreation.com/?room=onecocreation-studio&push=ada");
  });

  it("a bare host, no scheme pasted twice — a fictional host proves it isn't pinned", () => {
    const link = studioGuestCameraLink("vdo.example-studio.test", "someartist-studio", "bee");
    expect(link).toBe("https://vdo.example-studio.test/?room=someartist-studio&push=bee");
  });

  it("never the public vdo.ninja", () => {
    const link = studioGuestCameraLink("vdo.onecocreation.com", "onecocreation-studio", "ada");
    expect(link).not.toContain("vdo.ninja");
  });

  it("encodes a handle carrying characters URL-unsafe unescaped", () => {
    const link = studioGuestCameraLink("vdo.onecocreation.com", "onecocreation-studio", "a b&c");
    expect(link).toBe("https://vdo.onecocreation.com/?room=onecocreation-studio&push=a%20b%26c");
  });
});

describe("RoomVideoSlot — the vdo branch's camera door", () => {
  it("renders the door with the muted line when cameraDoor is set", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        rail: "vdo",
        vdoHost: "vdo.onecocreation.com",
        studioRoom: "onecocreation-studio",
        cameraDoor: "https://vdo.onecocreation.com/?room=onecocreation-studio&push=ada",
      }),
    );
    expect(html).toContain("Step on camera");
    expect(html).toContain('href="https://vdo.onecocreation.com/?room=onecocreation-studio&amp;push=ada"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain("Love named you as today");
    expect(html).not.toContain("btn-gold\" href");
  });

  it("never gold — the door wears btn-ghost, not btn-gold", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        rail: "vdo",
        vdoHost: "vdo.onecocreation.com",
        studioRoom: "onecocreation-studio",
        cameraDoor: "https://vdo.onecocreation.com/?room=onecocreation-studio&push=ada",
      }),
    );
    const anchorIdx = html.indexOf("Step on camera");
    const tagStart = html.lastIndexOf("<a ", anchorIdx);
    const tag = html.slice(tagStart, anchorIdx);
    expect(tag).toContain("btn-ghost");
    expect(tag).not.toContain("btn-gold");
  });

  it("renders nothing at all — grep-pin — when cameraDoor is absent", async () => {
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
    expect(html).not.toContain("Step on camera");
  });

  it("renders nothing when cameraDoor is explicitly null", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        rail: "vdo",
        vdoHost: "vdo.onecocreation.com",
        studioRoom: "onecocreation-studio",
        cameraDoor: null,
      }),
    );
    expect(html).not.toContain("Step on camera");
  });

  it("the Jitsi branch never renders it, even with a stray cameraDoor passed", async () => {
    const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
    const withoutDoor = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        jitsiDomain: "meet.onecocreation.com",
        liveRoom: "onecocreation-heart-field",
      }),
    );
    const withStrayDoor = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        jitsiDomain: "meet.onecocreation.com",
        liveRoom: "onecocreation-heart-field",
        cameraDoor: "https://vdo.onecocreation.com/?room=onecocreation-studio&push=ada",
      }),
    );
    // T-245's byte-identical Jitsi branch stays byte-identical — a stray
    // cameraDoor changes nothing on this rail
    expect(withStrayDoor).toBe(withoutDoor);
    expect(withStrayDoor).not.toContain("Step on camera");
  });
});

describe("the room page — cameraDoor derives on the same gate as onCameraMxids, never a stray read", () => {
  it("imports studioGuestCameraLink from live.ts", () => {
    // TASK-305: the import gains studioRoomKey — the string pin updates,
    // the intent (this page reads its VDO builders from @/lib/live) holds.
    expect(PAGE_SRC).toContain(
      'import { liveRoomName, studioVdoLinks, studioGuestCameraLink, studioRoomKey } from "@/lib/live"',
    );
  });

  it("derives cameraDoor inside the vdo/open/roster-ok gate, comparing the viewer's own handle", () => {
    expect(PAGE_SRC).toMatch(/let cameraDoor: string \| null = null;/);
    expect(PAGE_SRC).toMatch(/if \(switches\.meeting\.rail === "vdo" && door === "open" && roster\?\.ok\)/);
    expect(PAGE_SRC).toMatch(/const viewerHandle = norm\(session\.handle\);/);
    expect(PAGE_SRC).toMatch(
      /const mine = onCameraMxids\.find\(\(mxid\) => norm\(mxid\.slice\(1, mxid\.indexOf\(":"\)\)\) === viewerHandle\);/,
    );
    expect(PAGE_SRC).toMatch(/cameraDoor = studioGuestCameraLink\(switches\.meeting\.vdoHost, studioVdo\.room, mine\.slice/);
  });

  it("threads cameraDoor down to ClassroomView, the same shape as stageMxids", () => {
    expect(PAGE_SRC).toContain("cameraDoor={cameraDoor}");
  });
});

describe("the prop threading — ClassroomView -> StageView -> RoomVideoSlot, the same shape T-245 used for stageMxids", () => {
  it("ClassroomView accepts and forwards cameraDoor", () => {
    expect(CLASSROOM_SRC).toMatch(/cameraDoor\?: string \| null;/);
    expect(CLASSROOM_SRC).toContain("cameraDoor }: Props");
    expect(CLASSROOM_SRC).toContain("cameraDoor={cameraDoor}");
  });

  it("StageView accepts and forwards cameraDoor", () => {
    expect(STAGE_SRC).toMatch(/cameraDoor\?: string \| null;/);
    expect(STAGE_SRC).toContain("cameraDoor={cameraDoor}");
  });
});
