import { describe, it, expect } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { confirmedToday, studioVdoLinks, studioDirectorLink, studioGuestLink, liveRoomPrefix, liveRoomName } from "@/lib/live";
import * as liveLinks from "@/lib/live-links";
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
  { slug: "heart-field", title: "The Heart Field", kind: "community" },
  { slug: "clair-senses", title: "Clair Senses — Foundations", kind: "class" },
  { slug: "tune-up", title: "Daily Tune-Up & Check-ins", kind: "community" },
  { slug: "weekly-reading", title: "Chronicles: Weekly Reading", kind: "class" },
];

const MEETING: GoLiveMeeting = {
  rail: "jitsi",
  jitsiDomain: "meet.onecocreation.com",
  jitsiPrefix: "onecocreation-",
  vdoRoomPrefix: "onecocreation",
  vdoHost: "vdo.onecocreation.com",
  siteOrigin: "https://onecocreation.test",
};

const renderRoom = (props: Partial<Parameters<typeof GoLiveRoom>[0]> = {}) =>
  renderToStaticMarkup(
    h(GoLiveRoom, {
      rooms: ROOM_FIXTURES,
      studioVdo: studioVdoLinks("onecocreation", "vdo.onecocreation.com"),
      /* TASK-306: the desk door is the SITE route now (T-292 Page A);
         studioDirectorLink stays pinned below at the builder level — the
         builder is not retired, only its call-sites' handling changed. */
      studioDirector: "https://onecocreation.test/a/studio/room/onecocreation-studio",
      /* TASK-440: the standing studio's guest door arrives SIGNED from the
         server (the card can never sign client-side) — a fixture token
         stands in for /a/studio's own derivation. */
      studioGuestDoor: "https://onecocreation.test/meet/studio/onecocreation_studio?invite=123.abcdef",
      sessions: [],
      meeting: MEETING,
      youtube: "https://www.youtube.com/@Onecocreation",
      ...props,
    }),
  );

