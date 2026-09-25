# TASK-458 register

Base: 9db8532 (origin/main)
Builder: Number One
Block: 968,543
Brief: /home/pac/dev/briefings/oc-sat-lanes-968543/TASK-458-receipt-door.md
Commits (this branch, in order): 3045fd7 (claim) → 3bbe162 (red tests,
verified against 9db8532: 11 of 19 fail, 8 pass — see Obstacles for why 8
pass on purpose) → 2ca2f36 (the build, all 19 green).

## What was built

**`src/components/store/OrderStatus.tsx`**
- `FIAT_STATE_COPY` (new): settled → `PAID ✓` / "thank you. Your payment
  went through."; processing → `PROCESSING` / "Square is finishing your
  card payment. This page updates by itself."; expired → `LINK EXPIRED` /
  "no harm, payment links time out. Start again from your basket." Read
  only when `order.priceSnapshot.currency !== "SATS"`; every other state,
  and every SATS order, reads the untouched `STATE_COPY`.
- `door?: string | null` added to `OrderView`. Signed in + a door +
  settled/fulfilled: `<p><a href={order.door} className="kit-btn
  kit-btn-main">Go to the Heart Field</a></p>` + a `kit-text-quiet` line.
  Signed out + a door: the existing sign-in line's `next` becomes
  `order.door` and its words become "Sign in with `{buyerEmail}` to go
  in."; no door keeps the original "Sign in with that email... to use
  what you bought." line word-for-word (the pin `order-receipt.test.ts`
  already carries on that exact string still holds).
- `canRecharge` now excludes a fiat "expired" order; that case instead
  renders `<p><a href="/cart" className="btn btn-gold btn-sm">Back to
  your basket</a></p>` — see Obstacles for the seam this covers.

**`src/app/api/store/orders/[id]/route.ts`**
- `door` on the feed: a second small loop over `order.lineItems` (mirrors
  the existing deliverable loop's own per-line `getItem` shape) checks
  `item?.kind === "package" && isTier(item.entitlementTier)` — the exact
  two conditions `entitlement-fulfil.ts`'s `bestPackageGrant` checks per
  line, so this can never name a membership item `bestPackageGrant`
  itself wouldn't also grant on. `isTier` is imported from
  `@/lib/entitlement` (already exported); `bestPackageGrant` itself is
  not exported and entitlement-fulfil.ts is READ-ONLY, so this is the
  closest "same source" available without touching that file. The door's
  destination is `READING_ROOM_PATH` (`@/lib/reading-room`), the one
  Heart Field address every other door in the codebase already agrees on
  (NavMenu, `readingDoorHref`, …) — never a hand-typed `"/rooms/heart-
  field"` string.
- The reconcile: when `recordChargeEvent` flips the order, the route now
  also calls `settleEntitlementFromOrder(order)`, wrapped in its own
  try/catch (mirrors `store.ts`'s own pattern for `sendOrderReceipt`) so a
  settle hiccup never costs the receipt page its answer.

**`tests/receipt-door-458.test.ts`** (new, 19 tests) — see the file's own
header comment for the fixture idiom (order-receipt.test.ts's stateful KV
+ Square-sandbox stub, extended with LPUSH for mail-queue.ts and a
chargeId→Square-state map for the reconcile poll). Covers: the door
derivation (membership/taster/mug/mixed basket), the signed-out feed
facts, settleEntitlementFromOrder's idempotency called directly (grant
twice, taster twice, refund twice — one membership, one expiry, one
letter), the reconcile actually calling it, the fiat-recharge probe, and
source pins for the two word tables + the door/fallback markup.

## Deviations

1. **The two new UI blocks use plain `<p>` wrappers instead of the
   flex-centering `<div style={{display:"flex",justifyContent:"center"}}>`
   pattern the sibling download/recharge blocks use.** First draft used
   that pattern (2 new inline styles for the door CTA, 1 for the `/cart`
   fallback) and blew the design-drift ratchet
   (`tests/design-drift.ceilings.json`: OrderStatus.tsx's `styleBlocks`
   ceiling is 27; measured 30). Both `.kit-btn` and `.btn` are
   `display:inline-block` (kit.css/house.css), and the page's outermost
   `<div style={{textAlign:"center"}}>` already centers any inline-block
   descendant — so a bare `<p><a className="kit-btn kit-btn-main">…</a></p>`
   centers identically with zero new `style={{`. Ceiling holds at 27; full
   suite green.
2. **A fiat "expired" order does not get a working recharge button at
   all — a plain `/cart` link replaces it, per the brief's own
   conditional.** The brief said: check whether "Mint a fresh invoice"
   can actually re-mint a Square link on the card rail; if it can't,
   fall back to `/cart`. It can't, for a reason worth naming precisely
   (Obstacles below) — and the real fix sits in a file outside this
   lane's Build scope, so it was reported, not built.
3. **No existing pin needed re-truing.** Searched
   (`grep -rln "sats landed with the artist\|ON THE CHAIN\|Mint a fresh
   invoice\|INVOICE EXPIRED\|PAID ✓" tests/`) before touching any word —
   nothing outside the new test file names these literal strings.
   `order-receipt.test.ts`'s own OrderStatus.tsx pins ("order.viewerOwns
   === false", "Sign in with that email") still hold verbatim.

## Open question for the Admiral

`OrderStatus.tsx`'s `recharge()` posts `{ orderId }` with no `rail` field
when retrying an expired/underpaid order. The checkout route picks its
top-level adapter via `liveAdapter(wantsCard ? "square" : undefined)`
*before* it even looks at `body.orderId` — and `wantsCard` is `false`
whenever `rail` is absent, so a retry always gates on the **bitcoin**
switch, never the order's own Square adapter. With bitcoin off (today's
production setting), that 503s before the retry logic that would
otherwise correctly resolve Square via `getAdapter(order.adapterId)` ever
runs. Proven both ways in `tests/receipt-door-458.test.ts`'s "fiat
recharge probe": `{orderId}` alone 503s; `{orderId, rail:"card"}` on the
identical order succeeds and returns a real `square.link` URL. The real
fix is one line in `recharge()` (send `rail: "card"` when the order's
currency isn't SATS) — entirely inside this lane's own OWNS file, but
outside this lane's three declared Build items, and it changes a live
payment-retry path, so it wasn't made without the Admiral's say-so. This
lane instead followed the brief's own pre-authorized fallback (plain
`/cart` link) so no fiat buyer sees a button that silently fails. Named,
not fixed.

