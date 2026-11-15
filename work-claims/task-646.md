# WORK-CLAIM - T-646 - ONE Cocreation: Pay It Forward step 1, three fixed dollar gifts

CLAIMED-BY: Number One's builder (home crew), block 976,007,
from Lumen's brief `number-one/inbox/LUMEN-oc-pif-card-gifts-GO-975999.md` (step 1)
and Part 4 of `number-one/inbox/LUMEN-oc-his-desk-answers-and-marks-976007.md`.
BRANCH: `lane/task-646` (off origin/main eaa63bec; the admin shell Part A is not merged)
WORKTREE: `~/dev/worktrees/oc-pif-step1`
PORTS: 6460-6463
PR: none from this lane. Lumen looks at the forge set first; the branch is pushed only.

Fences: no merge, no deploy, no write to Love's saved pages, menu or KV, no live
shelf item, no live pay press, the word is "gift", common CSS only, the
design-drift ceilings never rise, new public words are proposals.

First commit: the books fix (the jars count from settled orders, Lumen's
acceptance at block 975,999), with the reports export holding one row per gift.

## OWNS
- `work-claims/task-646.md` (this file)
- `src/lib/tips.ts` (the jar ledger reads orders as well as the pre-T-411 invoices)
- `src/lib/jars.ts` (the three dollar gift ids beside JAR_ITEMS)
- `src/lib/gift-panel.ts` (new: the panel gate, rail by rail)
- `src/lib/basket-rails.ts` (new: which live rail can carry a basket, and the plain sentence)
- `src/lib/store.ts` (an order line records its list price in fiat, beside listSats)
- `src/app/api/cart/checkout/route.ts` (writes that record; the charge is not changed)
- `src/app/api/admin/reports/route.ts` (one row per gift)
- `src/app/api/admin/tips/route.ts` (the ledger's new gate)
- `src/app/a/page.tsx` (the scoreboard shows dollars beside sats)
- `src/app/a/money/page.tsx` (the jar cards show dollars beside sats)
- `src/components/TipJar.tsx` (the row: three one-width buttons, Give full width; the dollar row)
- `src/components/DollarGiftRow.tsx` (new)
- `src/components/store/GiftDrawer.tsx` (the drawer opens on either rail)
- `src/components/store/ShelfSection.tsx` (gift items stay off the shelf)
- `src/components/store/RelatedItems.tsx` (gift items stay out of Related)
- `src/components/store/CartPanel.tsx` (the plain sentence for a basket no live rail can carry)
- `src/lib/store-sections.ts` (gift items' crumb goes to the drawer)
- `src/app/store/page.tsx` (the drawer's gate)
- `src/app/pay-it-forward/page.tsx` (the gate and the words, as proposals)
- `src/app/house.css` (the give row rules, inside the existing pif- section at the file's end; no overlap with T-645's hunks)
- `tests/design-drift.ceilings.json` (only lowered, or a new file's record)
- `tests/jar-books-646.test.ts` (new)
- `tests/pif-card-gifts-646.test.ts` (new)
- `tests/basket-sats-off-646.test.ts` (new, fix round: the basket shows no sats while bitcoin is off, his Mark 2)
- `tests/store-gift-drawer.test.ts` (pins follow the new gate)
- `tests/support-jars-basket.test.ts` (pins follow the new gate)
- `tests/item-page.test.ts` (pins follow the new gate)
- `tests/pay-it-forward.test.ts` (pins follow the new words)
