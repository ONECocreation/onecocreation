# TASK-449 claim

Builder: Ms. Kimi's crew
Block: 968365
Branch: feat/task-449-reading-encore
Worktree: /home/pac/dev/worktrees/task-449
Base: cae2548d5fb6d5431e61194094c1c104861007e6
Brief: /home/pac/dev/kimi/inbox/TASK-449-oc-reading-encore.md (under K124, block 968,357)

Contract: Stage 2 gets its own address. New /reading/encore (server shell + client island, the five states per M19a–e plus left-while-open) riding the existing entitlement rail (/api/stage2 + src/lib/stage2-access.ts), the server deciding, never a room name or raw call link to a refused viewer; prices up in every gate state via the Stage2Details rows with names linked through TIER_PAGES. /reading's in-place Stage 2 card and single-embed branch are replaced by the banner (open-only, 20 s poll): kicker "Stage 2 · the encore", h2 "Want an encore?", button "Go to the encore" — no arrow, no emoji, no idle motion, no click effect. Free members (ruling 3): main = the Observer package derived from TIER_PAGES (tier B, never a literal slug or price), secondary = see the memberships, "Try one week" quiet nevermind-weight. Paid (ruling 4): the button reads "Join Love"; in-call is Jitsi's own toolbar with NO page buttons beneath. The member menu carries "The encore · open now" only while the encore is open. readingViewerName ported from 179fce8 into src/lib/session-read.ts (JitsiViewer hunks NOT ported — decision F).

Owned paths and limits:
- src/app/reading/encore/page.tsx (NEW): the server shell only.
- src/components/reading/encore/EncoreIsland.tsx (NEW): the client island only.
- src/lib/week-pass.ts (NEW): the deriveWeekPass extraction (decision D).
- src/lib/session-read.ts: the readingViewerName addition only.
- src/components/reading/ReadingStage.tsx: the card/branch deletions + the banner only; every K122 behavior byte-identical.
- src/app/reading/page.tsx: the stage2Details prop retirement + the helper import only.
- src/components/reading/Stage2Details.tsx: the name links only.
- src/app/kit.css: the ONE .kit-rows b a rule, plus decision B's ONE .kit-stage-media--encore phone media rule.
- src/components/door/DoorButton.tsx: the menu line + the menuRowStyle hoist only; design-drift numbers (9/6/0) never rise.
- tests/reading-encore.test.ts (NEW); tests/reading-stage.test.ts (replaced-branch pins rewritten to pin the banner; every other pin byte-identical).
- work-claims/task-449.md and work-claims/task-449-register.md.

First commit is this claim. Subsequent commits: red tests, then the build to green. Gates: npx vitest run; for f in scripts/*.test.mjs; do node "$f"; done; npx eslint src tests --max-warnings=0; npx tsc --noEmit; npx next build. Baseline at cut: vitest 222 files / 2773 tests passed; scripts 5/5 zero failed.

Read-only holds: src/app/api/** whole; Stage2Door.tsx, StageView.tsx, door-machine.ts, JitsiViewer.tsx, the entitlement libs. No new dependencies, no .env* access, no fetch/merge/push/git config, no Gregorian stamps. No literal tier slugs or prices in the lane's source. No idle motion, no arrow, no emoji, no page buttons under the call. Any out-of-scope need is named in the register as a deviation, never smuggled.
