"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BftMonthGrid,
  WeekRibbon,
  CalendarOptions,
  bftMonthGrid,
  bftToday,
  useCalendarPrefs,
  type CalendarEventPill,
  type CalendarDayMarks,
  type CalendarDayMarksLookup,
} from "@/components/calendar";
import type { RoomsFeed, LiveFeed } from "./ClassroomView";
import { groupRoomsByPackage, shelfRoomsForRoom } from "@/lib/matrix-rooms";
import { signInDoorLine, signInDoorHref, packageDoorLine, type RoomGate } from "@/lib/room-access";
import PackageRoomsCard from "./PackageRoomsCard";

/**
 * C — THE CIRCLE (loves-desk-and-classroom-plan.md): calendar-first.
 * TASK-184 (0018.06.18 a₿ · the Admiral's three-rooms ruling):
 *  · THE WEEKLY VIEW LEADS — the same WeekRibbon the trainer's home
 *    dashboard (/a, WeekAltitude) rides, this week, over the month grid.
 *  · THE MONTH'S EVENTS SIT CENTRED in their day cells (Love: "the 11:11
 *    live left-aligned doesn't look good") — scoped via .circle-cal in
 *    classroom.css, so Love's own /a calendars keep their alignment.
 *  · MEMBERS NEVER SEE BLACKOUT TIME — a blocked day renders as a plain
 *    day here (no rose wash, no "blackout" mark, and no ~11:11 projection
 *    onto it — a live pill on a dark day would leak it). Love's own
 *    calendar on /a keeps the blackout (console/desk/marks.ts, untouched).
 *    Retreats stay lavender — they were always member-visible.
 *  · THE GATE RIDES THE EVENTS (T-174's roomGate, threaded from the page):
 *    signed out → the sign-in door with the room's name; under-tier → the
 *    package words. The rooms strip below stays either way — showing which
 *    classrooms CAN open is its whole job.
 *  · The "other classrooms" strip at the bottom wears the STANDARD card
 *    layout (TASK-150/183's PackageRoomsCard — doors hugging the bottom,
 *    uniform across the row).
 */

const MONTH_WORDS = [
  "One", "Two", "Three", "Four", "Five", "Six", "Seven",
  "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
] as const;
const pad2 = (n: number) => String(n).padStart(2, "0");
const pad4 = (n: number) => String(n).padStart(4, "0");

/* Mon/Wed/Fri — the same weekday projection of live.ts's LIVE_SCHEDULE
 * ("Mon · Wed · Fri ~11:11") desk/marks.ts already carries; a calendar
 * projection, never a chain fact, per the loves-desk plan's honesty riders. */
const LIVE_WEEKDAYS = new Set([1, 3, 5]);

interface MarksFeed {
  ok: boolean;
  overrides: { date: string; kind: "blocked" | "extra"; isRetreat: boolean }[];
}

/* TASK-184: the member marks — blackout HIDDEN. A blocked day (not a
 *  retreat) is a plain day: no mark, and the live projection skips it (a
 *  pill on a blocked day would whisper what the wash no longer says).
 *  Exported pure so tests/classroom-three-rooms.test.ts pins it. */
export function buildPublicMarks(
  feed: MarksFeed | null,
  opts: { liveNowCivilKey: string | null; liveRoomTitle: string | null },
): CalendarDayMarksLookup {
  return (cell): CalendarDayMarks | undefined => {
    const override = feed?.overrides.find((o) => o.date === cell.civilKey);
    const blackout = !!override && override.kind === "blocked" && !override.isRetreat;
    const multiDay = !!override && override.isRetreat;

    const pills: CalendarEventPill[] = [];
    if (opts.liveNowCivilKey === cell.civilKey) {
      pills.push({ id: "live-now", label: opts.liveRoomTitle ? `● LIVE — ${opts.liveRoomTitle}` : "● LIVE now", variant: "gold" });
    } else if (LIVE_WEEKDAYS.has(cell.civilDate.getUTCDay()) && !blackout) {
      pills.push({ id: `live-${cell.civilKey}`, label: "~11:11 live", variant: "gold" });
    }

    /* blackout rides out only as the live-pill skip — never a visible mark */
    if (!multiDay && pills.length === 0) return undefined;
    return { multiDay, pills: pills.slice(0, 3) };
  };
}

function RoomCardsGrid({ feed, activeSlug }: { feed: RoomsFeed | null; activeSlug: string }) {
  if (!feed) return <p style={{ color: "var(--muted)" }}>opening the rooms…</p>;
  /* only this class's package + the Commons — never the whole house */
  const packages = groupRoomsByPackage(shelfRoomsForRoom(feed.rooms, activeSlug));
  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(240px,100%), 1fr))" }}>
      {packages.map((p) => (
        <PackageRoomsCard key={p.tier} pkg={p} signedIn={feed.signedIn} compact />
      ))}
    </div>
  );
}

