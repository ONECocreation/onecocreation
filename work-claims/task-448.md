# TASK-448 claim

Builder: Chief O'Brien on Astra
Block: 968349
Branch: feat/task-448-reading-player-polish
Worktree: /home/pac/dev/worktrees/task-448
Base: 336313a411727345bc7d39839fd8175841113b39
Brief: /home/pac/dev/hermes/inbox/TASK-448-oc-reading-player-and-signup-row.md

Contract: remove redundant Stage 1 page controls; port only the viewer storage isolation and notification keys with their original comments; align the guest newsletter input and button using decision (a), a scoped grid. Preserve Stage 2 and the member form.

Owned paths and limits:
- src/components/reading/ReadingStage.tsx: watching controls, dead props/functions, phase docblock only.
- src/components/reading/JitsiViewer.tsx: the paired configOverwrite keys and comments only.
- src/app/kit.css: .kit-inline-form rules only.
- src/components/rooms/ReadingSignUp.tsx: public guest form only if decision (b) becomes necessary; no change planned.
- tests/reading-stage.test.ts, tests/jitsi-viewer.test.ts, tests/reading-sign-up.test.ts, tests/reading-look.test.ts: named assertions only.
- work-claims/task-448.md and work-claims/task-448-register.md.

First commit is this claim. Subsequent commits: red tests, player, viewer, row, pins, register. Tests must fail before implementation. Run the baseline and final row probes with fixture-only services, stop both services, run all specified gates, and record actual command output in the requested outbox SUMMARY.md.

No root WORK-CLAIM.md edits; no environment-file reads, secrets, vault, server/Jitsi configuration changes, name work, design ceiling changes, push/fetch/merge or git configuration changes. Read-only branches and files remain untouched. Any needed out-of-scope change is a seam and stops the lane.
