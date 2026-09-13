# work-claim — TASK-224: Square's receipt carries the itemised bill

LANE: home crew (sonnet) · worktree `~/dev/worktrees/task-224` · branch `feat/task-224-square-itemised`
base: `main @ 92d2087` (moving requirement — this lane reports the actual base used in SUMMARY.md)

## Baseline (established at cut, before any change)

`npx vitest run`:
```
 Test Files  78 passed (78)
      Tests  785 passed (785)
```

`node scripts/square-payments.test.mjs`:
```
44 passed, 0 failed
```

## Scope (OWNS, per the brief)

- `src/lib/payments.ts` — `ChargeRequest` gains optional `lines?: { name; quantity; unitAmount }[]`;
  `buildSquarePaymentLinkBody()` emits itemised `line_items[]` ONLY when
  `Σ quantity × unitAmount === req.amount` exactly, else falls back to today's single line.
- `src/app/api/cart/checkout/route.ts` — the basket's `createCharge()` call site: one line per
  basket line (fiat only, card rail only; a PWYC/sats-only line means no `lines` at all).
- `src/app/api/store/checkout/route.ts` — both `createCharge`/`tryCharge` call sites (new order +
  retry-on-expired): one line with the qty.
- Tests: `scripts/square-payments.test.mjs`, `tests/cart-checkout.test.ts`.

NOT touched: the receipt letter (`src/lib/order-receipt.ts`), the order page
(`src/components/store/OrderStatus.tsx`), bookings/tips (single description, unchanged), the
BTCPay adapter, any amount/currency/idempotency/redirect/reference_id/metadata value.

## Money-path law (restated, binding)

The charged total, currency, idempotency key, redirect URL, `reference_id`, `metadata` and the
BTCPay rail do not change. Itemised lines are emitted ONLY when their exact sum equals the
charged amount; any mismatch falls back to the single-line body — never rounds.
