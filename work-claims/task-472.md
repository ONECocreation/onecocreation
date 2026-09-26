# TASK-472 claim

Builder: sonnet sub-agent for Number One
Block: 968,624 (the Admiral's ruling: Observer/Evening Star show "Coming
soon"; price and description stay visible, nobody can buy them anywhere;
everything else in the store is unchanged — the $11 and Q&A passes stay
buyable)
Branch: feat/task-472
Worktree: /home/pac/dev/worktrees/task-472
Base: a80ada9 (origin/main, after #93)

Read first: `briefings/walk-968624/L5-TRACE.md` (§1 — the store trace),
the L5 section of `ASTRA-REVIEW.md` (Astra's warning: a brand-new
`ItemStatus` crosses validation, persistence, checkout AND old carts — four
surfaces to keep in lockstep for one word), `VERDICT-968624.md`, and
`Reference/lustr/LUMEN-LEARNING-LOG.md` (no em dash in visible copy,
L-002/L-003; honest buttons; one button size per surface, L-004).

## The shape

The SMALLEST safe design, per the brief: no fourth `ItemStatus`. An
optional `comingSoon?: boolean` flag rides on TOP of the existing, proven
`status: "live"` path in `src/lib/store.ts`. A new `isPurchasable(item)`
helper (`item.status === "live" && !item.comingSoon`) is the ONE
single-item law every server-side purchasability gate now asks, instead of
a bare `status !== "live"` — so `comingSoon` narrows "live" further
everywhere at once, and never widens `hidden`/`soldout` back into buyable.

**FOLLOW-UP (adversarial review, same block, FIX FIRST):** a `package`
item can grant tier access two ways — the tier's own standing membership
item, or a TASTER (a time-limited pass like `observer-one-week`, marked by
`entitlementDays`) that grants the identical tier via `bestPackageGrant()`
in `entitlement-fulfil.ts`. `isPurchasable()` alone only reads an item's
OWN `status`/`comingSoon` — flagging the standing item comingSoon left its
taster fully buyable, a side door into the same entitlement. A new
catalog-aware `isPurchasableIn(item, catalog)` closes it: a taster is
refused the instant EVERY standing item for its `entitlementTier` is not
purchasable, with no change to `isPurchasable()` itself and no widening —
a taster whose own tier is fine, or an item with no `entitlementDays`
grant at all, is untouched. Every route below now calls
`isPurchasableIn()`, not `isPurchasable()`, wherever it decides
purchasability against the live catalog (cart add, cart resolve/sweep of
an OLD cart, cart checkout, the single-item checkout).

Every surface that would otherwise render a buy/add-to-cart/join control
for a `comingSoon` item now shows the plain words "Coming soon" instead —
never a dead button, never the pre-order waitlist email form. Price and
description are untouched; they render exactly as they did before, because
`status` itself never changes.

## OWNS

- `src/lib/store.ts` — EDIT: `comingSoon?: boolean` field on `StoreItem`;
  `validateItem()` type-checks it (boolean or absent); new exported
  `isPurchasable()` (the single-item law) and `isPurchasableIn(item,
  catalog)` (the catalog-aware law — a taster follows its own tier's
  standing item; adversarial-review follow-up).
- `src/app/api/admin/store/route.ts` — EDIT: the PUT route normalizes
  `comingSoon` to `true` or `undefined` (never a stored `false` — same
  honest-shapes law as `sku`/`bundle`).
- `src/app/a/store/page.tsx` — EDIT: the item editor's "coming soon"
  checkbox (right under the `status` select, inside the same editor card),
  and a small "coming soon" `Chip` under `StatusChip` on the shelf table
  row so it's visible without opening the editor. **This is the checkbox
  the Admiral/Love tick after deploy** — see "Your actions" below.
- `src/app/api/cart/route.ts` — EDIT: both the goods-line gate in
  `resolved()` (drops an OLD cart's line for a newly-comingSoon item OR
  taster, the same sweep a hidden/gone item already gets) and the POST add
  gate now call `isPurchasableIn(item, catalog)` instead of
  `status !== "live"` — one `listItems({ includeHidden: true })` catalog
  read per request, reused across every line in `resolved()`.
- `src/app/api/cart/checkout/route.ts` — EDIT: the basket's goods-line
  gate calls `isPurchasableIn()` — refuses even a comingSoon (or
  now-comingSoon-tier taster) line an old cart is still holding, 409, same
  honest wording as any other item that "left the shelf."
- `src/app/api/store/checkout/route.ts` — EDIT: the single-item door
  (BuyPanel → this route) calls `isPurchasableIn()` too — no second
  doorway a comingSoon flag (on the item OR its tier) forgot to cover.
- `src/app/packages/[slug]/page.tsx` — EDIT: `itemLive()` now means
  `isPurchasable()` (so a comingSoon tier's own upgrade/addon/related
  doors never sneak it in from a sibling page either); new exported pure
  `tierPageMode(offerMode, mainLive, comingSoon)` — comingSoon outranks
  both "buy" and the pre-order "waitlist" email form; the YES button's
  slot renders the plain label "Coming soon" (shares the "banner" mode's
  one style block, mutually exclusive states); the tier's own one-time
  taster BUTTON (e.g. `observer-one-week`) also stays off the display
  while its own tier is comingSoon (`mode !== "soon"` already excludes
  it) — no dead click to catch. Untouched by the follow-up round: this
  file's display gate was already correct; the gap the adversarial review
  found was a bypass of this UI, straight at the cart/checkout routes,
  fixed there (see `isPurchasableIn` above) — not owned by this page.
- `src/components/store/BuyPanel.tsx` — EDIT: a `comingSoon` check ahead
  of (and sharing one style block with) the existing `soldout` branch —
  "Coming soon." in place of the doors, checked first so it always wins.
- `src/components/store/StoreItemCard.tsx` — EDIT: `storeCardModel()`
  carries `comingSoon`; the front face's title row shows a "coming soon"
  badge sharing the sold-out badge's one style block (mutually exclusive).
  This also covers every doorForItem shelf (`ShelfSection.tsx`,
  `RelatedItems.tsx`) for free — they all render through this one card.
- `tests/store-coming-soon-472.test.ts` — NEW/EDIT: `isPurchasable()`,
  `isPurchasableIn()` (the taster-follows-its-tier law, 7 pure cases),
  `validateItem()`, a catalog persistence round trip (isolateCwd), the
  shelf card model, `tierPageMode()`, an em-dash check on every new
  string, and full route-level refusal tests (cart add, an old cart's
  resolve/sweep, cart checkout, single-item checkout) against a fixture
  KV + BTCPay catalog that now also carries `observer-one-week` (tier B
  taster, refused off Observer's own comingSoon flag) and a second tier
  (`weekly-intuitive-main` / `weekly-one-week`, tier A, NOT comingSoon) as
  a positive control proving the fix narrows, never blocks a fine taster.
- `work-claims/task-472.md` — this file.

## READ-ONLY

Everything else in the store/checkout/packages surface not touched above —
`src/lib/entitlement.ts`, `src/lib/tiers-content.ts`, `src/lib/tier-offer.ts`
(untouched: its switch-only `tierOfferMode()` stays exactly what it was;
the comingSoon layering happens one level up, in the packages page, the
same way the existing `!mainLive` fallback already layers on top of it),
`src/lib/week-pass.ts`, `src/lib/stage2-access.ts` (the one-week taster
PRICE display for a *different* item id — out of the Admiral's named
scope, not touched), `src/components/store/AddonActions.tsx`,
`src/app/kit.css`, `src/app/house.css` — no new CSS; every new visible
element reuses an existing class or an existing hoisted style const
(`fieldLabel`/`fieldHint` in the admin editor) so the design-drift
(`tests/design-drift.test.ts`) and operator-census
(`tests/operator-census.test.ts`) ratchets stay flat.

## Your actions

1. Deploy this branch.
2. In `/a/store`, tick "Coming soon" on Observer and Evening Star; the
   taster (Observer's one-week pass) follows automatically — no separate
   tick, no separate step.
3. Confirm on the live site: `/packages/observer` and
   `/packages/evening-star` show the price, the words, and "Coming soon"
   in the YES button's place; the $11 one-time pass and the $33 Q&A pass
   are untouched.

## Do NOT

Number One did not flip any production data — no item in this branch's
diff has `comingSoon: true`. That tick is the Admiral's/Love's, in `/a`,
after deploy, per the brief.
