# work-claim — TASK-251: the OC Stage honours the full scene (waiting / brb / ending) instead of the camera

LANE: home crew (sonnet) · worktree `~/dev/worktrees/task-251` · branch `lane/task-251` · base main @ `2cf92dd`
(T-250 merged). OWNS: `src/app/rooms/[slug]/page.tsx` (the `fullScene` + text-field derivation, inside the
existing vdo-rail gate), `src/components/rooms/ClassroomView.tsx` / `StageView.tsx` / `RoomVideoSlot.tsx` /
`classroom.css` (pass-through + the frame swap), `src/components/rooms/SceneFrame.tsx` (NEW client leaf),
`src/components/studio-overlay/FullScene.tsx` (a `fixed` prop only — the overlay route's own render/snapshot
untouched), `src/app/api/live/route.ts` (`scene` field), `tests/stage-honours-the-full-scene.test.ts` (NEW).
Do NOT touch: `src/app/a/live/**`, `src/app/api/admin/live/route.ts`, `/a/studio` — T-235 runs beside this lane
there.
