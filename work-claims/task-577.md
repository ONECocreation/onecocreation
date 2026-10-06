# WORK-CLAIM - TASK-577 - ONE Cocreation: the reading-day reminder goes to the WHOLE mailing list

CLAIMED-BY: Number One, on the Admiral's word at block 970,203: "they should get an email at 2am mountain time it should go out the morning of to remind them of the reading."
BRANCH: `feat/task-577-reading-reminder-whole-list`
WORKTREE: `~/dev/worktrees/task-577`
BASE: origin/main `61c160a9`

THE RULE: the day-of reminder reaches every subscriber record that is not opted out (deduped by email, case-insensitive), not only the "reading" tag. Timing is already done (crons and `dueOccurrenceNow`, 2:00 AM local in the reading's zone) and is NOT touched. Once-key, `isSubscribed` check, start-time re-check and the hourly cap stay exactly as they were.

## OWNS
- `work-claims/task-577.md` (NEW)
- `src/lib/subscribers.ts` (one new export, `listActiveSubscribers`)
- `src/lib/reading-letters.ts` (`sendDayOfIfDue` recipient list only)
- `src/app/a/letters/page.tsx` (the day-of row's "when" line)
- `tests/reading-dayof-whole-list-577.test.ts` (NEW)
- `tests/reading-letters.test.ts`
- `tests/reading-day-of-immediate-484.test.ts`

READ-ONLY: everything else (vercel.json, crons, join-letters.ts, the draft letters, mail rail).

## FOUND, NOT IN THIS LANE
- `join-letters.ts` `joinAudience()` still unions only the `reading` and `reading-seat` tags for the join reminder and start letter; it is a separate letter and was left alone.
- The confirmation backlog sweep in reading-letters.ts (`listSubscribersByTag("reading")`, ~:320) correctly stays tag-only: it confirms a sign-up.
- Hourly cap MAIL_HOURLY_CAP (default 100): a list above 100 is carried over ticks (08:05, 09:05, 15:00 UTC) by the per-recipient once-key, so the tail may arrive later than 2 a.m.
- `ReadingSignUp.tsx` already says "A reminder the morning of each reading" and needed no change.
