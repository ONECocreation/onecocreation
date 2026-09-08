import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { bftMonthGrid, type CalendarDayCell } from "@/lib/calendar-view";
import type { MaterialItem } from "@/lib/class-materials";

/**
 * TASK-184 (0018.06.18 a₿ · block 966101) — A CLASSROOM IS THREE ROOMS.
 * The Admiral's ruling, pinned:
 *
 *  1. THE RETIRED FOUR RESOLVE, NEVER 404 — a stored Sanctuary / Video /
 *     Materials / People vantage lands on the Stage (resolveVantage), the
 *     three live vantages pass through, garbage falls to the site default.
 *  2. THE CIRCLE'S BLACKOUT IS HIDDEN FROM MEMBERS — buildPublicMarks
 *     paints a blocked day as a PLAIN day (no mark at all) and skips the
 *     ~11:11 live projection onto it, while the OPERATOR'S desk marks
 *     (console/desk/marks.ts, untouched) keep the blackout.
 *  3. THE CIRCLE'S EVENTS SIT CENTRED — .circle-cal scopes
 *     justify-content:center onto the shared DayCell's pill row, and the
 *     weekly ribbon leads the month grid.
 *  4. THE GATE RIDES ALL THREE — signed out, the Circle and the Lesson
 *     Path meet the sign-in door with the room's name (the SAME
 *     room-access words the Stage's video slot and the chat say).
 *  5. THE LESSON PATH MERGED THE MATERIALS — deriveResources splits
 *     session-attached items (lessons) from everything else (resources).
 *  6. THE 429 — ONE roster/presence read per open, server-side, cached
 *     per request; a fixture homeserver 429 renders honest words
 *     ("the room is busy — try again in a moment"), never a blank room.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

/* a real cell off the real grid math — the marks lookups read civilKey +
 *  civilDate.getUTCDay(), and honesty here is the grid's own arithmetic */
function cellMatching(pred: (c: CalendarDayCell) => boolean): CalendarDayCell {
  const cell = bftMonthGrid(18, 6).cells.find(pred);
  if (!cell) throw new Error("no matching cell in the fixture grid");
  return cell;
}
const LIVE_WEEKDAYS = new Set([1, 3, 5]); // Mon/Wed/Fri — live.ts's LIVE_SCHEDULE projection

describe("1 · the retired vantages resolve to the Stage — no 404s for a saved pick", () => {
  it("sanctuary / video / materials / people all land on the Stage", async () => {
    const { resolveVantage } = await import("@/components/rooms/vantage");
    for (const retired of ["sanctuary", "video", "materials", "people"]) {
      expect(resolveVantage(retired), retired).toBe("stage");
    }
  });

  it("the three live vantages pass through; garbage and nothing fall to the site default", async () => {
    const { resolveVantage, ROOM_VANTAGE_SITE_DEFAULT } = await import("@/components/rooms/vantage");
    expect(resolveVantage("stage")).toBe("stage");
    expect(resolveVantage("lesson")).toBe("lesson");
    expect(resolveVantage("circle")).toBe("circle");
    expect(resolveVantage("nonsense")).toBe(ROOM_VANTAGE_SITE_DEFAULT);
    expect(resolveVantage(null)).toBe(ROOM_VANTAGE_SITE_DEFAULT);
  });
});

describe("2 · the Circle hides blackout from members — Love's /a calendar keeps it", () => {
  it("a blocked day paints NOTHING for a member — no wash, no mark", async () => {
    const { buildPublicMarks } = await import("@/components/rooms/CircleView");
    const cell = cellMatching((c) => !LIVE_WEEKDAYS.has(c.civilDate.getUTCDay()));
    const marks = buildPublicMarks(
      { ok: true, overrides: [{ date: cell.civilKey, kind: "blocked", isRetreat: false }] },
      { liveNowCivilKey: null, liveRoomTitle: null },
    );
    expect(marks(cell)).toBeUndefined(); // a plain day — blackout hidden
  });

  it("the ~11:11 live projection SKIPS a blacked-out weekday — a pill there would leak the blackout", async () => {
    const { buildPublicMarks } = await import("@/components/rooms/CircleView");
    const cell = cellMatching((c) => LIVE_WEEKDAYS.has(c.civilDate.getUTCDay()));
    const blackout = buildPublicMarks(
      { ok: true, overrides: [{ date: cell.civilKey, kind: "blocked", isRetreat: false }] },
      { liveNowCivilKey: null, liveRoomTitle: null },
    );
    expect(blackout(cell)).toBeUndefined();
    /* …and the same weekday unblocked DOES carry the projection (control) */
    const open = buildPublicMarks({ ok: true, overrides: [] }, { liveNowCivilKey: null, liveRoomTitle: null });
    expect(open(cell)?.pills?.some((p) => p.label === "~11:11 live")).toBe(true);
  });

  it("a retreat stays member-visible (lavender multi-day) — retreats were never the blackout", async () => {
    const { buildPublicMarks } = await import("@/components/rooms/CircleView");
    const cell = cellMatching((c) => !LIVE_WEEKDAYS.has(c.civilDate.getUTCDay()));
    const marks = buildPublicMarks(
      { ok: true, overrides: [{ date: cell.civilKey, kind: "blocked", isRetreat: true }] },
      { liveNowCivilKey: null, liveRoomTitle: null },
    );
    expect(marks(cell)?.multiDay).toBe(true);
    expect(marks(cell)?.blackout).toBeUndefined();
  });

  it("the operator's desk marks KEEP the blackout — buildDeskMarks is untouched", async () => {
    const { buildDeskMarks } = await import("@/components/console/desk/marks");
    const cell = cellMatching(() => true);
    const marks = buildDeskMarks(
      { rules: [], overrides: [{ id: "ov-1", date: cell.civilKey, kind: "blocked" }], bookings: [] },
      { todayCivilKey: "1999-01-01" },
    );
    expect(marks(cell)?.blackout).toBe(true);
  });
});