## Gates (actual output)

```
$ ~/dev/shortcuts/oc-gate.sh /home/pac/dev/worktrees/task-458
 Test Files  230 passed (230)
      Tests  2903 passed (2903)
scripts/calendar-view.test.mjs: 70 passed, 0 failed
scripts/cartridge-identity.test.mjs: 179 passed, 0 failed
scripts/console-matrix.test.mjs: 14 passed, 0 failed
scripts/fixture-kv.test.mjs: 45 passed, 0 failed
scripts/square-payments.test.mjs: 58 passed, 0 failed
eslint 0
tsc 0
build ok
GATES GREEN
```

One prior run of the same gate on the same commit reported `BUILD FAILED`
with zero lines of actual error output under it (other lanes were gating
the shared box at the same time, per COMMON.md's own warning); a bare
`npx next build` immediately after showed `✓ Compiled successfully` with
exit 0, and the very next full gate run was clean. Treated as the flake
COMMON.md names, not a red gate — the surviving GATES GREEN above is the
current commit's real result.

## Verification

Red tests committed at 3bbe162 against unmodified `OrderStatus.tsx`/
`orders/[id]/route.ts`: 11 of 19 fail (door derivation, signed-out feed
facts, reconcile-wiring, card-words/door source pins). The other 8 pass
at that same commit ON PURPOSE: four of them call `settleEntitlementFromOrder`
directly against the READ-ONLY `entitlement-fulfil.ts`/`entitlement.ts` to
prove idempotency BEFORE wiring it to the reconcile (the brief's own
sequencing: "FIRST prove it is idempotent... If it is NOT idempotent, do
not build item 3"), and two probe the untouched `checkout/route.ts`
directly. Verified by `git stash` (tagged, SHA captured, applied back
by SHA, per this session's stash-safety rule) to isolate the build
commit's diff, run the suite at 3bbe162, then restore.

Final HEAD: this register's own commit — reported in the hand-back
message.

## Review fix round (Number One, block 968,543)
- BLOCKER (adversarial review): a card order in `charge_created` — the state Square's OPEN order reads while a card authorizes (`payments.ts` mapOrderState), where the buyer lands straight back from the payment page — fell through to STATE_COPY and read "your invoice is open". `created` likewise read "no invoice yet". Fixed: both added to FIAT_STATE_COPY; the page now resolves words through one exported `stateCopyFor(state, currency)`, and the test walks EVERY state a card order can be in (not just the fiat table's own text).
- Should-fix (same review): a signed-out buyer of a mixed basket (membership + a locked download) never got the door-aware sign-in, because the old `!order.deliverable?.locked` guard hid it and the lock block's own `/login` link carries no `next`. Fixed: the line shows when `order.door || !order.deliverable?.locked`. Pinned.
- Rebased onto origin/main a176f7c (#81/#82/#83).
- The receipt's "Go to the Heart Field" is now `kit-btn kit-btn-main kit-btn-sm`. Measured on production /reading (T-457's same label, main size): the button is 406 px wide and clips inside a 316 px card at a 360 px phone. The receipt would have done the same.
