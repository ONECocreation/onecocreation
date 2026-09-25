import { wallClockToUtc, zonedDateParts } from "./booking-time.ts";

/**
 * THE DAY'S AGENDA (TASK-467, block 968,561) — the ONLY place the Reading
 * Day brick's two clock times and its one store item id are written.
 * Every other file that needs one of these three values IMPORTS it from
 * here; nothing else hardcodes them (tests/reading-day-467.test.ts pins
 * this).
 *
 * The call with Love, Thu 2026-09-24 (briefings/walk-968482/walk.txt,
 * 42:41–45:03): "just put this whole room brick right in the other on
 * the weekly reading page … with three buttons of the times … the
 * reading, then the second stage, then the q&a."
 *
 * The Admiral, tracker note (block 968,561): "make sure to have a brick
 * that shows an agenda with times names of sessions prices if applicable
 * and links to watch the video. so the video for the book reading is in
 * the heart field stage, the encore is in the playground … the q&a is in
 * the evening star." The Admiral, same block: the Encore starts at
 * "2:22 PM MDT," and "they can even buy the q&a for the one time 33, or
 * if they are part of the evening star they get q&a included."
 *
 * Both clock times are WALL CLOCK "HH:MM" (24h) in the reading schedule's
 * OWN zone (`ReadingSchedule.tz`) — not a UTC offset, the same law
 * `booking-time.ts`'s own docblock names, and both happen to be two of
 * `slotsFor`'s own "five sacred numbers" (booking-time.ts:324-336).
 */

/** The Encore in the Playground — 2:22 PM, the reading's own day. */
export const ENCORE_TIME = "14:22";

/** The Q&A with Love — 3:33 PM, the reading's own day. */
export const QA_TIME = "15:33";

/**
 * The Q&A's one-time store pass — live today at $33.33, kind "digital"
 * (buying it grants NO room access on its own until the Admiral makes it
 * a tier-C package with a window in /a/store; see the register). The
 * not-entitled Q&A row falls back to adding the Evening Star package
 * itself (its own item id, derived from `TIER_PAGES` — never a second
 * literal here) when this pass isn't live.
 */
export const QA_ITEM_ID = "q-a-meetup-with-love";

const CLOCK_LABEL: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

/**
 * "1:11 PM MDT" — the same two-step Intl derivation
 * `ReadingHeroCountdown.tsx`'s own (unexported) `clockAt`/`zoneLabel`
 * pair uses, written fresh here because that pair isn't exported. Pure:
 * the same `ms`+`tz` always reads the same words.
 */
export function clockWords(ms: number, tz: string): string {
  const clock = new Intl.DateTimeFormat("en-US", { timeZone: tz, ...CLOCK_LABEL }).format(new Date(ms));
  const zoneParts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(
    new Date(ms),
  );
  const zone = zoneParts.find((p) => p.type === "timeZoneName")?.value ?? tz;
  return `${clock} ${zone}`;
}

/**
 * The same CIVIL DATE as `anchorMs` (read in `tz`), at the wall-clock
 * "HH:MM" `hhmm` names — the Encore and the Q&A both ride the reading's
 * own day, never a separately-derived date. Mirrors `nextReading`'s own
 * civil-date-then-wall-clock technique (reading-schedule.ts) rather than
 * a millisecond offset, so a reading that starts near a DST boundary
 * still lands its Encore/Q&A on the SAME calendar day in `tz`.
 */
export function sameDayAt(anchorMs: number, tz: string, hhmm: string): number {
  const [hh, mm] = hhmm.split(":").map(Number);
  const { date } = zonedDateParts(new Date(anchorMs), tz);
  const [y, m, d] = date.split("-").map(Number);
  return wallClockToUtc(y, m, d, hh, mm, tz).getTime();
}
