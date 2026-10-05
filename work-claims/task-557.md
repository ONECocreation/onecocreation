# WORK-CLAIM - TASK-557 - ONE Cocreation: the day's agenda on /reading shows only on a reading day

CLAIMED-BY: Lumen, on the Admiral's word at block 970,051 (a Monday): "the /reading page on onecocreation is showing the days agenda right now. and it's not a reading day. that should be turned off."
BRANCH: `feat/task-557-agenda-reading-day-only`
WORKTREE: `~/dev/worktrees/task-557`
BASE: origin/main `5a2db38` (merge of PR #147)

## THE RULE
"The day's agenda" card on /reading shows when any one of these is true, and at no other time:
1. it is a reading day: the schedule's weekday, midnight to midnight in the schedule's own zone;
2. the reading's own window is running (a late reading that crosses midnight);
3. a part's door is open right now (a door opened by hand on another day still needs its rows, they are the only part pickers).

On every other day /reading keeps the date, the countdown, the top screen, the sign-up box and the replays.

## OWNS
- `work-claims/task-557.md` (NEW)
- `src/lib/reading-schedule.ts` (adds `isReadingDay`, `dayAgendaShows`; nothing existing changed)
- `src/app/reading/page.tsx` (one decision, `agendaOn`; the agenda's section rides it)
- `tests/agenda-reading-day-557.test.ts` (NEW)
- `src/lib/reading-day.ts` (adds `opensWords`; nothing existing changed)
- `src/components/reading/ReadingStageDoor.tsx` (one optional prop, `opensWords`; without it the card reads `whenWords` as before)
- `src/components/reading/ReadingStagePart1.tsx` (hands `opensWords` down)
- `src/components/reading/ReadingStagePart3.tsx` (hands `opensWords` down)
- `src/components/reading/ReadingStagePart4.tsx` (hands `opensWords` down)
- `tests/opens-words-557.test.ts` (NEW)

READ-ONLY: everything else. `ReadingDay.tsx` and `ReadingDayBody.tsx` are untouched (the rows, their words, their buttons and their times are as they were). No setting, no switch, no stored data changes.

## FOUND, NOT IN THIS LANE
- With the schedule switched off, the agenda's section drew an empty band (its padding and dashed line with nothing inside). This lane's change removes that band too, as a side effect of the section riding the decision.
- (Was: the top screen's waiting words name a clock and no day on every day of the week. Now in this lane, see SECOND ASK below.)
- The rows' clock words are worked out from the NEXT reading. On Saturday, October 31, 2026, after the reading's own hour ends, "next" is November 7, which is on standard time, so that afternoon's rows and the top screen would say MST while the day is still on MDT. Not touched here.

## SECOND ASK (block 970,060)
Shown "The Housewarming is not live yet. Opens 12:12 PM MDT." on a Monday, the Admiral: "yes should say opens the next time the site is set to go live. so if she doesnt have a live scheduled for the week after next, it would react to that as well."

- On a day that is not a reading day the closed top card names the day: "Opens Saturday, October 10 at 12:12 PM MDT." On a reading day it stays the clock alone ("Opens 12:12 PM MDT."), the words that day has always read.
- Every word is read off the schedule's next reading (`nextReading`), so a new weekday or time moves the card with nothing typed, and with the schedule off there is no "Opens" line.
- The clock's three words are tied with no-break spaces, so a phone wraps before the time and never inside it.
- The chip on the picture ("12:12 PM MDT · The Housewarming") is unchanged.
- `src/app/reading/page.tsx` imports `opensWords` on its own line: `tests/reading-page.test.ts` (S8) pins the existing import line, and that line is as it was.

NOT IN THIS LANE, AND NOT POSSIBLE YET: skipping ONE week. The stored schedule is one weekly time and an on/off switch (`reading-schedule.ts`, THE CONTRACT: "Skipping one week, or a single one-off date, cannot be expressed by this shape"). The card will follow a skipped week the day the schedule can hold one, because it reads `nextReading`. That control is its own lane, mockup first.
