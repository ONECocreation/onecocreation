# WORK-CLAIM — TASK-123 (restore the four missing classroom layouts — video / materials / people / stage)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.16 a₿ (block 965,887)
BRANCH: `feat/task-123-classroom-layouts-restore`
WORKTREE: `~/dev/worktrees/task-123`
BASE: main tip `642d488` (lint-ignore of the parked .claude worktree; local main is ahead of origin — the house merges locally, this lane never pushes)
ROOM: ONE Cocreation classroom — Love's List row 23 (Sept 1): "there's four classroom styles that are missing that should have those layouts… video, materials, people." Restore/rebuild the four as selectable classroom templates (vantage switcher), each showing the video (Jitsi rail or embed slot), a materials list, and the people/attendees rail, arranged differently. Reuse existing components; no new deps; rose accents via TOKEN NAMES only (T-121 lands the rose token values in a parallel lane). Does NOT touch `.env.local`, package.json / lockfile, :3000/:4100 (operator's live processes), or any deployment.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge to main, never push. ENGLISH-PIN. BFT dating in comments. Love design laws: no serif faces, contrast ≥ 4.5:1, no color-only meaning. Module law: no cross-app imports.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/components/rooms/` (where the classroom lives): `vantage.ts`, `VantageSwitcher.tsx`, `ClassroomView.tsx`, `classroom.css`, new `RoomVideoSlot.tsx` + four new layout views (`VideoView.tsx`, `MaterialsView.tsx`, `PeopleView.tsx`, `StageView.tsx`)
- `tests/classroom-layouts.test.ts` (new — one render test per layout)
- `docs/classroom-layouts.md` (new)

Brief: `~/dev/kimi/inbox/TASK-123-oc-classroom-layouts-restore.md` (cut 0018.06.16 a₿)
Gates: `npx vitest run` 17/17+ · `node scripts/calendar-view.test.mjs && node scripts/cartridge-identity.test.mjs && node scripts/square-payments.test.mjs` · `npm run lint` = 0 · `npx tsc --noEmit` · `npx next build` · shots of every changed surface in BOTH themes (dev server on :3123 only, killed by recorded PID) → `~/dev/kimi/outbox/task-123/shots/` · SUMMARY.md in `~/dev/kimi/outbox/task-123/`
Questions → Number One.
