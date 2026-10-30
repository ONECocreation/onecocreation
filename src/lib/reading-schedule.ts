import { DEFAULT_TZ, wallClockToUtc, zonedDateParts, isValidTz } from "./booking-time.ts";

/**
 * THE READING SCHEDULE (TASK-381, cut at block 968,048) — the ONE source both
 * the public notice (T-382, held on the mockup nod) and the event sign-up
 * block (T-370, later) read: when the weekly reading happens, and whether
 * it's published at all right now.
 *
 * NOT `reading-room.ts` — that file derives WHICH Matrix room a free
 * reading happens IN (the Heart Field Commons). This file is WHEN one
 * happens. The two words collide in English, not in code: neither file
 * imports the other, and nothing here names a room.
 *
 * Pure and dependency-free, same discipline as booking-time.ts (this
 * module's only import is booking-time.ts's own time law) — client-safe,
 * testable alone, no storage driver. site-config.ts owns the stored shape;
 * this file only knows what a valid one looks like and when the next
 * occurrence lands.
 *
 * THE CONTRACT (RULED — T-381 Build 1; T-382 and T-370 both read this, so
 * the words matter):
 *  - `on: false` means "no reading time is published," for EVERY reader —
 *    they say "stay tuned." It does NOT mean "this week is cancelled."
 *    Skipping one week, or a single one-off date, cannot be expressed by
 *    this shape; both are deferred on purpose — a later lane's problem, not
 *    this one's.
 *  - `durationMin` is ELAPSED minutes, an integer from 1 to
 *    `READING_MAX_DURATION_MIN` (12 hours) — long enough for any real
 *    reading, short enough that one week's occurrence can never overlap the
 *    next, and short enough that `nextReading`'s look-back below only ever
 *    needs to check ONE civil day behind "now."
 *  - Readers derive the occurrence's calendar date, and its MDT/MST-style
 *    label, from `startsAtMs` + `schedule.tz` with `Intl` themselves — no
 *    extra field is stored for either.
 */

/** A weekly reading time — the shape stored on `SiteConfig.reading` and
 *  handed to `nextReading`. See the CONTRACT above for what each field
 *  really means, especially `on`. */
export interface ReadingSchedule {
  /** false = nothing published; every reader says "stay tuned." */
  on: boolean;
  /** 0 = Sunday … 6 = Saturday — the same map `zonedDateParts` and
   *  `Date#getUTCDay()` both use. */
  weekday: number;
  /** "HH:MM", 24-hour, wall clock in `tz`. */
  time: string;
  /** the IANA zone `weekday`/`time` are written in. */
  tz: string;
  /** elapsed minutes the reading runs, 1..READING_MAX_DURATION_MIN. */
  durationMin: number;
}

/** 12 hours — keeps one weekly occurrence from ever overlapping the next,
 *  and keeps `nextReading`'s look-back to exactly one civil day (see the
 *  module docblock's CONTRACT). */
export const READING_MAX_DURATION_MIN = 720;

/** Wednesdays 1:11 PM Mountain, on — the Admiral's ruling (block 968,047:
 *  "put 1:11p MST on there for now") until Love or the Admiral types the
 *  real one into /a/site/reading. This is a READER's fallback, never
 *  written to storage by this lane — `defaultSiteConfig()` carries no
 *  `reading` key at all (site-config.ts). */
export const DEFAULT_READING_SCHEDULE: ReadingSchedule = {
  on: true,
  weekday: 3,
  time: "13:11",
  tz: DEFAULT_TZ,
  durationMin: 60,
};

/** Strict "HH:MM", 24-hour — booking-time.ts's own HHMM/toMinutes aren't
 *  exported (its docblock note), so this is that same small check, written
 *  fresh: "24:00" and "7:5" both fail it, same as there. */
const HHMM_24H = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Runtime check of an `unknown` value — never trust the `ReadingSchedule`
 * type alone; a stored doc or a PUT body can carry anything. `reason` is
 * one plain sentence Love can read (the D3 route refusal returns it
 * untouched).
 */
