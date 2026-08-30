import { createHmac, timingSafeEqual } from "crypto";
import type { ChargeEventType } from "./store";

/**
 * The payments adapter — ONE interface, many rails (spec module 2).
 * BTCPay (bitcoin on-chain + lightning, the artist's own node) is the
 * default rail. Square wires the fiat-card rail: hosted Payment Link,
 * so the site never touches a card number (PCI stays on Square). Stripe
 * still slots behind the same shapes later. Every rail: hosted-redirect
 * payUrl always, discriminated webhook events, idempotency key on create.
 * The app holds API tokens to the artist's own processors — never funds;
 * Square is the one rail where "the artist's own processor" means their
 * own Square merchant account, not a shared one.
 */

export type CanonicalChargeState = "charge_created" | "processing" | "settled" | "expired" | "invalid";

export interface ChargeRequest {
  orderId: string;
  amount: number; // integer: sats when currency SATS, minor units otherwise
  currency: string; // "SATS" or ISO-4217
  buyerEmail?: string;
  redirectUrl: string;
}

export interface CreatedCharge {
  chargeId: string;
  /** hosted redirect — ALWAYS (the Stripe-Checkout/Square-Link compatible shape) */
  payUrl: string;
  extras?: { bolt11?: string; onchainAddress?: string };
}

export interface ChargeEvent {
  type: ChargeEventType;
  chargeId: string;
}

export interface PaymentAdapter {
  id: "btcpay" | "square" | "stripe";
  rails: ("onchain" | "lightning" | "card")[];
  configured(): boolean;
  createCharge(req: ChargeRequest, idempotencyKey: string): Promise<CreatedCharge>;
  status(chargeId: string): Promise<CanonicalChargeState>;
  /** raw body in, verified discriminated event out — or null for noise */
  verifyWebhook(rawBody: string, headers: Headers): Promise<ChargeEvent | null>;
}

// ---------------------------------------------------------------------------
// BTCPay Server (Greenfield API) — the v1 rail
// ---------------------------------------------------------------------------

function btcpayEnv() {
  const url = process.env.BTCPAY_URL?.replace(/\/$/, "");
  const storeId = process.env.BTCPAY_STORE_ID;
  const apiKey = process.env.BTCPAY_API_KEY;
  return url && storeId && apiKey ? { url, storeId, apiKey } : null;
}

