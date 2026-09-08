# WORK-CLAIM — TASK-148 (every store item card flips like the session cards — front · back · full view)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ · block 966,012
BRANCH: `feat/task-148-store-cards-flip`
WORKTREE: `~/dev/worktrees/task-148`
BASE: main tip `e540fa3` (T-147 pay-doors merged).
ROOM: From Love's meeting + the Admiral's word — the item cards in /store
"are not flipping — it extends the card in an unnatural way, it goes
outside the box". The shelf cards ride a QuickView peek Sheet whose
position:fixed is trapped by the .card's backdrop-filter containing block
(the exact failure ServiceCard's header retires for sessions), while the
session cards on /book already turn over clean on the house flip contract
(house.css `.flip-card`). The fix is NOT a second flip: the store shelf
adopts the same 3D flip mechanism, one card box, front rules the height,
back scrolls inside, click anywhere turns it, Enter/Space turns it, the
full-view door on both faces → /store/[id], and GET IT ⚡ / ADD TO BASKET
leave the card for the full view page (the Admiral: "where the user can
decide to purchase or add to cart"). Session cards stay byte-identical —
their component is not touched.
Does NOT touch `.env.local`, :3000/:4100 (the operator's live processes),
the live site, the main checkout, `~/dev/worktrees/task-137` (another
lane's live claim), or any deployment. Dev server on :3139 only, killed
by recorded PID.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push, never archive. ENGLISH-PIN. No new dependencies. BFT
dating in comments. Love design laws: no serif faces (house tokens only),
contrast ≥ 4.5:1, no color-only meaning. Derive-or-dash — never a fake
link, number or name.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/components/store/StoreItemCard.tsx` (new) — the shelf card on the
  ONE house flip mechanism, reusing house.css's `.flip-card` contract
- `src/app/store/page.tsx` — CARD WIRING ONLY: the shelf maps items into
  StoreItemCard; the QuickView Sheet leaves the shelf
- `src/components/store/QuickView.tsx` — RETIRED (dead after the rewiring;
  it is the culprit: its Sheet is the fixed-position peek trapped inside
  the card's containing block)
- `src/app/house.css` — CARD FLIP RULES ONLY, if the contract needs a line
- `tests/store-cards.test.ts` (new) — the vitest pins

Brief: `~/dev/kimi/inbox/TASK-148-oc-store-cards-flip.md` (cut
0018.06.17 a₿)
Gates: `npx vitest run` (main baseline 130 + follow-throughs → grows) · ALL
`node scripts/*.test.mjs` (calendar 70, cartridge 183, square-payments 36
hold) · `npm run lint` = 0 · `npx tsc --noEmit` · `npx next build` · shots
both themes × 1440/390: /store front, one card flipped, the full view
page, /book's session cards unchanged (own dev server :3139, stopped by
PID after; harness borrowed per the outbox examples, lives in the outbox,
not the repo; puppeteer borrowed by require-path, NEVER a dependency)
→ `~/dev/kimi/outbox/task-148/shots/` · SUMMARY.md in
`~/dev/kimi/outbox/task-148/`, ending LANE-DONE + full sha.
Questions → Number One.