describe("the folded-in door model — the Heart Field first", () => {
  it("groups free → classes → community, unknown slugs never crash it", () => {
    const groups = doorRoomGroups([...ROOM_FIXTURES, { slug: "not-a-room", title: "Ghost", kind: "class" }]);
    expect(groups.map((g) => g.label)).toEqual([
      "The Heart Field — free for every member",
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
  it("studioVdoLinks is exactly the studio's derivation — guest is TASK-261's one-click door", () => {
    const vdo = studioVdoLinks("onecocreation", "vdo.onecocreation.com");
    expect(vdo.room).toBe("onecocreation_studio"); // TASK-264: underscore-native, no VDO rewrite
    expect(vdo.push).toBe("https://vdo.onecocreation.com/?room=onecocreation_studio&push=host");
    // TASK-305: &videomute rides beside &mute (Love's both-off ruling)
    expect(vdo.guest).toBe(
      "https://vdo.onecocreation.com/?room=onecocreation_studio&webcam&mute&videomute&label=Guest",
    );
  });

  it("the card carries the links and says the state comes with the kit — never invented", () => {
    const html = renderRoom({ initialOpen: "youtube" });
    expect(html).toContain("the studio&#x27;s state comes with the kit");
    expect(html).toContain("onecocreation_studio");
    expect(html).toContain("Copy the push link");
    expect(html).toContain("Copy the guest link");
    expect(html).toContain('href="/a/studio"');
  });
});

describe("TASK-261 — the director's desk and the guest's one-click door", () => {
  it("studioDirectorLink: ?director=<room>&label=Love&muteallguests — verified against the fork's own main.js (director :664, label :3533, muteallguests :2342) and its room-setup generator (studio/app.js buildDirectorUrl)", () => {
    expect(studioDirectorLink("vdo.onecocreation.com", "onecocreation-studio")).toBe(
      "https://vdo.onecocreation.com/?director=onecocreation-studio&label=Love&muteallguests",
    );
  });

  it("studioDirectorLink never carries &cleanoutput — it fights &muteallguests (main.js:6080 re-hides #controlButtons, the parent of #muteAllGuests)", () => {
    expect(studioDirectorLink("vdo.onecocreation.com", "onecocreation-studio")).not.toContain("cleanoutput");
  });

  it("studioGuestLink: ?room=<r>&webcam&mute&videomute&label=<handle> — verified against main.js (webcam :2037, mute :2229, videomute :2237, label :3533) and the fork's own buildInviteUrl", () => {
    expect(studioGuestLink("vdo.onecocreation.com", "onecocreation-studio")).toBe(
      "https://vdo.onecocreation.com/?room=onecocreation-studio&webcam&mute&videomute&label=Guest",
    );
    expect(studioGuestLink("vdo.onecocreation.com", "onecocreation-studio", "Ada")).toBe(
      "https://vdo.onecocreation.com/?room=onecocreation-studio&webcam&mute&videomute&label=Ada",
    );
  });

  it("studioGuestLink/studioDirectorLink append &password=<key> only when a key is given (TASK-305)", () => {
    expect(studioGuestLink("vdo.onecocreation.com", "onecocreation-studio", "Ada", "abc123")).toBe(
      "https://vdo.onecocreation.com/?room=onecocreation-studio&webcam&mute&videomute&label=Ada&password=abc123",
    );
    expect(studioDirectorLink("vdo.onecocreation.com", "onecocreation-studio", "abc123")).toBe(
      "https://vdo.onecocreation.com/?director=onecocreation-studio&label=Love&muteallguests&password=abc123",
    );
  });

  it("studioVdoLinks.guest calls studioGuestLink — one source, never a second hand-spelled shape", () => {
    const vdo = studioVdoLinks("onecocreation", "vdo.onecocreation.com");
    expect(vdo.guest).toBe(studioGuestLink("vdo.onecocreation.com", "onecocreation_studio"));
  });

  it("live.ts re-exports are the SAME functions live-links.ts defines — one source, not a copy", () => {
    expect(studioDirectorLink).toBe(liveLinks.studioDirectorLink);
    expect(studioGuestLink).toBe(liveLinks.studioGuestLink);
    expect(studioVdoLinks).toBe(liveLinks.studioVdoLinks);
    expect(guestMeetingLink).toBe(liveLinks.guestMeetingLink);
  });

  it("the Next row: Open your director's desk (primary, studioDirector) + Step on camera (secondary, studioVdo.push)", () => {
    const src = read("src/app/a/live/go-live-room.tsx");
    expect(src).toContain("href={studioDirector}");
    expect(src).toContain("Open your director&apos;s desk");
    expect(src).toContain("href={studioVdo.push}");
    expect(src).toContain("Step on camera");
    expect(src).toContain("btn-sm btn-ghost");
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

  it("the VDO rail's handed-out link is the SITE url /meet/studio/<room>, underscore-native (TASK-297)", () => {
    /* T-292 DESIGN.md §2 Page B: the URL the site hands out is OURS, never
       the vdo host. The room id folds the slug's hyphens to underscores —
       byte-identical to the room VDO's sanitizeRoomName always made of the
       old `onecocreation-reading-with-ada` spelling (lib.js:3747-3758), so
       nobody's room changes; the native warning modal just never fires. */
    expect(guestMeetingLink("vdo", "reading with ada", MEETING)).toBe(
      "https://onecocreation.test/meet/studio/onecocreation_reading_with_ada",
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

  it("TASK-339: the strip reads bigger — roomier padding, larger type, a bigger dot, a pill-shaped Join", () => {
    const src = read("src/components/LiveStrip.tsx");
    expect(src).toContain('padding: "12px 20px"');
    expect(src).toContain('fontSize: "1rem"');
    expect(src).toContain('fontSize: "1.4em"');
    expect(src).toContain('borderRadius: "999px"');
    // the two live-signal colors ride the same tokens, unchanged by the size pass
    expect(src).toContain('color: "var(--info)"');
    expect(src).toContain('color: "var(--err)"');
  });
});

describe("the room itself — the desk pointer", () => {
  it("the console front page points at the Go-Live room instead of mounting the old card", () => {
    const src = read("src/app/a/page.tsx");
    expect(src).toContain('href="/a/live"');
    expect(src).not.toContain("LiveDoorCard");
  });
});

/* TASK-330 (0018.06.27 a₿ — RULED Studio 0018.06.26 · 11:20 a₿): Live and
 * Studio merge into ONE room. /a/live retired its own gate+render (the
 * pin above this comment, honestly broken — decision 4) for a plain
 * redirect to /a/studio, which gates the merged room either way. */
describe("/a/live redirects to /a/studio (decision 4) — the merged room's own gate covers it", () => {
  it("no longer gates itself — that's the merged room's job now", () => {
    const src = read("src/app/a/live/page.tsx");
    expect(src).not.toContain("OperatorGate");
    expect(src).not.toContain("operatorFromCookieHeader");
    expect(src).toContain('redirect(studioRedirectPath(sp))');
    expect(src).toContain('from "next/navigation"');
  });

  it("redirects to /a/studio with no query", async () => {
    const { default: GoLivePage } = await import("@/app/a/live/page");
    let caught: { digest?: string } | undefined;
    try {
      await GoLivePage({ searchParams: Promise.resolve({}) });
    } catch (e) {
      caught = e as { digest?: string };
    }
    expect(caught?.digest).toContain("NEXT_REDIRECT");
    expect(caught?.digest).toContain("/a/studio");
    expect(caught?.digest).not.toContain("/a/studio?");
  });

  it("preserves every query key/value a bookmark or link carried, verbatim, by BROWSER NAVIGATION — not just the bare route", async () => {
    const { default: GoLivePage } = await import("@/app/a/live/page");
    let caught: { digest?: string } | undefined;
    try {
      await GoLivePage({ searchParams: Promise.resolve({ ref: "newsletter", utm_source: "mail" }) });
    } catch (e) {
      caught = e as { digest?: string };
    }
    expect(caught?.digest).toContain("/a/studio?ref=newsletter&utm_source=mail");
  });

  /* studioRedirectPath is pure — tested directly so the query-preserving
     logic is pinned against real URLSearchParams behaviour (repeat keys,
     arrays, blanks), the same real way the page itself builds the target,
     never a hand-typed string. */
  describe("studioRedirectPath — pure, computed the same real way the page redirects", () => {
    it("no query at all", async () => {
      const { studioRedirectPath } = await import("@/app/a/live/page");
      expect(studioRedirectPath({})).toBe("/a/studio");
    });

    it("a single key", async () => {
      const { studioRedirectPath } = await import("@/app/a/live/page");
      expect(studioRedirectPath({ room: "heart-field" })).toBe("/a/studio?room=heart-field");
    });

    it("multiple keys, in order", async () => {
      const { studioRedirectPath } = await import("@/app/a/live/page");
      expect(studioRedirectPath({ a: "1", b: "2" })).toBe("/a/studio?a=1&b=2");
    });

    it("a repeated key (array value) rides every value, never collapsed", async () => {
      const { studioRedirectPath } = await import("@/app/a/live/page");
      expect(studioRedirectPath({ tag: ["x", "y"] })).toBe("/a/studio?tag=x&tag=y");
    });

    it("undefined values are dropped, never rendered as the literal string 'undefined'", async () => {
      const { studioRedirectPath } = await import("@/app/a/live/page");
      expect(studioRedirectPath({ room: "heart-field", ghost: undefined })).toBe("/a/studio?room=heart-field");
    });
  });
});

/* TASK-264: the room id never carries a character VDO would rewrite. */
describe("the studio room id is VDO-native (TASK-264)", () => {
  it("has no hyphen — sanitizeRoomName would replace it and warn on every open", () => {
    const { room } = studioVdoLinks("onecocreation", "vdo.onecocreation.com");
    expect(room).toBe("onecocreation_studio");
    expect(room).toMatch(/^[A-Za-z0-9_]+$/);
  });
});
