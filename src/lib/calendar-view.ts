/**
 * Calendar-view math — the shared foundation for Love's Desk / the
 * Classroom Four's a₿ month grid + week ribbon (Lane CAL, loves-desk plan).
 *
 * ALL block arithmetic is bft.ts's — this file never reimplements the
 * 13×28×144 shape, it only walks whole BFT days and asks bft.ts what each
 * one is. Two families live in bft.ts:
 *   - `heightAt`/`fromGregorian` — a FLAT 600s/block model off the chain's
 *     literal genesis instant. It does not track how much faster the real
 *     chain has run since 2009, so by now it reads several BFT MONTHS
 *     behind the anchored reading below (verified while building this
 *     file: it puts "today" in AB 17 · M10, not the AB 18 · M06 the rest
 *     of the house's clocks agree on).
 *   - `estimateHeightAt`/`fromHeight` — the CHAIN-ANCHORED model (real
 *     halving heights + the pupil's recent anchor, `CHAIN_ANCHORS`),
 *     extrapolated flat past the last anchor. This is the one every other
 *     face on the site reads "today" from, so it's the one this grid
 *     anchors to as well.
 *
 * HONESTY STANCE (dashes-over-estimates, fleet ruling 0018.05.26 a₿):
 * `estimateHeightAt`'s own header says nothing in src/ may RENDER its
 * output — that guards against a modeled block HEIGHT masquerading as a
 * live chain fact (a fake "block N"). This file never renders a height; it
 * uses one internal, un-displayed height read (today's) purely to learn
 * which BFT day "today" is, then walks every other day by whole calendar
 * days from there — the exact pattern `src/app/a/money/page.tsx` already
 * uses (`bftDateTime(estimateHeightAt(...))`, always `~`-marked). Every
 * date this module hands out is a CALENDAR PROJECTION: correct for the
 * current era (this grid is a near-term scheduling tool, not a history
 * book), never a block-height claim. A future day's cell never claims a
 * height, block, or "at block N" fact — only a day label.
 */

import { fromHeight, estimateHeightAt, type BftKnown } from "./bb/bft.ts";

export const BFT_DAYS_PER_MONTH = 28;
export const BFT_MONTHS_PER_YEAR = 13;
export const BFT_DAYS_PER_YEAR = BFT_DAYS_PER_MONTH * BFT_MONTHS_PER_YEAR; // 364
const MS_PER_DAY = 86_400_000;

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const pad = (n: number, w: number) => String(n).padStart(w, "0");

/** One BFT calendar day, decomposed for grid rendering. Every field is
 *  calendar math (see file header) — never a chain fact. */
export interface CalendarDayCell {
  /** the BFT year this cell belongs to (AB epoch — same shape as bft.ts's `year`) */
  bftYear: number;
  /** the BFT month this cell belongs to, 1..13 */
  bftMonth: number;
  /** the BFT day of month, 1..28 — never 29, a₿ months don't grow one */
  bftDay: number;
  /** "0018.06.07" — stable id for this cell, safe as a React key or an event map key */
  bftKey: string;
  /** the civil (Gregorian, UTC-midnight-anchored) date this BFT day projects onto */
  civilDate: Date;
  /** civilDate's day-of-month, e.g. 23 */
  civilDayNum: number;
  /** civilDate's month abbreviation, e.g. "Aug" — always present; components show it only on boundary cells */
  civilMonthAbbr: string;
  /** "2026-08-23" — civilDate as an ISO day string, for consumers keying off the civil calendar instead */
  civilKey: string;
  /** true when this cell's civil month differs from the previous cell's (or it's the grid's first cell) —
   *  the faint civil month abbreviation only surfaces on these cells */
  isCivilMonthBoundary: boolean;
  /** BFT day-of-year, 1..364 */
  dayOfYear: number;
  /** BFT week-of-year, ceil(dayOfYear / 7), 1..52 */
  weekOfYear: number;
}

export interface CalendarMonthGridResult {
  bftYear: number;
  bftMonth: number;
  /** always exactly 28 */
  cells: CalendarDayCell[];
}

export interface CalendarViewOptions {
  /** reference "now" instant, ms since epoch — defaults to Date.now(). Tests pin this to get
   *  a deterministic grid; production leaves it out. */
  nowMs?: number;
}

function bftDayIndex(year: number, month: number, day: number): number {
  return year * BFT_DAYS_PER_YEAR + (month - 1) * BFT_DAYS_PER_MONTH + (day - 1);
}

/** Today's BFT reading, anchored to the chain (see file header) — the ONE height read this
 *  module performs, never rendered, only decomposed into a day index. */