export function validateReadingSchedule(
  raw: unknown,
): { ok: true; value: ReadingSchedule } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "the reading schedule must be an object" };
  }
  const o = raw as Record<string, unknown>;

  const on = o.on;
  if (typeof on !== "boolean") {
    return { ok: false, reason: "on/off must be true or false" };
  }

  const weekday = o.weekday;
  if (typeof weekday !== "number" || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return { ok: false, reason: "the day must be a whole number from 0 (Sunday) to 6 (Saturday)" };
  }

  const time = o.time;
  if (typeof time !== "string" || !HHMM_24H.test(time)) {
    return { ok: false, reason: "the time must be HH:MM in 24-hour time, 00:00 through 23:59" };
  }

  const tz = o.tz;
  if (typeof tz !== "string" || !isValidTz(tz)) {
    return { ok: false, reason: "the time zone must be a real time zone name" };
  }

  const durationMin = o.durationMin;
  if (
    typeof durationMin !== "number" ||
    !Number.isInteger(durationMin) ||
    durationMin < 1 ||
    durationMin > READING_MAX_DURATION_MIN
  ) {
    return {
      ok: false,
      reason: `how long it runs must be a whole number of minutes, from 1 to ${READING_MAX_DURATION_MIN}`,
    };
  }

  return { ok: true, value: { on, weekday, time, tz, durationMin } };
}

/**
 * The next (or currently running) occurrence, as of `nowMs`. `null` when
 * nothing is published (`on: false`), the schedule doesn't validate, or
 * `nowMs` isn't finite — NEVER for "no more occurrences," because a weekly
 * rule always has a next one.
 *
 * Walks CIVIL DATES in the schedule's own zone — never `now + n ×
 * 86_400_000` (booking-time.ts's `slotsFor` probe loop is fine for its own
 * purpose, but a fixed-millisecond step can skip or repeat a local date
 * beside a clock change). `i = -1` is the look-back: a reading that started
 * yesterday evening and crosses midnight is still running this morning —
 * and `durationMin`'s 12-hour cap (see the module docblock) guarantees one
 * day of look-back is always enough, never two.
 *
 * The FIRST candidate (walking i from -1 to +7, i.e. from yesterday to a
 * week out) whose window hasn't ENDED yet wins; `phase` is `"window"` from
 * the start instant (inclusive) to the end instant (exclusive), else
 * `"upcoming"`. Because the search always returns the soonest not-yet-ended
 * candidate, an occurrence already in progress is what comes back — the
 * walk never jumps ahead to next week while today's (or yesterday's) is
 * still running.
 */
export function nextReading(
  schedule: ReadingSchedule,
  nowMs: number,
): { startsAtMs: number; endsAtMs: number; phase: "upcoming" | "window" } | null {
  if (!Number.isFinite(nowMs)) return null;
  const checked = validateReadingSchedule(schedule);
  if (!checked.ok) return null;
  const { on, weekday, time, tz, durationMin } = checked.value;
  if (!on) return null;
  const [hh, mm] = time.split(":").map(Number);

  // "today," as the schedule's OWN zone sees `nowMs` — the walk below steps
  // this civil date, never a millisecond offset.
  const { date } = zonedDateParts(new Date(nowMs), tz);
  const [y, m, d] = date.split("-").map(Number);

  for (let i = -1; i <= 7; i++) {
    // Step the CALENDAR date itself; Date.UTC normalizes day overflow/
    // underflow (d+i below day 1, or past the month's length) on its own —
    // read the normalized y/m/d back with the UTC getters rather than
    // reusing the raw d+i.
    const probe = new Date(Date.UTC(y, m - 1, d + i));
    if (probe.getUTCDay() !== weekday) continue;
    const startsAtMs = wallClockToUtc(
      probe.getUTCFullYear(),
      probe.getUTCMonth() + 1,
      probe.getUTCDate(),
      hh,
      mm,
      tz,
    ).getTime();
    const endsAtMs = startsAtMs + durationMin * 60_000;
    if (endsAtMs > nowMs) {
      return { startsAtMs, endsAtMs, phase: nowMs >= startsAtMs ? "window" : "upcoming" };
    }
  }
  // Unreachable for any schedule validateReadingSchedule accepts: the
  // 12-hour durationMin cap bounds the look-back to one day (i=-1) and the
  // walk-forward to one week (i=7) always lands a matching weekday whose
  // window hasn't ended (see the docblock above) — kept as an honest
  // `null` rather than an `as`-cast past a loop that "can't" fall through.
  return null;
}

/**
 * TASK-557 (block 970,051) - the Admiral, on a Monday: "the /reading page
 * ... is showing the days agenda right now. and it's not a reading day.
 * that should be turned off."
 *
 * IS `nowMs` ON A READING DAY? True when the civil day `nowMs` falls on, as
 * the schedule's OWN zone sees it, is the schedule's weekday. The whole
 * day counts, midnight to midnight in that zone: the Housewarming before
 * the reading and the Book Talk and Q&A after it all belong to that day,
 * so this never asks `nextReading` (which rolls to next week the moment
 * the reading's own window ends, hours before the day's last part).
 * A schedule that is off or malformed has no reading day at all.
 */
