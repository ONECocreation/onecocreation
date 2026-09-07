# WORK-CLAIM — TASK-120 (the squares: Instagram + Read with Love doors, store hide flag)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: BFT derive-or-dash — claimed at session start, cut 0018.06.16 a₿ brief (block ~965,887)
BRANCH: `feat/task-120-squares-waitlist-store-hide`
WORKTREE: `~/dev/worktrees/task-120`
BASE: main tip `642d488` (the T-112 lint zero merge; local main is ahead of origin — the house merges locally, this lane never pushes)
ROOM: WildDoors' two placeholder doors get repurposed — Instagram (fleet handle @onecocreation, new tab, inline SVG glyph) and Read with Love (book glyph, SubscribeForm source="readwithlove"); SubscribeForm gains an optional `note` prop (props only); the store's `hidden` status is verified end-to-end so an item is kept but never rendered publicly, the 5-day item flip flagged for the operator's admin desk (vault state, not a repo file); subscriber `source` recording pinned by test. Does NOT touch `.env*`, package.json / lockfile, :3000/:4100 (operator's live processes), or any deployment. `READ_WITH_LOVE_ZOOM_URL` is referenced by NAME only — the welcome-letter wiring lives in `src/lib/lead-magnet.ts` / `src/app/api/subscribe/route.ts`, OUTSIDE this lane's OWNS — flagged for the owning lane, not edited here.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge to main, never push. ENGLISH-PIN. BFT dating in comments. Love design laws: no serif faces, contrast ≥ 4.5:1, no color-only meaning. Module law: no cross-app imports. No new dependencies.

Files this lane touches (OWNS):
- `WORK-CLAIM.md` (this claim)
- `src/components/WildDoors.tsx` (the two placeholder doors repurposed)
- `src/components/ReadWithLove.tsx` (NEW — the book-reading door, wraps SubscribeForm)
- `src/components/SubscribeForm.tsx` (props only: optional `note`)
- `src/app/store/[id]/page.tsx` (hidden item's title stays out of the metadata too — OWNS `src/app/store/**`)
- `tests/subscribers-source.test.ts` (NEW — spec step 4's pin; `src/lib/subscribers.ts` itself needs no change, the `source` is already recorded)

Brief: `~/dev/kimi/inbox/TASK-120-oc-squares-waitlist-store-hide.md` (cut 0018.06.16 a₿)
Gates: `npx vitest run` 17/17+ · `node scripts/calendar-view.test.mjs && node scripts/cartridge-identity.test.mjs && node scripts/square-payments.test.mjs` · `npm run lint` = 0 · `npx tsc --noEmit` · `npx next build` · screenshots of every changed surface in BOTH themes → `~/dev/kimi/outbox/task-120/shots/` · truthful SUMMARY.md in `~/dev/kimi/outbox/task-120/`
Questions → Number One.
