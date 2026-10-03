# WORK-CLAIM - TASK-549 - ONE Cocreation: memberships polish on /me

CLAIMED-BY: builder lane for Number One (the Admiral's forge marks on the T-541b pictures: "move this button above the cancel. where the 2 dot is." and "this is that weird grey. thought we fixed this.")
BRANCH: `feat/task-549-me-polish`
WORKTREE: `~/dev/worktrees/task-549`
BASE: origin/main `250fc95`
LANE PORT: 5490

## OWNS
- `work-claims/task-549.md` (NEW)
- `src/app/kit.css` (two rules beside `.kit-rows-pair`: the stacked confirm pair, the welcome card's top gap)
- `src/components/me/MembershipPanel.tsx` (one class on the cancel confirm's button cluster)
- `src/components/me/EmailMemberPanel.tsx` (the welcome card wears the kit Card)
- `tests/design-drift.ceilings.json` (EmailMemberPanel colours only, LOWERED 3 to 1)
- `tests/membership-polish.test.ts` (NEW)

READ-ONLY: everything else. No payment behaviour, no button words, no new field.
The Square card box (centre the fields, site colours) is NOT in this lane: it moved to T-554 (`feat/task-554-square-card-box`), because it must be checked against Square's real card field before it ships.
