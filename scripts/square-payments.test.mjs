/**
 * Square payment-rail harness (payments-lane rail port). Everything here
 * runs OFFLINE — no network call reaches Square from this repo, ever (this
 * build environment can't reach Square's servers at all). What IS provable
 * without a live round-trip: configured()'s env gate, the request-shape
 * builder, the state/event mapping tables, and the webhook HMAC scheme
 * against a synthetic key. A real sandbox run is the first true network
 * test — this harness is everything short of that.
 *
 * Run from the repo root:  node scripts/square-payments.test.mjs
 */

import { createHmac } from "crypto";
import path from "path";

const root = path.resolve(new URL("..", import.meta.url).pathname);

// clean slate — configured() must read false before anything sets env
delete process.env.SQUARE_ACCESS_TOKEN;
delete process.env.SQUARE_LOCATION_ID;
delete process.env.SQUARE_ENVIRONMENT;
delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
delete process.env.SQUARE_WEBHOOK_URL;

const {
  squareAdapter,
  buildSquarePaymentLinkBody,
  mapOrderState,
  mapSquareWebhookEvent,
  getAdapter,
  liveAdapter,
} = await import(path.join(root, "src", "lib", "payments.ts"));

let passed = 0, failed = 0;
function t(name, cond, extra = "") {
  if (cond) { passed++; }
  else { failed++; console.log(`FAIL  ${name}${extra ? ` — ${extra}` : ""}`); }
}
async function rejects(name, fn, pattern) {
  try {
    await fn();
    t(name, false, "did not throw");
  } catch (e) {
    t(name, pattern.test(String(e?.message ?? e)), String(e?.message ?? e));
  }
}

/* ── configured(): honest env gate ────────────────────────────────────── */
t("unconfigured with no env at all", squareAdapter.configured() === false);
process.env.SQUARE_ACCESS_TOKEN = "sandbox-fake-token";
t("still unconfigured with only the token set", squareAdapter.configured() === false);
process.env.SQUARE_LOCATION_ID = "L_FAKE";
t("configured once token + location are both set", squareAdapter.configured() === true);
t("getAdapter('square') resolves to the same adapter", getAdapter("square") === squareAdapter);
t("liveAdapter('square') returns it once configured", liveAdapter("square") === squareAdapter);
t("liveAdapter() with no arg is UNCHANGED — still btcpay-or-null, never square by default", liveAdapter() !== squareAdapter);
delete process.env.SQUARE_LOCATION_ID;
t("un-configured again the moment either var is removed", squareAdapter.configured() === false);
t("liveAdapter('square') honestly null once unconfigured", liveAdapter("square") === null);
process.env.SQUARE_LOCATION_ID = "L_FAKE"; // restore for the rest of the file

/* ── createCharge(): never invents a sats↔fiat rate ───────────────────── */
await rejects(
  "createCharge on a SATS request refuses instead of converting",
  () => squareAdapter.createCharge(
    { orderId: "o1", amount: 21000, currency: "SATS", redirectUrl: "https://x/y" },
    "idem1",
  ),
  /fiat rail only/,
);

/* ── buildSquarePaymentLinkBody(): the request shape, pure ───────────── */
{
  const body = buildSquarePaymentLinkBody(
    { orderId: "ord_abc123", amount: 4200, currency: "USD", redirectUrl: "https://site.example/store/order/ord_abc123" },
    "idem-key-1",
    "L_FAKE",
  );
  t("idempotency_key rides at the top level", body.idempotency_key === "idem-key-1");
  t("order.location_id is the configured location", body.order.location_id === "L_FAKE");
  t("order.metadata.orderId carries OUR id — the webhook's only way back to it", body.order.metadata.orderId === "ord_abc123");
  t("checkout_options.redirect_url is passed through untouched", body.checkout_options.redirect_url === "https://site.example/store/order/ord_abc123");
  const li = body.order.line_items[0];
  t("exactly one line item", body.order.line_items.length === 1);
  t("line item price_money uses the request's exact minor-unit amount — no conversion applied", li.base_price_money.amount === 4200);
  t("line item currency passes through untouched", li.base_price_money.currency === "USD");
  t("no quick_pay field — metadata requires the full order shape", body.quick_pay === undefined);
}

