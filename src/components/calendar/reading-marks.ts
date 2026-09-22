import {
  DEFAULT_READING_SCHEDULE,
  readingOccurrencesBetween,
  validateReadingSchedule,
  type ReadingSchedule,
} from "@/lib/reading-schedule";
import type { CalendarDayMarks, CalendarDayMarksLookup, CalendarEventPill } from "./DayCell";

/**
 * TASK-385 — the weekly reading, painted onto a calendar cell. A pure
 * module (no React import — the fetch/hook lives in its own "use client"
 * sibling, useReadingSchedule.ts) so this file's logic is unit-testable
 * without a DOM or an effect. The one shared translation from a schedule
 * into `CalendarEventPill`s, per cell, so the real logic (unlike the
 * trivial one-line `LIVE_WEEKDAYS` Set this repo already duplicates three
 * times) is written once for the two member-facing surfaces that need it.
 */

/**
 * `schedule` → a per-cell lookup, the same shape `buildPublicMarks` and
 * `buildBookingMarks` already answer. `schedule: null` (the fetch hasn't
 * resolved yet) answers `undefined` for every cell — never a guessed mark.
 *
 * At most one occurrence per day for a weekly rule, found via
 * `readingOccurrencesBetween`'s start-within semantics over the cell's own
 * UTC-midnight-anchored day window. Never `cell.civilDate.getUTCDay() ===
 * schedule.weekday` — that naive UTC-weekday check would silently diverge
 * from the schedule's true civil day whenever the stored wall-clock time
 * sits close enough to local midnight that the schedule's zone and UTC
 * disagree on the date (Ground, reading-schedule.ts's own tz law).
 *
 * BLACKOUT, deliberate, not an oversight (Astra's plan review, block
 * 968,061): this lookup takes no override/blackout data at all. Unlike
 * `buildPublicMarks`, which skips its own live pill on a blocked,
 * non-retreat day, the reading pill is unaffected by any blackout override
 * and paints on its own schedule regardless — `on: false` is the ONLY way
 * to unpublish a reading (reading-schedule.ts's own docblock: "skipping one
 * week... cannot be expressed by this shape"); a blackout day exists for
 * BOOKING availability, an unrelated concern, and must never silently
 * borrow that meaning. A blocked, non-retreat Wednesday therefore shows
 * the reading pill (from here, which never saw the blackout) with the live
 * pill absent (from `buildPublicMarks`, which did) — two independently-
 * correct facts side by side, neither function silently deferring to the
 * other.
 */
export function readingMarksLookup(schedule: ReadingSchedule | null): CalendarDayMarksLookup {
  return (cell): CalendarDayMarks | undefined => {
    if (!schedule) return undefined;
    const dayStart = cell.civilDate.getTime();
    const [occurrence] = readingOccurrencesBetween(schedule, dayStart, dayStart + 86_400_000);
    if (!occurrence) return undefined;
    const pills: CalendarEventPill[] = [
      { id: `reading-${cell.civilKey}`, label: readingPillLabel(occurrence.startsAtMs), variant: "gold" },
    ];
    return { pills };
  };
}

/**
 * The mark's words (Named decision C): the start time in the VIEWER's own
 * zone, 12-hour with an explicit am/pm marker — the way this same surface
 * already prints a member's booking times (`MemberCalendar.tsx`,
 * `toLocaleString(undefined, { ... hour: "numeric", minute: "2-digit" })`)
 * and the way `SlotPicker.tsx` prints slots — but with `hour12: true`
 * stated explicitly rather than left to the locale's own default:
 * `Intl.DateTimeFormat` with only `hour: "numeric"` does not guarantee an
 * am/pm period at all (several locales, `en-GB` among them, default to
 * 24-hour with that option alone).
 *
 * Production always calls this with `locale` omitted (the browser's own —
 * never the schedule's `tz`-implied locale, never a hardcoded `"en-US"`),
 * e.g. `1:11 PM reading` for a Mountain viewer, `3:11 PM reading` for one
 * in New York. `locale` is exposed only so the `hour12` guarantee is
 * testable independent of the viewer's real locale. The pill only ever
 * renders client-side after the fetch, so the browser's own zone is
 * already the right one — no hydration mismatch.
 */
export function readingPillLabel(startsAtMs: number, locale?: string): string {
  const time = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", hour12: true }).format(
    new Date(startsAtMs),
  );
  return `${time} reading`;
}

/**
 * Unions any number of per-cell lookups for the same cell — `blackout`/
 * `multiDay` OR together, `pills` concatenated IN ARGUMENT ORDER,
 * `undefined` when every lookup answers `undefined`. This is what lets
 * both member-facing surfaces add the reading mark without editing
 * `buildPublicMarks` or `buildBookingMarks` at all.
 *
 * THE CONCATENATION ORDER IS LOAD-BEARING, NOT INCIDENTAL (RULED, Astra's
 * plan review, block 968,061): `DayCell.tsx` caps the DISPLAYED pills at
 * two, folding the rest into an honest "+N more" with no click-through to
 * reveal them today — a pill appended AFTER two others already on a busy
 * day would silently vanish into "+1 more" with no way for a member to
 * ever see it. This function's own contract is therefore: earlier
 * arguments' pills are shown first. Each call site orders its own
 * arguments accordingly; `mergeDayMarks` itself stays a plain,
 * order-preserving concatenation, never a priority sort — the ordering
 * decision belongs to the caller, who knows which of its own pills can
 * most afford to be truncated.
 */
export function mergeDayMarks(...lookups: CalendarDayMarksLookup[]): CalendarDayMarksLookup {
  return (cell): CalendarDayMarks | undefined => {
    let blackout = false;
    let multiDay = false;
    let sawAny = false;
    const pills: CalendarEventPill[] = [];
    for (const lookup of lookups) {
      const marks = lookup(cell);
      if (!marks) continue;
      sawAny = true;
      if (marks.blackout) blackout = true;
      if (marks.multiDay) multiDay = true;
      if (marks.pills) pills.push(...marks.pills);
    }
    if (!sawAny) return undefined;
    const result: CalendarDayMarks = {};
    if (blackout) result.blackout = true;
    if (multiDay) result.multiDay = true;
    if (pills.length > 0) result.pills = pills;
    return result;
  };
}

/**
 * The hook's decision logic, separated from its I/O so it's unit-testable
 * without a fetch mock (RULED, Astra's plan review, block 968,061). Five
 * distinct outcomes:
 *  1. a non-2xx `status` → `null`;
 *  2. a 2xx status but `body.ok !== true` → `null`;
 *  3. `body.config.reading === undefined` (never saved) → `DEFAULT_READING_SCHEDULE`
 *     — the operator page's own contract, absent means the built-in default
 *     publishes;
 *  4. `body.config.reading` present but failing `validateReadingSchedule` →
 *     `null`, NEVER the default — a malformed saved object must read as
 *     honest absence (no mark), not quietly repaint as if Love had never
 *     touched it (an earlier version of this brief folded this outcome
 *     into the default instead of `null`; Astra's review caught that a bad
 *     save and an untouched default would then be indistinguishable, which
 *     they must never be);
 *  5. a valid `reading` present → that schedule itself.
 */
export function normalizeReadingResponse(status: number, body: unknown): ReadingSchedule | null {
  if (status < 200 || status >= 300) return null;
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (o.ok !== true) return null;
  const config = o.config;
  if (!config || typeof config !== "object") return null;
  const raw = (config as Record<string, unknown>).reading;
  if (raw === undefined) return DEFAULT_READING_SCHEDULE;
  const checked = validateReadingSchedule(raw);
  return checked.ok ? checked.value : null;
}
