# work-claim — task-357 (OC · cap the cart merge)

Lane: home crew (Number One sonnet sub-agent). Base = onecocreation main
**eb2441f3ba0980a8becab9f6ca8422afaf703124** (T-352 merged, touched no cart file; anchors
re-grepped on it at lift). Branch `feat/task-357-cart-merge-cap`. Worktree cut by Number
One, `npm ci` already run there. Lane ports **4542–4545**. Brief:
`~/dev/home/inbox/TASK-357-oc-cart-merge-cap.md`. RULED by the Admiral, block 967,916:
**(a) on all four named decisions** (D1 leave the line-count bound, D2 clamp on read in
`getCart`, D3 stay silent, D4 fold the store-checkout twin in) — nothing here is open.

A guest with 21 of an item signing in to a member cart already holding 21 of the same
item used to land at 42, and checkout charged for 42 — the add path would never allow
that. This lane gives the 1..21 law one source (`CART_MAX_QTY` + `clampQty` in
`src/lib/cart.ts`) and makes `mergeCarts`, the cart add path, and the store-checkout twin
all obey it, plus heals a poisoned qty in memory on every `getCart` read (D2(a)) so an old
merge artifact can't keep re-spreading. A non-numeric `body.qty` (the second bug traced in
the brief — it used to store `null` and price at 0) now stores `1` on both money-adjacent
paths.

## OWNS

`src/lib/cart.ts` (NEW `CART_MAX_QTY`, NEW `clampQty`, `getCart`'s read-time heal,
`mergeCarts`'s clamp on sum + on push), `src/app/api/cart/route.ts` (the add path's inline
literal → `clampQty(body.qty ?? 1)`), `src/app/api/store/checkout/route.ts` (the twin
literal → `clampQty(body.qty ?? 1)`, imported from `@/lib/cart` — D4(a)), NEW
`tests/cart-merge-cap.test.ts`, `work-claims/task-357.md` (this file, first commit).

READ-ONLY (per brief, untouched): `src/app/api/cart/checkout/route.ts` (bare `mergeCarts`
call stays bare, on purpose — fail-loud on the money route), `src/lib/mail-queue.ts`,
`src/components/BasketChip.tsx`, `src/components/store/BuyPanel.tsx` (keeps its own `21`
literal — importing `CART_MAX_QTY` would drag server imports into the client bundle),
`tests/cart-checkout.test.ts`, `tests/cart-puck.test.ts`, `tests/chrome-trio.test.ts`,
`tests/buy-panel.test.ts`, `tests/store-checkout-receipt.test.ts` — all pass unedited.

## Gates

`npx vitest run` · `node scripts/calendar-view.test.mjs` · `node scripts/
cartridge-identity.test.mjs` · `node scripts/square-payments.test.mjs` · `npx eslint src
tests --max-warnings=0` · `npx tsc --noEmit` · `npx next build`.

## What is NOT in this lane

No line-count bound (D1). No UI change, no message to the shopper when a merge clamps
(D3). `BuyPanel.tsx`'s stepper keeps its literal `21`. `BasketChip`'s `99+` display cap
stays. `cart/checkout/route.ts` is read-only — no graceful-503 wrap on its bare
`mergeCarts` call. No remedy for an order already charged at 42 before this lane (that's a
refund conversation, not code).

## Cut note

Stamp per the brief, block 967,916 (the block D1–D4 were RULED at).
