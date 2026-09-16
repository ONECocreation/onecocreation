import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * TASK-297 (0018.06.25 a₿ · block ~967,218) — THE MEETING ROOM LIVES IN
 * THE SITE. `/meet/studio/<room>` wraps the studio guest door in the site
 * chrome (T-292 DESIGN.md §2 Page B): the URL the site hands out is OURS,
 * never the vdo host — the studio host appears only inside the iframe src
 * our own frame route mints, and the room key rides ONLY there (T-292 §4).
 *
 * Pins:
 *  · the pure builders: meetStudioPath / meetStudioUrl / isStudioNamespaceRoom;
 *  · resolveStudioRoom: registry (rooms.json) / namespace / booking resolve,
 *    anything else is null (the page's 404 — the /meet/[bookingId] law);
 *  · mintStudioFrameTarget: both-off arrival by default, the toggles honoured,
 *    `&hangupbutton`, `&iframetarget=<origin>`, key when SEAT_SECRET is set,
 *    none when unset (derive-or-dash);
 *  · the frame route: 302 with the keyed Location for a known room, 404 for
 *    an unknown one, no-store;
 *  · the key NEVER in the page's HTML: page.tsx / pre-join.tsx / VdoRoom.tsx
 *    mint nothing (source pins) — the frame route is the ONLY minter;
 *  · the three handed-out guest links are the SITE url (source pins on the
 *    /a/studio page, go-live-room.tsx, and the /meet/[bookingId] vdo branch);
 *  · the end card: Love's line verbatim, wired to the fork's `hungup` event.
 */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const iso = isolateCwd("task-297-meet-studio-");
afterAll(() => iso.cleanup());

const SAVED_SECRET = process.env.SEAT_SECRET;
afterAll(() => {
  if (SAVED_SECRET === undefined) delete process.env.SEAT_SECRET;
  else process.env.SEAT_SECRET = SAVED_SECRET;
});

type RoomAccess = typeof import("@/app/meet/studio/room-access");
type LiveLinks = typeof import("@/lib/live-links");
let ra: RoomAccess;
let links: LiveLinks;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  process.env.SEAT_SECRET = "task-297-test-seat-secret";

  /* a confirmed vdo-rail booking, file-driver seeded (no vault here):
     the booking id IS the room id — the /meet/[bookingId] branch's own
     derivation. The id is 24 lowercase hex — booking-orders.ts's safeId
     (:281) refuses anything else. */
  await fs.mkdir(path.join(process.cwd(), "data", "booking-recs"), { recursive: true });
  await fs.writeFile(
    path.join(process.cwd(), "data", "booking-recs", "a297b0000000000000000001.json"),
    JSON.stringify({
      id: "a297b0000000000000000001",
      state: "confirmed",
      serviceId: "discovery",
      serviceTitle: "Discovery call with Love",
      customer: { name: "Ada" },
    }),
  );
  await fs.writeFile(
    path.join(process.cwd(), "data", "booking-config.json"),
    JSON.stringify({ services: [{ id: "discovery", meetingRail: { kind: "vdo" } }] }),
  );

  ra = await import("@/app/meet/studio/room-access");
  links = await import("@/lib/live-links");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const stubRoomsJson = (body: unknown, ok = true) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok,
      json: async () => body,
    })),
  );

