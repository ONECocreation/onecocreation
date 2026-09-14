"use client";

import type { CalendarDayCell } from "@/lib/calendar-view";
import { WeekRibbon, type CalendarEventPill } from "@/components/calendar";
import { bftWeek } from "@/lib/calendar-view";
import MaterialsShelf from "./MaterialsShelf";
import RosterPanel from "./RosterPanel";
import { buildDeskMarks, civilKeyOf, timeLabel } from "./marks";
import type { BookingChip, DeskFeed, DeskRoom } from "./types";

/**
 * T-248: the same "you're working this meeting" breadcrumb the Week
 * altitude always showed for its own schedule-panel selection now also
 * answers the Day altitude's booking-pill click — DERIVED here once and
 * imported there, never a second card (the brief's own wording).
 */
export function BookingBreadcrumb({ altitude, selected }: { altitude: "Week" | "Day"; selected: BookingChip | null }) {
  if (!selected) return null;
  return (
    <p className="desk-breadcrumb">
      Desk › {altitude} › <b>{selected.title} · {timeLabel(selected.startUtc)}</b> — you&apos;re working this meeting
    </p>
  );
}

/**
 * Love's Desk — Week ("the plan"): the ribbon + three columns (Schedule /
 * Materials / Roster), per the ruled spec. Bookings (booking-time.ts) do
 * NOT carry a room slug — meetingRail is jitsi/static/matrix/orbee/
 * inPerson, never one of matrix-rooms.ts's ROOMS — so this altitude keeps
 * two independent selections: the SCHEDULE selection (a booking, for the
 * breadcrumb + "this session" material tag) and a separate ROOM picker
 * (for the classroom-only Materials/Roster panels). A fabricated
 * booking→room mapping would be dishonest; two visible pickers is the
 * honest shape of the real data (scope note in the lane report).
 */
export default function WeekAltitude({
  bftYear,
  bftMonth,
  weekOfMonth,
  feed,
  rooms,
  liveNowRoomSlug,
  todayCivilKey,
  selectedBookingId,
  onSelectBooking,
  selectedRoomSlug,
  onSelectRoom,
  onSelectDay,
  onSelectPill,
}: {
  bftYear: number;
  bftMonth: number;
  weekOfMonth: number;
  feed: DeskFeed | null;
  rooms: DeskRoom[];
  liveNowRoomSlug: string | null;
  todayCivilKey: string;
  selectedBookingId: string | null;
  onSelectBooking: (id: string | null) => void;
  selectedRoomSlug: string | null;
  onSelectRoom: (slug: string) => void;
  /** T-248: the week's day blocks were inert (WeekRibbon always accepted
   *  onSelectDay; this altitude just never passed it on) — the Admiral's
   *  "make the weekly buttons also clickable". Same jumpToDay(cell.bftDay)
   *  the month grid already uses, wired one level up in LovesDesk. */
  onSelectDay?: (cell: CalendarDayCell) => void;
  /** T-248: a booking/live pill inside the ribbon — LovesDesk resolves it. */
  onSelectPill?: (pill: CalendarEventPill, cell: CalendarDayCell) => void;
}) {
  const marks = buildDeskMarks(feed, { todayCivilKey, liveNowRoomSlug });

  const cells = bftWeek(bftYear, bftMonth, weekOfMonth);
  const loKey = cells[0]?.civilKey;
  const hiKey = cells[cells.length - 1]?.civilKey;

  const bookings = (feed?.bookings ?? [])
    .filter((b) => {
      const k = civilKeyOf(b.startUtc);
      return loKey && hiKey && k >= loKey && k <= hiKey;
    })
    .sort((a, b) => (a.startUtc < b.startUtc ? -1 : 1));

  const selected = bookings.find((b) => b.bookingId === selectedBookingId) ?? null;

  return (
    <div>
      <WeekRibbon
        bftYear={bftYear}
        bftMonth={bftMonth}
        weekOfMonth={weekOfMonth}
        marks={marks}
        onSelectDay={onSelectDay}
        onSelectPill={onSelectPill}
      />
      <BookingBreadcrumb altitude="Week" selected={selected} />
      <div className="desk-grid-3">
        <div className="desk-panel">
          <div className="desk-panel__head"><h3>Schedule</h3></div>
          {bookings.length === 0 && <p className="desk-panel__muted">nothing on the books this week</p>}
          <ul className="desk-shelf__list">
            {bookings.map((b) => (
              <li key={b.bookingId}>
                <button
                  type="button"
                  className={`desk-schedule__row${b.bookingId === selectedBookingId ? " desk-schedule__row--working" : ""}`}
                  onClick={() => onSelectBooking(b.bookingId === selectedBookingId ? null : b.bookingId)}
                  aria-pressed={b.bookingId === selectedBookingId}
                >
                  <b>{timeLabel(b.startUtc)}</b> {b.title} — {b.customer}
                  {b.needsFulfil && <span aria-hidden="true"> ⚑</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="desk-room-picker">
            <label htmlFor="desk-week-room">room</label>
            <select id="desk-week-room" value={selectedRoomSlug ?? ""} onChange={(e) => onSelectRoom(e.target.value)}>
              {rooms.map((r) => <option key={r.slug} value={r.slug}>{r.title}</option>)}
            </select>
          </div>
          <MaterialsShelf
            roomSlug={selectedRoomSlug}
            sessionKey={selectedBookingId}
            sessionLabel={selected ? selected.title : "this session"}
          />
        </div>

        <RosterPanel
          roomSlug={selectedRoomSlug}
          roomTitle={rooms.find((r) => r.slug === selectedRoomSlug)?.title ?? null}
        />
      </div>
    </div>
  );
}
