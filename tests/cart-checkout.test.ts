import { describe, it, expect, beforeAll, vi } from "vitest";

/**
 * TASK-198 (0018.06.18 a₿) — THE BASKET HONOURS THE MONEY WORD: found live on
 * the Love call — "trying to do a payment with love, getting an error that
 * says payment rail not connected." /api/cart/checkout called liveAdapter()
 * with NO rail, so it only ever asked BTCPay — even when the visitor's money
 * word was fiat and Square was the live rail. The single-item door
 * (BuyPanel → /api/store/checkout) already read the rail from the money word;
 * this pins the basket doing the same, honestly:
 *
 *  1. rail: "card" picks Square and never touches BTCPay.
 *  2. no rail (bitcoin, the default) is unchanged.
 *  3. a card rail that isn't live answers "card rail not connected".
 *  4. the "has no sats price — cart checkout is sats-first" line-price gate
 *     applies to the bitcoin rail ONLY — a fiat-only line checks out fine on
 *     the card rail (never a sats↔fiat conversion, never a false refusal).
 *
 * All network is a stubbed global fetch (a stateful fixture KV + BTCPay +
 * Square) — every credential below is a fixture string, never a real one.
 */

const KV_URL = "http://kv.fixture";

/** two goods, mirroring the shelf's own shapes (fixture) */
const CATALOG = {
  schemaVersion: 2,
  items: [
    {
      id: "both-rails-good",
      schemaVersion: 2,
      title: "Both Rails Meditation",
      blurb: "sats and fiat both listed",
      images: [],
      media: { images: [] },
      kind: "digital",
      price: { sats: 21000, fiat: { amount: 2200, currency: "USD" } },
      fulfillment: "digital",
      status: "live",
    },
    {
      id: "fiat-only-good",
      schemaVersion: 2,
      title: "Fiat Only Meditation",
      blurb: "no sats price at all",
      images: [],
      media: { images: [] },
      kind: "digital",
      price: { fiat: { amount: 3300, currency: "USD" } },
      fulfillment: "digital",
      status: "live",
    },
    {
      id: "eur-good",
      schemaVersion: 2,
      title: "Euro Meditation",
      blurb: "a different fiat currency",
      images: [],
      media: { images: [] },
      kind: "digital",
      price: { fiat: { amount: 1900, currency: "EUR" } },
      fulfillment: "digital",
      status: "live",
    },
  ],
};

/** stateful fixture KV — SET remembers, GET reads back */
const kvStore = new Map<string, string>();

function seedCart(id: string, lines: unknown[]) {
  kvStore.set(`cart:${id}`, JSON.stringify({ lines, updatedAtMs: Date.now() }));
}

let btcpayCalled = false;

beforeAll(async () => {
  delete process.env.VERCEL;
  delete process.env.REDIS_URL;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.SQUARE_ACCESS_TOKEN; // vault-only Square — the live shape (T-136)
  delete process.env.SQUARE_LOCATION_ID;
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-kv-token";
  process.env.SEAT_SECRET = "test-seat-secret";
  process.env.BTCPAY_URL = "http://btcpay.fixture";
  process.env.BTCPAY_STORE_ID = "store-fixture";
  process.env.BTCPAY_API_KEY = "fixture-btcpay-key";

  kvStore.set("store:catalog", JSON.stringify(CATALOG));
  // both rails live — the money word alone decides which one a checkout asks
  kvStore.set("site:config:onecocreation", JSON.stringify({
    features: { community: true, classes: true, store: true, sessions: true, cuts: false, jars: true, news: true },
    payments: { btcpay: true, square: true, stripe: false },
    meeting: { rail: "jitsi", jitsiDomain: "meet.onecocreation.com", allowStaticLinks: false },
  }));
  kvStore.set("oc:square:access-token", "EAAAtest-sandbox-fixture");
  kvStore.set("oc:square:location-id", "LTESTFIXTURE0");
  kvStore.set("oc:square:environment", "sandbox");
  kvStore.set("oc:square:webhook-signature-key", "whsec_fixture");
  kvStore.set("oc:square:webhook-url", "https://example.com/api/webhooks/square");

  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u === KV_URL) {
      const cmd = JSON.parse(String(init?.body)) as unknown[];
      const [op, key] = cmd.map(String);
      let result: unknown = null;
      if (op === "GET") result = kvStore.get(key) ?? null;
      else if (op === "SET") {
        const [, k, v] = cmd.map(String);
        kvStore.set(k, v);
        result = "OK";
      } else if (op === "DEL") {
        kvStore.delete(key);
        result = 1;
      }
      return new Response(JSON.stringify({ result }), { status: 200 });
    }
    if (u.startsWith("http://btcpay.fixture")) {
      btcpayCalled = true;
      if (u.includes("/invoices") && init?.method === "POST") {
        return new Response(
          JSON.stringify({ id: "inv_fixture_1", checkoutLink: "http://btcpay.fixture/i/inv_fixture_1" }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ id: "inv_fixture_1", status: "New" }), { status: 200 });
    }
    if (u.startsWith("https://connect.squareupsandbox.com")) {
      return new Response(
        JSON.stringify({
          payment_link: {
            id: "plink_fixture",
            order_id: "sqord_fixture",
            url: "https://sandbox.square.link/u/fixture",
          },
        }),
        { status: 200 },
      );
    }
    throw new Error(`unexpected fetch: ${u}`);
  });
});

const checkoutPOST = async () => (await import("@/app/api/cart/checkout/route")).POST;

