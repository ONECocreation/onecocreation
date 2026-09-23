import { describe, it, expect, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { StudioSceneId } from "@/lib/studio/scenes";

/**
 * TASK-305 (0018.06.25 a₿) — THE STUDIO ROOM GETS A KEY. T-292 DESIGN.md
 * §4.1's SECURITY finding: today's studio links (`studioGuestLink`/
 * `studioDirectorLink`/`studioVdoLinks`/`studioGuestCameraLink`) carry no
 * password, so any holder of the bare guest URL joins Love's room, and
 * the first stranger to open a director-shaped URL claims her desk (fork
 * `main.js:664-665`). VDO's fix is native: `&password=<key>` — room+
 * password is a DISTINCT room (fork `lib.js:27981-27989` folds
 * `session.password` into the signaling topic hash), so every door into
 * the room must carry the SAME key.
 *
 * Pins:
 *  · every studio builder appends `&password=<key>` when a key is given,
 *    and NOT when it's absent (source-assertion style, like
 *    tests/studio-desk-doors.test.ts);
 *  · `studioRoomKey` is deterministic, 12 lowercase-hex characters, and
 *    `null` without `SEAT_SECRET` (derive-or-dash);
 *  · the remaining call-sites thread the key through (grep pins against
 *    the real source) — MINUS /rooms: TASK-440 (block 968,222) retires
 *    that derivation entirely (the DARK ruling; its no-key pin lives
 *    below, and the behavioral proof in tests/studio-key-leak.test.ts).
 *    TASK-440 also bumps the label to `studio-room-key:v2:` (v1 retired:
 *    minted anonymously through /meet/studio until T-440);
 *  · `studioGuestLink` carries `&videomute` beside `&mute` (Love's
 *    both-off arrival ruling, call #4 item 6) regardless of a key.
 */

const read = (rel: string) => readFileSync(rel, "utf8");

describe("studioRoomKey — the one derivation (live.ts)", () => {
  const SAVED = process.env.SEAT_SECRET;
  afterAll(() => {
    if (SAVED === undefined) delete process.env.SEAT_SECRET;
    else process.env.SEAT_SECRET = SAVED;
  });

  it("null without SEAT_SECRET — derive-or-dash, never a fabricated key", async () => {
    delete process.env.SEAT_SECRET;
    const { studioRoomKey } = await import("@/lib/live");
    expect(studioRoomKey("onecocreation_studio")).toBeNull();
  });

  it("12 lowercase-hex characters, deterministic for the same room + secret", async () => {
    process.env.SEAT_SECRET = "task-305-test-secret";
    const { studioRoomKey } = await import("@/lib/live");
    const key = studioRoomKey("onecocreation_studio");
    expect(key).not.toBeNull();
    expect(key).toMatch(/^[0-9a-f]{12}$/);
    expect(studioRoomKey("onecocreation_studio")).toBe(key); // same room, same key
  });

  it("a different room name derives a different key — one key per room, not a single site-wide secret in disguise", async () => {
    process.env.SEAT_SECRET = "task-305-test-secret";
    const { studioRoomKey } = await import("@/lib/live");
    expect(studioRoomKey("onecocreation_studio")).not.toBe(studioRoomKey("someartist_studio"));
  });

  it("a blank SEAT_SECRET (whitespace only) reads as unset", async () => {
    process.env.SEAT_SECRET = "   ";
    const { studioRoomKey } = await import("@/lib/live");
    expect(studioRoomKey("onecocreation_studio")).toBeNull();
  });
});

describe("the builders — &password=<key> appended only when a key is given", () => {
  it("studioGuestLink", async () => {
    const { studioGuestLink } = await import("@/lib/live-links");
    expect(studioGuestLink("vdo.onecocreation.com", "onecocreation_studio")).not.toContain("&password=");
    expect(studioGuestLink("vdo.onecocreation.com", "onecocreation_studio", "Ada", "keyabc")).toContain(
      "&password=keyabc",
    );
  });

  it("studioGuestLink carries &videomute beside &mute — Love's both-off arrival ruling (call #4 item 6), regardless of a key", async () => {
    const { studioGuestLink } = await import("@/lib/live-links");
    expect(studioGuestLink("vdo.onecocreation.com", "onecocreation_studio")).toContain("&mute&videomute&label=");
    expect(studioGuestLink("vdo.onecocreation.com", "onecocreation_studio", "Ada", "keyabc")).toContain(
      "&mute&videomute&label=Ada&password=keyabc",
    );
  });

  it("studioDirectorLink", async () => {
    const { studioDirectorLink } = await import("@/lib/live-links");
    expect(studioDirectorLink("vdo.onecocreation.com", "onecocreation_studio")).not.toContain("&password=");
    expect(studioDirectorLink("vdo.onecocreation.com", "onecocreation_studio", "keyabc")).toBe(
      "https://vdo.onecocreation.com/?director=onecocreation_studio&label=Love&muteallguests&password=keyabc",
    );
  });

  it("studioGuestCameraLink", async () => {
    const { studioGuestCameraLink } = await import("@/lib/live-links");
    expect(studioGuestCameraLink("vdo.onecocreation.com", "onecocreation_studio", "ada")).not.toContain("&password=");
    expect(studioGuestCameraLink("vdo.onecocreation.com", "onecocreation_studio", "ada", "keyabc")).toBe(
      "https://vdo.onecocreation.com/?room=onecocreation_studio&push=ada&password=keyabc",
    );
  });

  it("studioViewLink — the Stage's view tiles (RoomVideoSlot's host frame + gallery), the raw password (never &hash — see this builder's docblock for the fork citations)", async () => {
    const { studioViewLink } = await import("@/lib/live-links");
    expect(studioViewLink("vdo.onecocreation.com", "onecocreation_studio", "host")).toBe(
      "https://vdo.onecocreation.com/?view=host&room=onecocreation_studio&cleanoutput&autostart&chat=0",
    );
    expect(studioViewLink("vdo.onecocreation.com", "onecocreation_studio", "ada", "keyabc")).toBe(
      "https://vdo.onecocreation.com/?view=ada&room=onecocreation_studio&cleanoutput&autostart&chat=0&password=keyabc",
    );
    expect(studioViewLink("vdo.onecocreation.com", "onecocreation_studio", "host")).not.toContain("&hash=");
  });

  it("studioVdoLinks threads the SAME key into both push and guest — one room, one key, every door agrees", async () => {
    const { studioVdoLinks } = await import("@/lib/live-links");
    const unkeyed = studioVdoLinks("onecocreation", "vdo.onecocreation.com");
    expect(unkeyed.push).not.toContain("&password=");
    expect(unkeyed.guest).not.toContain("&password=");
    const keyed = studioVdoLinks("onecocreation", "vdo.onecocreation.com", "keyabc");
    expect(keyed.room).toBe(unkeyed.room); // the key never changes the room's own name
    expect(keyed.push).toBe("https://vdo.onecocreation.com/?room=onecocreation_studio&push=host&password=keyabc");
    expect(keyed.guest).toContain("&password=keyabc");
  });
});

describe("the key's call-sites (grep pins against the real source — TASK-440 retires the /rooms one)", () => {
  it("src/app/a/studio/page.tsx derives roomKey, threads it into studioVdoLinks, and derives the director door as the in-site route (TASK-306)", () => {
    const src = read("src/app/a/studio/page.tsx");
    expect(src).toContain("studioRoomKey");
    expect(src).toContain("const vdo = studioVdoLinks(config.meeting.vdoRoomPrefix, config.meeting.vdoHost, roomKey);");
    /* TASK-306: the director door is the SITE route (directorDeskUrl) —
       the keyed studioDirectorLink call is GONE from this page; the desk
       route's own server mints the key into its iframe src instead
       (src/app/a/studio/room/mint.ts, pinned in
       tests/studio-director-desk.test.ts). */
    expect(src).toContain("const director = directorDeskUrl(origin, vdo.room);");
    expect(src).not.toContain("studioDirectorLink(");
  });

  /* TASK-330 (0018.06.27 a₿): /a/live/page.tsx is a bare redirect now — it
     derives no roomKey, no studioVdo, nothing keyed at all. The go-live
     door's own key/room threading happens once, in /a/studio/page.tsx
     (the pin right above this one, "src/app/a/studio/page.tsx derives
     roomKey..."), and StudioHub reuses that SAME `vdo`/`director` for the
     go-live door's studioVdo/studioDirector props — one room, one key,
     never re-derived. */
  it("src/app/a/live/page.tsx derives no key/room at all — it's a bare redirect (TASK-330); StudioHub reuses studio/page.tsx's own vdo/director", () => {
    const liveSrc = read("src/app/a/live/page.tsx");
    expect(liveSrc).not.toContain("studioRoomKey");
    expect(liveSrc).not.toContain("studioVdoLinks");
    expect(liveSrc).not.toContain("directorDeskUrl(");
    const hubSrc = read("src/components/console/StudioHub.tsx");
    expect(hubSrc).toContain("studioVdo={vdo}");
    expect(hubSrc).toContain("studioDirector={director}");
  });

  it("src/app/rooms/[slug]/page.tsx derives NO key (TASK-440's DARK ruling) — the named-camera door mints unkeyed and no client key prop rides down", () => {
    /* TASK-440 (block 968,222, the Admiral: "let's make it dark so no one
       gets the pssword.") — this pin used to assert the OPPOSITE (T-305's
       `const roomKey = studioRoomKey(studioVdo.room) ?? undefined;`,
       threaded into the camera door and ClassroomView). Every signed-in
       member received the key, and Heart Field is minTier "all" — the
       leak's second path. The page now computes and sends NOTHING keyed,
       in every rail, door and live state. */
    const src = read("src/app/rooms/[slug]/page.tsx");
    expect(src).not.toContain("studioRoomKey(");
    expect(src).not.toContain("roomKey=");
    expect(src).toMatch(/cameraDoor = studioGuestCameraLink\(switches\.meeting\.vdoHost, studioVdo\.room, mine\.slice\(1, mine\.indexOf\(":"\)\)\)/);
  });

  it("src/components/rooms/RoomVideoSlot.tsx mints both view tiles through studioViewLink, keyed", () => {
    const src = read("src/components/rooms/RoomVideoSlot.tsx");
    expect(src).toContain('import { studioViewLink } from "@/lib/live-links"');
    expect(src).toContain('src={studioViewLink(vdoHost!, studioRoom!, "host", roomKey)}');
    expect(src).toContain("src={studioViewLink(vdoHost, studioRoom, handle, roomKey)}");
  });
});

describe("the desk's honest key line (StudioRoom.tsx) — never prints the key itself", () => {
  it("keyed reads 'Room key: on', unkeyed reads the honest unset line", async () => {
    const StudioRoom = (await import("@/components/studio-overlay/StudioRoom")).default;
    const { defaultStudioDoc } = await import("@/lib/studio/doc");
    const { STUDIO_SCENES } = await import("@/lib/studio/scenes");
    const { studioVdoLinks } = await import("@/lib/live");
    const VDO = studioVdoLinks("onecocreation", "vdo.onecocreation.com", "keyabc123x");
    /* TASK-306: the director door is the UNKEYED in-site route now — the
       only door on this card still carrying the key is vdo.push (Love's
       own camera seat, never handed out). */
    const DIRECTOR = "https://onecocreation.test/a/studio/room/onecocreation_studio";
    const overlayUrls = Object.fromEntries(STUDIO_SCENES.map((s) => [s.id, null])) as Record<StudioSceneId, string | null>;
    const showInStudioUrls = { ...overlayUrls };

    const render = (roomKeyed: boolean) =>
      renderToStaticMarkup(
        h(StudioRoom, {
          initial: defaultStudioDoc(),
          overlayUrls,
          overlayReady: false,
          vdo: VDO,
          director: DIRECTOR,
          showInStudioUrls,
          showTitleFallback: "One Cocreation",
          roomKeyed,
          guestDoor: "https://onecocreation.test/meet/studio/onecocreation_studio",
        }),
      );

    // the status line's own text never repeats the raw key — it says
    // words, not the value (the push door above carries the key,
    // legitimately, in its href; this line is the ONLY thing being
    // pinned not to leak it a second time as bare text)
    const keyLine = /<p[^>]*>(Room key: on[^<]*|room unkeyed[^<]*)<\/p>/;

    const keyed = render(true);
    expect(keyed).toContain("Room key: on · rotates with the seat secret");
    const keyedLine = keyed.match(keyLine)?.[0] ?? "";
    expect(keyedLine).not.toContain("keyabc123x");

    const unkeyed = render(false);
    expect(unkeyed).toContain("room unkeyed — SEAT_SECRET unset");
    expect(unkeyed).not.toContain("Room key: on");
  });
});
