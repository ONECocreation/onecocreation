/**
 * Calendar-view math harness (Lane CAL, loves-desk plan). Pure date math,
 * no network, no DOM — asserts the grid shape and the spec's own sanity
 * anchor: Month Six 0018 a₿, D01 = Aug 23 2026, day-of-year 141, W21.
 *
 * Run from the repo root:  node scripts/calendar-view.test.mjs
 */

import path from "path";

const root = path.resolve(new URL("..", import.meta.url).pathname);

const { bftMonthGrid, bftWeek, bftWeekContaining, bftToday, isTodayCell, BFT_DAYS_PER_MONTH } =
  await import(path.join(root, "src", "lib", "calendar-view.ts"));

let passed = 0, failed = 0;
function t(name, cond, extra = "") {
  if (cond) { passed++; }
  else { failed++; console.log(`FAIL  ${name}${extra ? ` — ${extra}` : ""}`); }
}

/* ── the spec's own sanity anchor: Month Six 0018 a₿ ──────────────────────
   "D01 = Aug 23 2026 = day 141 = W21" — pinned to a fixed `nowMs` so the
   test never drifts with the wall clock. Any instant within BFT 0018.06
   works as the reference; Aug 29 2026 (a day this task ran on) decomposes
   to 0018.06.07 under the house's chain-anchored reading. */
const REF_MS = Date.UTC(2026, 7, 29); // 2026-08-29 UTC

const today = bftToday(REF_MS);
t("reference instant decomposes to BFT year 18", today.year === 18, `got ${today.year}`);
t("reference instant decomposes to BFT month 6", today.month === 6, `got ${today.month}`);

const m6 = bftMonthGrid(18, 6, { nowMs: REF_MS });
t("month grid always carries exactly 28 cells", m6.cells.length === 28, `got ${m6.cells.length}`);
t("no cell ever claims BFT day 29", m6.cells.every((c) => c.bftDay <= BFT_DAYS_PER_MONTH));
t("cells are day 1..28 in order", m6.cells.every((c, i) => c.bftDay === i + 1));

const d1 = m6.cells[0];
t("Month Six D01 bftKey", d1.bftKey === "0018.06.01", d1.bftKey);
t("Month Six D01 civil date is 2026-08-23", d1.civilKey === "2026-08-23", d1.civilKey);
t("Month Six D01 day-of-year is 141", d1.dayOfYear === 141, String(d1.dayOfYear));
t("Month Six D01 week-of-year is W21", d1.weekOfYear === 21, String(d1.weekOfYear));
t("Month Six D01 is a civil-month boundary (grid start)", d1.isCivilMonthBoundary === true);
t("Month Six D01 civil month abbr is Aug", d1.civilMonthAbbr === "Aug", d1.civilMonthAbbr);

const d28 = m6.cells[27];
t("Month Six D28 civil date is 2026-09-19", d28.civilKey === "2026-09-19", d28.civilKey);
t("Month Six D28 day-of-year is 168", d28.dayOfYear === 168, String(d28.dayOfYear));

/* civil month-boundary detection: Aug 23 .. Aug 31 (9 cells), then the
   Sep 1 crossing (1 more boundary), covering the rest of the month */
const boundaryCells = m6.cells.filter((c) => c.isCivilMonthBoundary);
t("exactly two civil-month boundaries in Month Six (grid start + the Aug→Sep crossing)",
  boundaryCells.length === 2, String(boundaryCells.length));
const sepCross = m6.cells.find((c) => c.civilMonthAbbr === "Sep" && c.isCivilMonthBoundary);
t("the Aug→Sep boundary cell is civil Sep 1", !!sepCross && sepCross.civilDayNum === 1);
t("the Aug→Sep boundary cell is BFT D10", !!sepCross && sepCross.bftDay === 10, String(sepCross?.bftDay));

/* today's cell, self-consistently */
const todayCell = m6.cells.find((c) => isTodayCell(c, REF_MS));
t("today's cell exists in its own month grid", !!todayCell);
t("today's cell is BFT D07", todayCell?.bftDay === 7, String(todayCell?.bftDay));

/* week slicing: 4 weeks of 7, no overlap, matches the month grid's own cells */
for (let w = 1; w <= 4; w++) {
  const week = bftWeek(18, 6, w, { nowMs: REF_MS });
  t(`week ${w} carries exactly 7 cells`, week.length === 7, String(week.length));
  t(`week ${w} starts on BFT D${(w - 1) * 7 + 1}`, week[0].bftDay === (w - 1) * 7 + 1);
}
const w1 = bftWeek(18, 6, 1, { nowMs: REF_MS });
t("week 1 D01 matches the month grid's own D01", w1[0].bftKey === d1.bftKey);

const containing = bftWeekContaining(18, 6, 10, { nowMs: REF_MS });
t("bftWeekContaining(D10) returns week 2 (D08..D14)", containing[0].bftDay === 8 && containing[6].bftDay === 14);

/* range guards */
let threw = false;
try { bftMonthGrid(18, 14, { nowMs: REF_MS }); } catch { threw = true; }
t("month 14 (out of BFT's 1..13 range) throws", threw);
threw = false;
try { bftMonthGrid(18, 0, { nowMs: REF_MS }); } catch { threw = true; }
t("month 0 throws", threw);
threw = false;
try { bftWeek(18, 6, 5, { nowMs: REF_MS }); } catch { threw = true; }
t("week 5 (out of 1..4) throws", threw);

/* every BFT month, everywhere, is 28 days — spot-check the full year */
for (let m = 1; m <= 13; m++) {
  const grid = bftMonthGrid(18, m, { nowMs: REF_MS });
  t(`month ${m} carries 28 cells`, grid.cells.length === 28);
  t(`month ${m} never reaches day 29`, grid.cells.every((c) => c.bftDay <= 28));
}

/* month boundary continuity: the day after M6D28 is M7D01, one civil day later */
const m7 = bftMonthGrid(18, 7, { nowMs: REF_MS });
const m7d1 = m7.cells[0];
t("M7D01 is exactly one civil day after M6D28",
  m7d1.civilDate.getTime() - d28.civilDate.getTime() === 24 * 3600 * 1000);
t("M7D01 day-of-year is 169 (continues past M6's 168)", m7d1.dayOfYear === 169);

console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