export function isReadingDay(schedule: ReadingSchedule, nowMs: number): boolean {
  if (!Number.isFinite(nowMs)) return false;
  const checked = validateReadingSchedule(schedule);
  if (!checked.ok || !checked.value.on) return false;
  const { date } = zonedDateParts(new Date(nowMs), checked.value.tz);
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === checked.value.weekday;
}

/**
 * TASK-557 - DOES THE DAY'S AGENDA SHOW on /reading right now? Three ways
 * to a yes, any one is enough:
 *  - it is a reading day (`isReadingDay`);
 *  - the reading's own window is running (a late reading that crosses
 *    midnight is still that day's reading);
 *  - a part's door is open right now (`anyDoorOpen`: a door Love or the
 *    operator opened by hand on another day - a rehearsal, a special
 *    session - still needs its rows, they are the only part pickers).
 * Every other moment the answer is no and /reading keeps only the date,
 * the countdown and the top screen. Off or malformed schedule: no.
 */
export function dayAgendaShows(schedule: ReadingSchedule, nowMs: number, anyDoorOpen: boolean): boolean {
  const next = nextReading(schedule, nowMs);
  if (!next) return false;
  return anyDoorOpen || next.phase === "window" || isReadingDay(schedule, nowMs);
}

/**
 * TASK-559 (block 970,084) - the owner, on the signed-in view of /reading:
 * "if user is signed in. it is probably a good idea to show them the
 * opportunity to purchase a head of time." TASK-557 hid the day's agenda
 * off a reading day, and that was the only place to buy the Book Talk and
 * the Q&A before the day. This is the yes for a small "Coming up" card that
 * holds just those two rows: true only when the agenda is NOT showing, the
 * visitor is signed in, and there is a next reading to hang them on.
 */
export function buyAheadShows(agendaOn: boolean, signedIn: boolean, hasNext: boolean): boolean {
  return !agendaOn && signedIn && hasNext;
}

/**
 * TASK-616 (K176, Love's mail #86): "Add more dates to the 'coming up' and
 * add these events to the Calendar on the site." The weekly rule above
 * cannot say "a reading on a SUNDAY this once," "only one event this week,
 * due to travel," or "a full day of four parts on November 8" - its own
 * CONTRACT defers exactly that ("skipping one week, or a single one-off
 * date, cannot be expressed by this shape"). This is that shape: a short
 * list of ONE-OFF DATED events, stored on the site-config doc as
 * `readingEvents`, edited by Love from /a/site/reading, and read by
 * /reading's "Coming up" card and by the calendar marks.
 *
 * An event is a CIVIL DATE plus an OPTIONAL wall clock, both in the
 * schedule's own zone - never a UTC instant: "January 5" (the Weekly
 * Intuitive membership opens, no clock) is a whole-day note, and a
 * 12:12/1:11/2:22/3:33 reads exactly as she wrote it, MDT/MST handled by
 * the zone like every other reading time on the site.
 */
