# WORK-CLAIM — TASK-147 (the pay button on meditations does nothing — bitcoin AND square; the card door never shows)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ (block 966,006)
BRANCH: `feat/task-147-pay-button-meditations`
WORKTREE: `~/dev/worktrees/task-147`
BASE: main tip `d674dbd` (T-129 switches, T-136 money desk with
ensureSquareVault(), T-138, T-145/146 all merged).
ROOM: From Love's meeting — "payment button is not currently working when
trying the meditation areas — we tried bitcoin and square"; "cash payment
doesn't show up when purchasing a meditation or anything". Bug lane first,
then the honest states. Live switches today (public read):
payments.btcpay=false, square=true — and the store item page judges rails
SYNCHRONOUSLY off siteSwitchesSync()'s cold-instance defaults
(btcpay:true) and never awaits ensureSquareVault() before
liveAdapter("square"), so the card door comes and goes per serverless
instance while a switched-OFF bitcoin door can still render. Faults to
verify, not assume (spec §2): railLive misjudged for fiat-priced items, no
card door on the AddonActions strip, checkout errors swallowed silently.
Does NOT touch `.env.local`, :3000/:4100 (the operator's live processes),
the live vault or live site (read-only public GETs only, per spec), the
main checkout, `~/dev/worktrees/task-137` (another lane's live claim), or
any deployment. Dev server on :3138 only, killed by recorded PID.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push, never archive. ENGLISH-PIN. No new dependencies. BFT
dating in comments. Love design laws: no serif faces, contrast ≥ 4.5:1, no
color-only meaning. Module law: no cross-app imports. Derive-or-dash —
never a fake link, number or name. The word is CARD, never "cash".

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/components/store/BuyPanel.tsx` — the honest button states + the
  rail's own error sentence, never a silent nothing
- `src/app/store/[id]/page.tsx` — RAIL PROPS ONLY: await getSiteConfig() +
  ensureSquareVault() before liveAdapter()/liveAdapter("square") are judged
- `src/app/api/store/checkout/route.ts` — ERROR SHAPE ONLY: a throwing
  adapter answers with the rail's own sentence as JSON, never a bare 500
- `src/components/store/AddonActions.tsx` + `AddTierButton.tsx` — the strip
  doors: card door when the card rail is live, failures spoken in words
- `tests/buy-panel.test.ts` (new) — the vitest pins
- (flagged in SUMMARY if forced) `src/app/packages/[slug]/page.tsx` — the
  one line each that passes rail truth into AddonActions; without it the
  strip's card door can never render (spec §2 fault 2)

Brief: `~/dev/kimi/inbox/TASK-147-oc-pay-button-meditations.md` (cut
0018.06.17 a₿)
Gates: `npx vitest run` (main baseline 121 → grows) · ALL
`node scripts/*.test.mjs` (square-payments 36 holds) · `npm run lint` = 0 ·
`npx tsc --noEmit` · `npx next build` · shots both themes: a meditation
item with (a) card only, (b) bitcoin only, (c) neither, (d) the error
sentence after a failed checkout (own dev server :3138, stopped by PID
after; harness borrowed per the outbox examples, lives in the outbox, not
the repo; puppeteer borrowed by require-path, NEVER a dependency)
→ `~/dev/kimi/outbox/task-147/shots/` · SUMMARY.md in
`~/dev/kimi/outbox/task-147/`, ending LANE-DONE + full sha.
Questions → Number One.
