# register: task-532

Claimed at block 969,334+ by Ms. Kimi's builder, lane T-532
(branch feat/task-532-replays-members-and-playlist, base main at cut
8ef0363cb879693eb23fffa6d839c66704398708). The Admiral lifted the pause
2026-09-30; the round-2 NOD look (walks/969334/replays-thumbs, draft 2
frames R1/R2/R3) is the ruled build target.

Claim: `work-claims/task-532.md`. Friction register, if any, files at
`~/dev/kimi/outbox/task-532/REGISTER.md` at hand-back.

## Baseline gates at cut

Run via `~/dev/shortcuts/oc-gate.sh ~/dev/worktrees/task-532` on the
pristine cut (npm ci first; lockfile unchanged by this lane):

- `npx vitest run` - green (286 files, 3852 tests, all passed)
- `for f in scripts/*.test.mjs` - calendar-view 70 passed 0 failed; cartridge-identity 179 passed 0 failed; console-matrix 14 passed 0 failed; fixture-kv 45 passed 0 failed; square-payments 58 passed 0 failed
- census: 1114 objects, baseline 1119 · families: 181/37/5/8/63/0 · fonts: 47 token/32 literal
- `npx eslint src tests --max-warnings=0` - 0
- `npx tsc --noEmit` - 0
- `npx next build` - compiled successfully

GATES GREEN. The suite grows from this baseline; nothing in it is allowed to
shrink or flap.
