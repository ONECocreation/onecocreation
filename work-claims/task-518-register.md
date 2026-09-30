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