async function btcpayFetch(pathname: string, init?: RequestInit): Promise<Response> {
  const env = btcpayEnv();
  if (!env) throw new Error("btcpay: not configured");
  return fetch(`${env.url}/api/v1/stores/${env.storeId}${pathname}`, {
    ...init,
    headers: {
      Authorization: `token ${env.apiKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
}

/** BTCPay invoice lifecycle → the canonical machine (spec's mapping table). */
function mapInvoiceStatus(status: string): CanonicalChargeState {
  switch (status) {
    case "New":
      return "charge_created";
    case "Processing":
      return "processing";
    case "Settled":
      return "settled";
    case "Expired":
      return "expired";
    default:
      return "invalid";
  }
}

/** Webhook event types → the canonical union. Settles ONLY on InvoiceSettled. */
function mapWebhookType(type: string): ChargeEventType | null {
  switch (type) {
    case "InvoiceSettled":
      return "settled";
    case "InvoiceProcessing":
    case "InvoiceReceivedPayment":
      return "processing";
    case "InvoiceExpired":
      return "expired";
    case "InvoiceInvalid":
      return "invalid";
    default:
      return null;
  }
}

export const btcpayAdapter: PaymentAdapter = {
  id: "btcpay",
  rails: ["onchain", "lightning"],

  configured() {
    return btcpayEnv() !== null;
  },

  async createCharge(req, idempotencyKey) {
    // BTCPay has no idempotency header — the orderId in metadata is the
    // dedupe handle; a retried create mints a new invoice for the SAME order
    // (chargeIds[] absorbs it; only one can settle).
    const amount =
      req.currency === "SATS" ? (req.amount / 1e8).toFixed(8) : (req.amount / 100).toFixed(2);
    const currency = req.currency === "SATS" ? "BTC" : req.currency;
    const res = await btcpayFetch("/invoices", {
      method: "POST",
      body: JSON.stringify({
        amount,
        currency,
        metadata: { orderId: req.orderId, idempotencyKey, buyerEmail: req.buyerEmail },
        checkout: { redirectURL: req.redirectUrl },
      }),
    });
    if (!res.ok) throw new Error(`btcpay: invoice create ${res.status}`);
    const inv = (await res.json()) as { id: string; checkoutLink: string };
    return { chargeId: inv.id, payUrl: inv.checkoutLink };
  },

  async status(chargeId) {
    const res = await btcpayFetch(`/invoices/${chargeId}`);
    if (!res.ok) throw new Error(`btcpay: invoice read ${res.status}`);
    const inv = (await res.json()) as { status: string };
    return mapInvoiceStatus(inv.status);
  },

  async verifyWebhook(rawBody, headers) {
    // HMAC-SHA256 over the RAW body; secret is a SEPARATE credential from
    // the API key (template contract). No secret configured = nothing
    // verifies = nothing flips. A forged POST buys nothing.
    const secret = process.env.BTCPAY_WEBHOOK_SECRET;
    const sig = headers.get("btcpay-sig");
    if (!secret || !sig?.startsWith("sha256=")) return null;
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const given = sig.slice("sha256=".length);
    if (
      given.length !== expected.length ||
      !timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(expected, "hex"))
    ) {
      return null;
    }
    const payload = JSON.parse(rawBody) as { type: string; invoiceId?: string };
    const type = mapWebhookType(payload.type);
    if (!type || !payload.invoiceId) return null;
    return { type, chargeId: payload.invoiceId };
  },
};

/**
 * Refund a settled BTCPay invoice as a PULL PAYMENT — BTCPay mints a claim
 * page where the member takes their sats back (lightning or on-chain, their
 * pick). RateThen = the BTC amount as paid, which for our sats-denominated
 * invoices is simply the sats back. Greenfield's payout-method field name
 * moved across versions, so both spellings are tried before giving up.
 * Null = this invoice can't auto-refund (unpaid/expired) — manual it is.
 */
export async function btcpayRefundLink(chargeId: string): Promise<string | null> {
  const env = btcpayEnv();
  if (!env) return null;
  const bodies = [
    { refundVariant: "RateThen", payoutMethodId: "BTC-CHAIN" },
    { refundVariant: "RateThen", paymentMethod: "BTC" },
  ];
  for (const body of bodies) {
    try {
      const res = await btcpayFetch(`/invoices/${chargeId}/refund`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) continue;
      const pp = (await res.json()) as { id?: string; viewLink?: string };
      if (pp.viewLink) return pp.viewLink;
      if (pp.id) return `${env.url}/pull-payments/${pp.id}`;
    } catch {
      /* try the other spelling */
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Square — the fiat-card rail (Payment Links / Checkout API)
// ---------------------------------------------------------------------------
//
// Square is a CARD-FIAT rail only: it never accepts a sats amount, and this
// adapter never invents a sats↔fiat rate to bridge that gap (the honest seam
// the build spec asked for). createCharge() throws on currency "SATS" — the
// caller must have already resolved the order to a fiat PriceSnapshot (the
// store's Price.fiat field already carries the exact { amount: minor-units,
// currency: ISO-4217 } shape Square's Money type wants, so no conversion is
// needed for a fiat-priced item — only a refusal for a sats-only one).
//
// createCharge() uses the Payment Links API (POST /v2/online-checkout/
// payment-links) — Square hosts the card form and the buyer never leaves it
// to reach us, so no card data ever touches this codebase. It builds a full
// `order` object (not the simpler "quick_pay" shape) SPECIFICALLY because
// quick_pay carries no metadata field — this codebase's orderId has to ride
// along on the Square Order itself (`order.metadata.orderId`) so the
// webhook can recover which of OUR orders a Square event is about. The
// response's `order_id` (the Order Square creates behind the link,
// synchronously, at link-creation time) becomes our chargeId — every
// payment/order webhook event correlates back to it; the payment_link id
// itself never reappears in a webhook payload.
//
// status() polls the Orders API (GET /v2/orders/{id}) and reads `state`.
// The webhook route resolves our internal orderId the same way: a fresh
// GET /v2/orders/{id} read of the SAME order (squareOrderMetadata() below)
// — a webhook is treated as "go re-check the source of truth," never as
// self-sufficient payload data, because payment.updated events (unlike
// order.updated ones) don't carry the order's metadata inline.
// verifyWebhook() implements Square's documented HMAC-SHA256-over-
// (notification-URL + raw-body) scheme, base64-encoded, header
// `x-square-hmacsha256-signature`. Square's signature is computed over the
// exact webhook subscription URL (not sent in any header), so the site's
// own copy of that URL is a required, non-secret companion value —
// SQUARE_WEBHOOK_URL below. Get it wrong (trailing slash, http vs https)
// and every event silently fails verification, same honest-refusal shape
// as a wrong secret.
//
// Endpoint base + version are PINNED, not auto-negotiated: Square ships a
// dated API version with its own deprecation calendar. Bump SQUARE_API_
// VERSION deliberately (check Square's changelog first) — never let it
// drift silently.
//
// NO network call in this codebase has been exercised against Square's
// servers — sandboxes aren't reachable from this environment. Every shape
// below is built from documented request/response contracts, not a live
// round-trip. Pac's sandbox run is the first real test.

const SQUARE_API_VERSION = "2024-01-18"; // pinned — bump deliberately, see note above

interface SquareEnv {
  accessToken: string;
  locationId: string;
  environment: "sandbox" | "production";
}

export function squareEnv(): SquareEnv | null {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!accessToken || !locationId) return null;
  const environment = process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";
  return { accessToken, locationId, environment };
}

function squareBaseUrl(environment: SquareEnv["environment"]): string {
  return environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

export async function squareFetch(pathname: string, env: SquareEnv, init?: RequestInit): Promise<Response> {
  return fetch(`${squareBaseUrl(env.environment)}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_API_VERSION,
      ...init?.headers,
    },
    cache: "no-store",
  });
}