describe("3 · the Circle — the weekly view first, the month's events centred", () => {
  it("the weekly ribbon (the trainer dashboard's WeekRibbon) leads the month grid", async () => {
    const src = await read("src/components/rooms/CircleView.tsx");
    expect(src).toContain("WeekRibbon");
    expect(src.indexOf("<WeekRibbon")).toBeLessThan(src.indexOf("<BftMonthGrid"));
  });

  it("the centred events are SCOPED to the Circle (.circle-cal) — the desk's cells keep their alignment", async () => {
    const css = await read("src/components/rooms/classroom.css");
    expect(css).toMatch(/\.circle-cal \.cal-cell__pills\s*\{[\s\S]*?justify-content:\s*center[\s\S]*?\}/);
    const src = await read("src/components/rooms/CircleView.tsx");
    expect(src).toContain('className="circle-cal"');
    /* the shared calendar component itself carries no centering — the
       ruling named the classroom's month grid, not Love's /a */
    const calCss = await read("src/components/calendar/calendar-view.css");
    expect(calCss).not.toContain("justify-content:center");
  });
});

describe("4 · the gate rides all three vantages", () => {
  const CIRCLE_PROPS = { feed: null, live: null, activeSlug: "clair-senses", slug: "clair-senses", title: "Clair Senses — Foundations" };

  it("signed out, the Circle meets the sign-in door with the room's name — no calendar grid", async () => {
    const CircleView = (await import("@/components/rooms/CircleView")).default;
    const html = renderToStaticMarkup(createElement(CircleView, { ...CIRCLE_PROPS, door: "signin" as const }));
    expect(html).toContain("Clair Senses — Foundations opens for members");
    expect(html).toContain(`/login?next=${encodeURIComponent("/rooms/clair-senses")}`);
    expect(html).not.toContain('role="grid"');
  });

  it("under-tier, the Circle says the package words — still no calendar", async () => {
    const CircleView = (await import("@/components/rooms/CircleView")).default;
    const html = renderToStaticMarkup(
      createElement(CircleView, { ...CIRCLE_PROPS, door: "package" as const, doorPackage: "Weekly Intuitive" }),
    );
    expect(html).toContain("opens with the Weekly Intuitive package");
    expect(html).not.toContain('role="grid"');
  });

  it("open, the Circle renders the weekly ribbon AND the month grid AND the rooms strip", async () => {
    const CircleView = (await import("@/components/rooms/CircleView")).default;
    const html = renderToStaticMarkup(createElement(CircleView, { ...CIRCLE_PROPS, door: "open" as const }));
    expect(html.match(/role="grid"/g)?.length).toBe(2); // the week ribbon + the month
    expect(html).toContain("The rooms");
  });

  it("signed out, the Lesson Path meets the sign-in door with the room's name", async () => {
    const LessonPathView = (await import("@/components/rooms/LessonPathView")).default;
    const html = renderToStaticMarkup(
      createElement(LessonPathView, {
        slug: "clair-senses", alias: "#clair-senses:onecocreation.com",
        title: "Clair Senses — Foundations", kind: "class", door: "signin" as const,
      }),
    );
    expect(html).toContain("Clair Senses — Foundations opens for members");
    expect(html).toContain(`/login?next=${encodeURIComponent("/rooms/clair-senses")}`);
  });
});

