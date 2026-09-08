import { describe, it, expect } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { confirmedToday, studioVdoLinks, liveRoomPrefix, liveRoomName } from "@/lib/live";
import { doorRoomGroups, type DoorRoom } from "@/components/console/LiveDoorCard";
import GoLiveRoom, {
  nextOpenDoor,
  guestSlug,
  guestMeetingLink,
  type GoLiveMeeting,
} from "@/app/a/live/go-live-room";
import { stripModel } from "@/components/LiveStrip";

/**
 * TASK-192 (0018.06.18 a₿ · H69 ruled A) — LOVE'S GO-LIVE DOOR. Pins:
 *
 *  · the four cards derive from their sources — the room chips from ROOMS
 *    (the Commons first), the studio VDO links from the meeting config's
 *    prefix (T-191's derivation), the Discovery card from today's
 *    CONFIRMED bookings only, the co-create link from the meeting config;
 *  · one door open at a time (nextOpenDoor), and the words say so;
 *  · the member-header strip's presence/absence and its href (the room's
 *    Stage), from the SAME /api/live flag — never a second store;
 *  · the studio's state is WORDS, never invented ("comes with the kit");
 *  · the fold-in: LiveDoorCard keeps only the model, /a points at /a/live,
 *    and the old banner's mount is retired (one strip, never two);
 *  · the room gates like every /a room.
 */

const read = (rel: string) => readFileSync(rel, "utf8");

const ROOM_FIXTURES: DoorRoom[] = [
  { slug: "heart-field", title: "The Heart Field — Commons", kind: "community" },
  { slug: "clair-senses", title: "Clair Senses — Foundations", kind: "class" },
  { slug: "tune-up", title: "Daily Tune-Up & Check-ins", kind: "community" },
  { slug: "weekly-reading", title: "Chronicles: Weekly Reading", kind: "class" },
];

const MEETING: GoLiveMeeting = {
  rail: "jitsi",
  jitsiDomain: "meet.onecocreation.com",
  jitsiPrefix: "onecocreation-",
  vdoRoomPrefix: "onecocreation",
};

const renderRoom = (props: Partial<Parameters<typeof GoLiveRoom>[0]> = {}) =>
  renderToStaticMarkup(
    h(GoLiveRoom, {
      rooms: ROOM_FIXTURES,
      studioVdo: studioVdoLinks("onecocreation"),
      sessions: [],
      meeting: MEETING,
      youtube: "https://www.youtube.com/@Onecocreation",
      ...props,
    }),
  );

describe("the folded-in door model — the Commons first", () => {
  it("groups free → classes → community, unknown slugs never crash it", () => {
    const groups = doorRoomGroups([...ROOM_FIXTURES, { slug: "not-a-room", title: "Ghost", kind: "class" }]);
    expect(groups.map((g) => g.label)).toEqual([
      "The Commons — free for every member",
      "Classes",
      "Community rooms",
    ]);
    expect(groups[0].rooms.map((r) => r.slug)).toEqual(["heart-field"]);
    /* an unknown slug isn't free (minTier dashes to null) — it lists with
       its own kind, never crashes the grouping */
    expect(groups[1].rooms.map((r) => r.slug)).toEqual(["clair-senses", "weekly-reading", "not-a-room"]);
    expect(groups[2].rooms.map((r) => r.slug)).toEqual(["tune-up"]);
  });

  it("LiveDoorCard folds in: the model stays, the desk UI is gone from the file", () => {
    const src = read("src/components/console/LiveDoorCard.tsx");
    expect(src).toContain("export function doorRoomGroups");
    expect(src).not.toContain("export default function");
    expect(src).not.toContain("fetch(");
  });
});

describe("the Discovery card — today's confirmed bookings from the booking store", () => {
  const bookings = [
    { id: "b1", serviceTitle: "Discovery Call", startUtc: "2026-09-08T18:00:00.000Z", endUtc: "2026-09-08T18:30:00.000Z", state: "confirmed", customer: { name: "Ada" } },
    { id: "b2", serviceTitle: "Soul Conversation", startUtc: "2026-09-08T14:00:00.000Z", endUtc: "2026-09-08T15:00:00.000Z", state: "confirmed", customer: { email: "soul@example.com" } },
    { id: "b3", serviceTitle: "Discovery Call", startUtc: "2026-09-08T20:00:00.000Z", endUtc: "2026-09-08T20:30:00.000Z", state: "held", customer: { name: "Held" } },
    { id: "b4", serviceTitle: "Discovery Call", startUtc: "2026-09-09T18:00:00.000Z", endUtc: "2026-09-09T18:30:00.000Z", state: "confirmed", customer: { name: "Tomorrow" } },
    { id: "b5", serviceTitle: "Discovery Call", startUtc: "2026-09-08T21:00:00.000Z", endUtc: "2026-09-08T21:30:00.000Z", state: "canceled", customer: { name: "Gone" } },
  ];
  const nowMs = Date.parse("2026-09-08T12:00:00.000Z");

  it("confirmed only, today (UTC) only, earliest first — held/canceled/tomorrow never list", () => {
    const out = confirmedToday(bookings, nowMs);
    expect(out.map((s) => s.bookingId)).toEqual(["b2", "b1"]);
    expect(out[1]).toMatchObject({ title: "Discovery Call", customer: "Ada" });
    expect(out[0].customer).toBe("soul@example.com"); // nameless wears the email, never an invention
  });

  it("derive-or-dash: an empty store is an empty day", () => {
    expect(confirmedToday([], nowMs)).toEqual([]);
  });

  it("the card lists each session with one button → /meet/<id>, Love hosting", () => {
    const sessions = confirmedToday(bookings, nowMs);
    const html = renderRoom({ sessions, initialOpen: "call" });
    expect(html).toContain("14:00 UTC");
    expect(html).toContain("18:00 UTC");
    expect(html).toContain('href="/meet/b2"');
    expect(html).toContain('href="/meet/b1"');
    expect(html).not.toContain("Held");
    expect(html).not.toContain("Tomorrow");
  });

  it("an empty day says so in words; the closed card wears the honest count", () => {
    const open = renderRoom({ sessions: [], initialOpen: "call" });
    expect(open).toContain("— no confirmed calls today (UTC)");
    const closed = renderRoom({ sessions: confirmedToday(bookings, nowMs) });
    expect(closed).toContain("2 today");
  });
});

