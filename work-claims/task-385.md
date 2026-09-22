# work-claim — task-385 (OC · the weekly reading shows on the calendars)

This file is `work-claims/task-385.md`.

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
**c9ebcb94f2eec21570ecd9f15edcb3764dd8b7ef** (T-381's merge, PR #33 — `git log -1` on this
worktree's HEAD before any commit matches this sha exactly). Branch
`feat/task-385-weekly-reading-on-the-calendars`. Worktree cut by Number One at
`~/dev/worktrees/task-385`, `npm ci` run fresh by this builder (550 packages, 0
vulnerabilities). Lane ports **4634–4637**. Brief:
`~/dev/kimi/inbox/TASK-385-oc-weekly-reading-on-the-calendars.md`.

The ask (the Admiral, block 968,051, walking PR #33's preview): "the reading session isnt
showing up on the calendar." The weekly reading appears as a mark — the same look as the
existing "~11:11 live" gold pill, no new visual design — on every member-facing calendar
surface that already carries that live mark's pattern: the room Events tab
(`CircleView.tsx`) and the member's own `/me/calendar` (`MemberCalendar.tsx`). Data path,
Named decision B: the client fetch of the existing public `GET /api/admin/site`, through
ONE shared hook (`useReadingSchedule`). Base sha sufficient per Named decision E — no T-382
file is opened by this lane's design.

## OWNS

NEW `src/components/calendar/reading-marks.ts` (pure — `readingMarksLookup`,
`readingPillLabel`, `mergeDayMarks`, `normalizeReadingResponse`; no React import), NEW
`src/components/calendar/useReadingSchedule.ts` (the `"use client"` hook, Build 2), NEW
`tests/reading-on-the-calendars.test.ts` (the mark-merging/label/response-normalization/
CircleView/MemberCalendar wiring), extended `tests/reading-schedule.test.ts` (new
`describe` blocks for `readingOccurrencesBetween` only — every existing block untouched),
`work-claims/task-385.md` (this file, first commit).

Additive, narrowly: `src/lib/reading-schedule.ts` (the one new `readingOccurrencesBetween`
export only — every existing export byte-identical), `src/components/rooms/CircleView.tsx`
(new import lines, the `useReadingSchedule()` call, and the one changed `marks` line at the
render site — `buildPublicMarks`'s own function body and the `<WeekRibbon>`/`<BftMonthGrid>`
JSX tags' prop lists stay byte-identical beyond those import lines), `src/components/me/
MemberCalendar.tsx` (new import lines, the `useReadingSchedule()` call, and the one changed
`marks` line — `buildBookingMarks`'s own function body stays byte-identical beyond those
import lines).

## READ-ONLY and FORBIDDEN (per brief)

READ-ONLY: `src/lib/booking-time.ts`, `src/lib/site-config.ts`, `src/app/api/admin/site/
route.ts`, `src/lib/calendar-view.ts`, `src/lib/live.ts`, `src/components/calendar/
BftMonthGrid.tsx`/`WeekRibbon.tsx`/`DayCell.tsx`/`CalendarPrefs.tsx`/`CalendarOptions.tsx`/
`calendar-view.css`/`index.ts`, `src/components/rooms/VantageSwitcher.tsx`/`vantage.ts`,
`src/app/me/calendar/page.tsx`, `src/components/me/MeSwitch.tsx`, `src/app/me/page.tsx`.

FORBIDDEN: `src/components/rooms/ClassroomView.tsx`, `src/app/rooms/[slug]/page.tsx`
(T-382's claimed files), `src/app/api/rooms/marks/route.ts` (T-364's conditional
territory), `src/components/console/desk/marks.ts`/`LovesDesk.tsx`/`WeekAltitude.tsx`/
`DayAltitude.tsx` (the operator desk, Named decision F), `buildPublicMarks`'s and
`buildBookingMarks`'s own function bodies, `LIVE_SCHEDULE`'s string value, any new CSS
class or literal colour, an "Add to my calendar" button, an `.ics` download, any
reminder/email, any production KV/Blob write, any civil-date stamp in this lane's own
commits/claim.

## Gates

`npx vitest run` · each live `scripts/*.test.mjs` (`calendar-view.test.mjs`,
`cartridge-identity.test.mjs`, `square-payments.test.mjs`) · `npx eslint src tests
--max-warnings=0` · `npx tsc --noEmit` · `npx next build` (Number One's gate, after
`git merge main`).

## What is NOT in this lane

No per-member "Add to my calendar" button, no RSVP list, no `.ics` download — this lane
only ever reads the schedule and paints a mark, it writes nothing. No reminders or emails.
No change to `LIVE_SCHEDULE`'s string value or `src/lib/live.ts`. No new calendar look, CSS
class, pill variant, or literal colour — every reading pill uses the identical
`variant: "gold"` the live pill already uses. No rebuild of `buildPublicMarks`'s or
`buildBookingMarks`'s own bodies. Not the operator's `/a` calendar (Named decision F). Not
`ClassroomView.tsx`/`src/app/rooms/[slug]/page.tsx` (T-382's territory) or
`src/app/api/rooms/marks/route.ts` (T-364's conditional territory) — this lane's whole
design avoids opening any of the three. Not a click-through (T-364/T-368's territory) — the
mark stays as inert as the live pill until a later lane wires one in. No `next build`/gate
script run by this builder — Number One runs the gate.

## Cut note

Stamp per the brief, block 968,061 (claimed / Astra's plan review folded).
