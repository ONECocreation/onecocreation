"use client";

import type { CalendarDayCell } from "@/lib/calendar-view";
import type { CalendarPrimary } from "./CalendarPrefs";

export type CalendarPillVariant = "plain" | "gold" | "lav";

export interface CalendarEventPill {
  id: string;
  label: string;
  variant?: CalendarPillVariant;
}

export interface CalendarDayMarks {
  /** rose wash + a "blackout" text mark */
  blackout?: boolean;
  /** lavender wash — this day sits inside a multi-day span */
  multiDay?: boolean;
  /** plain/gold/lav pills — live sessions and the like */
  pills?: CalendarEventPill[];
}

/** Pure lookup a consumer feeds in — the grid/ribbon render, they never fetch. Keyed
 *  by the full cell so a consumer can match on `bftKey`, `civilKey`, or its own logic. */
export type CalendarDayMarksLookup = (cell: CalendarDayCell) => CalendarDayMarks | undefined;

export interface DayCellProps {
  cell: CalendarDayCell;
  primary: CalendarPrimary;
  counts: boolean;
  /** show the week-of-year label — only the first cell of a grid row sets this */
  showWeekOfYear?: boolean;
  isToday?: boolean;
  isSelected?: boolean;
  marks?: CalendarDayMarks;
  onSelect?: (cell: CalendarDayCell) => void;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

export default function DayCell({
  cell, primary, counts, showWeekOfYear, isToday, isSelected, marks, onSelect,
}: DayCellProps) {
  const bftLabel = `D${pad2(cell.bftDay)}`;
  const civilLabel = String(cell.civilDayNum);
  const primaryLabel = primary === "bft" ? bftLabel : civilLabel;
  const cornerLabel = primary === "bft" ? civilLabel : bftLabel;
  // the faint civil month abbreviation rides whichever slot holds the
  // civil value, and only on the cell where the civil month actually
  // changes (the spec's "boundary cells" rule) — in either orientation
  const monthAbbrOnPrimary = primary === "civil" && cell.isCivilMonthBoundary;
  const monthAbbrOnCorner = primary === "bft" && cell.isCivilMonthBoundary;

  const blackout = !!marks?.blackout;
  const multiDay = !!marks?.multiDay;
  const pills = marks?.pills ?? [];

  const classes = [
    "cal-cell",
    blackout && "cal-cell--blackout",
    multiDay && "cal-cell--multiday",
    isToday && "cal-cell--today",
    isSelected && "cal-cell--selected",
    cell.isCivilMonthBoundary && "cal-cell--boundary",
  ].filter(Boolean).join(" ");

  const dateSpoken = `BFT ${cell.bftKey}, civil ${cell.civilMonthAbbr} ${cell.civilDayNum}`;

  const body = (
    <>
      <div className="cal-cell__head">
        <span className="cal-cell__primary">
          {monthAbbrOnPrimary && <span className="cal-cell__month-abbr">{cell.civilMonthAbbr}</span>}
          {primaryLabel}
        </span>
        <span className="cal-cell__corner">
          {monthAbbrOnCorner && <span className="cal-cell__month-abbr">{cell.civilMonthAbbr}</span>}
          {cornerLabel}
        </span>
      </div>
      {showWeekOfYear && counts && <span className="cal-cell__week-label">W{cell.weekOfYear}</span>}
      {blackout && <span className="cal-cell__mark">blackout</span>}
      {pills.length > 0 && (
        <div className="cal-cell__pills">
          {pills.map((p) => (
            <span key={p.id} className={`cal-pill cal-pill--${p.variant ?? "plain"}`}>{p.label}</span>
          ))}
        </div>
      )}
      {counts && <span className="cal-cell__doy">{cell.dayOfYear}</span>}
    </>
  );

  if (!onSelect) {
    return (
      <div className={classes} aria-label={dateSpoken}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      onClick={() => onSelect(cell)}
      aria-pressed={!!isSelected}
      aria-label={dateSpoken}
      style={{ textAlign: "left", cursor: "pointer", font: "inherit" }}
    >
      {body}
    </button>
  );
}
