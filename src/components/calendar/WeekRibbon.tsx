"use client";

import { bftWeek, isTodayCell, type CalendarDayCell } from "@/lib/calendar-view";
import { useCalendarPrefs, type CalendarPrimary } from "./CalendarPrefs";
import DayCell, { type CalendarDayMarksLookup } from "./DayCell";
import "./calendar-view.css";

export interface WeekRibbonProps {
  bftYear: number;
  bftMonth: number;
  /** 1..4 — which of the month's four 7-day weeks */
  weekOfMonth: number;
  primary?: CalendarPrimary;
  counts?: boolean;
  marks?: CalendarDayMarksLookup;
  selectedBftKey?: string;
  onSelectDay?: (cell: CalendarDayCell) => void;
  nowMs?: number;
  className?: string;
}

/**
 * The 7-day strip — Love's Desk "the plan" (Week altitude) and any layout
 * that wants a single-week view. Same dual-date + rose/lavender/today/pill
 * semantics as `BftMonthGrid`, sharing the same `DayCell` atom and the
 * same `CalendarPrefs` slider so a Week view dropped in next to a Month
 * view never disagrees with it.
 */
export default function WeekRibbon({
  bftYear, bftMonth, weekOfMonth, primary: primaryProp, counts: countsProp,
  marks, selectedBftKey, onSelectDay, nowMs, className,
}: WeekRibbonProps) {
  const prefs = useCalendarPrefs();
  const primary = primaryProp ?? prefs.primary;
  const counts = countsProp ?? prefs.counts;

  const cells = bftWeek(bftYear, bftMonth, weekOfMonth, nowMs != null ? { nowMs } : {});
  const first = cells[0];

  const wrapperClass = ["cal-scroll", className].filter(Boolean).join(" ");
  const gridClass = ["cal-week-ribbon", primary === "civil" && "civil-primary"].filter(Boolean).join(" ");

  return (
    <div className={wrapperClass}>
      {counts && first && (
        <p className="cal-legend" style={{ marginTop: 0, marginBottom: 6 }}>
          <span>W{first.weekOfYear}</span>
        </p>
      )}
      <div
        className={gridClass}
        role="grid"
        aria-label={`BFT week ${first?.bftKey ?? ""} — 7 days`}
      >
        {cells.map((cell) => (
          <DayCell
            key={cell.bftKey}
            cell={cell}
            primary={primary}
            counts={counts}
            isToday={isTodayCell(cell, nowMs)}
            isSelected={selectedBftKey === cell.bftKey}
            marks={marks?.(cell)}
            onSelect={onSelectDay}
          />
        ))}
      </div>
    </div>
  );
}
