# WORK-CLAIM - TASK-561 - ONE Cocreation: the $33.33 Q&A pass opens ONE Q&A day

CLAIMED-BY: Lumen, on the Admiral's word at block 970,086: "the qa pass 33.33 is a one time deal for that one session."
BRANCH: `feat/task-561-qa-pass-one-day`
WORKTREE: `~/dev/worktrees/task-561`
BASE: origin/main `5a2db38`

THE RULE: a Q&A pass opens ONE Q&A day, the first day its buyer is actually let into a published Q&A with it (`/api/qa-door` stamps that order with the door's own Denver calendar day, write-once). Until then it waits; from the next day on it is spent. Each pass order carries at most one used day, and a buyer with two unspent passes spends one per day, oldest first. Tier C (Evening Star and up) never spends a pass. Orders bought before this ships have no record, so they read as unused and are good for one more Q&A day.

## OWNS
- `work-claims/task-561.md` (NEW)
- `src/lib/qa-pass-used.ts` (NEW)
- `src/lib/qa-entitlement.ts`
- `src/lib/door-lifecycle.ts`
- `src/app/api/qa-door/route.ts`
- `tests/qa-pass-one-day-561.test.ts` (NEW)
- `tests/qa-entitlement.test.ts`
- `tests/qa-door-route.test.ts`

READ-ONLY: everything else (ReadingDay.tsx and its call `qaEntitled(subject, tier)` unchanged, store.ts and the order shape, checkout, components, CSS, copy).

## FOUND, NOT IN THIS LANE
- A pass line item with `qty` above 1 still counts as ONE pass (the old rule never read qty either); a buyer of 3 in one order gets one Q&A day. Not changed here.
- `ReadingDay.tsx` and `ReadingDayBody.tsx` also read the pass for the offer card and the Q&A row; they get the new answer through `qaEntitled` and need no change. `OrderStatus.tsx`, `reading-day-doors.ts`, `ReadingStagePart4.tsx` mention the pass item only for display.
- Vercel previews share production KV: a preview that runs this route against a real buyer would stamp the real pass.
