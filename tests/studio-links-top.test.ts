import { describe, it, expect } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import StudioRoom from "@/components/studio-overlay/StudioRoom";
import { defaultStudioDoc } from "@/lib/studio/doc";
import { STUDIO_SCENES, type StudioSceneId } from "@/lib/studio/scenes";
import { studioVdoLinks } from "@/lib/live";

/**
 * TASK-300 (0018.06.25 a₿ · block 967,174) — Love call #4 findings 1-2:
 * "there's a lot of clutter here at the top… the links are all the way
 * at the bottom… I'm gonna add a button here that says open instead of
 * copy this link." The links card (T-261) moves to the TOP of /a/studio
 * with an OPEN button (new tab) beside Copy on every row, titled with
 * the room's plain name; everything else (guest panel, timers, the
 * scene/overlay URL list) collapses under one section until T-292 moves
 * it to the director view. Pins:
 *
 *  · the links card is the FIRST section on the page, ahead of "Scene";
 *  · all three doors carry a real target="_blank" rel="noopener" OPEN
 *    anchor, each the exact output of the shared builders
 *    (studioVdoLinks; the director door is directorDeskUrl's in-site
 *    route since TASK-306) — never a re-spelled link;
 *  · the "Send to user" placeholder is a real, disabled button — an
 *    honest not-yet, no fake action;
 *  · `/a/studio/page.tsx` computes the room's plain name and threads it
 *    down as `roomTitle` (the fork's brand/rooms.json, TASK-262, is a
 *    separate repo this app has no route to).
 *
 * `tests/studio-desk-doors.test.ts` (T-261, untouched by this lane) still
 * pins the three row headings/blurbs/Copy labels this redesign keeps
 * verbatim — this file only adds the NEW pins TASK-300 asks for.
 */

const read = (rel: string) => readFileSync(rel, "utf8");

const VDO = studioVdoLinks("onecocreation", "vdo.onecocreation.com");
/* TASK-306: the director door is the SITE route now (T-292 Page A) —
   what /a/studio/page.tsx mints via directorDeskUrl on the request origin. */
const DIRECTOR = "https://onecocreation.test/a/studio/room/onecocreation_studio";
const ROOM_TITLE = "Heart Field · the studio";
/* TASK-297: the guest door is the SITE url (T-292 Page B) — what
   /a/studio/page.tsx mints via meetStudioUrl on the request origin. */
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
      roomTitle: ROOM_TITLE,
      guestDoor: GUEST_DOOR,
    }),
  );

describe("the links card — moved to the top, OPEN + Copy, the room's plain name", () => {
  it("renders before the collapsed section — the first section on the page (the accordion starts closed, so 'Scene' itself isn't in the markup yet)", () => {
    const html = renderRoom();
    const cardAt = html.indexOf(ROOM_TITLE);
    const collapsedAt = html.indexOf("For the director&#x27;s desk");
    expect(cardAt).toBeGreaterThan(-1);
    expect(collapsedAt).toBeGreaterThan(-1);
    expect(cardAt).toBeLessThan(collapsedAt);
  });

  it("the collapsed section starts CLOSED — 'Scene' (and the rest) is not in the initial markup", () => {
    const html = renderRoom();
    expect(html).not.toContain(">Scene<");
    expect(html).toContain('aria-expanded="false"');
  });

  it("titles the card with the room's plain name and the derived room id", () => {
    const html = renderRoom();
    expect(html).toContain(`${ROOM_TITLE} — ${VDO.room}`);
  });

  it("falls back to a generic title when no roomTitle is given (derive-or-dash, never invent a name)", () => {
    const html = renderToStaticMarkup(
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
    expect(html).toContain(`the studio — ${VDO.room}`);
  });

  it("three OPEN anchors carry target=\"_blank\" rel=\"noopener\" and their exact door URLs", () => {
    const html = renderRoom();
    expect((html.match(/target="_blank"/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect((html.match(/rel="noopener"/g) ?? []).length).toBeGreaterThanOrEqual(3);
    /* TASK-306: the director OPEN anchor is the in-site desk route — no
       & escaping needed, the route carries no query (and no key). */
    expect(html).toContain(`href="${DIRECTOR}"`);
    expect(html).toContain(`href="${VDO.push.replace(/&/g, "&amp;")}"`);
    /* TASK-297: the guest OPEN anchor is the SITE door, never the keyed
       vdo-host guest link (T-292 DESIGN.md §2 Page B + §4). */
    expect(html).toContain(`href="${GUEST_DOOR}"`);
    expect(html).not.toContain(VDO.guest.replace(/&/g, "&amp;"));
    expect(html).toContain("Open your director&#x27;s desk");
    expect(html).toContain("Step on camera");
    expect(html).toContain("Guest door");
  });

  it("the 'Send to user' door is LIVE (TASK-304) — the chooser's opener, no disabled placeholder", () => {
    const html = renderRoom();
    expect(html).toContain("Send this guest door to a member");
    expect(html).not.toContain("coming with T-304");
    /* the stub became the chooser: a real, enabled button with the stable
       id the shots harness clicks */
    const btnMatch = html.match(/<button[^>]*id="send-to-user-open"[^>]*>\s*Send to user\s*<\/button>/);
    expect(btnMatch).not.toBeNull();
    expect(btnMatch?.[0]).not.toContain("disabled");
  });
});

describe("/a/studio/page.tsx — the room's plain name flows down as a prop", () => {
  const src = read("src/app/a/studio/page.tsx");

  it("computes roomTitle and passes it to StudioRoom", () => {
    expect(src).toContain('const roomTitle = "Heart Field · the studio"');
    expect(src).toContain("roomTitle={roomTitle}");
  });
});
