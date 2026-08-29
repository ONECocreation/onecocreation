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
