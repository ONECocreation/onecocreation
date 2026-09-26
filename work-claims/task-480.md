# TASK-480 claim

Builder: sonnet sub-agent for Number One
Block: 968,624+ (Saturday, reading day)
Branch: feat/task-480
Worktree: /home/pac/dev/worktrees/task-480
Base: origin/main e136672

The Admiral's report (today, reading day): "the month and week calendar
in the /me area doesnt show the events for today. it only shows the
12:12 reading, and it's not clickable."

ROOT CAUSE — `src/components/calendar/reading-marks.ts`'s
`readingMarksLookup` (fed to `MemberCalendar.tsx` by
`src/components/me/MemberCalendar.tsx`) only ever modeled ONE occurrence
— `schedule.time` (the Reading itself, whatever Love saved) — never the
other three clock times `/reading`'s own agenda brick shows
(`HOUSEWARMING_TIME`/`ENCORE_TIME`/`QA_TIME`, `src/lib/reading-day.ts`).
Its pill also carried no `href` and `MemberCalendar.tsx` never wires
`DayCell`'s `onSelectPill`, so it rendered as an inert `<span>` — never
clickable.

BUILD:

1. `src/components/calendar/reading-marks.ts` — a new sibling function,
   `readingDayPartsMarksLookup`, models all FOUR parts (Housewarming,
   Reading, Book Talk, Q&A with Love) via the same `sameDayAt` derivation
   `ReadingDay.tsx`/`/reading/page.tsx` already use, titled from a new
   `AGENDA_ROW_TITLES` (reading-parts.ts) and linked via a new
   `readingPartHref(part)` (`/reading?part=N#stage`). It also fixes the
   UTC-day trap: it nets a wide window around the cell then keeps only
   the occurrence whose OWN civil day, read back through
   `zonedDateParts(..., schedule.tz)`, matches the cell's `civilKey` —
   never the old `[cell.civilDate, +86_400_000)` UTC-day window
   `readingMarksLookup` still carries (untouched — CircleView.tsx keeps
   using it, its own pinned tests intact).

2. `src/components/calendar/DayCell.tsx` — `CalendarEventPill` gains an
   optional `href`; a pill carrying one renders as a real `<a>` (never a
   synthetic `onClick`) whenever the consumer hasn't wired
   `onSelectPill` of its own (which still wins, unchanged, for
   LovesDesk). A new `maxPills` prop (threaded through `BftMonthGrid`/
   `WeekRibbon`) overrides the T-319 two-pill display cap per instance;
   `MemberCalendar.tsx` passes 6 so the reading day's four parts are
   never folded into "+N more".

3. `src/components/calendar/calendar-view.css` — `a.cal-pill` gets the
   same door-frame look + a visible `:focus-visible` outline
   `button.cal-pill` already carries (2px solid, `--info`), plus the
   anchor-specific `color:inherit`/`text-decoration:none` resets.

4. `src/components/me/MemberCalendar.tsx` — swaps `readingMarksLookup`
   for `readingDayPartsMarksLookup`; `buildBookingMarks`'s own pills gain
   `href: /book/receipt/${bookingId}` (the page already exists, already
   linked from the session list below); both grid mounts pass
   `maxPills={6}`.

5. `src/lib/reading-parts.ts` — `AGENDA_ROW_TITLES` (the agenda row's own
   four bold titles, `ReadingDayBody.tsx`'s literals, restated once),
   `parseReadingPart` (strict "1".."4" validator), `readingPartHref`.

6. `src/app/reading/page.tsx` — the ONE permitted edit: accepts
   `searchParams: Promise<{ part?: string }>`, reads it through
   `parseReadingPart`, and overrides the door-computed `defaultPart` when
   it validates. No other line in this file changes.

## OWNS

- `work-claims/task-480.md` — this file.
- `src/components/calendar/reading-marks.ts` — EDIT (additive): new
  `readingDayPartsMarksLookup` + its own `partClockWords` helper.
  `readingMarksLookup`/`readingPillLabel`/`mergeDayMarks`/
  `normalizeReadingResponse` untouched, byte-identical.
- `src/components/calendar/DayCell.tsx` — EDIT: `href` on
  `CalendarEventPill`, `maxPills` prop, the new `<a>` render branch.
- `src/components/calendar/BftMonthGrid.tsx` — EDIT: `maxPills` prop,
  threaded straight to `DayCell`.
- `src/components/calendar/WeekRibbon.tsx` — EDIT: same.
- `src/components/calendar/calendar-view.css` — EDIT: `a.cal-pill` rules.
- `src/components/me/MemberCalendar.tsx` — EDIT: see above.
- `src/lib/reading-parts.ts` — EDIT (additive): `AGENDA_ROW_TITLES`,
  `parseReadingPart`, `readingPartHref`.
- `src/app/reading/page.tsx` — EDIT: the one `?part=` read only (see
  build item 6) — every other line stays T-473/T-479/T-481's.
- New test file: `tests/reading-day-calendar-480.test.ts`.
- `tests/member-calendar.test.ts` — EDIT: one pinned expectation
  (`buildBookingMarks`'s exact pill shape) updated to include the new
  `href` field — the only change.

## READ-ONLY

Everything else, explicitly including `src/components/reading/
ReadingStage*.tsx`, `src/components/reading/ReadingDayBody.tsx`,
`src/components/rooms/CircleView.tsx` (keeps `readingMarksLookup`,
untouched), `src/lib/reading-day.ts`, `src/lib/reading-schedule.ts`,
`src/lib/booking-time.ts` — parallel lanes T-478/T-479/T-481 own their
own files under `src/app/reading/` and `src/components/reading/`.