/* ── TASK-223 (Love's call #7): the receipt names what was bought ────── */
{
  // no description/referenceId at all — the pre-T-223 fallback, unchanged
  const bare = buildSquarePaymentLinkBody(
    { orderId: "ord_bare1", amount: 1000, currency: "USD", redirectUrl: "https://x/y" },
    "idem-bare",
    "L_FAKE",
  );
  t("no description → falls back to the old 'Order <id>' name", bare.order.line_items[0].name === "Order ord_bare1");
  t("no referenceId → order.reference_id is undefined (Square treats a missing key as none set)", bare.order.reference_id === undefined);

  // a real description + referenceId — the fix itself
  const named = buildSquarePaymentLinkBody(
    {
      orderId: "ord_named1",
      amount: 2500,
      currency: "USD",
      redirectUrl: "https://x/y",
      description: "Sunrise Reiki Session — Sep 15, 2:00 PM",
      referenceId: "ORD_NAM1",
    },
    "idem-named",
    "L_FAKE",
  );
  t("a description becomes the buyer's own receipt line-item name", named.order.line_items[0].name === "Sunrise Reiki Session — Sep 15, 2:00 PM");
  t("referenceId rides as order.reference_id — the buyer-facing order number", named.order.reference_id === "ORD_NAM1");
  t("the fallback name never appears once a real description is given", !named.order.line_items[0].name.includes("Order ord_named1"));

  // the 500-char cap — Square's own line-item name limit
  const longDescription = "A".repeat(600);
  const capped = buildSquarePaymentLinkBody(
    { orderId: "ord_long1", amount: 100, currency: "USD", redirectUrl: "https://x/y", description: longDescription },
    "idem-long",
    "L_FAKE",
  );
  t("a description over 500 chars is truncated to exactly 500", capped.order.line_items[0].name.length === 500);
  t("the truncated name is the description's own leading 500 chars, not the fallback", capped.order.line_items[0].name === "A".repeat(500));

  // the fallback itself also respects the cap (an absurdly long orderId can't blow past it either)
  const longFallback = buildSquarePaymentLinkBody(
    { orderId: "x".repeat(600), amount: 100, currency: "USD", redirectUrl: "https://x/y" },
    "idem-long-fallback",
    "L_FAKE",
  );
  t("the fallback name is capped at 500 too", longFallback.order.line_items[0].name.length === 500);
}

