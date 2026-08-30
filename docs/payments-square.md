# Square — the fiat-card payment rail

The site's second payment rail, wired behind the same `PaymentAdapter` seam
`src/lib/payments.ts`'s BTCPay adapter already uses. This doc is the
runbook: what Square is for, how to turn it on, and how to test it.

## The two honest facts first

1. **Square is a fiat-cards rail. Full stop.** It charges Visa/Mastercard/
   etc. in a real-world currency (USD, etc.) through Square's own hosted
   checkout page — this codebase never touches a card number (PCI liability
   stays on Square, where it belongs). Square has **no bitcoin purchase
   feature for a merchant's customers** — buying with sats is not something
   Square offers, and this integration doesn't fake it. An item priced only
   in sats simply cannot be bought through Square; the checkout refuses
   honestly (`"<title>" has no fiat price — not purchasable by card`)
   rather than inventing a sats↔fiat conversion rate. Give an item a
   `price.fiat` (or `sale.fiat`) value if you want it card-purchasable.
2. **Square Online (the site builder) and Square Appointments (the
   calendar) are deliberately NOT adopted.** This site keeps its own
   storefront and its own booking calendar — Square is wired as a payment
   rail only, nothing more.

BTCPay stays the **default** rail (bitcoin on-chain + lightning, the
artist's own node) whether or not Square is configured. Square is an
*additional* rail that only lights up once its env vars are set — until
then the site is byte-for-byte unchanged: no card option renders anywhere.

## What shipped

- `src/lib/payments.ts` — the `squareAdapter` implementing the same
  `PaymentAdapter` interface BTCPay does: `configured()`, `createCharge()`,
  `status()`, `verifyWebhook()`. Uses Square's **Payment Links API**
  (`POST /v2/online-checkout/payment-links`) so the buyer pays on a
  Square-hosted page and gets redirected back — the same hosted-redirect
  shape as BTCPay's invoice checkout. Endpoint base switches on
  `SQUARE_ENVIRONMENT` (`https://connect.squareupsandbox.com` for sandbox,
  `https://connect.squareup.com` for production); the `Square-Version`
  header is pinned in code (`2024-01-18`) rather than auto-negotiated —
  bump it deliberately after checking Square's own changelog, don't let it
  drift. `liveAdapter()` gained an optional rail argument
  (`liveAdapter("square")`) — every existing no-arg call site is
  byte-behavior-unchanged; `getAdapter("square")` resolves the adapter too.
- `src/app/api/store/webhook/square/route.ts` — the webhook receiver,
  mirroring `webhook/btcpay/route.ts`'s shape: verify the raw body first,
  flip the order through the one sanctioned `recordChargeEvent()` commit
  function, then run the same settle helpers (booking / entitlement / gift
  vouchers) BTCPay's webhook already runs. Square's `payment.updated`
  events don't carry the order's metadata inline the way BTCPay's do, so
  the route re-reads the order (`squareOrderMetadata()`) after verifying to
  recover the internal `orderId`.
- `src/app/api/store/checkout/route.ts` — a **minimal seam**: the
  single-item checkout now accepts an optional `rail: "card"` field in the
  POST body. Omitted (or anything else) keeps today's exact default
  behavior (sats-first, BTCPay). A recharge retry on an existing order
  always uses the order's *original* adapter (`getAdapter(order.adapterId)`),
  never the retry's rail field, so a rail can't flip mid-order.
  `api/cart/checkout` (the basket) was intentionally left untouched — it's
  sats-first end to end today; wiring the card rail into a mixed basket is
  a bigger product decision than this rail-port's scope.
- `src/components/store/BuyPanel.tsx` — a `squareLive` prop (default
  `false`) that, when true AND the item carries a fiat price, offers a
  small bitcoin/card rail picker. When Square isn't configured, or the
  item is sats-only, nothing about the panel's markup or copy changes from
  today's shipped behavior.
- `scripts/square-payments.test.mjs` — offline unit tests: the
  `configured()` env gate, the Payment Link request-shape builder, the
  order-state and webhook-event mapping tables, and the webhook HMAC
  signature scheme against a synthetic key (correct signature passes,
  tampered body / wrong key / missing header / garbage signature all
  refuse cleanly, none of it throws).

## Setup

1. **Sandbox app.** [developer.squareup.com](https://developer.squareup.com)
   → Dashboard → your app (or create one) → the **Sandbox** tab has a
   sandbox Access Token and a sandbox test Location already provisioned —
   no real business verification needed for sandbox testing.
2. **Env vars** (`.env.local`, see `.env.example` for the annotated block):
   ```
   SQUARE_ACCESS_TOKEN=<sandbox access token>
   SQUARE_LOCATION_ID=<sandbox location id>
   SQUARE_ENVIRONMENT=sandbox
   ```
3. **Webhook.** Developer Dashboard → your app → **Webhooks** → add a
   subscription:
   - URL: `https://<your-deployed-host>/api/store/webhook/square` (a local
     `npm run dev` box needs a tunnel — ngrok or similar — Square can't
     reach `localhost`)
   - Events: subscribe to `payment.updated` and `order.updated` at minimum
     (`payment.created` and `order.fulfillment.updated` are also handled if
     subscribed, but not required)
   - Copy the **Signature Key** it shows into `SQUARE_WEBHOOK_SIGNATURE_KEY`
   - Copy the **exact URL you just typed** into `SQUARE_WEBHOOK_URL` —
     Square signs over that literal string, not something it tells you at
     verify time, so a mismatch (trailing slash, `http` vs `https`) fails
     every event silently. If webhooks stop registering, this is the first
     thing to re-check character-for-character.
4. **A card-purchasable item.** Give at least one catalog item a
   `price.fiat = { amount: <cents>, currency: "USD" }` (or whatever ISO
   code) — sats-only items stay bitcoin-only, on purpose.

## Test plan

1. **Sandbox smoke test.** No network call from this build environment has
   touched Square's servers — everything above was built from Square's
   documented API shapes, not a live round-trip. With env vars set,
   `POST /api/store/checkout` with
   `{ "itemId": "<a fiat-priced item>", "rail": "card", "contact": { "email": "you@example.com" } }`
   should return a `payUrl` pointing at a `squareupsandbox.com` hosted
   checkout page. Pay it with [Square's documented sandbox test card
   numbers](https://developer.squareup.com/docs/testing/sandbox) (never a
   real card against a sandbox app — it won't work anyway, sandbox never
   touches real money). Confirm: the webhook fires, the order flips to
   `settled` in the order store, and (if the item grants one) the
   entitlement lands.
2. **Live small-transaction test.** Once sandbox is clean, swap in
   production credentials (`SQUARE_ENVIRONMENT=production` + a production
   access token/location) and run one or two genuinely small real-card
   purchases — the owner's own hands enter the Square credentials; they
   never touch this repo or any report.
3. **Disconnect, leave open for Love.** After the live test, this
   integration is meant to sit configured-but-quiet (or fully unset) until
   the site owner wants her own Square merchant account wired the same
   way — same five env vars, her own credentials, nothing in the code to
   change.

Offline, everything that doesn't need a real Square server is covered by
`node scripts/square-payments.test.mjs` — run it any time this file or
`payments.ts`'s Square section changes.

## What shipped, part two — the admin desk (Admiral's walk)

`/a/money`'s Money Rails row used to show Square permanently stuck on a
dead "soon" chip while an unwired Stripe key drawer sat live below it.
That's fixed: `SquareRailCard.tsx` reads `squareAdapter.configured()` and
shows either the exact `SQUARE_*` env vars to set, or (once configured) a
bitcoin-enablement check against the merchant's own Square location
(`squareBitcoinEnabled()` below). `SquareCatalogDesk.tsx` is the one-way
Square-catalog-display admin surface — `src/lib/square-catalog.ts` reads
Square's Catalog API (GET-only, never upserted into this store's own
catalog, never synced back) and lets the operator pick which fetched
items to keep an eye on here. Both are admin-desk-only; nothing here adds
a Square item to the public storefront shelf — that's a bigger product
call left for later.

## What's next (not in this port's scope)

- `api/cart/checkout` (the basket) is still sats-first only — the card
  rail is wired into the single-item quick-buy (`BuyPanel.tsx`) and the
  admin desk above, not the multi-item basket.
- **Refunds.** BTCPay has `btcpayRefundLink()` (a pull-payment the buyer
  claims); Square refunds are a different API (`POST /v2/refunds`, keyed
  off the Square **payment** id, not the order id this adapter stores as
  `chargeId`) — not wired in this port.
- **The direct session-booking checkout** (`api/bookings/checkout`) still
  dispatches through `liveAdapter()` with no argument, unconditionally
  BTCPay-only — out of scope for this rail port.
- **No network call in this environment has reached Square's servers** —
  every request/response shape above is built from documented API
  contracts, not a live round-trip. A real sandbox run is the first true
  test.