/** Pure request-body builder — split out so the shape is unit-testable
 *  without a network call (scripts/square-payments.test.mjs). Uses the full
 *  `order` shape (not "quick_pay") so `metadata.orderId` can ride along —
 *  see the file-header note on why the webhook needs it. */
export function buildSquarePaymentLinkBody(
  req: ChargeRequest,
  idempotencyKey: string,
  locationId: string,
) {
  return {
    idempotency_key: idempotencyKey,
    order: {
      location_id: locationId,
      line_items: [
        {
          name: `Order ${req.orderId}`.slice(0, 512),
          quantity: "1",
          base_price_money: { amount: req.amount, currency: req.currency },
        },
      ],
      metadata: { orderId: req.orderId },
    },
    checkout_options: {
      redirect_url: req.redirectUrl,
    },
  };
}

/** Orders API `state` → the canonical machine. Square has no order-level
 *  "processing" — a card's brief authorization window still reads OPEN;
 *  webhook payment.updated events (mapped below) are the finer-grained
 *  signal when one has arrived. */
export function mapOrderState(state: string | undefined): CanonicalChargeState {
  switch (state) {
    case "OPEN":
      return "charge_created";
    case "COMPLETED":
      return "settled";
    case "CANCELED":
      return "expired";
    default:
      return "invalid";
  }
}

/** Payment object `status` → the canonical event union (webhook path). */
function mapPaymentStatus(status: string | undefined): ChargeEventType | null {
  switch (status) {
    case "COMPLETED":
      return "settled";
    case "APPROVED":
    case "PENDING":
      return "processing";
    case "FAILED":
      return "invalid";
    case "CANCELED":
      return "expired";
    default:
      return null;
  }
}

interface SquareWebhookPayload {
  type?: string;
  data?: {
    id?: string;
    object?: {
      payment?: { order_id?: string; status?: string };
      order?: { id?: string; state?: string };
    };
  };
}

/** The two event families Square sends for a checkout: payment.* (finest
 *  grain — has the payment's own status) and order.* (coarser — the
 *  Order's own state). Both resolve to the same chargeId: the Square
 *  order id. Pure + exported for offline testing. */
export function mapSquareWebhookEvent(payload: SquareWebhookPayload): ChargeEvent | null {
  const t = payload.type;
  if (t === "payment.created" || t === "payment.updated") {
    const payment = payload.data?.object?.payment;
    const orderId = payment?.order_id;
    const type = mapPaymentStatus(payment?.status);
    return orderId && type ? { type, chargeId: orderId } : null;
  }
  if (t === "order.updated" || t === "order.fulfillment.updated") {
    const order = payload.data?.object?.order;
    const orderId = order?.id ?? payload.data?.id;
    if (!orderId) return null;
    // order-level state only carries NEW information for the two
    // terminal states; OPEN says nothing beyond "still charge_created"
    if (order?.state === "COMPLETED") return { type: "settled", chargeId: orderId };
    if (order?.state === "CANCELED") return { type: "expired", chargeId: orderId };
    return null;
  }
  return null;
}

