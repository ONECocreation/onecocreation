# WORK-CLAIM — TASK-159 (every seeded page reads its studio publish first — support · book · classes · store)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ · block 966,055
BRANCH: `feat/task-159-puck-publish-first`
WORKTREE: `~/dev/worktrees/task-159`
BASE: main tip `31a5a10` (T-156 commons colors merged).
ROOM: T-153's finding, follow-through. /about was the only route wired for
PUCK P4 ("Admiral-approved 2026-08-11"); T-153 wired /memberships. The same
missing read remains on the four other pages with seeds in
`src/lib/puck-seeds.ts` — /support, /book, /classes, /store: pressing
"Publish to live" in /studio writes `puck:page:<slug>` correctly, but the
visitor-facing route never calls getPuckPage() before falling back to its
hand-built JSX. This lane mirrors the T-153 pattern per page: the Puck-first
branch (`const puck = await getPuckPage("<slug>"); if (puck) return <Render
…/>`) wrapped in the page's own header/footer/PaletteVars/PopupHost; the
hand-built JSX stays the fallback, untouched.
Does NOT touch `.env.local`, :3000/:4100 (the operator's live processes),
the live site, the live vault (fixture filesystem storage only,
PUCK_STORE_FS_DIR), any other lane's worktree, or any deployment.
CONCURRENCY: lane T-160 is simultaneously adding a feature-switch gate
branch (NotOpenYet early return) to the TOP of `src/app/classes/page.tsx`
and `src/app/book/page.tsx`. The agreed early-return ORDER is (1) switch
gate → NotOpenYet, (2) Puck-first read → Render, (3) hand-built fallback —
this lane's branch sits where (2) belongs, clearly delimited, without
restructuring surrounding code. Dev server on :3146 only, killed by
recorded listener PID.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push, never archive. Never `git stash`. ENGLISH-PIN. No new
dependencies. BFT dating in comments. Love design laws: no serif faces
(house tokens only), contrast ≥ 4.5:1, no color-only meaning.
Derive-or-dash — never a fake link, number or name.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/app/support/page.tsx` — the Puck-first branch only
- `src/app/book/page.tsx` — the Puck-first branch only (T-160's gate sits above it)
- `src/app/classes/page.tsx` — the Puck-first branch only (T-160's gate sits above it)
- `src/app/store/page.tsx` — the Puck-first branch only (T-137's store gate sits above it)
- `tests/studio-publish.test.ts` — extend: pin each page's BOTH branches
  against fixture storage
- `vitest.config.ts` — the transpile allowance for `@pacsarcade/puck-config`
  raw tsx so real blocks render in tests (T-153's second seam)

Brief: `~/dev/kimi/inbox/TASK-159-oc-pages-read-puck-publish-first.md`
(cut 0018.06.17 a₿)
Gates: `npx vitest run` (grows with the new pins) · ALL
`node scripts/*.test.mjs` (calendar 70, cartridge 183, square-payments 36
hold) · `npm run lint` = 0 · `npx tsc --noEmit` · `npx next build` · shots:
one page with a fixture publish taking effect, before/after, both themes
(own dev server :3146, stopped by recorded listener PID after; harness
borrowed per the task-148 outbox idiom, lives in the outbox, not the repo;
puppeteer borrowed by require-path, NEVER a dependency) →
`~/dev/kimi/outbox/task-159/shots/` · SUMMARY.md in
`~/dev/kimi/outbox/task-159/`, ending LANE-DONE + full sha.
Questions → Number One.