export interface ReadingDatedEvent {
  /** "YYYY-MM-DD" - the civil date in the schedule's zone. */
  date: string;
  /** "HH:MM", 24-hour wall clock in the same zone; ABSENT = a whole-day
   *  note with no clock (the "January 5" membership opening). */
  time?: string;
  /** the event's own words - "Read with Love", "The Housewarming". */
  title: string;
  /** a quiet line under the title - "Only one event this week, due to
   *  travel." */
  note?: string;
  /** one optional button - { "Submit your questions here", "/contact" }.
   *  Internal hrefs only (a leading "/"), the KNOWN_NAV_HREFS law's own
   *  rule: a hand-edited doc can never grow an external door. */
  action?: { label: string; href: string };
}

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** a real calendar date, not just a shaped one (2026-02-31 fails) */
function isRealDate(date: string): boolean {
  if (!DATE_ISO.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

/**
 * Runtime check of a `readingEvents` list - the validateReadingSchedule
 * sibling, same contract: `reason` is one plain sentence Love can read
 * (the route refusal returns it untouched). An empty list is valid (the
 * saved "no one-off dates" state).
 */
export function validateReadingDatedEvents(
  raw: unknown,
): { ok: true; value: ReadingDatedEvent[] } | { ok: false; reason: string } {
  if (!Array.isArray(raw)) return { ok: false, reason: "the dated events must be a list" };
  const out: ReadingDatedEvent[] = [];
  for (const [i, v] of raw.entries()) {
    if (!v || typeof v !== "object") return { ok: false, reason: `event ${i + 1} isn't an object` };
    const o = v as Record<string, unknown>;
    if (typeof o.date !== "string" || !isRealDate(o.date)) {
      return { ok: false, reason: `event ${i + 1}: the date must be a real date, YYYY-MM-DD` };
    }
    if (o.time !== undefined && (typeof o.time !== "string" || !HHMM_24H.test(o.time))) {
      return { ok: false, reason: `event ${i + 1}: the time must be HH:MM in 24-hour time, or left empty for a whole-day note` };
    }
    if (typeof o.title !== "string" || !o.title.trim()) {
      return { ok: false, reason: `event ${i + 1}: a title is required` };
    }
    if (o.note !== undefined && typeof o.note !== "string") {
      return { ok: false, reason: `event ${i + 1}: the note must be words` };
    }
    let action: ReadingDatedEvent["action"];
    if (o.action !== undefined) {
      const a = o.action as Record<string, unknown> | null;
      if (!a || typeof a !== "object") return { ok: false, reason: `event ${i + 1}: the button isn't an object` };
      if (typeof a.label !== "string" || !a.label.trim()) {
        return { ok: false, reason: `event ${i + 1}: the button needs its words` };
      }
      if (typeof a.href !== "string" || !a.href.startsWith("/") || a.href.startsWith("//")) {
        return { ok: false, reason: `event ${i + 1}: the button's link must be a page on this site (start with /)` };
      }
      action = { label: a.label.trim().slice(0, 60), href: a.href.slice(0, 120) };
    }
    out.push({
      date: o.date,
      ...(o.time !== undefined ? { time: o.time as string } : {}),
      title: (o.title as string).trim().slice(0, 80),
      ...(typeof o.note === "string" && o.note.trim() ? { note: o.note.trim().slice(0, 160) } : {}),
      ...(action ? { action } : {}),
    });
  }
  return { ok: true, value: out.slice(0, 24) };
}

/** One dated event with its start instant derived - `startsAtMs` is null
 *  for a whole-day note (no clock to derive). */
export interface UpcomingDatedEvent extends ReadingDatedEvent {
  startsAtMs: number | null;
}

/**
 * The dated events still to come, as of `nowMs`, in the schedule's own
 * zone. An event shows through its WHOLE civil day - the same "the whole
 * day counts" law isReadingDay keeps (a 3:33 Q&A must not vanish from
 * "Coming up" at 3:34 while the day is still going). Sorted by date,
 * then by clock, a whole-day note after that day's timed events.
 * Assumes validated input (validateReadingDatedEvents at every
 * boundary); a malformed entry is skipped, never invented.
 */
export function upcomingDatedEvents(
  events: ReadingDatedEvent[],
  nowMs: number,
  tz: string,
): UpcomingDatedEvent[] {
  if (!Number.isFinite(nowMs) || !isValidTz(tz)) return [];
  const { date: today } = zonedDateParts(new Date(nowMs), tz);
  const out: UpcomingDatedEvent[] = [];
  for (const e of events) {
    if (!isRealDate(e.date) || e.date < today) continue;
    let startsAtMs: number | null = null;
    if (e.time && HHMM_24H.test(e.time)) {
      const [y, m, d] = e.date.split("-").map(Number);
      const [hh, mm] = e.time.split(":").map(Number);
      const ms = wallClockToUtc(y, m, d, hh, mm, tz).getTime();
      if (Number.isNaN(ms)) continue;
      startsAtMs = ms;
    }
    out.push({ ...e, startsAtMs });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time ?? "99") < (b.time ?? "99") ? -1 : 1));
  return out;
}

