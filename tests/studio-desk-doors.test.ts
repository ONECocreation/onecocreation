import { describe, it, expect } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import StudioRoom from "@/components/studio-overlay/StudioRoom";
import { defaultStudioDoc } from "@/lib/studio/doc";
import { STUDIO_SCENES, type StudioSceneId } from "@/lib/studio/scenes";
import { studioVdoLinks, studioDirectorLink } from "@/lib/live";

/**
 * TASK-261 (0018.06.24 a₿) — the /a/studio links card grows a third row:
 * the director's desk, on camera, a guest's door, each naming which door
 * it is and carrying the room's name (the brief's own words: "the room's
 * name in the row"). Pins:
 *
 *  · the card renders all three doors, each with its own one-line
 *    "what this is" and the room name;
 *  · `/a/studio/page.tsx` no longer hand-builds the `{room, push, guest}`
 *    shape inline — it calls the SAME `studioVdoLinks` every other caller
 *    uses (the grep-pin below), and derives `director` via
 *    `studioDirectorLink`.
 */

const read = (rel: string) => readFileSync(rel, "utf8");

const VDO = studioVdoLinks("onecocreation", "vdo.onecocreation.com");
const DIRECTOR = studioDirectorLink("vdo.onecocreation.com", VDO.room);

const overlayUrls = Object.fromEntries(STUDIO_SCENES.map((s) => [s.id, null])) as Record<StudioSceneId, string | null>;
const showInStudioUrls = Object.fromEntries(STUDIO_SCENES.map((s) => [s.id, null])) as Record<StudioSceneId, string | null>;

const renderRoom = () =>
  renderToStaticMarkup(
    h(StudioRoom, {
      initial: defaultStudioDoc(),
      overlayUrls,
      overlayReady: false,
      vdo: VDO,
      director: DIRECTOR,
      showInStudioUrls,
      showTitleFallback: "One Cocreation",
    }),
  );

describe("the VDO links card — three doors, each named and carrying the room", () => {
  it("renders the director's desk, on camera, and a guest's door, in that order", () => {
    const html = renderRoom();
    const deskAt = html.indexOf("your director&#x27;s desk");
    const cameraAt = html.indexOf("on camera");
    const guestAt = html.indexOf("a guest&#x27;s door");
    expect(deskAt).toBeGreaterThan(-1);
    expect(cameraAt).toBeGreaterThan(-1);
    expect(guestAt).toBeGreaterThan(-1);
    expect(deskAt).toBeLessThan(cameraAt);
    expect(cameraAt).toBeLessThan(guestAt);
  });

  it("each row carries a one-line 'what this is' and the room's name", () => {
    const html = renderRoom();
    expect(html).toContain("scene switching, mute-all, the room&#x27;s own controls");
    expect(html).toContain("step onto camera yourself");
    expect(html).toContain("camera + mic ready, muted until you unmute them");
    // the room's name rides all three lines
    expect(html.split("onecocreation_studio").length - 1).toBeGreaterThanOrEqual(4); // the caption line + the 3 door names
  });

  it("the director row's copy value is studioDirectorLink's own output", () => {
    const html = renderRoom();
    expect(html).toContain(DIRECTOR.replace(/&/g, "&amp;"));
    expect(html).toContain("Copy the director link");
  });

  it("the push/guest rows still carry the exact builder outputs", () => {
    const html = renderRoom();
    expect(html).toContain(VDO.push.replace(/&/g, "&amp;"));
    expect(html).toContain(VDO.guest.replace(/&/g, "&amp;"));
  });
});

describe("/a/studio/page.tsx — one source, not a second hand-built shape", () => {
  const src = read("src/app/a/studio/page.tsx");

  it("imports studioVdoLinks and studioDirectorLink from @/lib/live, never re-spells the link shape", () => {
    expect(src).toContain('import { studioVdoLinks, studioDirectorLink } from "@/lib/live"');
    expect(src).toContain("studioVdoLinks(config.meeting.vdoRoomPrefix, config.meeting.vdoHost)");
    expect(src).toContain("studioDirectorLink(config.meeting.vdoHost, vdo.room)");
    // the old inline hand-built shape is gone
    expect(src).not.toMatch(/push:\s*`https:\/\/\$\{config\.meeting\.vdoHost\}/);
  });

  it("passes director down to StudioRoom", () => {
    expect(src).toContain("director={director}");
  });
});
