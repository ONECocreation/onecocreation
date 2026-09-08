# WORK-CLAIM — TASK-158

LANE: home (sonnet, Number One orchestrating)
TASK: 158 — ONE Cocreation: the site-config test suites isolate their cwd (mkdtemp) so vitest can run files in parallel again
BFT STAMP: 0018.06.17 a₿ (block 966,016)
BASE SHA: 2facbac (main)
BRANCH: feat/task-158-tests-isolate-cwd
WORKTREE: ~/dev/worktrees/task-158

OWNS: tests/site-config.test.ts, tests/package-waitlist.test.ts, tests/jars.test.ts,
tests/helpers/* (new shared helper), vitest.config.ts (remove `fileParallelism: false`
only once green ×10).

Other builders run in parallel; Mr. Kim (T-137) is editing tests/site-config.test.ts
in his own worktree — a merge on that file is expected at the end.
