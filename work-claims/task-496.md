# WORK-CLAIM - TASK-496 - ONE Cocreation: the Replays page

CLAIMED-BY: Ms. Kimi's crew (builder subagent)
CLAIMED-AT: block 969,094
BRANCH: `feat/task-496-replays-page`
WORKTREE: `~/dev/worktrees/task-496`
BASE: main @ `7b33fb6a1c145f0358c0f8c795c468dc27b65937` (verified at pickup: HEAD == base)
LANE PORTS: 5124-5127
BRIEF: `~/dev/kimi/inbox/drafts/TASK-496-oc-replays-page.md`

## The lane in one line
A public `/replays` page (podcast style, youtube-nocookie embeds, list shipped EMPTY with a designed empty state), the `/a/site/replays` editor room (AboutPlaylist data flow on the RoomsCard class-based idiom), a Replays button on /reading, a "Replays" row under Community in the menu (code default + KNOWN_NAV_HREFS).

## OWNS (from the brief)
- NEW `src/app/replays/page.tsx`, NEW `src/app/replays/**`
- NEW `src/components/replays/**`
- NEW `src/app/a/site/replays/page.tsx`, NEW `src/app/a/site/replays/SiteReplaysRoom.tsx`, NEW `src/app/a/site/replays/ReplaysCard.tsx`
- NEW `tests/replays.test.ts`
- edits: `src/lib/site-config.ts` (replays key, sanitize, patch error, merge line, KNOWN_NAV_HREFS), `src/app/api/admin/site/route.ts` (one validation block), `src/components/NavMenu.tsx` (PAGE_CATALOG row + one Community sub), `src/components/console/SiteConsoleShell.tsx` (one SITE_SUBS row), `src/app/reading/page.tsx` (one new section only), `tests/site-room-accordion.test.ts` + `tests/a-site-rooms-wear-the-gate.test.ts` (honest updates), `work-claims/task-496.md`
- SEAM additions the brief did not name but the gates require (honest, additive, minimal): `src/lib/page-states.ts` (one PAGE_STATES row: /replays, "words", copy lives in code; the pages-panel manifest walk fails any unlisted public route) and `scripts/console-matrix.routes.json` (one policy row: /a/site/replays render+gate, the same shape as its five siblings; the console-matrix oracle fails any /a page with no row)

## Baseline gates at cut (block 969,094, base 7b33fb6)
- `npx vitest run` - green (278 files, all passed)
- `for f in scripts/*.test.mjs; do node "$f"; done` - calendar-view 0 failed · cartridge-identity 0 failed · console-matrix 0 failed · fixture-kv 0 failed · square-payments 0 failed
- `npx eslint src tests --max-warnings=0` - rc 0
- `npx tsc --noEmit` - rc 0
- `npx next build` - compiled successfully, rc 0

## Adjacency noted (Seams in the brief)
T-490 rides the shared chrome (NavMenu/SiteHeader) - check at build time; T-499 later touches `src/app/reading/page.tsx` and `/a/site/reading` - this lane's reading-page edit is one additive section only.
