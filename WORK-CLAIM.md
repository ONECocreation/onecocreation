# WORK-CLAIM — TASK-155

LANE: home (sonnet, Number One orchestrating)
TASK: 155 — ONE Cocreation: the login card
BFT STAMP: 0018.06.17 a₿ (derived from live tip: block 966016 → year=⌊966016/52416⌋=18, month=⌊22528/4032⌋+1=6, day=⌊2368/144⌋+1=17)
BASE SHA: 2facbac (main)
BRANCH: feat/task-155-login-card
WORKTREE: ~/dev/worktrees/task-155

OWNS:
- the sign-in card component(s) (`src/components/**/SignIn*.tsx` / `Login*.tsx` / `FrontDoor*.tsx`)
- `src/app/login/**` or `/me` entry page (style + the new door only)
- `src/app/house.css` (login rules only)
- `tests/login-card.test.ts` (new)

PARALLEL BUILDERS ON THIS REPO (do not touch their files):
- Mr. Kim: T-137 (NavMenu, site-config, a/site, a/booking page, meet page, store page, sections.tsx), T-149 (src/components/rooms/**)
- home crew: T-151 (booking components), T-153 (memberships page, studio/puck), T-157 (store/[id] page, StoreItemCard, Sheet.tsx), T-158 (test suites, vitest.config.ts)

LAWS: WORK-CLAIM first · commit at gates · never the live site or vault · own port 4355 for shots, kill only own PID · no secrets · no new auth path (reuse existing code/key sign-in flows) · never push · never archive · derive-or-dash · legibility doctrine (scripts/cartridge-identity.test.mjs stays green both themes) · git merge main before final gates.
