"use client";

import { bftMonthGrid, isTodayCell, type CalendarDayCell } from "@/lib/calendar-view";
import { useCalendarPrefs, type CalendarPrimary } from "./CalendarPrefs";
import DayCell, { type CalendarDayMarksLookup } from "./DayCell";
import "./calendar-view.css";

export interface BftMonthGridProps {
  bftYear: number;
  /** 1..13 */
  bftMonth: number;
  /** overrides the shared a₿|AD preference for this instance only — most consumers should
   *  leave this unset and let `CalendarPrefsProvider` drive it */
  primary?: CalendarPrimary;
  /** overrides the shared counts preference for this instance only */
  counts?: boolean;
  /** pure per-day lookup — rose blackout / lavender multi-day / gold-plain-lav pills.
   *  The grid renders, it never fetches; DESK/ROOM feed their own data through this. */
  marks?: CalendarDayMarksLookup;
  /** the currently-selected day (by bftKey), if any */
  selectedBftKey?: string;
  onSelectDay?: (cell: CalendarDayCell) => void;
  /** reference "now" — tests/stories only; production leaves this to Date.now() */
  nowMs?: number;
  /** the "28 days, always" legend row — default true */
  legend?: boolean;
  className?: string;
}

/**
 * The full 28-day 4×7 month grid — Love's Desk "the glance" (Month altitude)
 * and the Classroom Four's Circle layout share this. Presentational only:
 * date math comes from `bftMonthGrid` (src/lib/calendar-view.ts, itself
 * riding bft.ts's canonical arithmetic — see that file's header for the
 * dashes-over-estimates honesty stance), and per-day content (blackouts,
 * multi-day spans, live-session pills) is entirely consumer-supplied
 * through `marks`.
 */
export default function BftMonthGrid({
  bftYear, bftMonth, primary: primaryProp, counts: countsProp,
  marks, selectedBftKey, onSelectDay, nowMs, legend = true, className,
}: BftMonthGridProps) {
  const prefs = useCalendarPrefs();
  const primary = primaryProp ?? prefs.primary;
  const counts = countsProp ?? prefs.counts;

  const { cells } = bftMonthGrid(bftYear, bftMonth, nowMs != null ? { nowMs } : {});

  const wrapperClass = ["cal-scroll", className].filter(Boolean).join(" ");
  const gridClass = ["cal-month-grid", primary === "civil" && "civil-primary"].filter(Boolean).join(" ");

  return (
    <div className={wrapperClass}>
      <div
        className={gridClass}
        role="grid"
        aria-label={`BFT month ${bftYear}.${String(bftMonth).padStart(2, "0")} — 28 days`}
      >
        {cells.map((cell, i) => (
          <DayCell
            key={cell.bftKey}
            cell={cell}
            primary={primary}
            counts={counts}
            showWeekOfYear={i % 7 === 0}
            isToday={isTodayCell(cell, nowMs)}
            isSelected={selectedBftKey === cell.bftKey}
            marks={marks?.(cell)}
            onSelect={onSelectDay}
          />
        ))}
      </div>
      {legend && (
        <p className="cal-legend">
          <span><span className="cal-legend__swatch cal-legend__swatch--blackout" />blackout</span>
          <span><span className="cal-legend__swatch cal-legend__swatch--multiday" />multi-day</span>
          <span><span className="cal-legend__swatch cal-legend__swatch--today" />today</span>
          <span>28 days, always — a₿ months never grow a day 29</span>
        </p>
      )}
    </div>
  );
}
