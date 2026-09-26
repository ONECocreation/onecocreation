# TASK-485 claim

Builder: sonnet sub-agent for Number One
Block: 968,624+ (Love's live reading, ongoing)
Branch: feat/task-485
Worktree: /home/pac/dev/worktrees/task-485
Base: origin/main 81608d2 (T-479's own two fix rounds already merged, PR #107)

GOAL: the Admiral will join the /reading rooms as a SECOND moderator
(logged in as adminpacman) alongside Love. T-479's merged reducer tracks
host identity as "the FIRST moderator seen" and never adopts a second one
(the T-479 review's own hijack fix, deliberately). That is now wrong for
a real two-moderator room: if the Admiral is in the room before Love, or
Love drops and rejoins after him, and HIS camera is off, he gets tracked
as host with `videoOn:false` — Love's later unmute is then ignored (a
second moderator is never adopted), and the cover stays over Love while
she is live.

FIX: the cover should drop when ANY remote moderator has video on. Track
a MAP of moderator id -> videoOn (unknown = on, fail open) instead of a
single `hostId`/`videoOn` pair:
- `videoOn` = the map is empty OR any entry is `true`.
- the cover shows only when at least one moderator is known AND every
  known moderator is muted (every entry `false`).
- a moderator leaving or losing the role is removed from the map.
- the local participant is never counted (never added to the map).
- kept as-is: the 20s safety timeout, the onHostVideo boot-time sync, and
  the rejoin reset (both halves of T-479's second fix round).

## OWNS

- `work-claims/task-485.md` — this file. Committed alone.
- `src/components/booking/JitsiRoom.tsx` — EDIT: `HostVideoState` drops
  `hostId` for `moderators: Record<string, boolean>`; `hostVideoReducer`
  rewritten around the map + a `computeVideoOn` helper; every other
  contract (the `onHostVideo` prop, the boot-time sync, the safety
  timeout, `hostEventParticipantId`) unchanged.
- `tests/host-video-reducer-479.test.ts` — EDIT: rewritten for the new
  map-based state (every `hostId`-shaped assertion no longer applies);
  the second-moderator regression tests re-trued to the new semantics
  (a second moderator is now EXPECTED to be tracked, not ignored); new
  tests for the Admiral-then-Love ordering, both-muted, and one-leaves-
  recomputes cases.
- `tests/reading-stage-cover-479.test.ts` — read for whether anything
  needs a matching update; only touched if something there actually
  breaks (it works at the `hostVideoOn` prop level, not the reducer's
  internal shape, so it is not expected to need a change).

## READ-ONLY

Everything else. In particular: `ReadingStage.tsx`/`ReadingStageDoor.tsx`
(their `onHostVideo`/`hostVideoOn` contract with `JitsiRoom.tsx` does not
change — only what happens INSIDE the reducer does), and every other
JitsiRoom caller (unaffected, `onHostVideo` stays opt-in).
