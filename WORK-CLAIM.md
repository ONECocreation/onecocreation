# WORK-CLAIM — TASK-119 (home copy + nav trim + footer — Love's Sept 1 asks, wave 1)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.16 a₿ (block 965,887)
BRANCH: `feat/task-119-home-copy-nav-trim`
WORKTREE: `~/dev/worktrees/task-119`
BASE: main tip `642d488` (lint-ignore of the parked .claude worktree; local main is ahead of origin — the house merges locally, this lane never pushes)
ROOM: ONE Cocreation home + chrome trim per Love's List rows 2, 3, 8, 11, 13, 15, 16, 17 — new hero lines, membership waitlist forms instead of buy buttons, nav/footer trimmed of Sessions & Store, support jars renamed, leftover "haircut" strings scrubbed where this lane owns the file. [AMBER] items built anyway and listed under "AMBER built" in SUMMARY.md. Does NOT touch `.env.local`, package.json / lockfile, :3000/:4100 (operator's live processes), or any deployment.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge to main, never push. ENGLISH-PIN. BFT dating in comments. Love design laws: no serif faces, contrast ≥ 4.5:1, no color-only meaning. Module law: no cross-app imports.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/components/sections.tsx` (hero, about pink line, packages waitlist, donations links, contact heading + hidden doors)
- `src/components/NavMenu.tsx` (Sessions & Store entries out; Free meditation under Community)
- `src/components/SiteFooter.tsx` (Store link out; rebuild <p> block out)
- `src/app/support/page.tsx` (The Three Jars → Gifts of Gratitude)
- `src/lib/puck-seeds.ts` line ~418 ONLY (The Three Jars → Gifts of Gratitude)

Brief: `~/dev/kimi/inbox/TASK-119-oc-home-copy-nav-trim.md` (cut 0018.06.16 a₿)
Gates: `npx vitest run` 17/17+ · `node scripts/calendar-view.test.mjs && node scripts/cartridge-identity.test.mjs && node scripts/square-payments.test.mjs` · `npm run lint` = 0 · `npx tsc --noEmit` · `npx next build` · shots of every changed surface in BOTH themes (dev server on :3119 only, killed by recorded PID) → `~/dev/kimi/outbox/task-119/shots/` · SUMMARY.md in `~/dev/kimi/outbox/task-119/`
Questions → Number One.
