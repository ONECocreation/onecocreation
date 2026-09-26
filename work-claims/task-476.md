# TASK-476 claim

Builder: sonnet sub-agent for Number One
Block: 968,670 (Love's live reading, ongoing; ground truth as of 968,624+)
Branch: feat/task-476
Worktree: /home/pac/dev/worktrees/task-476
Base: origin/main e136672

PROBLEM: `src/lib/qa-entitlement.ts`'s `qaEntitled(subject, tier)` checks
tier C first, then (below tier C) calls `store.ts`'s `listOrders()` —
which reads the WHOLE order ledger (`SMEMBERS store:orders:index`, then
one GET per order) on every /reading SSR for a signed-in visitor below
tier C, and on every 20s poll of `/api/qa-door` while the Q&A is open.
Fine at today's order count, doesn't scale.

BUILD: a per-subject order index in `store.ts`.

1. `createOrder()` SADDs an order with an `entitlementSubject` into
   `store:orders:by-subject:<subject>` (same bare, un-prefixed key shape
   as the existing `store:order:<id>` / `store:orders:index` keys — no
   `TENANT` prefix; store.ts carries none today, so this doesn't invent
   one), right alongside its existing `store:orders:index` SADD, same
   `kv()` client, same `vaultConfigured()` gate (the dev file driver gets
   no index — `listOrdersForSubject` falls back to a plain scan there,
   same as `listOrders()` already does for that driver).
2. New `listOrdersForSubject(subject)`: SMEMBERS the subject's set, GET
   only those ids (via the existing `getOrder()`, which already applies
   `safeOrderId`).
3. One-time backfill, no manual step: a KV flag
   `store:orders:by-subject:v1-built`. Missing → one full `listOrders()`
   scan, SADD every existing order into its subject's set, then set the
   flag. SADD is idempotent (two racing "first calls" are harmless). An
   order created during the backfill is still covered because
   `createOrder()` indexes it itself.
4. `qaEntitled()` switches from `listOrders()` to
   `listOrdersForSubject(subject)`. Tier C short-circuit stays first,
   fail-closed-on-throw stays, the settled/fulfilled-only rule
   (`qaEntitledFromOrders`) is untouched.
5. Tests (vitest, fixture-KV `vi.stubGlobal("fetch", …)` pattern from
   `tests/entitlement-renewal.test.ts` / `tests/order-receipt.test.ts`):
   createOrder indexes; backfill runs once, never re-scans; a
   pre-backfill order is found after backfill; a wrong subject isn't
   found; `qaEntitled` behavior unchanged (tier C, settled, refunded,
   disputed, wrong item).

## OWNS

- `work-claims/task-476.md` — this file.
- `src/lib/store.ts` — EDIT: `createOrder()` gains the subject-set SADD;
  new internal `subjectIndexKey()`/`ensureSubjectIndexBuilt()`; new
  exported `listOrdersForSubject(subject)`. No existing export's
  signature or behavior changes.
- `src/lib/qa-entitlement.ts` — EDIT: `qaEntitled()`'s one `listOrders()`
  call becomes `listOrdersForSubject(subject)`. `qaEntitledFromOrders`
  (the pure core) and its exported shape are untouched.
- New test file(s) under `tests/` for the index/backfill (exact name(s)
  may shift slightly while building, e.g.
  `tests/store-orders-by-subject.test.ts`).

## READ-ONLY

Everything else, in particular the other lanes running alongside this
one: `src/components/booking/JitsiRoom.tsx` and
`src/components/reading/ReadingStage*.tsx` (T-477), any sign-in UI
component (T-478), and any mockup-only work (T-479, no code). Also
read-only: every other caller of `listOrders()` (`src/app/a/money/page.tsx`,
`src/app/api/admin/people/route.ts`, `src/components/console/PwycDesk.tsx`)
— they keep reading the whole ledger; this lane adds a second read path,
it does not migrate them.
