# work-claim — task-186

- TASK: TASK-186 — one currency at a time: fiat first "or sats", the customer's choice at checkout, a member preference
- HOUSE: ONE Cocreation (`~/dev/onecocreation`)
- LANE: kimi · branch `feat/task-186-one-currency` · base main @ 607687a (the T-169 merge — money CARDS live; this lane owns the money WORDS, never /a/money)
- STAMP: 0018.06.18 a₿ · block 966,101
- BASELINE AT CUT: `npx vitest run` — 47 files / 458 tests, all green (pasted in SUMMARY.md)
- OWNS (verbatim from the spec):
  `src/lib/money-words.ts`, NEW `src/lib/money-preference.ts`,
  `src/components/store/{StoreItemCard,BuyPanel,CartPanel,OrderStatus}.tsx` (the price lines + the toggle),
  `src/app/packages/[slug]/page.tsx` (price lines), the member profile route (additive field), tests.
- OWNS EXITS: flag-and-stop by default; any minimal forced edit gets a one-line justification in SUMMARY.md
  (expected, load-bearing: `src/app/store/[id]/page.tsx` price line through priceWords — the spec names the item
  page a price surface and demands shots of it in both preferences; `src/app/cart/page.tsx` judging the rails
  server-side so CartPanel's toggle can honor "fiat default when the card rail is live";
  `src/lib/order-receipt.ts` — the letters' amounts, spec item (4)).
- NEIGHBORS (never touched): task-182 brand desk, task-184 rooms, task-185 front door — disjoint OWNS verified at dispatch.
