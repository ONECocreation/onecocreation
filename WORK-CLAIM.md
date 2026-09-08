# WORK-CLAIM — TASK-161 (the About playlist in Love's hands — no deploy to add a video)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ · block 966,080
BRANCH: `feat/task-161-about-playlist`
WORKTREE: `~/dev/worktrees/task-161`
BASE: main tip `45d1d59` (T-145 merged — the item editor exists on main).
ROOM: /about already renders a playlist (T-154 item 8) but the four videos
are hard-coded in `src/lib/about-content.ts` (ABOUT_VIDEOS) — adding one
means a code deploy. Love is sending links; she must be able to paste them
herself. BUILD: (1) `SiteConfig` gains
`about?: { videos: { id: string; title: string; ratio: "16/9" | "9/16" }[] }`
— additive, optional; absent = the seed list stands (derive-or-dash). (2) A
"Videos on About" card on /a/site (the page where the nav editor lives —
same neighbourhood): paste a YouTube URL or id (watch?v=, youtu.be/,
shorts/, bare id → the 11-char id; refuse anything else IN WORDS), title
required, portrait/landscape toggle (shorts default portrait), reorder
up/down, remove; Save = `saveSiteConfig({about})` through the existing
/api/admin/site route with extended patch validation. (3) /about reads the
config list first, falls back to ABOUT_VIDEOS; empty list = the honest
empty line already there; first video open, the rest folded, as today.
(4) The Puck seed for /about carries the video block and already reads
ABOUT_VIDEOS — the same source module; one truth holds (see Seams for the
published-snapshot caveat).
Does NOT touch `.env.local`, :3000/:4100 (the operator's live processes),
the live site/vault, the main checkout, any other lane's worktree, or any
deployment. Dev server on :3152 only, killed by recorded listener PID
(`ss -tlnp`), never the npx wrapper.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push, never archive. Never `git stash` (shared across
worktrees). ENGLISH-PIN. No new dependencies. BFT dating in comments. Love
design laws: no serif faces (house tokens only), contrast ≥ 4.5:1, no
color-only meaning. Derive-or-dash — never a fake link, number or name.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/lib/youtube-id.ts` (NEW) — YouTube URL/id → the 11-char id
- `src/lib/about-content.ts` — export the list type; the seed stays
- `src/lib/site-config.ts` — additive `about?` type, sanitize, patch
  validation
- `src/app/api/admin/site/route.ts` — the extended patch validation
- `src/app/a/site/page.tsx` — one new card: "Videos on About"
- `src/app/about/page.tsx` — the config-first read only
- `tests/about-playlist.test.ts` (NEW) — the vitest pins (URL→id parsing
  table 6 shapes + 2 refusals, patch validation, config-first-then-seed
  fallback)

Brief: `~/dev/kimi/inbox/TASK-161-oc-about-playlist-loves-hands.md`
(cut 0018.06.17 a₿ · block 966073)
Gates: `npx vitest run` (base 281, must grow) · `npm run lint` = 0/0 ·
`npx tsc --noEmit` · `npx next build` · shots: the card empty + with three
rows (fixture), /about with the fixture list, both themes, 1440 + 390
(own dev server :3152, stopped by recorded listener PID after; harness
borrowed per the task-148 outbox idiom — shoot.cjs + run-shots.sh,
puppeteer by require-path, NEVER a dependency) →
`~/dev/kimi/outbox/task-161/shots/` · SUMMARY.md in
`~/dev/kimi/outbox/task-161/`, ending LANE-DONE + full sha.
Questions → Number One.
