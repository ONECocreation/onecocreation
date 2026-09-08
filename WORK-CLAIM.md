# WORK-CLAIM — TASK-152 (/sessions + /book wear the home page's font, colors and dark ground)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ · block 966,019
BRANCH: `feat/task-152-sessions-house-style`
WORKTREE: `~/dev/worktrees/task-152`
BASE: main tip `005ae79` (T-157 seam merged).
ROOM: From Love's meeting — "on the book a session page the font and
colors need to be the same. the home page is correct. /sessions has the
incorrect font and coloring"; "make the /session page dark". The nav's
SESSIONS door opens `/book` (site-config.ts) — the spec's
`src/app/sessions/page.tsx` path never existed in this repo; the sessions
page IS `/book` (metadata title "Sessions — book a time"), and the spec's
`src/components/booking/ServiceCard.tsx` is `src/components/ServiceCard.tsx`
(same file, one directory up — it is the card the home shelf and /book
share). The divergence: /book's lede carries an inline
`fontFamily: var(--serif)` and a hardcoded `#EBCB77`, the sessions grid
section holds no dark ground (dawn repaints it light behind the dark
glass cards), and the Book doors ride the white `.btn` where the house's
T-121 pink pass already pours the popup's rose.
Does NOT touch `.env.local`, :3000/:4100 (the operator's live processes),
the live site, the main checkout, any other lane's worktree, or any
deployment. Dev server on :3143 only, killed by recorded PID.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push, never archive. ENGLISH-PIN. No new dependencies. BFT
dating in comments. Love design laws: no serif faces (house tokens only),
contrast ≥ 4.5:1, no color-only meaning. Derive-or-dash — never a fake
link, number or name.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/app/book/page.tsx` — STYLE ONLY: house heading/body classes, tokens
  for colors, dark ground like home, rose Book doors
- `src/app/book/[serviceId]/page.tsx`, `src/app/book/cuts/page.tsx`,
  `src/app/book/receipt/[bookingId]/page.tsx` — STYLE ONLY, only if a
  page-local font/color divergence shows
- `src/components/ServiceCard.tsx` — STYLE ONLY (the FLIP is the
  reference, behaviour untouched): the card's own one-off faces/colors
  align to the house tokens
- `src/app/house.css` — session/book rules only, if a rule is needed
- `tests/sessions-style.test.ts` (new) — pins the house heading/body
  classes and no page-local font-family on the sessions/book pages

Brief: `~/dev/kimi/inbox/TASK-152-oc-sessions-page-house-style.md` (cut
0018.06.17 a₿)
Gates: `npx vitest run` (grows with the new pins, all green) · ALL
`node scripts/*.test.mjs` (calendar 70, cartridge 183, square-payments 36
hold) · `npm run lint` = 0 · `npx tsc --noEmit` · `npx next build` · shots
before/after, dark/dawn × 1440/390 of /book and one /book/[serviceId]
page (own dev server :3143, stopped by PID after; harness borrowed per
the task-148 outbox idiom, lives in the outbox, not the repo; puppeteer
borrowed by require-path, NEVER a dependency)
→ `~/dev/kimi/outbox/task-152/shots/` · SUMMARY.md in
`~/dev/kimi/outbox/task-152/`, ending LANE-DONE + full sha.
Questions → Number One.
