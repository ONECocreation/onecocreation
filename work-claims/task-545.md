# WORK-CLAIM - TASK-545 - ONE Cocreation: The weekly reading lists under Studio

CLAIMED-BY: builder lane for Number One (Admiral's ask: "move the weekly reading left menu to be under the studio ... auto expanded when she logs in.")
BRANCH: `feat/task-545-reading-under-studio`
WORKTREE: `~/dev/worktrees/task-545`
BASE: origin/main `231e469`
LANE PORT: 5450

## OWNS
- `work-claims/task-545.md` (NEW)
- `src/components/console/SiteConsoleShell.tsx` (SITE_SUBS loses reading; STUDIO_SUBS + Studio accordion)
- `src/app/house.css` (three .mgmt-rail-row / toggle rules beside .mgmt-rail-tab)
- `tests/site-room-accordion.test.ts` (re-true the SITE_SUBS pin, add Studio pins)
- `src/components/console/StudioHub.tsx` (r2: the not-for-the-reading note)
- `src/app/a/site/reading/SiteReadingRoom.tsx` (r2: name)
- `tests/studio-hub.test.ts` (r2: pin the note)
- `/home/pac/dev/home/outbox/task-545/` (shots + SUMMARY, outside the repo)

READ-ONLY: everything else. Route /a/site/reading and /go/<door> unchanged. No copy changes.