describe("the pure builders (live-links.ts)", () => {
  it("meetStudioPath / meetStudioUrl — the ONE join point for the in-site room URL", () => {
    expect(links.meetStudioPath("onecocreation_studio")).toBe("/meet/studio/onecocreation_studio");
    expect(links.meetStudioUrl("https://onecocreation.test", "onecocreation_studio")).toBe(
      "https://onecocreation.test/meet/studio/onecocreation_studio",
    );
    expect(links.meetStudioPath("odd room")).toBe("/meet/studio/odd%20room");
  });

  it("isStudioNamespaceRoom — the co-create door's legitimacy check", () => {
    expect(links.isStudioNamespaceRoom("onecocreation_studio", "onecocreation")).toBe(true);
    expect(links.isStudioNamespaceRoom("onecocreation_reading_with_ada", "onecocreation")).toBe(true);
    expect(links.isStudioNamespaceRoom("onecocreation-reading-with-ada", "onecocreation")).toBe(false); // hyphen — never ours
    expect(links.isStudioNamespaceRoom("somebody_else", "onecocreation")).toBe(false);
    expect(links.isStudioNamespaceRoom("onecocreation_", "onecocreation")).toBe(false); // nothing after the join
    expect(links.isStudioNamespaceRoom("onecocreation_studio", "")).toBe(false);
  });

  it("guestMeetingLink's vdo room is byte-identical to the room VDO's sanitizer always made of the old spelling", () => {
    const sanitize = (id: string) => id.replace(/[\W]+/g, "_"); // the fork's own rule (lib.js:3747-3758)
    const url = links.guestMeetingLink("vdo", "reading with ada", {
      jitsiDomain: "meet.onecocreation.com",
      jitsiPrefix: "onecocreation-",
      vdoRoomPrefix: "onecocreation",
      vdoHost: "vdo.onecocreation.com",
      siteOrigin: "https://onecocreation.test",
    });
    expect(url).toBe("https://onecocreation.test/meet/studio/onecocreation_reading_with_ada");
    const room = url!.split("/meet/studio/")[1];
    expect(room).toBe(sanitize("onecocreation-reading-with-ada")); // the old hand-spelled shape, sanitized
  });
});

describe("resolveStudioRoom — the ONE access read", () => {
  it("a rooms.json registry entry resolves WITH its title and note (sanitize-matched both sides)", async () => {
    stubRoomsJson({
      _comment: "the file's own comment key (TASK-262) — skipped",
      "onecocreation-studio": { title: "Heart Field · the studio", note: "Love's weekly reading room" },
    });
    const access = await ra.resolveStudioRoom("onecocreation_studio"); // underscore form finds the hyphen-typed key
    expect(access).toEqual({
      kind: "registry",
      title: "Heart Field · the studio",
      note: "Love's weekly reading room",
    });
  });

  it("a namespace room resolves with NO invented title when the registry is silent (derive-or-dash)", async () => {
    stubRoomsJson(null, false); // the fork unreachable — the room still opens, plainly
    const access = await ra.resolveStudioRoom("onecocreation_reading_with_ada");
    expect(access).toEqual({ kind: "namespace", title: null, note: null });
  });

  it("the standing studio room resolves through the namespace even with no registry at all", async () => {
    stubRoomsJson(null, false);
    const access = await ra.resolveStudioRoom("onecocreation_studio");
    expect(access).toEqual({ kind: "namespace", title: null, note: null });
  });

  it("a confirmed vdo-rail booking resolves with its service title as the honest name", async () => {
    stubRoomsJson(null, false);
    const access = await ra.resolveStudioRoom("a297b0000000000000000001");
    expect(access).toEqual({ kind: "booking", title: "Discovery call with Love", note: null });
  });

  it("an unknown room is null — the page's 404 (the /meet/[bookingId] law)", async () => {
    stubRoomsJson(null, false);
    expect(await ra.resolveStudioRoom("somebody_else")).toBeNull();
    expect(await ra.resolveStudioRoom("onecocreation-reading-with-ada")).toBeNull(); // hyphenated = not ours
    expect(await ra.resolveStudioRoom("")).toBeNull();
  });
});

