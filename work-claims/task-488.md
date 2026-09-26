# TASK-488 claim

Builder: Number One (Claude Opus 5.5)
Block: 968,624+ (reading day, before the 12:12 Housewarming)
Branch: feat/task-488
Worktree: /home/pac/dev/worktrees/task-488
Base: origin/main 2e906a0 (PR #112, T-487)

GOAL: found on the Admiral's live Q&A test (production, after #112): a
/reading guest lands on Jitsi's prejoin screen ("Join meeting"), and the
book picture (.kit-stage-cover) sat OVER it, hiding the Join button, so a
guest never joined and never heard Love's music. The picture now waits
until the guest has actually joined the call (videoConferenceJoined).
Before that the guest sees the plain prejoin screen, which shows no host
video. After joining, the site switch (T-487) decides as before.

## OWNS

- `work-claims/task-488.md` — this file. Committed alone.
- `src/components/booking/JitsiRoom.tsx` — EDIT: optional `onJoined(joined)`
  prop, false on each boot and on the farewell events, true on
  videoConferenceJoined. Callers that pass nothing are unaffected.
- `src/components/reading/ReadingStage.tsx` — EDIT: `joined` state wired
  to JitsiRoom's onJoined; the body's cover needs `joined`.
- `src/components/reading/ReadingStageDoor.tsx` — EDIT: same.
- `tests/reading-stage-join-first-488.test.ts` — NEW: pins the rule.