describe("5 · the Lesson Path merged the Materials", () => {
  const item = (id: string, attachedTo: MaterialItem["attachedTo"]): MaterialItem => ({
    id, roomSlug: "clair-senses", name: id, kind: "recording", url: `/vault/${id}`, attachedTo, addedAtMs: 1,
  });

  it("session-attached items are lessons; everything else rides as resources — never both", async () => {
    const { deriveResources } = await import("@/components/rooms/LessonPathView");
    const items = [
      item("rec-1", { kind: "session", sessionKey: "bk_1" }),
      item("rec-2", { kind: "session", sessionKey: "bk_1" }),
      item("guide-pdf", { kind: "shelf" }),
    ];
    const resources = deriveResources(items);
    expect(resources.map((r) => r.id)).toEqual(["guide-pdf"]);
  });

  it("the resources list renders under the path, off the same feed (source pin)", async () => {
    const src = await read("src/components/rooms/LessonPathView.tsx");
    expect(src).toContain('data-region="resources"');
    expect(src).toContain("deriveResources(feed?.items ?? [])");
    /* under the path: the main return mounts {resourcesCard} after the lessons nav */
    expect(src.lastIndexOf("{resourcesCard}")).toBeGreaterThan(src.indexOf("</nav>"));
  });
});

describe("6 · the 429 — one roster read per open, honest words, never a blank room", () => {
  const LIMIT = { ok: false as const, reason: "M_LIMIT_EXCEEDED: Too Many Requests" };

  it("the fixture 429 renders the ruling's words — the room is busy, try again in a moment", async () => {
    const RoomPresence = (await import("@/components/rooms/RoomPresence")).default;
    const html = renderToStaticMarkup(createElement(RoomPresence, { roster: LIMIT }));
    expect(html).toContain("the room is busy — try again in a moment");
    expect(html).toContain("Who"); // the panel itself still stands — never a blank room
  });

  it("the limit is told by errcode OR status — both homeserver wordings", async () => {
    const { isLimitReason } = await import("@/components/rooms/RoomPresence");
    expect(isLimitReason("M_LIMIT_EXCEEDED: Too Many Requests")).toBe(true);
    expect(isLimitReason("http 429")).toBe(true);
    expect(isLimitReason("room not found on the homeserver")).toBe(false);
    expect(isLimitReason(undefined)).toBe(false);
  });

  it("a non-limit failure and a closed gate still speak — never a blank panel", async () => {
    const RoomPresence = (await import("@/components/rooms/RoomPresence")).default;
    const failed = renderToStaticMarkup(
      createElement(RoomPresence, { roster: { ok: false as const, reason: "room not found on the homeserver" } }),
    );
    expect(failed).toContain("didn&#x27;t answer — try again in a moment");
    expect(failed).not.toContain("the room is busy");
    const gated = renderToStaticMarkup(createElement(RoomPresence, { roster: null }));
    expect(gated).toContain("opens once this room does, for you");
  });

  it("a healthy roster paints the online chips (the roster fold onto the Stage)", async () => {
    const RoomPresence = (await import("@/components/rooms/RoomPresence")).default;
    const html = renderToStaticMarkup(
      createElement(RoomPresence, {
        roster: {
          ok: true as const,
          count: 2,
          names: ["Ada Lovelace", "bob"],
          joined: {
            "@ada:onecocreation.com": { display_name: "Ada Lovelace" },
            "@bob:onecocreation.com": {},
          },
          presence: {
            "@ada:onecocreation.com": { presence: "online" },
            "@bob:onecocreation.com": { presence: "offline", last_active_ago: 40 * 60 * 1000 },
          },
        },
      }),
    );
    expect(html).toContain("1 here now");
    expect(html).toContain("Ada Lovelace");
    expect(html).not.toContain("bob</li>"); // long-gone bob wears no chip
  });

  it("source pin: the page takes ONE roster read, gate-first; the helper is the per-request cache", async () => {
    const page = await read("src/app/rooms/[slug]/page.tsx");
    expect(page).toContain('import { rosterForRequest } from "@/lib/matrix"');
    expect(page).toContain('door === "open" ? await rosterForRequest(room.id) : null');
    const lib = await read("src/lib/matrix.ts");
    expect(lib).toContain("cache(roomRoster)");
    /* RoomPresence itself fires NO fetch any more — the prop IS the read */
    const presence = await read("src/components/rooms/RoomPresence.tsx");
    expect(presence).not.toContain("fetch(");
  });
});

describe("the bottom strip wears the standard card layout", () => {
  it("the Circle's rooms strip maps PackageRoomsCard (T-183's uniform cards) and nothing else", async () => {
    const src = await read("src/components/rooms/CircleView.tsx");
    expect(src).toContain('from "./PackageRoomsCard"');
    expect(src).toContain("<PackageRoomsCard");
    expect(src).not.toContain("cls-tabs"); // the retired sanctuary room-tabs row
  });
});
