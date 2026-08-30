"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  BftMonthGrid,
  CalendarOptions,
  CalendarPrefsProvider,
  useCalendarPrefs,
  bftMonthGrid,
  bftToday,
} from "@/components/calendar";
import { ROOMS } from "@/lib/matrix-rooms";
import WeekAltitude from "./desk/WeekAltitude";
import DayAltitude from "./desk/DayAltitude";
import { buildDeskMarks, civilKeyOf } from "./desk/marks";
import type { DeskFeed, DeskRoom } from "./desk/types";
import "./desk/loves-desk.css";

/**
 * LOVE'S DESK — one desk, three altitudes (loves-desk-and-classroom-plan.md,
 * Lane DESK), superseding AdminWeekGrid's mount at /a. AdminWeekGrid itself
 * stays in the tree, unmounted, for reference — its data wiring (services,
 * overrides→blackout, iCal busy) is exactly what this feeds from.
 */

type Altitude = "month" | "week" | "day";
const ALTITUDE_KEY = "oc-desk-altitude";

/* The altitude's persistence rides useSyncExternalStore over localStorage —
   the SAME shape CalendarPrefs.tsx uses over DOM attributes, and for the
   same reason its own header cites: a plain useEffect+useState read of an
   external store trips the react-hooks/set-state-in-effect purity rule.
   Month (the unmarked default) is what SSR/first paint always shows. */
const altitudeListeners = new Set<() => void>();
function notifyAltitude() { for (const l of altitudeListeners) l(); }
function subscribeAltitude(listener: () => void): () => void {
  altitudeListeners.add(listener);
  return () => altitudeListeners.delete(listener);
}
function readAltitude(): Altitude {
  try {
    const v = localStorage.getItem(ALTITUDE_KEY);
    if (v === "month" || v === "week" || v === "day") return v;
  } catch { /* private mode */ }
  return "month";
}
function readServerAltitude(): Altitude {
  return "month"; // SSR has no localStorage; matches the fresh-visit default
}

const MONTH_WORDS = [
  "One", "Two", "Three", "Four", "Five", "Six", "Seven",
  "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
] as const;

const pad2 = (n: number) => String(n).padStart(2, "0");
const pad4 = (n: number) => String(n).padStart(4, "0");

const DESK_ROOMS: DeskRoom[] = ROOMS.map((r) => ({
  slug: r.id.slice(1, r.id.indexOf(":")),
  title: r.title,
  kind: r.kind,
}));

interface LiveFeed {
  state: { live: boolean; room?: string };
  rooms: { slug: string; title: string; kind: string }[];
  matrixConfigured: boolean;
  vaultConfigured: boolean;
}

/** the bar's compact "● Start live session" door — the SAME /api/admin/live
 *  the full LiveDoorCard uses, just a one-tap version scoped to whichever
 *  room the desk is currently pointed at. */
function LiveDoor({ roomSlug }: { roomSlug: string | null }) {
  const [feed, setFeed] = useState<LiveFeed | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/live", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.ok) setFeed(d); })
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (!feed) return null;
  const room = feed.rooms.find((r) => r.kind === "class" && r.slug === roomSlug) ?? feed.rooms.find((r) => r.kind === "class");
  const dark = !feed.matrixConfigured || !feed.vaultConfigured;

  async function act(action: "open" | "close") {
    setBusy(true);
    await fetch("/api/admin/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "open" ? { action, room: room?.slug } : { action }),
    }).catch(() => {});
    setBusy(false);
    load();
  }

  if (feed.state.live) {
    const title = feed.rooms.find((r) => r.slug === feed.state.room)?.title ?? feed.state.room;
    return (
      <button type="button" className="btn btn-sm desk-live-door desk-live-door--on" onClick={() => act("close")} disabled={busy}>
        ● LIVE — {title} · close
      </button>
    );
  }
  return (
    <button
      type="button"
      className="btn btn-sm desk-live-door"
      onClick={() => act("open")}
      disabled={busy || !room || dark}
      title={dark ? "the matrix bot / live vault aren't configured here" : undefined}
    >
      ● Start live session
    </button>
  );
}

