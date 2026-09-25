# TASK-458 claim

Builder: Number One
Block: 968,543 (0018.07.05 a₿, per the Saturday lanes' own ground truth)
Branch: feat/task-458-receipt-door
Worktree: /home/pac/dev/worktrees/task-458
Base: 9db8532 (origin/main)
Brief: /home/pac/dev/briefings/oc-sat-lanes-968543/TASK-458-receipt-door.md
Common rules: /home/pac/dev/briefings/oc-sat-lanes-968543/COMMON.md

## Contract

The receipt page (`OrderStatus.tsx`) and its feed (`orders/[id]/route.ts`) get
three things:

1. **Card words** — a fiat order (`priceSnapshot.currency !== "SATS"`) reads
   its own settled/processing/expired words (no "sats"/"invoice"/"on-chain"/
   "⚡"); a SATS order's words are untouched. A fiat "expired" order gets a
   plain `/cart` link instead of the (proven-broken, see Obstacles) recharge
   button.
2. **The door** — the feed gains `door: "/rooms/heart-field" | null`, derived
   from the SAME predicate `entitlement-fulfil.ts`'s `bestPackageGrant` scans
   line items with (`kind === "package"` + `isTier(entitlementTier)`), never a
   second list of item ids. A settled membership order signed in gets a
   `kit-btn kit-btn-main` link to the door; signed out gets the door as the
   sign-in line's `next`.
3. **The grant on return (F-03)** — the receipt's reconcile, on flipping an
   order to settled, calls `settleEntitlementFromOrder(order)` exactly as the
   webhook does. Idempotency is proven FIRST, directly against the read-only
   `entitlement-fulfil.ts`/`entitlement.ts` (unmodified), before the call is
   wired into the route.

## OWNS

`src/components/store/OrderStatus.tsx`, `src/app/api/store/orders/[id]/route.ts`,
`tests/receipt-door-458.test.ts` (new), pins naming changed words,
`work-claims/task-458.md`, `work-claims/task-458-register.md`.

## READ-ONLY (imported, never edited)

`src/lib/payments.ts`, `src/app/api/store/webhook/square/route.ts`,
`src/lib/entitlement-fulfil.ts`, `src/lib/entitlement.ts`, `src/lib/matrix.ts`,
`src/lib/reading-room.ts`, `src/lib/store.ts`, `CartPanel.tsx`, store pages,
`sections.tsx`, `kit.css`, `house.css`. `src/app/api/store/checkout/route.ts`
is also read-only for this lane (see Obstacles — a real gap was found there,
worked around from inside OWNS instead of touched).

## Sequence

First commit: this claim. Then red tests (`tests/receipt-door-458.test.ts`
alone, proven to fail against base — see the register). Then the build (the
two source files). Then `work-claims/task-458-register.md`. Gate:
`~/dev/shortcuts/oc-gate.sh /home/pac/dev/worktrees/task-458` must print
GATES GREEN before hand-back.