export function bftToday(nowMs: number = Date.now()): BftKnown {
  const todayMidnightMs = Math.floor(nowMs / MS_PER_DAY) * MS_PER_DAY;
  const height = estimateHeightAt(todayMidnightMs);
  const reading = fromHeight(height);
  if (reading.known) return reading;
  // estimateHeightAt only returns a negative height for dates before the
  // chain's own genesis instant — not a reachable "today". Fall back to
  // genesis itself so the grid still renders something coherent rather
  // than throwing.
  return fromHeight(0);
}

function buildCell(
  bftYear: number,
  bftMonth: number,
  bftDay: number,
  todayMidnightMs: number,
  todayIdx: number,
  prevCivilMonth: number | null,
): CalendarDayCell {
  const targetIdx = bftDayIndex(bftYear, bftMonth, bftDay);
  const deltaDays = targetIdx - todayIdx;
  const civilDate = new Date(todayMidnightMs + deltaDays * MS_PER_DAY);
  const civilMonth = civilDate.getUTCMonth();
  const dayOfYear = (bftMonth - 1) * BFT_DAYS_PER_MONTH + bftDay;
  return {
    bftYear,
    bftMonth,
    bftDay,
    bftKey: `${pad(bftYear, 4)}.${pad(bftMonth, 2)}.${pad(bftDay, 2)}`,
    civilDate,
    civilDayNum: civilDate.getUTCDate(),
    civilMonthAbbr: MONTH_ABBR[civilMonth],
    civilKey: civilDate.toISOString().slice(0, 10),
    isCivilMonthBoundary: prevCivilMonth === null || civilMonth !== prevCivilMonth,
    dayOfYear,
    weekOfYear: Math.ceil(dayOfYear / 7),
  };
}

/** The full 28-day 4×7 month grid for a given BFT (year, month 1..13). Pure calendar
 *  math — never fetches, never renders a height. Consumers feed events/marks in per cell
 *  (keyed by `bftKey` or `civilKey`); this function only produces the dates. */
export function bftMonthGrid(
  bftYear: number,
  bftMonth: number,
  opts: CalendarViewOptions = {},
): CalendarMonthGridResult {
  if (!Number.isInteger(bftMonth) || bftMonth < 1 || bftMonth > BFT_MONTHS_PER_YEAR) {
    throw new RangeError(`bftMonthGrid: month out of range 1..${BFT_MONTHS_PER_YEAR}: ${bftMonth}`);
  }
  const nowMs = opts.nowMs ?? Date.now();
  const todayMidnightMs = Math.floor(nowMs / MS_PER_DAY) * MS_PER_DAY;
  const today = bftToday(nowMs);
  const todayIdx = bftDayIndex(today.year, today.month, today.day);

  const cells: CalendarDayCell[] = [];
  let prevCivilMonth: number | null = null;
  for (let d = 1; d <= BFT_DAYS_PER_MONTH; d++) {
    const cell = buildCell(bftYear, bftMonth, d, todayMidnightMs, todayIdx, prevCivilMonth);
    cells.push(cell);
    prevCivilMonth = cell.civilDate.getUTCMonth();
  }
  return { bftYear, bftMonth, cells };
}

/** One BFT week (1..4) within a month — a 4-way slice of `bftMonthGrid`, since 28/7 = 4
 *  exactly and BFT weeks never cross a month boundary. */
export function bftWeek(
  bftYear: number,
  bftMonth: number,
  weekOfMonth: number,
  opts: CalendarViewOptions = {},
): CalendarDayCell[] {
  if (!Number.isInteger(weekOfMonth) || weekOfMonth < 1 || weekOfMonth > 4) {
    throw new RangeError(`bftWeek: weekOfMonth out of range 1..4: ${weekOfMonth}`);
  }
  const { cells } = bftMonthGrid(bftYear, bftMonth, opts);
  const start = (weekOfMonth - 1) * 7;
  return cells.slice(start, start + 7);
}

/** The 7-day week ribbon containing a specific BFT day — convenience wrapper over `bftWeek`
 *  for consumers who have a selected date rather than a week index. */
export function bftWeekContaining(
  bftYear: number,
  bftMonth: number,
  bftDay: number,
  opts: CalendarViewOptions = {},
): CalendarDayCell[] {
  const weekOfMonth = Math.ceil(bftDay / 7);
  return bftWeek(bftYear, bftMonth, weekOfMonth, opts);
}

/** True when `cell` is "today" per the same reference instant. Pass the same `nowMs` you
 *  built the grid with (or leave both at the live default) so a cell and its "is this
 *  today" check never disagree. */
export function isTodayCell(cell: CalendarDayCell, nowMs: number = Date.now()): boolean {
  const today = bftToday(nowMs);
  return cell.bftYear === today.year && cell.bftMonth === today.month && cell.bftDay === today.day;
}