describe("mintStudioFrameTarget — the ONLY keyed mint on the route tree", () => {
  const base = { vdoHost: "vdo.onecocreation.com", room: "onecocreation_studio", origin: "https://onecocreation.test" };

  it("both-off arrival by default (&mute&videomute), the key when SEAT_SECRET is set, hangup + iframetarget", () => {
    process.env.SEAT_SECRET = "task-297-test-seat-secret";
    const url = ra.mintStudioFrameTarget({ ...base, label: "Ada", camera: false, mic: false });
    expect(url).toContain("?room=onecocreation_studio&webcam&mute&videomute&label=Ada");
    expect(url).toMatch(/&password=[0-9a-f]{12}&/);
    expect(url).toContain("&hangupbutton");
    expect(url).toContain(`&iframetarget=${encodeURIComponent("https://onecocreation.test")}`);
  });

  it("the pre-join toggles are honoured — camera on strips &videomute, mic on strips &mute", () => {
    const camOn = ra.mintStudioFrameTarget({ ...base, label: "Ada", camera: true, mic: false });
    expect(camOn).not.toContain("&videomute");
    expect(camOn).toContain("&mute");
    const micOn = ra.mintStudioFrameTarget({ ...base, label: "Ada", camera: false, mic: true });
    expect(micOn).toContain("&videomute");
    expect(micOn).not.toContain("&mute&");
    const bothOn = ra.mintStudioFrameTarget({ ...base, label: "Ada", camera: true, mic: true });
    expect(bothOn).not.toContain("&videomute");
    expect(bothOn).not.toContain("&mute&");
  });

  it("no SEAT_SECRET → no key, never a fabricated one (derive-or-dash)", () => {
    delete process.env.SEAT_SECRET;
    const url = ra.mintStudioFrameTarget({ ...base, label: "Ada", camera: false, mic: false });
    expect(url).not.toContain("&password=");
    process.env.SEAT_SECRET = "task-297-test-seat-secret";
  });

  it("the label is URL-encoded — a name can never grow a fake param", () => {
    const url = ra.mintStudioFrameTarget({ ...base, label: "Ada & the Gang", camera: false, mic: false });
    expect(url).toContain("label=Ada%20%26%20the%20Gang");
    expect(url.match(/&mute/g)?.length).toBe(1);
  });
});

describe("the frame route — 302 with the keyed Location for a known room, 404 for an unknown one", () => {
  const call = (room: string, query = "") =>
    import("@/app/meet/studio/frame/[room]/route").then(({ GET }) =>
      GET(new Request(`http://localhost:3000/meet/studio/frame/${room}${query}`), {
        params: Promise.resolve({ room }),
      }),
    );

  it("a known room: 302, Location carries key + hangupbutton + iframetarget, no-store", async () => {
    stubRoomsJson(null, false);
    process.env.SEAT_SECRET = "task-297-test-seat-secret";
    const res = await call("onecocreation_studio", "?label=Ada&camera=1&mic=0");
    expect(res.status).toBe(302);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    const loc = res.headers.get("Location") ?? "";
    expect(loc).toContain("https://vdo.onecocreation.com/?room=onecocreation_studio");
    expect(loc).toContain("label=Ada");
    expect(loc).not.toContain("&videomute"); // camera flipped on at the card
    expect(loc).toContain("&mute&"); // mic stays off
    expect(loc).toMatch(/&password=[0-9a-f]{12}&/);
    expect(loc).toContain("&hangupbutton");
    expect(loc).toContain(`&iframetarget=${encodeURIComponent("http://localhost:3000")}`);
  });

  it("an unknown room: 404, and NOTHING is minted", async () => {
    stubRoomsJson(null, false);
    const res = await call("somebody_else");
    expect(res.status).toBe(404);
    expect(res.headers.get("Location")).toBeNull();
  });
});

