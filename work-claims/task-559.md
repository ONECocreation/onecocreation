# WORK-CLAIM - TASK-559 - ONE Cocreation: a signed-in visitor on /reading (no letters card, the two paid rows ahead of time)

CLAIMED-BY: Lumen, on the Admiral's two review marks, block 970,084: "when a user is already signed in, can we remove the keep me posted letters. they are already signed up for the mailing list." and "if user is signed in. it is probably a good idea to show them the opportunity to purchase a head of time."
BRANCH: `feat/task-559-signed-in-buy-ahead`
WORKTREE: `~/dev/worktrees/task-559`
BASE: T-557's commit `0d8efccb` (stacked on lane T-557)

## THE RULE
A signed-in email member never sees the "Keep me posted" letters card, because every email sign-in already adds them to the mailing list. A member signed in by a Nostr key keeps that card, and the "You're in." card right after signing in through the box still shows. On a day the agenda is hidden, a signed-in visitor sees a small "Coming up" card holding only the Book Talk and the Q&A, with the same prices and the same Unlock buttons as on a reading day.

## OWNS
- `work-claims/task-559.md` (NEW)
- `src/components/rooms/ReadingSignInBox.tsx` (Case 3 returns null for an email member)
- `src/app/kit.css` (two rules: an empty section draws no band)
- `src/lib/reading-day.ts` (adds `dayWords`; `opensWords` calls it)
- `src/lib/reading-schedule.ts` (adds `buyAheadShows`)
- `src/components/reading/ReadingDayBody.tsx` (one optional prop, `ahead`)
- `src/components/reading/ReadingDay.tsx` (hands `ahead` down)
- `src/app/reading/page.tsx` (`aheadOn`, a second section with `<ReadingDay ahead />`)
- `tests/signed-in-buy-ahead-559.test.ts` (NEW)
- `tests/reading-one-box-468.test.ts` (only the assertions this ruling reverses)
- `tests/reading-day-467.test.ts` (only the one-mount pin: now the bare mount plus the ahead mount)

READ-ONLY: everything else. No entitlement logic, price logic or buy path is added or changed; rows 3 and 4 are the same markup in both modes. No setting, no switch, no stored data changes.

## FOUND, NOT IN THIS LANE
- `/api/auth/email/verify` calls `addSubscriber(email, "welcome")` on every successful sign-in, inside a try/catch that swallows a failed list write ("the session matters more than the list write"). So the list claim holds for every email sign-in, but a failed write would leave a member off the list with no card to fix it. Not touched here.
