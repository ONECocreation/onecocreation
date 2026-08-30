import type { CalendarDayCell } from "@/lib/calendar-view";
import type { CalendarDayMarks, CalendarEventPill, CalendarDayMarksLookup } from "@/components/calendar";
import { DEFAULT_TZ } from "@/lib/booking-time";
import type { DeskFeed } from "./types";

/**
 * Shared mark-building for Love's Desk's Month and Week altitudes (both
 * read the same /api/admin/calendar feed) — one lookup, so a day never
 * disagrees with itself between altitudes.
 *
 * Retreat days ride the SAME mechanism AdminWeekGrid already reads them
 * with: a Retreat's span becomes ordinary `blocked` DateOverrides whose
 * `note` starts with "Retreat" (booking-time.ts's Retreat doc header) —
 * this file just tells those apart from an ordinary day-off block.
 *
 * The Mon/Wed/Fri gold pill is a CALENDAR PROJECTION of live.ts's
 * LIVE_SCHEDULE ("Mon · Wed · Fri ~11:11") — weekday math, never a chain
 * fact, per the honesty riders (loves-desk-and-classroom-plan.md). If
 * LIVE_SCHEDULE's rhythm ever changes, this constant must move with it.
 */
const LIVE_WEEKDAYS = new Set([1, 3, 5]); // Mon, Wed, Fri — live.ts's LIVE_SCHEDULE

const timeLabel = (iso: string): string =>
  new Intl.DateTimeFormat("en-US", { timeZone: DEFAULT_TZ, hour: "numeric", minute: "2-digit", hour12: false }).format(
    new Date(iso),
  );

/** cell.civilKey is UTC-midnight-anchored (calendar-view.ts); booking
 *  startUtc is compared the same way, deliberately — this stays internally
 *  consistent with CAL's own math rather than the visitor-local-tz grouping
 *  AdminWeekGrid's older month view used. */
const civilKeyOf = (iso: string): string => new Date(iso).toISOString().slice(0, 10);

export function buildDeskMarks(
  feed: DeskFeed | null,
  opts: { todayCivilKey: string; liveNowRoomSlug?: string | null },
): CalendarDayMarksLookup {
  return (cell: CalendarDayCell): CalendarDayMarks | undefined => {
    if (!feed) return undefined;
    const override = feed.overrides.find((o) => o.date === cell.civilKey);
    const isRetreat = !!override?.note?.toLowerCase().startsWith("retreat");
    const blackout = !!override && override.kind === "blocked" && !override.start && !isRetreat;
    const multiDay = !!override && isRetreat;

    const pills: CalendarEventPill[] = [];
    if (cell.civilKey === opts.todayCivilKey && opts.liveNowRoomSlug) {
      pills.push({ id: "live-now", label: "● LIVE now", variant: "gold" });
    }
    if (LIVE_WEEKDAYS.has(cell.civilDate.getUTCDay()) && !blackout) {
      pills.push({ id: `live-${cell.civilKey}`, label: "~11:11 live", variant: "gold" });
    }
    for (const b of feed.bookings) {
      if (civilKeyOf(b.startUtc) !== cell.civilKey) continue;
      pills.push({ id: b.bookingId, label: `${timeLabel(b.startUtc)} ${b.title}`, variant: "plain" });
    }

    if (!blackout && !multiDay && pills.length === 0) return undefined;
    return { blackout, multiDay, pills: pills.slice(0, 4) };
  };
}

export { civilKeyOf, timeLabel };