async function checkout(cartId: string, body: Record<string, unknown>) {
  const POST = await checkoutPOST();
  return POST(
    new Request("http://localhost/api/cart/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `oc-cart=${cartId}` },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/cart/checkout — the basket follows the money word (T-198)", () => {
  it("rail: 'card' picks Square and never asks BTCPay", async () => {
    btcpayCalled = false;
    seedCart("cart-card-1", [{ itemId: "both-rails-good", qty: 1 }]);
    const res = await checkout("cart-card-1", { contact: { email: "guest@example.com" }, rail: "card" });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.payUrl).toBe("https://sandbox.square.link/u/fixture");
    expect(btcpayCalled).toBe(false);

    const { getOrder } = await import("@/lib/store");
    const order = await getOrder(data.orderId);
    expect(order?.adapterId).toBe("square");
    expect(order?.priceSnapshot).toMatchObject({ amount: 2200, currency: "USD" });
  });

  it("the bitcoin rail (no `rail` field) is unchanged — sats total, BTCPay adapter", async () => {
    btcpayCalled = false;
    seedCart("cart-btc-1", [{ itemId: "both-rails-good", qty: 1 }]);
    const res = await checkout("cart-btc-1", { contact: { email: "guest@example.com" } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.payUrl).toBe("http://btcpay.fixture/i/inv_fixture_1");
    expect(btcpayCalled).toBe(true);

    const { getOrder } = await import("@/lib/store");
    const order = await getOrder(data.orderId);
    expect(order?.adapterId).toBe("btcpay");
    expect(order?.priceSnapshot).toMatchObject({ amount: 21000, currency: "SATS" });
  });

  it("a card rail that isn't live answers 'card rail not connected' — the bitcoin rail keeps its own honest words", async () => {
    const { saveSiteConfig } = await import("@/lib/site-config");
    await saveSiteConfig({ payments: { btcpay: true, square: false } });
    seedCart("cart-dark-card", [{ itemId: "both-rails-good", qty: 1 }]);

    const card = await checkout("cart-dark-card", { contact: { email: "guest@example.com" }, rail: "card" });
    expect(card.status).toBe(503);
    expect(await card.json()).toEqual({ ok: false, reason: "card rail not connected" });

    await saveSiteConfig({ payments: { btcpay: false, square: false } });
    const bitcoin = await checkout("cart-dark-card", { contact: { email: "guest@example.com" } });
    expect(bitcoin.status).toBe(503);
    expect(await bitcoin.json()).toEqual({ ok: false, reason: "payment rail not connected" });

    // restore the live truth for every test after this one
    await saveSiteConfig({ payments: { btcpay: true, square: true } });
  });

  it("the sats-first check applies to the bitcoin rail only — a fiat-only line checks out fine by card", async () => {
    seedCart("cart-fiat-only", [{ itemId: "fiat-only-good", qty: 1 }]);

    const bitcoin = await checkout("cart-fiat-only", { contact: { email: "guest@example.com" } });
    expect(bitcoin.status).toBe(409);
    expect(await bitcoin.json()).toEqual({
      ok: false,
      reason: `"Fiat Only Meditation" has no sats price — cart checkout is sats-first`,
    });

    const card = await checkout("cart-fiat-only", { contact: { email: "guest@example.com" }, rail: "card" });
    expect(card.status).toBe(200);
    const data = await card.json();
    expect(data.ok).toBe(true);
    const { getOrder } = await import("@/lib/store");
    const order = await getOrder(data.orderId);
    expect(order?.priceSnapshot).toMatchObject({ amount: 3300, currency: "USD" });
  });

  it("a line with no fiat price is honestly refused on the card rail — never an invented rate", async () => {
    // "both-rails-good" carries sats — but this cart's OTHER line is sats-only
    // (no fiat at all), so the card rail must refuse it rather than drop it
    const CATALOG_WITH_SATS_ONLY = {
      schemaVersion: 2,
      items: [...CATALOG.items, {
        id: "sats-only-good",
        schemaVersion: 2,
        title: "Sats Only Class",
        blurb: "no fiat price",
        images: [],
        media: { images: [] },
        kind: "digital",
        price: { sats: 5000 },
        fulfillment: "digital",
        status: "live",
      }],
    };
    kvStore.set("store:catalog", JSON.stringify(CATALOG_WITH_SATS_ONLY));
    seedCart("cart-sats-only", [{ itemId: "sats-only-good", qty: 1 }]);
    const res = await checkout("cart-sats-only", { contact: { email: "guest@example.com" }, rail: "card" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      ok: false,
      reason: `"Sats Only Class" has no fiat price — not purchasable by card`,
    });
    kvStore.set("store:catalog", JSON.stringify(CATALOG));
  });

  it("a pay-what-you-can offer only settles in sats — the card rail refuses rather than drop or convert it", async () => {
    seedCart("cart-offer-card", [{ itemId: "both-rails-good", qty: 1, offerSats: 15000 }]);
    const res = await checkout("cart-offer-card", { contact: { email: "guest@example.com" }, rail: "card" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      ok: false,
      reason: "a pay-what-you-can offer in this basket only settles in sats — pay by bitcoin, or clear the offer, to use a card",
    });
  });

  it("mixed fiat currencies in one basket can't total honestly by card", async () => {
    seedCart("cart-mixed-currency", [
      { itemId: "fiat-only-good", qty: 1 },
      { itemId: "eur-good", qty: 1 },
    ]);
    const res = await checkout("cart-mixed-currency", { contact: { email: "guest@example.com" }, rail: "card" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      ok: false,
      reason: "this basket's prices don't share one currency — can't total it by card",
    });
  });
});