export const squareAdapter: PaymentAdapter = {
  id: "square",
  rails: ["card"],

  configured() {
    return squareEnv() !== null;
  },

  async createCharge(req, idempotencyKey) {
    if (req.currency === "SATS") {
      // no invented rate — a sats-priced order simply cannot charge through
      // Square; the caller is expected to have refused this earlier with an
      // honest "not purchasable by card" rather than reach this line
      throw new Error("square: fiat rail only — sats orders route through the bitcoin rail, never Square");
    }
    const env = squareEnv();
    if (!env) throw new Error("square: not configured");
    const res = await squareFetch("/v2/online-checkout/payment-links", env, {
      method: "POST",
      body: JSON.stringify(buildSquarePaymentLinkBody(req, idempotencyKey, env.locationId)),
    });
    if (!res.ok) throw new Error(`square: payment link create ${res.status}`);
    const body = (await res.json()) as {
      payment_link?: { id: string; order_id?: string; url?: string };
    };
    const link = body.payment_link;
    if (!link?.order_id || !link.url) {
      throw new Error("square: payment link response missing order_id/url");
    }
    return { chargeId: link.order_id, payUrl: link.url };
  },

  async status(chargeId) {
    const env = squareEnv();
    if (!env) throw new Error("square: not configured");
    const res = await squareFetch(`/v2/orders/${chargeId}`, env);
    if (!res.ok) throw new Error(`square: order read ${res.status}`);
    const body = (await res.json()) as { order?: { state?: string } };
    return mapOrderState(body.order?.state);
  },

  async verifyWebhook(rawBody, headers) {
    const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    // the exact webhook subscription URL configured in the Square
    // dashboard — not a secret, but required INPUT to the signature (see
    // the file-header note); wrong value = every event fails to verify
    const url = process.env.SQUARE_WEBHOOK_URL;
    const sig = headers.get("x-square-hmacsha256-signature");
    if (!key || !url || !sig) return null;
    const expected = createHmac("sha256", key).update(url + rawBody).digest("base64");
    let given: Buffer, want: Buffer;
    try {
      given = Buffer.from(sig, "base64");
      want = Buffer.from(expected, "base64");
    } catch {
      return null;
    }
    if (given.length !== want.length || !timingSafeEqual(given, want)) return null;
    let payload: SquareWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as SquareWebhookPayload;
    } catch {
      return null;
    }
    return mapSquareWebhookEvent(payload);
  },
};

/**
 * Reads back the `metadata.orderId` this codebase stamped on a Square order
 * at createCharge() time — the webhook route's answer to "which of OUR
 * orders is this event about" (Square's payment.updated events don't carry
 * order metadata inline, so a fresh read of the order is the reliable
 * path; see the Square section's file-header note). Null on any failure —
 * the webhook route's job is to treat that as "nothing to flip," same as
 * an unverifiable signature, never to throw a 500 at Square's retrier.
 */
