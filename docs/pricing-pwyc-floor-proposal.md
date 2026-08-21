# The floor and the range — a PWYC pricing proposal

TASK-14/S16, lane 3. A DOCUMENT ONLY — not one line of code changed or
proposed as diffs. The ruling that shapes every page: **the numbers are
Love's business decision, not ours.** This file proposes mechanism and
framing; every figure is left blank for her. Where a number appears below,
it is either a fact of the code as it ships today, or a transcription of
the reference model — never a suggestion of what hers should be.

## (a) What already ships — the five mechanisms, honestly mapped

Everything below was read in the tree, not remembered.

### 1. Pay-what-you-can on bookings, per service

- The mode is a first-class field: `PricingMode = "fixed" | "pwyc"` at
  `src/lib/booking-time.ts:34`, carried on `Service.pricingMode`
  (`src/lib/booking-time.ts:46-47`) — "a pwyc booking has identical
  standing". A pwyc service is exempt from the must-have-a-price rule at
  validation (`src/lib/booking-time.ts:344-348`).
- The customer names the price in the booking flow: the "what you can
  give (sats)" input at `src/components/booking/SlotPicker.tsx:605-617`,
  sent as `amountSats` at `SlotPicker.tsx:333`.
- Love toggles it per service at the /a/booking desk: the "pricing"
  select (`fixed` / `give what you can`) at
  `src/app/a/booking/page.tsx:173-182`. Note the same form DISABLES the
  price field in pwyc mode (`page.tsx:193-195`) — a pwyc service today
  carries no reference number at all.
- **The honest surprise, verified in code:** the direct booking rail
  (`src/app/api/bookings/checkout/route.ts:85-90`) accepts ANY positive
  integer of sats as the full price — no floor, no flag, no review. A
  session can be booked for a handful of sats and nothing tells Love it
  happened below any threshold, because no threshold exists. The review
  loop described next lives only on the CART path.

### 2. PWYC offers on cart lines — the full approval loop

- Any basket line may carry an offer: `CartLine.offerSats` at
  `src/lib/cart.ts:19-21` — "charged up front; below list price the order
  waits on Love's review."
- The offer UI is per line in the basket: "pay what you can — make an
  offer" at `src/components/store/CartPanel.tsx:326` (offer block
  :306-329), with the house's own promise under the total at
  `CartPanel.tsx:341-346`: "offers below the listed price are received
  with love — Love looks at each one, and if it can't be carried this
  time, your sats come straight back."
- Checkout flags it: `pwycPending` set whenever `offerSats < listSats`
  in `src/app/api/cart/checkout/route.ts` (gift-voucher lines :88,
  session lines :124, goods lines :150), stamped on the order at :237;
  the offer letter goes out at :250/:261. The money is captured
  IMMEDIATELY — the flag rides an already-paid (or already-invoiced)
  order.
