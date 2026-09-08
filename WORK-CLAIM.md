# WORK-CLAIM — TASK-154 (the About page — Love's pass)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ · block 966,019
BRANCH: `feat/task-154-about-loves-pass`
WORKTREE: `~/dev/worktrees/task-154`
BASE: main tip `005ae79` (T-157 seam follow-through).
ROOM: From Love's meeting (the Admiral's cut, 0018.06.17): the About page
takes her pass — the "My Story" band rides the home hero's darker galaxy
with twinkling stars (no shooting stars); her three faces stand LEVEL and
framed like the session cards (full square, the faint purple rounded thin
bar); the script graphic "Where Heaven and Earth Meet" gets a white 1px
outline; under the Weekly Intuitive the brown band goes and the YES! door
pours pink; the left glass box leaves (the thin outline she likes is the
session-card bar, carried to the picture frames); "Where heaven and earth
meet" — home hero AND About — wears the same face as "Home IS where the
Heart IS" and drops the period; "Create your account" pours pink; the
join-us heading reads "Breathe with us"; the single video becomes a
playlist of several real videos from her channel, with an honest empty
state. Her new middle picture arrives LATER — the slot keeps today's
image, TODO flagged in Seams.
Does NOT touch `.env.local`, :3000/:4100 (the operator's live processes),
the live site, the main checkout, any other lane's worktree, or any
deployment. Dev server on :3144 only, killed by recorded PID.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push, never archive. ENGLISH-PIN. No new dependencies. BFT
dating in comments. Love design laws: no serif faces (house tokens only),
contrast ≥ 4.5:1, no color-only meaning. Derive-or-dash — never a fake
link, number or name (the playlist ids are real videos on
@Onecocreation, titles confirmed over oEmbed).

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/app/about/page.tsx` — the whole pass on the hand-built page
- `src/app/house.css` — ABOUT RULES ONLY (the story-sky ground, the
  level square faces, the script outline, the playlist shell)
- `src/lib/puck-seeds.ts` — the ABOUT seeds only, within the block
  vocabulary (the page rides Puck once Love publishes; the seed keeps
  her rebuild aligned)
- `tests/about-copy.test.ts` (new) — the vitest pins

DECLARED FORCED EDIT (one line, spec item 6's home half):
- `src/components/sections.tsx` `Hero()` — the hero's "Where Heaven and
  Earth Meet" sub is not an About*/Story*/WeeklyIntuitive* section, but
  item 6 names it; the edit is one inline style so the line wears the
  pull-quote's face plainly. (`About()` in the same file IS owned and
  loses its period there.)

Brief: `~/dev/kimi/inbox/TASK-154-oc-about-page-loves-pass.md` (cut
0018.06.17 a₿)
Gates: `npx vitest run` (grows with tests/about-copy.test.ts) · ALL
`node scripts/*.test.mjs` (calendar 70, cartridge 183, square-payments 36
hold) · `npm run lint` = 0 · `npx tsc --noEmit` · `npx next build` · shots
both themes × 1440/390: About top, story band, pictures row, weekly
intuitive band, join-us (+ one home-hero pair for the item-6 face
evidence) — own dev server :3144, stopped by recorded PID after; harness
borrowed per the task-148 outbox idiom, lives in the outbox, not the
repo; puppeteer borrowed by require-path, NEVER a dependency
→ `~/dev/kimi/outbox/task-154/shots/` · SUMMARY.md in
`~/dev/kimi/outbox/task-154/`, ending LANE-DONE + full sha.
Questions → Number One.