export default function CircleView({
  feed, live, activeSlug, slug, title, door, doorPackage,
}: {
  feed: RoomsFeed | null;
  live: LiveFeed | null;
  activeSlug: string;
  /** TASK-184: the gate rides the events — the room's own slug/title feed
   *  the sign-in door's words and href. */
  slug: string;
  title: string;
  door?: RoomGate;
  doorPackage?: string | null;
}) {
  const today = useMemo(() => bftToday(), []);
  const [bftYear, setBftYear] = useState(today.year);
  const [bftMonth, setBftMonth] = useState(today.month);
  const [marksFeed, setMarksFeed] = useState<MarksFeed | null>(null);
  const { primary, counts } = useCalendarPrefs();

  const gated = !!door && door !== "open";

  const grid = useMemo(() => bftMonthGrid(bftYear, bftMonth), [bftYear, bftMonth]);
  const firstCell = grid.cells[0];
  const lastCell = grid.cells[grid.cells.length - 1];

  /* the weekly view: THIS week — the same bft-day math the desk's Week
     altitude rides (weekOfMonth = ceil(day/7), bftWeekContaining's own) */
  const weekOfMonth = Math.ceil(today.day / 7);

  useEffect(() => {
    if (gated) return; // the gate closed — the events never load
    if (!firstCell || !lastCell) return;
    const start = firstCell.civilDate;
    const days = Math.round((lastCell.civilDate.getTime() - firstCell.civilDate.getTime()) / 86_400_000) + 1;
    let alive = true;
    fetch(`/api/rooms/marks?start=${start.toISOString()}&days=${days}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.ok) setMarksFeed(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [firstCell, lastCell, gated]);

  function stepMonth(dir: -1 | 1) {
    let m = bftMonth + dir;
    let y = bftYear;
    if (m < 1) { m = 13; y -= 1; }
    if (m > 13) { m = 1; y += 1; }
    setBftMonth(m);
    setBftYear(y);
  }

  const todayCivilKey = new Date().toISOString().slice(0, 10);
  const liveNowCivilKey = live?.live ? todayCivilKey : null;
  const marks = buildPublicMarks(marksFeed, { liveNowCivilKey, liveRoomTitle: live?.roomTitle ?? null });

  const civilRangeLabel = firstCell && lastCell
    ? `${firstCell.civilMonthAbbr} ${firstCell.civilDayNum} – ${lastCell.civilMonthAbbr} ${lastCell.civilDayNum}`
    : "";
  const countsLabel = counts && firstCell ? ` · day ${firstCell.dayOfYear} · W${firstCell.weekOfYear}` : "";
  const header = primary === "bft"
    ? `Month ${MONTH_WORDS[bftMonth - 1]}, ${pad4(bftYear)} a₿ · civil ≈ ${civilRangeLabel}${countsLabel}`
    : `${civilRangeLabel} · ${pad4(bftYear)}.${pad2(bftMonth)} a₿${countsLabel}`;

  return (
    <div>
      {/* the gate rides the events: the calendar only opens WITH the room;
          the rooms strip below stays either way */}
      {gated ? (
        <div className="card" style={{ padding: 24, maxWidth: 520 }}>
          {door === "signin" ? (
            <>
              <p style={{ margin: "0 0 12px" }}>{signInDoorLine(title)}</p>
              <Link className="btn btn-sm" href={signInDoorHref(slug)}>Sign in · join free</Link>
            </>
          ) : (
            <>
              <p style={{ margin: "0 0 6px" }}>🔒 {packageDoorLine(doorPackage ?? null)}</p>
              <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: ".86rem" }}>
                The lock is an invitation — everything inside stays waiting for you.
              </p>
              <Link href="/memberships" className="btn btn-sm">
                See the memberships
              </Link>
            </>
          )}
        </div>
      ) : (
        /* .circle-cal scopes the centred-events ruling to the Circle —
           Love's /a calendars keep their own alignment */
        <div className="circle-cal">
          <WeekRibbon bftYear={today.year} bftMonth={today.month} weekOfMonth={weekOfMonth} marks={marks} />

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 10px", flexWrap: "wrap" }}>
            <button type="button" className="btn-round" aria-label="previous month" onClick={() => stepMonth(-1)}>‹</button>
            <p style={{ flex: 1, minWidth: 160, margin: 0, fontSize: ".82rem", color: "var(--ink-body)" }}>{header}</p>
            <button type="button" className="btn-round" aria-label="next month" onClick={() => stepMonth(1)}>›</button>
            <CalendarOptions />
          </div>
          <BftMonthGrid bftYear={bftYear} bftMonth={bftMonth} marks={marks} />
        </div>
      )}

      <div style={{ marginTop: 26 }}>
        <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.02rem", margin: "0 0 12px", color: "var(--ink-strong)" }}>The rooms</h3>
        <RoomCardsGrid feed={feed} activeSlug={activeSlug} />
      </div>
    </div>
  );
}
