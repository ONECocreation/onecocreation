# WORK-CLAIM - TASK-536 - the welcome home letter pinned in every member's letters room

BRANCH: feat/task-536-welcome-home-letter
WORKTREE: ~/dev/worktrees/task-536
BASE: origin/main at cut = fbd601576774794a2b032af7b34685ec350c3f23
LANE PORTS: 5292-5295

## OWNS
work-claims/task-536.md, work-claims/task-536-register.md,
src/app/api/me/letters/route.ts (the pinned-entry prepend only),
src/components/LettersRoom.tsx (Entry.pinned, pinned label, dead empty-branch removal, always-on news link, no-email link),
src/app/a/letters/page.tsx (the welcome row's when sentence only),
tests/welcome-home-letter-536.test.ts (NEW), tests/letters-free-member-535.test.ts (the one empty-room pin only),
tests/letters-readable-seam.test.ts (only if the route edit disturbs a pin).
