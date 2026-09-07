/**
 * Calendar-view math harness (Lane CAL, loves-desk plan). Pure date math,
 * no network, no DOM — asserts the grid shape, the spec's own sanity
 * anchor (Month Six 0018 a₿, D01 = Aug 23 2026, day-of-year 141, W21),
 * and TASK-124's boundary law: "today" is read at the live instant,
 * never snapped to a Gregorian UTC midnight (a BFT day is 144 blocks
 * and never aligns with civil midnight).
 *
 * Byte-identical across the vanilla template and onecocreation (module
 * law). Run from the repo root:  node scripts/calendar-view.test.mjs
 */

import path from "path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { registerHooks } from "node:module";

const root = path.resolve(new URL("..", import.meta.url).pathname);

// calendar-view.ts imports "./bb/bft" extensionless (the codebase's own
// convention, which Next.js resolves fine) — teach this standalone runner
// the same trick. The hook is INLINED here (not imported from a helper)
// so this harness stays one self-contained file, byte-identical in both
// repos that share it.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      const notFound = err && typeof err === "object" && "code" in err && err.code === "ERR_MODULE_NOT_FOUND";
      if (notFound && specifier.startsWith(".") && context.parentURL) {
        for (const ext of [".ts", ".tsx", "/index.ts"]) {
          const candidate = new URL(specifier + ext, context.parentURL);
          if (existsSync(fileURLToPath(candidate))) {
            return nextResolve(candidate.href, context);
          }
        }
      }
      throw err;
    }
  },
});

const { bftMonthGrid, bftWeek, bftWeekContaining, bftToday, isTodayCell, BFT_DAYS_PER_MONTH } =
  await import(path.join(root, "src", "lib", "calendar-view.ts"));
const { CHAIN_ANCHORS, estimateHeightAt, fromHeight } =
  await import(path.join(root, "src", "lib", "bb", "bft.ts"));

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

/* ── TASK-124: "today" is read at the live instant, never at UTC midnight ──
   Past the last chain anchor the model runs flat at 600s/block, so the
   estimated instant of any height H ≥ anchorH is exactly
   anchorMs + (H - anchorH)·600_000 — the fixtures below invert the model
   instead of hardcoding dates, and each guard assertion pins that the
   fixture really straddles the boundary it claims to. */
const [anchorMs, anchorH] = CHAIN_ANCHORS[CHAIN_ANCHORS.length - 1];
const MS_PER_BLOCK = 600_000;
const instantOf = (h) => anchorMs + (h - anchorH) * MS_PER_BLOCK;
const sameBftDay = (a, b) => a.year === b.year && a.month === b.month && a.day === b.day;

/* (a) 30 blocks after a 144-block boundary, "today" is the NEW day — the
   old midnight-snapping code read the day that was current at 00:00 UTC
   and highlighted YESTERDAY until the next civil midnight. */
const boundary = (Math.floor(anchorH / 144) + 1) * 144; // first 144-boundary above the anchor
const afterMs = instantOf(boundary + 30);
const newDay = fromHeight(boundary + 30);
const snappedDay = fromHeight(estimateHeightAt(Math.floor(afterMs / 86_400_000) * 86_400_000));
t("(a) fixture guard: the UTC-midnight snap really reads the OLD BFT day at this instant",
  !sameBftDay(snappedDay, newDay),
  `snap ${snappedDay.year}.${snappedDay.month}.${snappedDay.day} vs live ${newDay.year}.${newDay.month}.${newDay.day}`);
const afterToday = bftToday(afterMs);
t("(a) 30 blocks past a 144-boundary, bftToday reads the NEW day",
  sameBftDay(afterToday, newDay),
  `got ${afterToday.year}.${afterToday.month}.${afterToday.day}, want ${newDay.year}.${newDay.month}.${newDay.day}`);
const newGrid = bftMonthGrid(newDay.year, newDay.month, { nowMs: afterMs });
t("(a) the NEW day's own cell is the one highlighted", isTodayCell(newGrid.cells[newDay.day - 1], afterMs));
const prevDay = fromHeight(boundary - 1);
if (prevDay.year === newDay.year && prevDay.month === newDay.month) {
  t("(a) the OLD day's cell is NOT highlighted", !isTodayCell(newGrid.cells[prevDay.day - 1], afterMs));
}

/* (b) two instants on the same BFT day but different UTC dates give the
   same cell — the BFT day, not the civil date, decides the highlight. */
const beatZeroMs = instantOf(boundary);
const nextUtcMidnight = (Math.floor(beatZeroMs / 86_400_000) + 1) * 86_400_000;
const straddleBeat = Math.ceil((nextUtcMidnight - beatZeroMs) / MS_PER_BLOCK); // first beat after the civil date line
t("(b) fixture guard: a UTC midnight falls strictly inside this BFT day",
  straddleBeat >= 1 && straddleBeat <= 143, `beat ${straddleBeat}`);
const msEarly = instantOf(boundary + straddleBeat - 1); // last beat on the first UTC date
const msLate = instantOf(boundary + straddleBeat);      // first beat on the next UTC date
t("(b) fixture guard: the two instants fall on different UTC dates",
  new Date(msEarly).toISOString().slice(0, 10) !== new Date(msLate).toISOString().slice(0, 10),
  `${new Date(msEarly).toISOString()} vs ${new Date(msLate).toISOString()}`);
const earlyToday = bftToday(msEarly);
const lateToday = bftToday(msLate);
t("(b) both instants read the same BFT day across the civil date line", sameBftDay(earlyToday, lateToday),
  `${earlyToday.day} vs ${lateToday.day}`);
const straddleCell = bftMonthGrid(earlyToday.year, earlyToday.month, { nowMs: msEarly }).cells[earlyToday.day - 1];
t("(b) both instants highlight the same cell",
  isTodayCell(straddleCell, msEarly) && isTodayCell(straddleCell, msLate));

/* (c) a live-tip override wins over the estimate — the surface that has
   the chain's own reading never falls back to the model for "today". */
const overrideH = boundary + 30;
const estimated = bftToday(REF_MS);
t("(c) fixture guard: the estimate at the reference instant reads a different day than the override",
  !sameBftDay(estimated, newDay));
const overridden = bftToday(REF_MS, overrideH);
t("(c) bftToday's height override wins over the estimate",
  overridden.height === overrideH && sameBftDay(overridden, newDay),
  `got height ${overridden.height} day ${overridden.day}`);
t("(c) the grid's today highlight follows the override too",
  isTodayCell(newGrid.cells[newDay.day - 1], REF_MS, overrideH));

console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