function DeskInner() {
  const { primary, counts } = useCalendarPrefs();

  const today = useMemo(() => bftToday(), []);
  const [bftYear, setBftYear] = useState(today.year);
  const [bftMonth, setBftMonth] = useState(today.month);
  const [bftDay, setBftDay] = useState(today.day);

  const altitude = useSyncExternalStore(subscribeAltitude, readAltitude, readServerAltitude);
  function chooseAltitude(a: Altitude) {
    try { localStorage.setItem(ALTITUDE_KEY, a); } catch { /* private mode */ }
    notifyAltitude();
  }

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedRoomSlug, setSelectedRoomSlug] = useState<string | null>(
    DESK_ROOMS.find((r) => r.kind === "class")?.slug ?? DESK_ROOMS[0]?.slug ?? null,
  );

  const [feed, setFeed] = useState<DeskFeed | null>(null);
  const [liveNowRoomSlug, setLiveNowRoomSlug] = useState<string | null>(null);

  const grid = useMemo(() => bftMonthGrid(bftYear, bftMonth), [bftYear, bftMonth]);
  const firstCell = grid.cells[0];
  const lastCell = grid.cells[grid.cells.length - 1];

  const loadFeed = useCallback(() => {
    if (!firstCell || !lastCell) return;
    const start = firstCell.civilDate;
    const days = Math.round((lastCell.civilDate.getTime() - firstCell.civilDate.getTime()) / 86_400_000) + 1;
    fetch(`/api/admin/calendar?start=${start.toISOString()}&days=${days}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.ok) setFeed(d); })
      .catch(() => {});
  }, [firstCell, lastCell]);
  useEffect(loadFeed, [loadFeed]);

  useEffect(() => {
    fetch("/api/admin/live", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.ok) setLiveNowRoomSlug(d.state?.live ? d.state.room ?? null : null); })
      .catch(() => {});
  }, [altitude]);

  const todayCivilKey = civilKeyOf(new Date().toISOString());
  const monthMarks = buildDeskMarks(feed, { todayCivilKey, liveNowRoomSlug });

  function stepMonth(dir: -1 | 1) {
    let m = bftMonth + dir;
    let y = bftYear;
    if (m < 1) { m = 13; y -= 1; }
    if (m > 13) { m = 1; y += 1; }
    setBftMonth(m);
    setBftYear(y);
  }

  const civilRangeLabel = firstCell && lastCell
    ? `${firstCell.civilMonthAbbr} ${firstCell.civilDayNum} – ${lastCell.civilMonthAbbr} ${lastCell.civilDayNum}`
    : "";
  const countsLabel = counts && firstCell ? ` · day ${firstCell.dayOfYear} · W${firstCell.weekOfYear}` : "";
  const header = primary === "bft"
    ? `Month ${MONTH_WORDS[bftMonth - 1]}, ${pad4(bftYear)} a₿ · civil ≈ ${civilRangeLabel}${countsLabel}`
    : `${civilRangeLabel} · ${pad4(bftYear)}.${pad2(bftMonth)} a₿${countsLabel}`;

  const dayCell = grid.cells[bftDay - 1] ?? firstCell;
  const weekOfMonth = Math.ceil(bftDay / 7);

  function jumpToDay(day: number) {
    setBftDay(day);
    chooseAltitude("day");
  }

  /** Day altitude's ‹ › — rolls across a month boundary rather than
   *  clamping, since a₿ months are always exactly 28 days (no day 29 to
   *  worry about either direction). */
  function stepDay(dir: -1 | 1) {
    let d = bftDay + dir;
    if (d < 1) { stepMonth(-1); d = 28; }
    else if (d > 28) { stepMonth(1); d = 1; }
    setBftDay(d);
  }

  return (
    <div className="desk">
      <div className="desk-bar">
        <button type="button" className="btn btn-sm" aria-pressed={altitude === "month"} onClick={() => chooseAltitude("month")}>Month</button>
        <button type="button" className="btn btn-sm" aria-pressed={altitude === "week"} onClick={() => chooseAltitude("week")}>Week</button>
        <button type="button" className="btn btn-sm" aria-pressed={altitude === "day"} onClick={() => chooseAltitude("day")}>Day</button>
        <span className="desk-bar__spacer" />
        <LiveDoor roomSlug={selectedRoomSlug} />
        <CalendarOptions />
      </div>

      {altitude === "month" && (
        <div>
          <div className="desk-month-head">
            <button type="button" className="btn-round" aria-label="previous month" onClick={() => stepMonth(-1)}>‹</button>
            <div className="desk-month-head__title">
              <p>{header}</p>
            </div>
            <button type="button" className="btn-round" aria-label="next month" onClick={() => stepMonth(1)}>›</button>
            <Link className="btn btn-sm desk-schedule-chip" href="/a/booking">+ schedule</Link>
          </div>
          <BftMonthGrid
            bftYear={bftYear}
            bftMonth={bftMonth}
            marks={monthMarks}
            onSelectDay={(cell) => jumpToDay(cell.bftDay)}
          />
        </div>
      )}

      {altitude === "week" && (
        <WeekAltitude
          bftYear={bftYear}
          bftMonth={bftMonth}
          weekOfMonth={weekOfMonth}
          feed={feed}
          rooms={DESK_ROOMS}
          liveNowRoomSlug={liveNowRoomSlug}
          todayCivilKey={todayCivilKey}
          selectedBookingId={selectedBookingId}
          onSelectBooking={setSelectedBookingId}
          selectedRoomSlug={selectedRoomSlug}
          onSelectRoom={setSelectedRoomSlug}
        />
      )}

      {altitude === "day" && dayCell && (
        <div>
          <div className="desk-month-head">
            <button type="button" className="btn-round" aria-label="previous day" onClick={() => stepDay(-1)}>‹</button>
            <div className="desk-month-head__title">
              <p>D{pad2(dayCell.bftDay)} · {dayCell.civilMonthAbbr} {dayCell.civilDayNum}{counts ? ` · day ${dayCell.dayOfYear} · W${dayCell.weekOfYear}` : ""}</p>
            </div>
            <button type="button" className="btn-round" aria-label="next day" onClick={() => stepDay(1)}>›</button>
          </div>
          <DayAltitude
            cell={dayCell}
            feed={feed}
            rooms={DESK_ROOMS}
            liveNowRoomSlug={liveNowRoomSlug}
            selectedRoomSlug={selectedRoomSlug}
            onSelectRoom={setSelectedRoomSlug}
          />
        </div>
      )}
    </div>
  );
}

export default function LovesDesk() {
  return (
    <CalendarPrefsProvider>
      <DeskInner />
    </CalendarPrefsProvider>
  );
}
