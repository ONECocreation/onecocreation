# work-claim — TASK-236: the after-hours door: "then, in N minutes: <room>" on /a/live, the deeper-dive door on the stage

LANE: home crew (sonnet) · worktree `~/dev/worktrees/task-236` · branch `lane/task-236` · base main @ `45187c9`
(T-235 + T-251 merged). OWNS: `src/lib/live.ts` (`LiveState.afterHours`, `getLiveState` sanitise),
`src/app/api/admin/live/route.ts` (`action: "after-hours"` / `"after-hours-clear"`), `src/app/api/live/route.ts`
(`afterHours` field), `src/app/a/live/go-live-room.tsx` + `src/app/a/live/page.tsx` (the "then, in N minutes" row,
`DoorRoom.minTier`), `src/components/console/LiveDoorCard.tsx` (`DoorRoom.minTier`), `src/app/rooms/[slug]/page.tsx`
(thread `signedIn`/`viewerTier`), `src/components/rooms/ClassroomView.tsx` / `StageView.tsx` (thread afterHours +
gate), `src/components/rooms/AfterHoursDoor.tsx` (NEW client leaf), `src/components/rooms/classroom.css`
(`.cl-after-hours`, the new grid region), `tests/after-hours-door.test.ts` (NEW). Do NOT touch RoomVideoSlot.tsx's
Jitsi branch (byte-pinned by `tests/stage-shows-the-studio.test.ts`).