/**
 * Every occurrence whose START instant lies in `[fromMs, toMs)` (TASK-385,
 * the calendar mark) — a calendar pill belongs to the day a reading
 * STARTS, never to a second day it runs into (a reading that starts
 * 11:30 PM UTC and runs an hour is Wednesday's pill only), exactly how the
 * booking pills already match (`MemberCalendar.tsx`'s
 * `b.startUtc.slice(0,10) === cell.civilKey`).
 *
 * Mirrors `nextReading`'s own civil-date walk: anchor the first civil date
 * via `zonedDateParts(new Date(fromMs), tz).date` and the last via
 * `zonedDateParts(new Date(toMs), tz).date`, then step whole civil dates in
 * `schedule.tz` from the first through the last, inclusive — never a
 * `now + n × 86_400_000` INSTANT walk (a fixed-millisecond step can skip or
 * repeat a local date beside a clock change). No look-back is needed for
 * start-within semantics: a start at or after `fromMs` can never fall on an
 * earlier civil date, in the schedule's own zone, than `fromMs` itself.
 *
 * `[]` — never a thrown error, never an invented occurrence — for: a
 * non-finite `fromMs`/`toMs`, an empty or inverted range (`toMs <= fromMs`),
 * a range longer than 366 days (this lane's callers ask for one day; an
 * unbounded walk is a bug, not a feature), an invalid schedule, or
 * `on: false`. Mirrors `nextReading`'s own `null`-for-honest-absence
 * convention.
 *
 * FINITE IS NOT THE SAME AS VALID (Astra's plan review, block 968,061):
 * `Number.isFinite(fromMs)` alone doesn't guarantee `new Date(fromMs)` is a
 * real instant — `fromMs = 1e16` is finite (well under `Number.MAX_VALUE`)
 * but sits outside the ECMAScript Date range (±8,640,000,000,000,000ms from
 * epoch), so `new Date(1e16).getTime()` is `NaN`, and handing an Invalid
 * Date to `zonedDateParts` (which formats it with `Intl.DateTimeFormat`)
 * throws a `RangeError`, not an honest `[]` — both constructed anchor dates
 * are therefore validated explicitly before either ever reaches
 * `zonedDateParts`. The same guard applies inside the loop to every
 * `wallClockToUtc(...)` result — belt and braces for a derived y/m/d near
 * the walk's own edges, even though the bounded walk (a day at a time,
 * capped at 366 days) makes that unreachable today.
 *
 * Deliberately DROPS `nextReading`'s `phase` field — phase is "relative to
 * now," meaningless for a batch range query; a caller that needs it can
 * compare `startsAtMs` to `Date.now()` itself. Does not touch `nextReading`,
 * `validateReadingSchedule`, `DEFAULT_READING_SCHEDULE`, or
 * `ReadingSchedule` — purely additive.
 */
export function readingOccurrencesBetween(
  schedule: ReadingSchedule,
  fromMs: number,
  toMs: number,
): { startsAtMs: number; endsAtMs: number }[] {
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return [];
  if (toMs - fromMs > 366 * 86_400_000) return [];

  // Invalid Date must never reach zonedDateParts (it throws a RangeError on
  // one) — checked explicitly, because a finite ms value isn't always a
  // real instant (see the docblock above).
  const fromDate = new Date(fromMs);
  const toDate = new Date(toMs);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return [];

  const checked = validateReadingSchedule(schedule);
  if (!checked.ok) return [];
  const { on, weekday, time, tz, durationMin } = checked.value;
  if (!on) return [];
  const [hh, mm] = time.split(":").map(Number);

  // The first and last civil dates to walk, as the schedule's OWN zone sees
  // fromMs/toMs — the same technique nextReading uses to read "today."
  const { date: fromDateStr } = zonedDateParts(fromDate, tz);
  const { date: toDateStr } = zonedDateParts(toDate, tz);
  const [fy, fm, fd] = fromDateStr.split("-").map(Number);
  const [ty, tm, td] = toDateStr.split("-").map(Number);
  const firstDayMs = Date.UTC(fy, fm - 1, fd);
  const lastDayMs = Date.UTC(ty, tm - 1, td);

  const occurrences: { startsAtMs: number; endsAtMs: number }[] = [];
  for (let dayMs = firstDayMs; dayMs <= lastDayMs; dayMs += 86_400_000) {
    // Step the CALENDAR date itself, same normalization trick as
    // nextReading's own loop.
    const probe = new Date(dayMs);
    if (probe.getUTCDay() !== weekday) continue;
    const startDate = wallClockToUtc(
      probe.getUTCFullYear(),
      probe.getUTCMonth() + 1,
      probe.getUTCDate(),
      hh,
      mm,
      tz,
    );
    const startsAtMs = startDate.getTime();
    if (Number.isNaN(startsAtMs)) continue; // belt and braces — see the docblock
    if (startsAtMs < fromMs || startsAtMs >= toMs) continue;
    occurrences.push({ startsAtMs, endsAtMs: startsAtMs + durationMin * 60_000 });
  }
  return occurrences;
}
