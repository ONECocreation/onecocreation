import { describe, it, expect } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import StudioRoom from "@/components/studio-overlay/StudioRoom";
import { defaultStudioDoc } from "@/lib/studio/doc";
import { STUDIO_SCENES, type StudioSceneId } from "@/lib/studio/scenes";
import { studioVdoLinks } from "@/lib/live";

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
 *    `directorDeskUrl` (TASK-306: the SITE route — it was
 *    `studioDirectorLink`'s off-site URL before).
 */

const read = (rel: string) => readFileSync(rel, "utf8");

const VDO = studioVdoLinks("onecocreation", "vdo.onecocreation.com");
/* TASK-306: the director door is the SITE route now (T-292 Page A) —
   what page.tsx mints via directorDeskUrl on the request origin; the
   keyed studio URL no longer rides this href. */
const DIRECTOR = "https://onecocreation.test/a/studio/room/onecocreation_studio";
/* TASK-297: the guest door is the SITE url now (T-292 Page B) — what
   page.tsx mints via meetStudioUrl on the request origin. */
const GUEST_DOOR = "https://onecocreation.test/meet/studio/onecocreation_studio";

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
      guestDoor: GUEST_DOOR,
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
    // TASK-305: the guest-door blurb changed (Love's both-off ruling,
    // call #4 item 6) — the words moved, the intent (a guest's door row)
    // this test pins is unchanged.
    expect(html).toContain("camera and mic off until they choose — you can unmute from the desk");
    // the room's name rides all three lines
    expect(html.split("onecocreation_studio").length - 1).toBeGreaterThanOrEqual(4); // the caption line + the 3 door names
  });

  it("the director row's copy value is the in-site desk route (TASK-306)", () => {
    const html = renderRoom();
    expect(html).toContain(`href="${DIRECTOR}"`);
    expect(html).toContain("Copy the director link");
  });

  it("the push row carries the exact builder output; the guest row carries the SITE door (TASK-297)", () => {
    const html = renderRoom();
    expect(html).toContain(VDO.push.replace(/&/g, "&amp;"));
    /* TASK-297: the guest door is the SITE url /meet/studio/<room> — the
       keyed vdo-host guest link is no longer handed out anywhere on this
       card (T-292 DESIGN.md §2 Page B: the URL we hand out is OURS). */
    expect(html).toContain(`href="${GUEST_DOOR}"`);
    expect(html).not.toContain(VDO.guest.replace(/&/g, "&amp;"));
  });
});

describe("/a/studio/page.tsx — one source, not a second hand-built shape", () => {
  const src = read("src/app/a/studio/page.tsx");

  it("imports studioVdoLinks and studioRoomKey from @/lib/live, never re-spells the link shape", () => {
    expect(src).toContain('import { studioVdoLinks, studioRoomKey } from "@/lib/live"');
    // TASK-305: the room name is derived once (this SAME builder, never
    // re-spelled) to compute the key before the real, keyed links mint —
    // the substring below still names the one true builder call.
    expect(src).toContain("studioVdoLinks(config.meeting.vdoRoomPrefix, config.meeting.vdoHost)");
    /* TASK-306: the director door is derived by directorDeskUrl (the SITE
       route) — studioDirectorLink is no longer called on this page; the
       keyed studio URL leaves the href and the CopyGhost for good. */
    expect(src).toContain("directorDeskUrl(origin, vdo.room)");
    expect(src).not.toContain("studioDirectorLink(");
    // the old inline hand-built shape is gone
    expect(src).not.toMatch(/push:\s*`https:\/\/\$\{config\.meeting\.vdoHost\}/);
  });

  it("passes director down to StudioRoom", () => {
    expect(src).toContain("director={director}");
  });
});
