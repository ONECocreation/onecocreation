# TASK-519 register

Lane: feat/task-519-the-join-letter · worktree
/home/pac/dev/worktrees/task-519 · base
5ed20c8cbb4a68a7ada954c9b66cd722b7d800fa (the named stack: origin/main
8ef0363 = the T-493 merge PR #123, plus T-518's lane-done tip on top).
Ports 5228-5231.

## Baseline (established at cut, before any lane edit)

`bash ~/dev/shortcuts/oc-gate.sh /home/pac/dev/worktrees/task-519` on
the cut tip 5ed20c8 (+ claim commit a77107d, work-claims only):

```
census: 1114 objects, baseline 1119 · families: 181/37/5/8/63/0 · fonts: 47 token/32 literal
 Test Files  287 passed (287)
      Tests  3880 passed (3880)
scripts/calendar-view.test.mjs: 70 passed, 0 failed
scripts/cartridge-identity.test.mjs: 179 passed, 0 failed
scripts/console-matrix.test.mjs: 14 passed, 0 failed
scripts/fixture-kv.test.mjs: 45 passed, 0 failed
scripts/square-payments.test.mjs: 58 passed, 0 failed
eslint 0
tsc 0
build ok
GATES GREEN
```

The suite must grow from 287 files / 3880 tests.

## Running log

- cut: worktree added on the T-518 tip 5ed20c8 (T-493's merge 8ef0363
  verified an ancestor), npm ci clean.
- ground re-grep: done at cut (see task-519.md) — anchors held; four
  drift notes recorded there (four length pins not two, the 468
  exact-body pin, the tick-route describe inside
  tests/reading-letters.test.ts).