- The decision machinery: `OrderRecord.pwycPending` declared at
  `src/lib/store.ts:173`; `decidePwyc()` at `src/lib/store.ts:555-569` —
  accept records the blessing ("the Pay-It-Forward jar may carry the
  gap"), decline records that a refund is owed. The event is the ledger
  row.
- Two doors, one machinery: the PwycDesk (`src/components/console/
  PwycDesk.tsx`, mounted at `src/app/a/money/page.tsx:208`) and the
  one-tap email doors (`src/app/api/offer-action/route.ts` — HMAC-signed
  single-use tokens, seven days). Both pour from
  `src/lib/pwyc-letters.ts`: `sendOfferNotify()` (:175) writes to Love at
  checkout; `decideOfferWithLetters()` (:209) decides, mints a BTCPay
  pull-payment refund link on a paid decline (:220-229), and sends the
  kind buyer letter either way.

So today: EVERY below-list offer is paid first and judged after. Accept
means bookkeeping the gap; decline means a refund and a letter. That is
real admin work on every discounted sale — the desk never rests while
PWYC is loved.

### 3. Tips and pay-it-forward — the three jars

`src/components/TipJar.tsx`: one gesture, three jars — Tip Love, Tip One
Cocreation, Pay It Forward (`JARS` at :12-28), angel-number presets
2,100 / 11,111 / 111,111 sats (:30), custom open. The ledger
(`src/lib/tips.ts`) reads the jars straight from BTCPay invoices — "the
invoices ARE the ledger" — and says its own limit out loud (:8-10):
grant-tracking has not landed; "today the jar total is the honest
number."

### 4. Discount codes, including 100%-off with no invoice

`src/lib/discounts.ts`: percent or flat codes, store-level, repricing
BEFORE any invoice is minted; `applyDiscount()` (:82-89) never goes
below zero. A 100% code settles the order with no invoice at all —
honestly recorded as `settled` with a `discount:<code>` event, on both
rails: cart checkout (`src/app/api/cart/checkout/route.ts:242-257`) and
booking checkout (`src/app/api/bookings/checkout/route.ts:173-189`).

### 5. Tasters — time-boxed tier grants

`StoreItem.entitlementDays` (`src/lib/store.ts:91-94`, validated
:291-292): a store item whose grant closes itself N days after purchase
— the $11 one-week pass — instead of standing open-ended. The expiry
rides `Entitlement.expiresAtMs` (`src/lib/entitlement.ts:59-61`); the
ONE gate reads a lapsed taster as nothing (`getEntitlement`,
:168-174), and `grantTier()` (:217-254) keeps a taster from ever
downgrading a standing membership.

## (b) The reference model, transcribed

From livingtheonelight.com/new-earth-soul-business-journey (already
transcribed for this task; not re-fetched):

- It is NOT pay-as-you-go. It is a **sliding scale with a floor.**
  Option A: minimum $240, suggested $280–$580. Option B (adds a
  4-person circle): minimum $1,800, suggested $2,200–$3,200.
- The price appears **LAST** — after the entire value case: curriculum,
  bios, gifts, and only then money.
- Scarcity is on **spots** (4 per circle), never on price.
- The framing words are literally **"Minimum"** and **"Suggested"**.

## (c) The structural gap, and the proposal

**The gap, in one sentence: theirs prices at the point of sale; ours
reviews after the fact.**

The reference model states the floor and the range up front, and the
customer chooses inside a bounded, honest frame before money moves.
Ours collects the money first, then asks Love to accept or decline —
with a refund owed on decline — on every single below-list offer
(cart path), or asks nothing and accepts anything (booking path).
The desk's kindness is real; so is its cost.

**The proposal: give PWYC a floor and a suggested range.**

- Each pwyc-enabled thing carries two optional numbers Love sets:
  a **minimum** and a **suggested** amount (the reference model's exact
  words — not "floor", not "from", hers to read as "Minimum" and
  "Suggested" on the page).
- An offer **at or above the minimum settles with no review** — the
  order is ordinary, the desk never hears about it.
- Only a **below-minimum** offer reaches the desk — now as what it
  truly is: an ask for a gift, received with love, decided with love.
- Whether below-minimum offers should be possible at all, or gently
  refused at the input with "the minimum for this one is ____", is
  Love's call (open questions, §f). Both are one-line policy differences
  in the same mechanism.

**The files this would touch** (named, not coded — each is a small,
local change on machinery that already exists):

- `src/lib/booking-time.ts` — `Service` gains the two optional fields
  (minimum, suggested); `validateService()` (:329) learns to check them
  as positive integers, minimum ≤ suggested.
- `src/lib/store.ts` — `StoreItem` (:69-95) gains the same two optional
  fields, validated beside `entitlementDays` (:291-292). `decidePwyc()`
  (:555) is UNCHANGED — it stays the below-minimum path.
- `src/app/api/cart/checkout/route.ts` — the three `pwycPending`
  conditions (:88, :124, :150) compare against the line's minimum
  instead of the list price. This is the whole behavioral change on the
  cart path.
- `src/app/api/bookings/checkout/route.ts` — the pwyc branch (:85-90)
  gains the same comparison: at/above the minimum settles silently as
  today; below the minimum either refuses kindly or flags the order for
  the desk (today it does neither — see §a.1).
- `src/components/booking/SlotPicker.tsx` — the "what you can give"
  input (:605-617) shows the two words and their numbers, and the
  client-side guard matches the server's.
- `src/components/store/CartPanel.tsx` — the per-line offer UI
  (:306-329) and the promise copy (:341-346) learn the two words; a
  line with a minimum says so before the offer is typed.
- `src/components/ServiceCard.tsx` — the "give what you can" price line
  (:54) can carry "Minimum ____ · Suggested ____" once the fields
  exist.
- `src/app/a/booking/page.tsx` — the pricing field (:173-196): in pwyc
  mode the disabled price input becomes the two new inputs. This is
  where Love sets her numbers — they belong to her desk, not to code.
- The store admin surface (`src/app/a/store`, saving through
  `src/app/api/admin/store/route.ts` / `validateItem`) — the same two
  inputs on items that allow offers.
- `src/lib/pwyc-letters.ts` — the offer letter's wording may name the
  minimum when one exists (cosmetic; the machinery is untouched).
- `src/components/console/PwycDesk.tsx` — unchanged in behavior; it
  simply receives less. Any copy that says "below the listed price"
  becomes "below the minimum".

Deliberately NOT touched: the tips ledger, discounts, tasters, the
entitlement gate — orthogonal machinery that keeps working exactly as
it does.

**Borrowing the reference's structure where it is genuinely better:**

- **Price last.** The reference earns the number before showing it. Our
  service cards lead with price; our session pages could let the value
  case (what the session is, who Love is, what others received) come
  first and the money frame close the page. A copy-and-order change,
  not a mechanism.
- **The words "Minimum" and "Suggested".** Warmer and more honest than
  "from" or "PWYC" — and they carry the floor's existence on their
  face, so nobody discovers it by being refused.
- **Scarcity on spots, never on price.** We already do this right and
  should keep it: the five sacred session times per day
  (`src/lib/booking-time.ts:294-298`), retreat seats sold by the seat
  (`Retreat.seats`, `src/lib/booking-time.ts:92-106`). No countdown
  pricing anywhere. Keep it that way.

## (d) Where a sliding scale belongs — and where it does not

**Belongs** — anything whose marginal cost is Love's time and presence,
where SHE is the one carrying the gap:

- Sessions (the booking rail — the pwyc mode already lives here).
- Guided meditations and digital packages (near-zero marginal cost;
  already offerable per cart line).
- Classes and memberships (tier grants; a minimum+range on a tier is
  the same mechanism pointed at `entitlementTier` items).
- Retreat seats (already store items riding the cart — offerable; and
  scarcity is already on seats, matching the reference).

**Does NOT belong** — physical goods. Jewelry, prints, shipped store
items have REAL unit costs: stones, wire, printing, postage, and a
drop-ship partner's invoice on `kind: "self" | "fourthwall"` lines
(`src/app/api/cart/checkout/route.ts:151`). A below-cost offer on a
pendant is not generosity Love can choose to carry — it is a loss
posted automatically. Today the cart already allows an offer on every
line, physical included; if the floor work lands, physical goods should
plainly say "no offers on this one" (or carry a minimum at cost that
Love sets per item). Said plainly, as asked: sliding scale is for her
time, not for her materials.

## (e) Frictions, verified against the code

1. **Four price homes, not one.** The `TIERS` const
   (`src/lib/entitlement.ts:29-37`); the KV store catalog
   (`StoreItem.price`/`sale`, `src/lib/store.ts:69-95`); the KV booking
   config (`Service.price`, read/written by `src/lib/booking.ts`); and
   hardcoded JSX literals — the four Jewelry pieces with USD and sats
   inline at `src/components/sections.tsx:122-127`, and the Affirmations
   cards showing `$11.11` / `≈ 11,110 sats` as literal text
   (`sections.tsx:265`) while the "Add ⚡" button (:266) links to a
   store that does not own that price. Any pricing-model work will be
   re-asked in four places until this is one shelf with many windows.
2. **No recurring billing exists anywhere.** Memberships are open-ended
   grants from ONE-TIME payments (`Entitlement` with no `expiresAtMs`;
   only tasters expire, `src/lib/entitlement.ts:59-61,168-174`). The
   copy already says "Pay monthly" (`sections.tsx:75`) but nothing
   re-asks. BTCPay has no native subscriptions — invoices only
   (`src/lib/payments.ts`). A true subscription or metered model is a
   NEW billing loop: scheduled invoices, renewal letters, lapse sweeps,
   revoke-on-nonpayment. That is a build, not a config — said so, not
   implied small.
3. **The angel numbers are a choice, not a conversion.** The tier sats
   are deliberately decoupled from USD — the comment says so:
   "NOT naive USD×rate" (`src/lib/entitlement.ts:30-32`), with C's
   177,777 still pending Love's own confirmation against 111,111.
   55,555 / 88,888 / 177,777 are chosen numbers. Any percentage-based
   pricing model (percent-off codes against tiers, "suggested = list ×
   1.2") breaks an aesthetic Love picked on purpose. The floor and
   range MUST be free-typed numbers, never derived percentages. Flagged;
   not overridden.
4. **Pay-it-forward has no grant-tracking.** The jar's own header says
   "today the jar total is the honest number" (`src/lib/tips.ts:8-10`).
   The desk's accept already says "the Pay-It-Forward jar may carry the
   gap" (`src/lib/store.ts:551-554`, `PwycDesk.tsx:8-10`) — but nothing
   yet redeems the jar against a named soul's session. Promising
   "someone else's session is covered" on a public page is not yet
   true. The floor work makes this matter MORE: every auto-settled
   at-minimum offer is a gap nobody tracks.
5. **"Pay in dollars" is marketing copy, not a card rail.** Every such
   line — `sections.tsx:75,102,133,148,199,285`,
   `src/lib/puck-seeds.ts:215,254,320,328`, `src/app/manifest.ts:13`,
   `src/app/terms/page.tsx:21` — points at the same BTCPay checkout.
   `getAdapter()` returns BTCPay or nothing (`src/lib/payments.ts:192-193`);
   Square and Stripe are interface shapes and comments (:6-7,:35). The
   StripeRailCard at the money desk stores Love's keys in the vault, and
   its own header says the adapter that spends them "ships next build"
   (`src/components/console/StripeRailCard.tsx:10-12`). Until then,
   "or dollars" means "BTCPay will convert for the buyer," not "we take
   cards."

## (f) Open questions for Love — every number is hers

- The minimum for a session: ____ sats (or $____). Per service, or one
  house minimum? (Love chooses.)
- The suggested range for a session: ____ to ____ sats (or $____ to
  $____). (Love chooses.)
- Should below-minimum offers be POSSIBLE (reaching your desk as asks
  for a gift) or gently refused at the input? (Love chooses.)
- Do memberships get a minimum+range too, and what are they? A: ____ ·
  B: ____ · C: ____ — and do the angel-number sats stand as the
  "suggested" for each? (Love chooses; see friction 3 — nothing derives
  these.)
- Do the meditations carry a minimum, or stay open-offer? If a minimum:
  ____ sats. (Love chooses.)
- Retreat seats: offerable, or fixed-price with scarcity on seats only?
  If offerable, the minimum per seat: ____ sats. (Love chooses.)
- Physical goods: no offers at all, or a per-item minimum at cost?
  (Love chooses per piece.)
- Should the page say the words "Minimum" and "Suggested" in English,
  or in her own phrasing? (Love chooses — the reference's words are
  borrowed, not binding.)
- Price-last ordering: which pages earn the number first — sessions
  only, or the store shelf too? (Love chooses.)
- The Pay-It-Forward promise: say nothing publicly until grant-tracking
  lands, or say it now and track by hand? (Love chooses; see friction
  4.)
- "Pay in dollars": keep the line as-is until the card rail ships, or
  soften it to name bitcoin plainly? (Love chooses; see friction 5.)

---

*Written by lane 3 of TASK-14/S16. Every file reference above was
verified against the tree at commit 811a411 on branch `lane3`. No code
was harmed — or touched — in the making of this document.*
