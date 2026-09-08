# work-claim — task-184

- **Task:** TASK-184 — ONE Cocreation: a classroom is three rooms (Stage / Lesson Path / Circle; Sanctuary and the separate Video/Materials/People vantages retire; the 429 hunt)
- **Lane:** kimi (large)
- **House:** onecocreation (`~/dev/onecocreation`)
- **Worktree:** `~/dev/worktrees/task-184`
- **Branch:** `feat/task-184-three-rooms`
- **Base:** main @ 909e2cd (T-183 + T-174 both merged — the spec's start condition)
- **Baseline at cut:** `npx vitest run` → 46 files / 448 tests, all passed
- **OWNS:** `src/app/rooms/[slug]/page.tsx`, `src/components/rooms/**`, `src/components/rooms/PackageRoomsCard.tsx` (only if T-183 left something to thread), the calendar component the Circle uses (`src/components/calendar/` — BftMonthGrid / WeekRibbon / DayCell / calendar-view.css, touched only if the centred-events ruling can't land scoped in classroom.css), tests. `src/lib/matrix.ts` — additive cache helper only (`rosterForRequest`).
- **Stamp:** 0018.06.18 a₿ (block 966101)
