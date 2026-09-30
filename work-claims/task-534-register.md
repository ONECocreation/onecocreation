# register: task-534

Claimed by the T-534 Wednesday-half builder. Base main 8ef0363. Baseline gates at cut are pasted below once run.

## Baseline gates at cut
Run via `~/dev/shortcuts/oc-gate.sh ~/dev/worktrees/task-534` on the pristine cut (npm ci first):

- `npx vitest run` - green (286 files, 3852 tests)
- `for f in scripts/*.test.mjs` - calendar-view 70/0; cartridge-identity 179/0; console-matrix 14/0; fixture-kv 45/0; square-payments 58/0
- `npx eslint src tests --max-warnings=0` - 0
- `npx tsc --noEmit` - 0
- `npx next build` - compiled successfully

GATES GREEN. The suite grows from 3852.