export async function squareOrderMetadata(squareOrderId: string): Promise<Record<string, string> | null> {
  const env = squareEnv();
  if (!env) return null;
  try {
    const res = await squareFetch(`/v2/orders/${squareOrderId}`, env);
    if (!res.ok) return null;
    const body = (await res.json()) as { order?: { metadata?: Record<string, string> } };
    return body.order?.metadata ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Square bitcoin-enablement check (Admiral's walk — Pac's own Square
// merchant account has bitcoin accepted; the admin desk asks Square's own
// Location for that signal rather than assuming).
// ---------------------------------------------------------------------------
//
// ⚠ FIRST-VERIFIED-BY-PAC'S-SANDBOX, same honest limit as every other Square
// call in this file: no network reaches Square from this build environment,
// so the exact field below is a documented-best-guess, not a confirmed
// contract. Square's public API docs do not publish one dedicated "is
// bitcoin accepted" boolean at the time this was written — Pac's dashboard
// shows bitcoin acceptance as a Checkout/Payment-methods setting on the
// LOCATION (Square's bitcoin rail is via Cash App's bitcoin balance; the
// customer pays through Square's OWN hosted checkout page — this codebase
// never touches bitcoin directly through Square, it only asks "would the
// hosted page offer it"). GET /v2/locations/{id} is a real, well-documented
// endpoint regardless of the exact field; this reads it and looks for a
// bitcoin-shaped signal in `capabilities`. If NONE of the known keys are
// present, the honest answer is `enabled: null` ("couldn't determine — check
// the Square dashboard directly"), never a guessed true/false. The moment
// Pac's sandbox run reports the real field, update BITCOIN_CAPABILITY_KEYS —
// nothing else here should need to change.
const BITCOIN_CAPABILITY_KEYS = ["BITCOIN", "CASH_APP_BITCOIN", "BITCOIN_PAYMENTS"];

export interface SquareBitcoinStatus {
  /** false = Square isn't configured at all — this was never asked */
  checked: boolean;
  /** true/false = a confident answer from a real response; null = asked, couldn't tell */
  enabled: boolean | null;
  /** always populated, human-readable, honest — the admin desk shows this verbatim */
  reason: string;
  checkedAtMs?: number;
}

let bitcoinStatusCache: { at: number; status: SquareBitcoinStatus } | null = null;
/** brief + re-checkable, same convention as squareEnv's other short caches —
 *  an operator who just flipped the toggle in their own Square dashboard
 *  shouldn't have to wait long to see it reflected here. */
const BITCOIN_CHECK_TTL_MS = 5 * 60 * 1000;

/** Pure — split out so the capability-parsing logic is unit-testable without
 *  a network call (scripts/square-payments.test.mjs). */
export function findBitcoinCapability(capabilities: unknown): string | null {
  if (!Array.isArray(capabilities)) return null;
  const hit = capabilities.find((c) => typeof c === "string" && BITCOIN_CAPABILITY_KEYS.includes(c));
  return typeof hit === "string" ? hit : null;
}

/**
 * Query Square's own Location for a bitcoin-enablement signal. Never a
 * silent failure — every path returns a populated `reason`. `force` bypasses
 * the brief cache (the admin desk's "recheck" button).
 */
export async function squareBitcoinEnabled(force = false): Promise<SquareBitcoinStatus> {
  const env = squareEnv();
  if (!env) {
    return { checked: false, enabled: null, reason: "Square isn't configured" }; // not cached — nothing was actually asked
  }
  if (!force && bitcoinStatusCache && Date.now() - bitcoinStatusCache.at < BITCOIN_CHECK_TTL_MS) {
    return bitcoinStatusCache.status;
  }
  let status: SquareBitcoinStatus;
  try {
    const res = await squareFetch(`/v2/locations/${env.locationId}`, env);
    if (!res.ok) {
      status = { checked: true, enabled: null, reason: `Square location read failed (${res.status}) — could not verify`, checkedAtMs: Date.now() };
    } else {
      const body = (await res.json()) as { location?: { capabilities?: unknown } };
      const hit = findBitcoinCapability(body.location?.capabilities);
      status = hit
        ? { checked: true, enabled: true, reason: `Square reports "${hit}" enabled on this location`, checkedAtMs: Date.now() }
        : {
            checked: true,
            enabled: null,
            reason:
              "Square's location response carried no known bitcoin-capability field — this check is unverified against a real payload (see the file-header note); confirm in the Square dashboard (Settings → Checkout → Payment methods) for now",
            checkedAtMs: Date.now(),
          };
    }
  } catch (err) {
    status = { checked: true, enabled: null, reason: `Square unreachable — ${err instanceof Error ? err.message : "network error"}`, checkedAtMs: Date.now() };
  }
  bitcoinStatusCache = { at: Date.now(), status };
  return status;
}

export function getAdapter(id: string): PaymentAdapter | null {
  if (id === "btcpay") return btcpayAdapter;
  if (id === "square") return squareAdapter;
  return null;
}

/**
 * The rail the shelf sells on. No argument = today's default (unchanged for
 * every existing call site): BTCPay if configured, honest null otherwise.
 * Pass "square" to ask for the card rail specifically — fiat-only, a sats
 * order never reaches it. This is the one hook a "pay by card" surface
 * needs; today only the single-item checkout's minimal seam uses it (see
 * the `rail: "card"` field on POST /api/store/checkout).
 */
export function liveAdapter(rail?: "btcpay" | "square"): PaymentAdapter | null {
  if (rail === "square") return squareAdapter.configured() ? squareAdapter : null;
  return btcpayAdapter.configured() ? btcpayAdapter : null;
}