describe("the YouTube card — T-191's studio links, the studio's honest state", () => {
  it("studioVdoLinks is exactly the director's desk derivation", () => {
    const vdo = studioVdoLinks("onecocreation");
    expect(vdo.room).toBe("onecocreation-studio");
    expect(vdo.push).toBe("https://vdo.ninja/?room=onecocreation-studio&push=host");
    expect(vdo.guest).toBe("https://vdo.ninja/?room=onecocreation-studio");
  });

  it("the card carries the links and says the state comes with the kit — never invented", () => {
    const html = renderRoom({ initialOpen: "youtube" });
    expect(html).toContain("the studio&#x27;s state comes with the kit");
    expect(html).toContain("onecocreation-studio");
    expect(html).toContain("Copy the push link");
    expect(html).toContain("Copy the guest link");
    expect(html).toContain('href="/a/studio"');
  });
});

describe("the co-create card — the guest link derived from the meeting config", () => {
  it("guestSlug slugs honestly; a blank name is no link at all", () => {
    expect(guestSlug("  Reading with Ada!! ")).toBe("reading-with-ada");
    expect(guestSlug("   ")).toBe("");
    expect(guestMeetingLink("jitsi", "   ", MEETING)).toBeNull();
  });

  it("the Jitsi rail namespaces by the site's own space — the ONE liveRoomPrefix derivation", () => {
    expect(liveRoomName("x")).toBe(`${liveRoomPrefix()}x`);
    expect(guestMeetingLink("jitsi", "reading with ada", MEETING)).toBe(
      "https://meet.onecocreation.com/onecocreation-reading-with-ada",
    );
  });

  it("the VDO rail rooms by the config's prefix, T-191's shape", () => {
    expect(guestMeetingLink("vdo", "reading with ada", MEETING)).toBe(
      "https://vdo.ninja/?room=onecocreation-reading-with-ada",
    );
  });

  it("the card opens on the name field with both rail chips, dash before a name", () => {
    const html = renderRoom({ initialOpen: "cocreate" });
    expect(html).toContain("room name");
    expect(html).toContain("Jitsi");
    expect(html).toContain("VDO");
    expect(html).toContain("— type a room name and the guest link derives here");
  });
});

describe("one door open at a time", () => {
  it("opening one closes the others; tapping the open door closes it", () => {
    expect(nextOpenDoor(null, "read")).toBe("read");
    expect(nextOpenDoor("read", "youtube")).toBe("youtube");
    expect(nextOpenDoor("read", "read")).toBeNull();
  });

  it("the page says so in words, and the four doors are the ruling's four", () => {
    const html = renderRoom();
    expect(html).toContain("opening one closes the others");
    expect(html).toContain("Read live on the site");
    expect(html).toContain("YouTube live");
    expect(html).toContain("Discovery call · 1:1");
    expect(html).toContain("Co-create with a guest");
  });
});

describe("the member-header strip — the same flag, presence and absence", () => {
  it("a live flag with a room gives the one line and the Stage href", () => {
    expect(stripModel({ live: true, room: "heart-field", roomTitle: "The Heart Field — Commons" })).toEqual({
      href: "/rooms/heart-field",
      label: "Love is live · The Heart Field — Commons · Join",
    });
  });

  it("a nameless room wears its slug; a dark or room-less flag gives NOTHING", () => {
    expect(stripModel({ live: true, room: "tune-up", roomTitle: null })?.label).toBe("Love is live · tune-up · Join");
    expect(stripModel({ live: false, room: null, roomTitle: null })).toBeNull();
    expect(stripModel({ live: true, room: null, roomTitle: null })).toBeNull();
    expect(stripModel(null)).toBeNull();
  });

  it("the strip reads /api/live — the same flag, never a second store", () => {
    const src = read("src/components/LiveStrip.tsx");
    expect(src).toContain('fetch("/api/live")');
    expect(src).not.toContain("/api/admin/live");
    expect(src).not.toContain("getLiveState");
  });

  it("the mount is one line in the T-185 B header, and the old banner's mount is retired", () => {
    const header = read("src/components/SiteHeader.tsx");
    expect(header).toContain("<LiveStrip />");
    const layout = read("src/app/layout.tsx");
    expect(layout).not.toContain("<LiveBanner />");
  });
});

describe("the room itself — the gate and the desk pointer", () => {
  it("/a/live gates like every /a room", () => {
    const src = read("src/app/a/live/page.tsx");
    expect(src).toContain("operatorFromCookieHeader");
    expect(src).toContain('from "@/lib/operator-auth"');
    expect(src).toContain("if (!operator)");
    expect(src).toContain("<OperatorGate configured={operatorsConfigured()} />");
  });

  it("the console front page points at the Go-Live room instead of mounting the old card", () => {
    const src = read("src/app/a/page.tsx");
    expect(src).toContain('href="/a/live"');
    expect(src).not.toContain("LiveDoorCard");
  });
});
