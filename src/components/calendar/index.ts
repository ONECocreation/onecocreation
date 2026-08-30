export { default as BftMonthGrid } from "./BftMonthGrid";
export type { BftMonthGridProps } from "./BftMonthGrid";

export { default as WeekRibbon } from "./WeekRibbon";
export type { WeekRibbonProps } from "./WeekRibbon";

export { default as DayCell } from "./DayCell";
export type {
  DayCellProps,
  CalendarDayMarks,
  CalendarDayMarksLookup,
  CalendarEventPill,
  CalendarPillVariant,
} from "./DayCell";

export { default as CalendarOptions } from "./CalendarOptions";

export {
  CalendarPrefsProvider,
  useCalendarPrefs,
  CALENDAR_PREFS_BOOT_SCRIPT,
} from "./CalendarPrefs";
export type { CalendarPrefs, CalendarPrimary } from "./CalendarPrefs";

export {
  bftMonthGrid,
  bftWeek,
  bftWeekContaining,
  bftToday,
  isTodayCell,
  BFT_DAYS_PER_MONTH,
  BFT_MONTHS_PER_YEAR,
  BFT_DAYS_PER_YEAR,
} from "@/lib/calendar-view";
export type {
  CalendarDayCell,
  CalendarMonthGridResult,
  CalendarViewOptions,
} from "@/lib/calendar-view";
