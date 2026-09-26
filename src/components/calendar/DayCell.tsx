"use client";

import type { CalendarDayCell } from "@/lib/calendar-view";
import type { CalendarPrimary } from "./CalendarPrefs";

export type CalendarPillVariant = "plain" | "gold" | "lav";

export interface CalendarEventPill {
  id: string;
  label: string;
  variant?: CalendarPillVariant;
  /** TASK-480 — a pill that already has somewhere of its own to go (a
   *  reading part's deep link, a booking's receipt page) renders as a
   *  real `<a href>` instead of the inert `<span>` below, whenever the
   *  consumer hasn't wired `onSelectPill` (which still wins — see the
   *  render below). Omit it and nothing changes: today's plain-span
   *  consumers (the Circle's live pill, LovesDesk's own booking pills,
   *  wired through `onSelectPill` instead) are untouched. */
  href?: string;
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
  /** T-248: a pill is its own door — when given, each pill renders as its
   *  own button (same look, `aria-label="open <label>"`) instead of an
   *  inert span, and its click `stopPropagation`s so the day's own
   *  onSelect never also fires. Omit it and the span stays — MemberCalendar
   *  and any other consumer that never wires this keep today's rendering,
   *  byte for byte. */
  onSelectPill?: (pill: CalendarEventPill, cell: CalendarDayCell) => void;
  /** TASK-480 — overrides `MAX_SHOWN_PILLS` for this instance only. Most
   *  consumers leave this unset (the T-319 ruling's cap of 2 stands); the
   *  member calendar passes a higher number so the reading day's own FOUR
   *  agenda parts are never folded into "+N more" — the Admiral's report
   *  named exactly that: "it only shows the 12:12 reading." */
  maxPills?: number;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/* T-319 (0018.06.26 a₿ — the Admiral: the month cell's pills were
   unreadable, truncated to "~1…"/"12:…", with the day-of-year numeral
   floating over them). A cell shows at most two pills, then an honest
   "+N more" — the day's own click (onSelect) already opens the altitude
   that lists everything, so the overflow door needs no wiring of its
   own. Consumers keep their own caps (marks.ts slices at 4, the member
   calendar at 3); this cap is only about what one glance can hold. */
const MAX_SHOWN_PILLS = 2;

export default function DayCell({
  cell, primary, counts, showWeekOfYear, isToday, isSelected, marks, onSelect, onSelectPill, maxPills,
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
  const shownPills = pills.slice(0, maxPills ?? MAX_SHOWN_PILLS);
  const morePills = pills.length - shownPills.length;

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
          {shownPills.map((p) => {
            const pillClass = `cal-pill cal-pill--${p.variant ?? "plain"}`;
            if (onSelectPill) {
              return (
                <button
                  key={p.id}
                  type="button"
                  className={pillClass}
                  aria-label={`open ${p.label}`}
                  onClick={(e) => { e.stopPropagation(); onSelectPill(p, cell); }}
                >
                  {p.label}
                </button>
              );
            }
            /* TASK-480 — a pill with somewhere of its own to go (a
               reading part's deep link, a booking's receipt page) is a
               REAL <a>, never a synthetic onClick: it works with
               JavaScript off, opens in a new tab on a middle-click, and
               reads correctly to a screen reader without an extra prop.
               Never inside a day cell that is itself a <button> (onSelect
               wired): a link inside a button is invalid and its click
               would also fire onSelect, so that cell keeps the plain pill. */
            if (p.href && !onSelect) {
              return (
                <a key={p.id} className={pillClass} href={p.href} aria-label={`open ${p.label}`}>
                  {p.label}
                </a>
              );
            }
            return <span key={p.id} className={pillClass}>{p.label}</span>;
          })}
          {morePills > 0 && <span className="cal-cell__more">+{morePills} more</span>}
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
