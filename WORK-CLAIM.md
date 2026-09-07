# WORK-CLAIM — TASK-124 (BFT calendar "today" off by one day — ONE Cocreation port, byte-identical)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.16 a₿ (block 965,888)
BRANCH: `feat/task-124-bft-today`
WORKTREE: `~/dev/worktrees/task-124-oc` (the template half landed first in
`~/dev/worktrees/task-124-template` under its own WORK-CLAIM)
BASE: main tip `642d488` (lint: ignore .claude/**)
ROOM: the SAME patch the template just took, byte-identical (module law: shared code stays
copy-identical until it moves to a dependency repo). `bftToday()` snapped to Gregorian UTC
midnight before estimating height — a BFT day is 144 blocks and never aligns with civil
midnight, so near a 144-block boundary the grid highlighted YESTERDAY (reproduced by Number One
0018.06.16, block 965,885). Fix: `bftToday(nowMs, height?)` = `fromHeight(estimateHeightAt(nowMs))`
with no midnight snap, an optional live-tip height override that wins over the estimate, and the
spec's three new harness tests. `src/lib/bb/bft.ts fromHeight` is CORRECT and NOT touched.
Per the lane-lead ruling (Option A, drift fix beyond the bug patch): this repo's
`calendar-view.ts` had drifted to a `./bb/bft.ts` import suffix the rest of the house doesn't
use — it flips to the extensionless `./bb/bft` (one line), and the test harness becomes ONE
byte-identical file with the loose-resolution hook inlined (nothing outside OWNS moves; tsconfig
untouched). Does NOT touch `.env.local`, :3000/:4100 (operator's live processes), the main
checkout, or any deployment.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge to main, never push.
ENGLISH-PIN. No new dependencies. The final cross-repo `diff` of all three owned files must be
empty.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/lib/calendar-view.ts` (the fix + optional height override + the sanctioned import flip)
- `src/components/calendar/BftMonthGrid.tsx` (threads the override to the today highlight)
- `scripts/calendar-view.test.mjs` (inlined resolve hook + the three new boundary tests)

Brief: `~/dev/kimi/inbox/TASK-124-bft-today-off-by-one.md` (cut 0018.06.16 a₿)
Gates: `npx vitest run` 17/17+ · `node scripts/calendar-view.test.mjs` + the other
`scripts/*.test.mjs` · `npm run lint` = 0 · `npx tsc --noEmit` · `npx next build` · shots of the
month grid in BOTH themes (dev server on :3124 only, killed by recorded PID) →
`~/dev/kimi/outbox/task-124/shots/` · SUMMARY.md in `~/dev/kimi/outbox/task-124/`
Questions → Number One.
