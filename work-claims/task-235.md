# work-claim — TASK-235: after the room opens, /a/live shows the next doors: the studio and the waiting scene

LANE: home crew (sonnet) · worktree `~/dev/worktrees/task-235` · branch `lane/task-235` · base main @ `2cf92dd`.
OWNS: `src/app/a/live/go-live-room.tsx` (the `read` card's opened-state "Next" row, `meeting.rail === "vdo"` only),
the NEW `action: "scene"` block on `src/app/api/admin/live/route.ts` (shared file — T-251 owns the rest of it, on
the stage side), `tests/live-card-studio-doors.test.ts` (NEW). Do NOT touch: `src/app/rooms/**`,
`src/components/rooms/**`, `/a/studio`, `src/app/api/live/route.ts` — T-251 runs beside this lane on the stage side.
