import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isolateCwd } from "./helpers/isolate-cwd";

/* the page reads next/headers (cookie + request origin); a no-cookie,
 *  localhost mock keeps the render honest without a request scope */
vi.mock("next/headers", () => ({ headers: async () => ({ get: () => null }) }));

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

describe("the page render — the key appears ONLY inside the iframe src", () => {
  const renderPage = async (searchParams: Record<string, string>) => {
    const { default: MeetStudioPage } = await import("@/app/meet/studio/[room]/page");
    return renderToStaticMarkup(
      await MeetStudioPage({
        params: Promise.resolve({ room: "onecocreation_studio" }),
        searchParams: Promise.resolve(searchParams),
      }),
    );
  };

  it("?join=1 mounts the room with the server-minted keyed src — both-off arrival, hangupbutton, iframetarget", async () => {
    stubRoomsJson(null, false);
    process.env.SEAT_SECRET = "task-297-test-seat-secret";
    const html = await renderPage({ join: "1", label: "Ada" });
    const srcVal = (html.match(/<iframe[^>]*src="([^"]+)"/) ?? [])[1]?.replace(/&amp;/g, "&") ?? "";
    expect(srcVal).toContain("https://vdo.onecocreation.com/?room=onecocreation_studio");
    expect(srcVal).toContain("&webcam&mute&videomute&label=Ada");
    expect(srcVal).toMatch(/&password=[0-9a-f]{12}&/);
    expect(srcVal).toContain("&hangupbutton");
    expect(srcVal).toContain("&iframetarget=");
  });

  it("the key is in the iframe src and NOWHERE else in the document (T-292 §4's pin)", async () => {
    stubRoomsJson(null, false);
    process.env.SEAT_SECRET = "task-297-test-seat-secret";
    const { studioRoomKey } = await import("@/lib/live");
    const key = studioRoomKey("onecocreation_studio")!;
    const html = await renderPage({ join: "1", label: "Ada" });
    const rawSrc = (html.match(/<iframe[^>]*src="([^"]+)"/) ?? [])[1] ?? "";
    expect(rawSrc).toContain(key); // the one legitimate place
    expect(html.replaceAll(rawSrc, "")).not.toContain(key); // and no other
  });

  it("the card's toggles ride the query into the mint — camera=1&mic=1 strips both off-params", async () => {
    stubRoomsJson(null, false);
    const html = await renderPage({ join: "1", label: "Ada", camera: "1", mic: "1" });
    const srcVal = (html.match(/<iframe[^>]*src="([^"]+)"/) ?? [])[1]?.replace(/&amp;/g, "&") ?? "";
    expect(srcVal).not.toContain("&videomute");
    expect(srcVal).not.toContain("&mute&");
  });

  it("no join: the pre-join card (a plain GET form) — both boxes UNCHECKED, the allow line, the prefill", async () => {
    stubRoomsJson({
      "onecocreation-studio": { title: "Heart Field · the studio", note: "Love's weekly reading room" },
    });
    const html = await renderPage({});
    expect(html).toContain("Heart Field · the studio");
    expect(html).toContain("Love&#x27;s weekly reading room");
    expect(html).toContain('method="GET"');
    expect(html).toContain('action="/meet/studio/onecocreation_studio"');
    expect(html).toContain('name="join" value="1"');
    expect(html).toContain('type="checkbox" name="camera"');
    expect(html).toContain('type="checkbox" name="mic"');
    expect(html).not.toContain("checked");
    expect(html).toContain("allow camera and microphone when your browser asks.");
    expect(html).toContain("Join the room");
  });
});

describe("the key appears only inside the iframe src (source pins)", () => {
  it("pre-join.tsx and VdoRoom.tsx mint nothing keyed — page.tsx's mintStudioFrameTarget is the one minter", () => {
    for (const rel of ["src/app/meet/studio/[room]/pre-join.tsx", "src/components/booking/VdoRoom.tsx"]) {
      const src = read(rel);
      expect(src).not.toContain("studioRoomKey");
      expect(src).not.toContain("studioGuestLink");
      expect(src).not.toContain("&password");
    }
    expect(read("src/app/meet/studio/[room]/page.tsx")).toContain("mintStudioFrameTarget");
  });

  it("the same-origin frame route is GONE — Chromium does not delegate camera/mic through a 302 inside an iframe (A/B-proven this lane, 0018.06.25)", () => {
    expect(() => read("src/app/meet/studio/frame/[room]/route.ts")).toThrow();
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

  /* TASK-330 (0018.06.27 a₿): the go-live door's meeting config (siteOrigin
     included) now threads out of /a/studio/page.tsx — /a/live/page.tsx is
     a bare redirect and computes no origin of its own any more. */
  it("/a/studio/page.tsx computes the request origin and threads it into the go-live door's meeting config", () => {
    const src = read("src/app/a/studio/page.tsx");
    expect(src).toContain("siteOrigin: origin");
  });

  it("/a/live/page.tsx no longer computes an origin at all — it's a bare redirect now (TASK-330)", () => {
    const src = read("src/app/a/live/page.tsx");
    expect(src).not.toContain("x-forwarded-proto");
    expect(src).not.toContain("siteOrigin");
  });

  it("/meet/[bookingId]: the guest anchor is /meet/studio/<bookingId>; the director door is the in-site desk route (TASK-306 — was \"stays a studio URL, keyed the same\" before the desk route existed)", () => {
    /* T-297 ruled this door "stays the studio director URL, keyed the
       same" — correct at the time, because /a/studio/room/<room> did not
       exist yet. T-306 flips it: the operator's director door is now the
       in-site route, and the key lives in THAT route's own iframe mint —
       never in this page's href. This pin asserts the NEW true thing. */
    const src = read("src/app/meet/[bookingId]/page.tsx");
    expect(src).toContain("meetStudioPath(bookingId)");
    expect(src).toContain("directorDeskPath(bookingId)");
    expect(src).not.toContain("studioDirectorLink(");
    expect(src).not.toContain("`${vdo}?room=${room}`");
    expect(src).not.toContain("`${vdo}?director=${room}`");
  });
});

describe("the pre-join card and the end card", () => {
  it("the card: name prefilled when given, both boxes unchecked, the allow line, the join door", async () => {
    const PreJoin = (await import("@/app/meet/studio/[room]/pre-join")).default;
    const html = renderToStaticMarkup(h(PreJoin, { room: "onecocreation_studio", initialName: "Ada" }));
    expect(html).toContain('value="Ada"');
    expect(html).toContain('type="checkbox" name="camera"');
    expect(html).toContain('type="checkbox" name="mic"');
    expect(html).not.toContain("checked");
    expect(html).toContain("allow camera and microphone when your browser asks.");
    expect(html).toContain("Join the room");
  });

  it("an unsigned visitor gets the empty field, never a fabricated name", async () => {
    const PreJoin = (await import("@/app/meet/studio/[room]/pre-join")).default;
    const html = renderToStaticMarkup(h(PreJoin, { room: "onecocreation_studio", initialName: "" }));
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
