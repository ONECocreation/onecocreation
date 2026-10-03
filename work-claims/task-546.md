# WORK-CLAIM - TASK-546 - ONE Cocreation: /replays "Want a reminder email?" opens the box in place

CLAIMED-BY: builder lane for Number One (Admiral's ask: "that should just open the text box for them to enter their email and get added to the reading mailing list. give them a reading tag")
BRANCH: `feat/task-546-replays-reminder-inline`
WORKTREE: `~/dev/worktrees/task-546`
BASE: origin/main `ba9a2cc`
LANE PORT: 5460

## OWNS
- `work-claims/task-546.md` (NEW)
- `src/app/replays/page.tsx` (the reminder link becomes the island mount)
- `src/components/replays/ReplaysReminder.tsx` (NEW, a tiny disclosure island that mounts the existing ReadingSignInBox)
- `tests/replays-reminder-546.test.ts` (NEW)

READ-ONLY: everything else, including `ReadingSignInBox`, `/api/subscribe`, `subscribers.ts`, kit.css. No new CSS, no new copy beyond the button's own words.