/* ── TASK-224 (0018.06.23 a₿) — the itemised bill, exact-sum only ────── */
{
  // the exact sum → itemised, one row per line, quantity as a STRING
  const itemised = buildSquarePaymentLinkBody(
    {
      orderId: "ord_items1",
      amount: 7700,
      currency: "USD",
      redirectUrl: "https://x/y",
      description: "fallback should never appear",
      lines: [
        { name: "Both Rails Meditation", quantity: 2, unitAmount: 2200 },
        { name: "Fiat Only Meditation", quantity: 1, unitAmount: 3300 },
      ],
    },
    "idem-items",
    "L_FAKE",
  );
  t("exact sum → two line items, not one", itemised.order.line_items.length === 2);
  t("line 0 keeps its own name/qty/price", itemised.order.line_items[0].name === "Both Rails Meditation"
    && itemised.order.line_items[0].quantity === "2"
    && itemised.order.line_items[0].base_price_money.amount === 2200
    && itemised.order.line_items[0].base_price_money.currency === "USD");
  t("line 1 keeps its own name/qty/price", itemised.order.line_items[1].name === "Fiat Only Meditation"
    && itemised.order.line_items[1].quantity === "1"
    && itemised.order.line_items[1].base_price_money.amount === 3300);
  t("the description fallback never appears once the sum matches exactly", !itemised.order.line_items.some((li) => li.name === "fallback should never appear"));

  // a ONE-CENT mismatch → falls back to the single description line, never rounds
  const mismatch = buildSquarePaymentLinkBody(
    {
      orderId: "ord_items2",
      amount: 7699, // one cent short of the lines' own sum (7700)
      currency: "USD",
      redirectUrl: "https://x/y",
      description: "Both Rails Meditation × 2, Fiat Only Meditation",
      lines: [
        { name: "Both Rails Meditation", quantity: 2, unitAmount: 2200 },
        { name: "Fiat Only Meditation", quantity: 1, unitAmount: 3300 },
      ],
    },
    "idem-mismatch",
    "L_FAKE",
  );
  t("a 1-cent mismatch falls back to ONE line item", mismatch.order.line_items.length === 1);
  t("the fallback line is the description, not a rounded itemised row", mismatch.order.line_items[0].name === "Both Rails Meditation × 2, Fiat Only Meditation");
  t("the fallback line's amount is the REQUEST's own total, never a sum of the (mismatched) lines", mismatch.order.line_items[0].base_price_money.amount === 7699);

  // no `lines` at all → unchanged single-line behaviour (T-223, still intact)
  const noLines = buildSquarePaymentLinkBody(
    { orderId: "ord_items3", amount: 1000, currency: "USD", redirectUrl: "https://x/y", description: "Just One Thing" },
    "idem-none",
    "L_FAKE",
  );
  t("no lines field → still one line item (T-223 unchanged)", noLines.order.line_items.length === 1 && noLines.order.line_items[0].name === "Just One Thing");

  // an EMPTY lines array → treated the same as no lines (never an empty order)
  const emptyLines = buildSquarePaymentLinkBody(
    { orderId: "ord_items4", amount: 1000, currency: "USD", redirectUrl: "https://x/y", description: "Empty Lines Falls Back", lines: [] },
    "idem-empty",
    "L_FAKE",
  );
  t("an empty lines[] falls back to the single description line, never an empty line_items[]", emptyLines.order.line_items.length === 1 && emptyLines.order.line_items[0].name === "Empty Lines Falls Back");

  // a line name over 500 chars is truncated the same way the fallback is
  const longLineName = buildSquarePaymentLinkBody(
    { orderId: "ord_items5", amount: 500, currency: "USD", redirectUrl: "https://x/y", lines: [{ name: "B".repeat(600), quantity: 1, unitAmount: 500 }] },
    "idem-long-line",
    "L_FAKE",
  );
  t("an itemised line's own name is capped at 500 too", longLineName.order.line_items[0].name.length === 500);

  // idempotency_key / redirect_url / reference_id / metadata.orderId ride
  // through UNCHANGED whether the body itemises or falls back — the
  // money-path fields this lane must never touch
  const referenced = buildSquarePaymentLinkBody(
    {
      orderId: "ord_items6",
      amount: 4400,
      currency: "USD",
      redirectUrl: "https://site.example/store/order/ord_items6",
      referenceId: "ord_item",
      lines: [{ name: "Two Of A Thing", quantity: 2, unitAmount: 2200 }],
    },
    "idem-ref",
    "L_FAKE",
  );
  t("itemised body still carries idempotency_key untouched", referenced.idempotency_key === "idem-ref");
  t("itemised body still carries redirect_url untouched", referenced.checkout_options.redirect_url === "https://site.example/store/order/ord_items6");
  t("itemised body still carries reference_id untouched", referenced.order.reference_id === "ord_item");
  t("itemised body still carries metadata.orderId untouched", referenced.order.metadata.orderId === "ord_items6");
}

/* ── mapOrderState(): Orders API state → canonical machine ───────────── */
t("OPEN → charge_created", mapOrderState("OPEN") === "charge_created");
t("COMPLETED → settled", mapOrderState("COMPLETED") === "settled");
t("CANCELED → expired", mapOrderState("CANCELED") === "expired");
t("unknown/undefined state → invalid, never silently settled", mapOrderState(undefined) === "invalid");
t("a made-up state string → invalid", mapOrderState("SOMETHING_NEW") === "invalid");

