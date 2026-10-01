# TASK-518 register

Lane: feat/task-518-love-knows-who-bought · worktree
/home/pac/dev/worktrees/task-518 · base 8ef0363cb879693eb23fffa6d839c66704398708
(origin/main @ the T-493 merge, PR #123). Ports 5224-5227.

## Baseline (established at cut, before any lane edit)

`bash ~/dev/shortcuts/oc-gate.sh /home/pac/dev/worktrees/task-518` on
the cut tip 8ef0363 (+ claim commit 345cdba, work-claims only):

```
census: 1114 objects, baseline 1119 · families: 181/37/5/8/63/0 · fonts: 47 token/32 literal
 Test Files  286 passed (286)
      Tests  3852 passed (3852)
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

The suite must grow from 286 files / 3852 tests.

## Running log

- cut: worktree added on origin/main 8ef0363, npm ci clean (one
  install-scripts warning, unrs-resolver postinstall blocked — same as
  every lane, node_modules present and gates run).
- ground re-grep: done at cut (see task-518.md) — anchors held; one
  drift (letters-one-render.test.ts "all eight" word left by T-493).
- red-first: tests/purchase-love-notify.test.ts committed red (27 fail).
- builds landed in brief order: module, letter key, switch, five call
  sites, room row; claim widened three times for honestly-broken pins
  in unowned test files (order-receipt, letters-every-letter-in-the-room,
  site-config) — each widening its own named commit before the fix.
- `git merge origin/main` before final gates: Already up to date
  (origin/main still 8ef0363 at merge time).
- FINAL GATES (bash ~/dev/shortcuts/oc-gate.sh /home/pac/dev/worktrees/task-518):

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

Suite grew 286/3852 to 287/3880 (+28: the 27-pin lane suite plus the
one-render case). Census byte-identical to baseline (zero new style
objects).
- shots: 20 PNGs into outbox/task-518/shots (a/site ON+OFF, a/letters
  plain + editor-open, /letters/purchase-love-notify preview; dark+dawn,
  1440+390), every one read. One retake: the first OFF run re-seeded ON
  (a sed that missed the escaped JSON); re-seeded properly, re-shot,
  verified OFF.