describe("the key NEVER in the page's HTML outside the frame src (source pins)", () => {
  it("page.tsx / pre-join.tsx / VdoRoom.tsx mint nothing keyed — the frame route is the only minter", () => {
    for (const rel of [
      "src/app/meet/studio/[room]/page.tsx",
      "src/app/meet/studio/[room]/pre-join.tsx",
      "src/components/booking/VdoRoom.tsx",
    ]) {
      const src = read(rel);
      expect(src).not.toContain("studioRoomKey");
      expect(src).not.toContain("studioGuestLink");
      expect(src).not.toContain("&password");
    }
    const route = read("src/app/meet/studio/frame/[room]/route.ts");
    expect(route).toContain("mintStudioFrameTarget");
    const access = read("src/app/meet/studio/room-access.ts");
    expect(access).toContain("studioRoomKey");
  });

  it("VdoRoom carries the right allow=, the hungup listener — and no &api=, no eval (T-292 §4.6)", () => {
    const src = read("src/components/booking/VdoRoom.tsx");
    expect(src).toContain('allow="camera; microphone; autoplay; fullscreen"');
    expect(src).toContain('"hungup"');
    expect(src).toContain("e.source !== frame.current.contentWindow");
    expect(src).not.toContain("&api=");
    expect(src).not.toContain("eval(");
  });
});

describe("every handed-out guest link is the SITE url (source pins on the three call-sites)", () => {
  it("/a/studio/page.tsx mints the guest door via meetStudioUrl on the request origin", () => {
    const src = read("src/app/a/studio/page.tsx");
    expect(src).toContain("meetStudioUrl(origin, vdo.room)");
    expect(src).toContain("guestDoor={guestDoor}");
  });

  it("go-live-room.tsx: the YouTube card's guest link is the SITE url; the push link stays hers", () => {
    const src = read("src/app/a/live/go-live-room.tsx");
    expect(src).toContain("meetStudioUrl(meeting.siteOrigin, studioVdo.room)");
    expect(src).not.toContain("value={studioVdo.guest}");
    expect(src).toContain("value={studioVdo.push}");
  });

  it("/a/live/page.tsx computes the request origin and threads it into the meeting config", () => {
    const src = read("src/app/a/live/page.tsx");
    expect(src).toContain("siteOrigin: origin");
  });

  it("/meet/[bookingId]: the guest anchor is /meet/studio/<bookingId>; the director link stays a studio URL, keyed the same", () => {
    const src = read("src/app/meet/[bookingId]/page.tsx");
    expect(src).toContain("meetStudioPath(bookingId)");
    expect(src).toContain("studioDirectorLink(vdoHost, bookingId, studioRoomKey(bookingId) ?? undefined)");
    expect(src).not.toContain("`${vdo}?room=${room}`");
    expect(src).not.toContain("`${vdo}?director=${room}`");
  });
});

describe("the pre-join card and the end card", () => {
  it("the card: name prefilled when given, both toggles OFF by default, the allow line, the join door", async () => {
    const PreJoin = (await import("@/app/meet/studio/[room]/pre-join")).default;
    const html = renderToStaticMarkup(
      h(PreJoin, { room: "onecocreation_studio", vdoHost: "vdo.onecocreation.com", roomTitle: "Heart Field · the studio", initialName: "Ada" }),
    );
    expect(html).toContain('value="Ada"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain('aria-pressed="true"');
    expect(html).toContain("camera off");
    expect(html).toContain("mic off");
    expect(html).toContain("allow camera and microphone when your browser asks.");
    expect(html).toContain("Join the room");
  });

  it("an unsigned visitor gets the empty field, never a fabricated name", async () => {
    const PreJoin = (await import("@/app/meet/studio/[room]/pre-join")).default;
    const html = renderToStaticMarkup(
      h(PreJoin, { room: "onecocreation_studio", vdoHost: "vdo.onecocreation.com", roomTitle: "Heart Field · the studio", initialName: "" }),
    );
    expect(html).toContain('value=""');
    expect(html).toContain('placeholder="Guest"');
  });

  it("the end card: Love's line verbatim, the doors back home (wired to the fork's hungup event)", async () => {
    const { VdoRoomEndCard } = await import("@/components/booking/VdoRoom");
    const html = renderToStaticMarkup(h(VdoRoomEndCard));
    expect(html).toContain("The field holds what you brought 🕊️");
    expect(html).toContain("Thank you for meeting");
    expect(html).toContain('href="/me"');
    expect(html).toContain('href="/classes"');
  });
});
