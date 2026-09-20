# work-claim — task-347 (ONE Cocreation: the law-guard git hooks)

Lane: Number One. Base = onecocreation main **92d7653** (the T-346 Lane A merge). Branch
`feat/task-347-law-guard-hooks`. Plan of action 0018.07.02 §10 row 0.6 (Ms. Kimi's review K75
folded); the Admiral's pick P0-HOOKS A on the call sheet, 0018.07.02 a₿: cut now, he merges.

Adds a tracked `.githooks/` folder: `pre-commit` (author email, named adds against this file's
OWNS section), `pre-push` (protected-branch pushes re-run the gate, fail-closed), `law.conf`,
and a README. No application code, no dependency, no env. The hooks do nothing until a clone is
armed with `git config core.hooksPath .githooks` — that arming is the Admiral's hands.

## OWNS

NEW `.githooks/pre-commit`, NEW `.githooks/pre-push`, NEW `.githooks/law.conf`,
NEW `.githooks/README.md`, `work-claims/task-347.md`.

READ-ONLY: everything else.

## Proof

Canary run in this worktree with the hooks armed by `-c core.hooksPath=.githooks` (see the PR).
