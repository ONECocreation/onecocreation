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

/* TASK-122 (0018.06.16 a₿) — ONE SOURCE for the desk's clock. The Sept 1
   call showed her desk in "Central" from her iPad: DEFAULT_TZ was hardcoded
   here. A booking mark now takes the artist zone from the BOOKING's own
   `artistTz` (stamped at booking time — the truth that survives the studio
   moving zones), falling back to a caller-passed `artistTz`, then Denver.
   The visitor's zone rides as `visitorTz` and is rendered on the mark when
   present ("booked at 11:11 America/New_York"). Both fields arrive once the
   /api/admin/calendar feed and BookingChip type carry them — that seam is
   another lane's; until then the fallbacks keep today's rendering exact. */
type MarkTz = { artistTz?: string; visitorTz?: string };

const timeLabel = (iso: string, tz: string = DEFAULT_TZ): string =>
  new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: false }).format(
    new Date(iso),
  );

/** cell.civilKey is UTC-midnight-anchored (calendar-view.ts); booking
 *  startUtc is compared the same way, deliberately — this stays internally
 *  consistent with CAL's own math rather than the visitor-local-tz grouping
 *  AdminWeekGrid's older month view used. */
const civilKeyOf = (iso: string): string => new Date(iso).toISOString().slice(0, 10);

export function buildDeskMarks(
  feed: DeskFeed | null,
  opts: { todayCivilKey: string; liveNowRoomSlug?: string | null; artistTz?: string },
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
      const { artistTz: bArtistTz, visitorTz } = b as MarkTz;
      const artistTz = bArtistTz ?? opts.artistTz ?? DEFAULT_TZ;
      // the mark speaks her clock first, then the visitor's frame out loud —
      // never color-only: the zone is NAMED in words
      const label =
        visitorTz && visitorTz !== artistTz
          ? `${timeLabel(b.startUtc, artistTz)} ${b.title} · booked at ${timeLabel(b.startUtc, visitorTz)} ${visitorTz}`
          : `${timeLabel(b.startUtc, artistTz)} ${b.title}`;
      pills.push({ id: b.bookingId, label, variant: "plain" });
    }

    if (!blackout && !multiDay && pills.length === 0) return undefined;
    return { blackout, multiDay, pills: pills.slice(0, 4) };
  };
}

export { civilKeyOf, timeLabel };