/* ── mapSquareWebhookEvent(): the two event families ──────────────────── */
t(
  "payment.updated COMPLETED → settled, keyed on the ORDER id",
  (() => {
    const ev = mapSquareWebhookEvent({
      type: "payment.updated",
      data: { id: "pay_1", object: { payment: { order_id: "sqo_1", status: "COMPLETED" } } },
    });
    return ev?.type === "settled" && ev?.chargeId === "sqo_1";
  })(),
);
t(
  "payment.updated PENDING → processing",
  mapSquareWebhookEvent({ type: "payment.updated", data: { object: { payment: { order_id: "sqo_2", status: "PENDING" } } } })?.type === "processing",
);
t(
  "payment.updated FAILED → invalid",
  mapSquareWebhookEvent({ type: "payment.created", data: { object: { payment: { order_id: "sqo_3", status: "FAILED" } } } })?.type === "invalid",
);
t(
  "payment.updated with no order_id → null, nothing to flip",
  mapSquareWebhookEvent({ type: "payment.updated", data: { object: { payment: { status: "COMPLETED" } } } }) === null,
);
t(
  "order.updated COMPLETED → settled",
  mapSquareWebhookEvent({ type: "order.updated", data: { object: { order: { id: "sqo_4", state: "COMPLETED" } } } })?.type === "settled",
);
t(
  "order.updated CANCELED → expired",
  mapSquareWebhookEvent({ type: "order.updated", data: { object: { order: { id: "sqo_5", state: "CANCELED" } } } })?.type === "expired",
);
t(
  "order.updated OPEN → null (no NEW information over charge_created)",
  mapSquareWebhookEvent({ type: "order.updated", data: { object: { order: { id: "sqo_6", state: "OPEN" } } } }) === null,
);
t(
  "an unknown event type → null",
  mapSquareWebhookEvent({ type: "inventory.count.updated", data: {} }) === null,
);

/* ── verifyWebhook(): Square's HMAC-SHA256(url + rawBody), base64 ────── */
{
  const key = "synthetic-test-signature-key";
  const url = "https://site.example/api/store/webhook/square";
  const rawBody = JSON.stringify({
    type: "order.updated",
    data: { object: { order: { id: "sqo_7", state: "COMPLETED" } } },
  });
  const goodSig = createHmac("sha256", key).update(url + rawBody).digest("base64");

  // unconfigured — missing key/url both refuse honestly (null, no throw)
  const evNoEnv = await squareAdapter.verifyWebhook(rawBody, new Headers({ "x-square-hmacsha256-signature": goodSig }));
  t("no SQUARE_WEBHOOK_SIGNATURE_KEY/URL configured → verifyWebhook refuses (null), doesn't throw", evNoEnv === null);

  process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = key;
  process.env.SQUARE_WEBHOOK_URL = url;

  const evGood = await squareAdapter.verifyWebhook(rawBody, new Headers({ "x-square-hmacsha256-signature": goodSig }));
  t("a correctly-signed body verifies and maps to the right event", evGood?.type === "settled" && evGood?.chargeId === "sqo_7");

  const evMissingHeader = await squareAdapter.verifyWebhook(rawBody, new Headers());
  t("missing signature header → refused", evMissingHeader === null);

  const evTamperedBody = await squareAdapter.verifyWebhook(rawBody + " ", new Headers({ "x-square-hmacsha256-signature": goodSig }));
  t("a single byte of tamper on the body → signature no longer verifies", evTamperedBody === null);

  const wrongKeySig = createHmac("sha256", "not-the-real-key").update(url + rawBody).digest("base64");
  const evWrongKey = await squareAdapter.verifyWebhook(rawBody, new Headers({ "x-square-hmacsha256-signature": wrongKeySig }));
  t("a signature computed with the WRONG key → refused", evWrongKey === null);

  const evGarbageSig = await squareAdapter.verifyWebhook(rawBody, new Headers({ "x-square-hmacsha256-signature": "not-even-base64!!" }));
  t("a non-base64 signature header doesn't throw — refused cleanly", evGarbageSig === null);

  delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  delete process.env.SQUARE_WEBHOOK_URL;
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
