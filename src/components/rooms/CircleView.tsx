"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BftMonthGrid,
  CalendarOptions,
  bftMonthGrid,
  bftToday,
  useCalendarPrefs,
  type CalendarEventPill,
  type CalendarDayMarks,
  type CalendarDayMarksLookup,
} from "@/components/calendar";
import type { RoomsFeed, LiveFeed } from "./ClassroomView";
import { TIER_SLUG } from "./tier-slug";

/**
 * C — THE CIRCLE (loves-desk-and-classroom-plan.md): calendar-first. CAL's
 * BftMonthGrid, fed by the public-safe `/api/rooms/marks` (blackouts +
 * retreats, day-level only — no client names, ever) plus a calendar
 * PROJECTION of the live weekly rhythm, with the room-cards grid beneath —
 * Enter doors, honest locked pills, the same shape RoomsShelf's own cards
 * use.
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

function buildPublicMarks(
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

    if (!blackout && !multiDay && pills.length === 0) return undefined;
    return { blackout, multiDay, pills: pills.slice(0, 3) };
  };
}

function RoomCardsGrid({ feed, activeSlug }: { feed: RoomsFeed | null; activeSlug: string }) {
  if (!feed) return <p style={{ color: "var(--muted)" }}>opening the rooms…</p>;
  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(240px,100%), 1fr))" }}>
      {feed.rooms.map((r) => {
        const isActive = r.slug === activeSlug;
        return (
          <div
            key={r.slug}
            className="card"
            style={{ padding: "12px 16px", opacity: r.open ? 1 : 0.82, ...(isActive ? { borderColor: "var(--gold-deep)" } : {}) }}
          >
            <p style={{ margin: "0 0 6px", fontSize: ".6rem", fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: r.open ? "var(--ok)" : "var(--muted)" }}>
              {r.open ? (r.minTier === "all" ? "open to all members" : "yours") : `🔒 ${r.neededName ?? "members"}`}
            </p>
            <h4 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: ".96rem", margin: "0 0 10px", color: "var(--ink-strong)" }}>{r.title}</h4>
            {r.open ? (
              <Link className="btn btn-sm" href={`/rooms/${r.slug}`}>Enter</Link>
            ) : (
              <Link
                className="btn btn-ghost btn-sm"
                href={feed.signedIn ? (r.neededName ? `/packages/${TIER_SLUG[r.minTier] ?? ""}` : "/memberships") : "/login"}
              >
                {feed.signedIn ? `See ${r.neededName ?? "memberships"}` : "Sign in"}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CircleView({
  feed, live, activeSlug,
}: {
  feed: RoomsFeed | null;
  live: LiveFeed | null;
  activeSlug: string;
}) {
  const today = useMemo(() => bftToday(), []);
  const [bftYear, setBftYear] = useState(today.year);
  const [bftMonth, setBftMonth] = useState(today.month);
  const [marksFeed, setMarksFeed] = useState<MarksFeed | null>(null);
  const { primary, counts } = useCalendarPrefs();

  const grid = useMemo(() => bftMonthGrid(bftYear, bftMonth), [bftYear, bftMonth]);
  const firstCell = grid.cells[0];
  const lastCell = grid.cells[grid.cells.length - 1];

  useEffect(() => {
    if (!firstCell || !lastCell) return;
    const start = firstCell.civilDate;
    const days = Math.round((lastCell.civilDate.getTime() - firstCell.civilDate.getTime()) / 86_400_000) + 1;
    let alive = true;
    fetch(`/api/rooms/marks?start=${start.toISOString()}&days=${days}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.ok) setMarksFeed(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [firstCell, lastCell]);

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
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn-round" aria-label="previous month" onClick={() => stepMonth(-1)}>‹</button>
        <p style={{ flex: 1, minWidth: 160, margin: 0, fontSize: ".82rem", color: "var(--ink-body)" }}>{header}</p>
        <button type="button" className="btn-round" aria-label="next month" onClick={() => stepMonth(1)}>›</button>
        <CalendarOptions />
      </div>
      <BftMonthGrid bftYear={bftYear} bftMonth={bftMonth} marks={marks} />

      <div style={{ marginTop: 26 }}>
        <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.02rem", margin: "0 0 12px", color: "var(--ink-strong)" }}>The rooms</h3>
        <RoomCardsGrid feed={feed} activeSlug={activeSlug} />
      </div>
    </div>
  );
}
