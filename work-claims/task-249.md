# work-claim — TASK-249: a named guest's own camera door on the Stage

LANE: home crew (sonnet) · worktree `~/dev/worktrees/task-249` · branch `lane/task-249` · base main @ `655c1b0`
(T-245 merged). OWNS: `src/lib/live.ts` (new pure `studioGuestCameraLink`, `studioVdoLinks().guest` untouched),
`src/app/rooms/[slug]/page.tsx` (the `cameraDoor` derivation + prop threading only),
`src/components/rooms/RoomVideoSlot.tsx` (vdo branch only — the "Step on camera" door),
`tests/named-guest-camera-door.test.ts` (NEW). Seams (adjacent, unowned, minimal diff):
`src/components/rooms/ClassroomView.tsx` and `src/components/rooms/StageView.tsx` (thread `cameraDoor` down to
the slot, the same shape as `stageMxids` from T-245).
