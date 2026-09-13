# WORK-CLAIM — TASK-223 (ONE Cocreation: the Square receipt names what was bought)

CLAIMED-BY: home crew (sonnet) · Track B, alone.
CLAIMED-AT: 0018.06.23 a₿ (block ~966,830), lane opened same watch.
BRANCH: `feat/task-223-square-receipt`
WORKTREE: `~/dev/worktrees/task-223`
BASE: main @ `b8539e3` (the T-214 merge) — this IS "main @ the T-214 merge or newer" at the moment this lane was cut; re-verified at claim time (`git log -1` on the worktree matches).
BRIEF: `~/dev/home/inbox/TASK-223-oc-square-receipt-line-items.md`, cut from T-214's own seam (`~/dev/home/archive/task-214/patches/task-214/SUMMARY.md`, "Seams" section) — Love's call #7: the Square receipt mail has "no product description, unreadable order number."

GROUND (re-grepped at claim, not trusted from the brief alone):
- `src/lib/payments.ts` `ChargeRequest` interface (line ~22) carries no `description`/`referenceId` field yet.
- `buildSquarePaymentLinkBody()` (line ~370) sets `line_items[0].name = \`Order ${req.orderId}\`.slice(0, 512)` and never sets `order.reference_id` — confirmed the exact literal T-214 found.
- Four `createCharge(` call sites, confirmed at these exact lines on `b8539e3`:
  - `src/app/api/cart/checkout/route.ts:354` (the basket, one call; `order.lineItems` in scope)
  - `src/app/api/store/checkout/route.ts:33` (inside `tryCharge()`, called from two sites in the same file: line 119 retry-on-expired-order, line 228 new single-item order — both need the same treatment)
  - `src/app/api/bookings/checkout/route.ts:203` (the booking; `service.title` + `slot.startUtc`/`service.artistTz` in scope)
  - `src/app/api/tip/route.ts:59` (the tip; only `target`/`tipId` in scope, no order record — tip always charges in SATS so today it can never actually reach Square (`squareAdapter.createCharge` throws on `currency === "SATS"`), but the interface gets wired for consistency/future-proofing, per brief)
- The house's existing buyer-facing "order number" convention, confirmed by grep (not invented): `order.id.slice(0, 8)` — used identically in `src/app/a/money/page.tsx:328` ("Order {detail.id.slice(0, 8)}"), `src/lib/pwyc-letters.ts:185` ("order {order.id.slice(0, 8)}"), and `src/components/console/PwycDesk.tsx:87`. This lane reuses that exact derivation for `referenceId` — "one order number everywhere, never a second."
- Tip jar labels, confirmed by grep: `src/components/TipJar.tsx`'s `JARS` table and `src/app/a/page.tsx`'s `JAR_LABELS` both already carry the words "Tip Love" / "Tip One Cocreation" / "Gifts of Gratitude" — this lane reuses those exact words as the tip's `description` (a small local literal in the route, matching the house's own existing duplication pattern between those two files — no new cross-module import into a route handler).

BUILD (planned, confirmed against the live tree above):
1. `ChargeRequest` gains optional `description?: string` and `referenceId?: string`.
2. `buildSquarePaymentLinkBody`: `line_items[0].name = (req.description ?? \`Order ${req.orderId}\`).slice(0, 500)` (500, not the prior 512 — Square's real cap and this brief's own doc comment both say ≤500; T-214's sketch diff said 512, corrected here per this brief's explicit gate/test instructions, noted as a deliberate correction, not a drift). `order.reference_id = req.referenceId`.
3. Four callers pass `description`/`referenceId`:
   - basket: line titles joined, qty shown when >1, `.slice(0, 500)`; referenceId = `order.id.slice(0, 8)`.
   - store/checkout (both the new-order and the retry-on-expired-order call sites): the item's title(s); referenceId = `order.id.slice(0, 8)`.
   - booking: `${service.title} — <civil time>` (a small local formatter in the route file — `fmtWhen` in `src/lib/mail-booking.ts` is unexported and that file is NOT in this lane's OWNS, so a minimal local helper is written in the route itself rather than exporting/touching mail-booking.ts); referenceId = `orderId.slice(0, 8)`.
   - tip: the jar's existing label word; referenceId = `tipId` (already the one identifier this route mints and returns to the buyer — reused, not shortened again).
4. BTCPay adapter: untouched (confirmed it carries no description-shaped field to mirror).
5. Tests: `scripts/square-payments.test.mjs` gains cases pinning name-from-description, the "Order <id>" fallback, `reference_id` presence, and the 500-char cap. `tests/cart-checkout.test.ts` gains an assertion on the captured Square create body (name/reference_id) — reusing its existing full fixture. New light per-route tests for store/checkout, bookings/checkout and tip pin the description/referenceId by fixturing the adapter (mocking `@/lib/payments`'s `liveAdapter`/`getAdapter`/`ensureSquareVault`, keeping everything else real) — per the brief's own instruction, not a full second Square/BTCPay network fixture per route.

OWNS: `src/lib/payments.ts` (the Square body + `ChargeRequest` only), the four caller routes (the `createCharge` call sites only — `store/checkout/route.ts` has two), tests (`scripts/square-payments.test.mjs`, `tests/cart-checkout.test.ts`, and up to three NEW test files for store/checkout, bookings/checkout, tip). NOT the cart/checkout logic around them, NOT BTCPay, NOT the receipt letters, NOT `mail-booking.ts` (a seam only).

GATES (verbatim into SUMMARY, established now, must grow):
- `npx vitest run` baseline at this claim: **692 passed (692), 63 test files**.
- `node scripts/square-payments.test.mjs` baseline: **36 passed, 0 failed**.
- `node scripts/calendar-view.test.mjs`, `node scripts/cartridge-identity.test.mjs` (both in the gate list; not expected to move).
- `npx eslint` (0), `npx tsc --noEmit` (0), `npx next build` (compiled).

LAW: MONEY PATH — no change to amounts, currency, idempotency keys, redirect URLs, or the BTCPay rail. Only the line item's name, the order's `reference_id`, and the four callers' `description`/`referenceId`. Never the live Square account, never `.env*`, no new npm dependencies, no secrets, never push, never archive. Derive-or-dash. Baseline established at cut (this file), never re-derived. No shots (server-side bodies only) — one real built Square body pasted in SUMMARY instead.

Report → `~/dev/home/outbox/task-223/SUMMARY.md`, ends `LANE-DONE <full sha>`. Questions → Number One.
