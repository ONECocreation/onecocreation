import { describe, it, expect, beforeAll, vi } from "vitest";

/**
 * TASK-147 (0018.06.17 a₿) — the pay button on meditations did nothing
 * (bitcoin AND square) and the card door never showed. These pins cover the
 * three traced faults:
 *
 *  1. COLD-INSTANCE RAIL JUDGMENT — a vault-only Square (the Money desk's
 *     paste-keys shape, no env vars) reads "not configured" until
 *     ensureSquareVault() has run; the store item page now awaits it (and
 *     getSiteConfig()) before liveAdapter()/liveAdapter("square") are judged.
 *  2. THE SWALLOWED ERROR — a throwing adapter (Square's own 401) escaped
 *     the checkout route as a bare 500 HTML page; the route now answers JSON
 *     carrying the rail's own sentence, which the panel prints under the
 *     button.
 *  3. THE HONEST DOOR WORDS — buyDoorLabel()/addonDoorPlan() say which rail
 *     and what price ("GET IT ⚡ 11,111 sats" / "PAY BY CARD $11" — the word
 *     is CARD, never "cash"), and "not open yet — ask Love" when neither
 *     rail can sell the item.
 *
 * All network is a stubbed global fetch (a stateful fixture KV + the two
 * rails' APIs); every credential below is a fixture string, never a real one.
 */

const KV_URL = "http://kv.fixture";

/** the meditation, mirrored from Love's live shelf (fixture) */
const CATALOG = {
  schemaVersion: 2,
  items: [
    {
      id: "thank-you-wakeup",
      schemaVersion: 2,
      title: "Thank You Wake Up Affirmations",
      blurb: "Wake Up Affirmations · 1 hr 11 min",
      images: ["/images/affirmation-thankyou.webp"],
      media: { images: ["/images/affirmation-thankyou.webp"] },
      kind: "digital",
      price: { sats: 11111, fiat: { amount: 1100, currency: "USD" } },
      fulfillment: "digital",
      status: "live",
    },
  ],
};

/** stateful fixture KV — SET remembers, GET reads back, NX honored */
const kvStore = new Map<string, string>();

let squareRefuses = true; // the sandbox fixture token is refused (401) unless a test says otherwise

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
  // the LIVE switch truth (read from the public /api/admin/site shape,
  // 0018.06.17 a₿): bitcoin OFF, square ON — a cold instance must not
  // resurrect the bitcoin rail from the defaults
  kvStore.set("site:config:onecocreation", JSON.stringify({
    features: { community: true, classes: true, store: true, sessions: true, cuts: false, jars: true, news: true },
    payments: { btcpay: false, square: true, stripe: false },
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
        const [, k, v, flag] = cmd.map(String);
        if (flag === "NX" && kvStore.has(k)) result = null;
        else { kvStore.set(k, v); result = "OK"; }
      } else if (op === "SADD") result = 1;
      else if (op === "DEL") result = 1;
      return new Response(JSON.stringify({ result }), { status: 200 });
    }
    if (u.startsWith("http://btcpay.fixture")) {
      if (u.includes("/invoices") && init?.method === "POST") {
        return new Response(
          JSON.stringify({ id: "inv_fixture_1", checkoutLink: "http://btcpay.fixture/i/inv_fixture_1" }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ id: "inv_fixture_1", status: "New" }), { status: 200 });
    }
    if (u.startsWith("https://connect.squareupsandbox.com")) {
      if (squareRefuses) {
        return new Response(
          JSON.stringify({ errors: [{ category: "AUTHENTICATION_ERROR", code: "UNAUTHORIZED" }] }),
          { status: 401 },
        );
      }
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

const checkoutPOST = async () => (await import("@/app/api/store/checkout/route")).POST;

async function frenCookie(): Promise<string> {
  const { makeFrenToken } = await import("@/lib/fren-auth");
  return `pa-fren=${makeFrenToken("love", "frens")}`;
}

async function checkout(body: Record<string, unknown>, cookie?: string) {
  const POST = await checkoutPOST();
  return POST(
    new Request("http://localhost/api/store/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}

describe("the cold-instance card door (fault 1 — the vault must be warm before the judgment)", () => {
  it("a vault-only Square reads 'not configured' until ensureSquareVault() has run", async () => {
    const { liveAdapter, ensureSquareVault } = await import("@/lib/payments");
    // COLD: nothing has warmed the vault cache — the card rail judges false
    // even though the vault holds Love's keys (the pre-fix store item page
    // judged exactly here, so the card door vanished per instance)
    expect(liveAdapter("square")).toBeNull();
    await ensureSquareVault();
    // WARM: the same judgment now sees the card rail (the fixed page awaits
    // this line before judging — the doors stop flickering per instance)
    expect(liveAdapter("square")?.id).toBe("square");
  });
});

describe("POST /api/store/checkout — the rail's own sentence, never a silent 500 (fault 2)", () => {
  it("a rail Love switched OFF stays off on a COLD route instance — no invoice against it", async () => {
    // the FIRST route call in this file: nothing has warmed the switch cache.
    // The route must read the vault truth itself (btcpay OFF) rather than
    // judge off the cold-cache defaults (btcpay:true) and mint an invoice
    // against Love's OFF switch — the pre-fix behavior, reproduced live.
    const res = await checkout({ itemId: "thank-you-wakeup" });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      ok: false,
      reason: "payment rail not connected — the shelf is browse-only",
    });
  });

  it("a guest with NO email buying a meditation (digital) is stopped, in the basket's words", async () => {
    const res = await checkout({ itemId: "thank-you-wakeup", rail: "card" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      ok: false,
      reason: "add your email (it becomes your account) or sign in — this unlocks FOR you",
    });
  });

  it("the basket rule on the item page: a guest WITH an email gets through — the email becomes the account", async () => {
    squareRefuses = true; // the rail refuses the fixture token — proves the guest passed the gate and reached the rail
    const res = await checkout({ itemId: "thank-you-wakeup", rail: "card", contact: { email: "Guest@Example.com" } });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, reason: "square: payment link create 401" });
  });

  it("Square's own refusal reaches the buyer as JSON words, not a bare 500", async () => {
    squareRefuses = true;
    const res = await checkout({ itemId: "thank-you-wakeup", rail: "card" }, await frenCookie());
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, reason: "square: payment link create 401" });
  });

  it("a working card rail answers the hosted payUrl", async () => {
    squareRefuses = false;
    const res = await checkout({ itemId: "thank-you-wakeup", rail: "card" }, await frenCookie());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.payUrl).toBe("https://sandbox.square.link/u/fixture");
    expect(typeof data.orderId).toBe("string");
  });

  it("BTCPay's refusal gets the same honest shape on the default rail", async () => {
    const { saveSiteConfig } = await import("@/lib/site-config");
    await saveSiteConfig({ payments: { btcpay: true, square: true } });
    // break only the BTCPay half of the stub: invoice mint answers 500
    const origFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
      if (String(url).startsWith("http://btcpay.fixture") && String(url).includes("/invoices") && init?.method === "POST") {
        return new Response("btcpay says no", { status: 500 });
      }
      return origFetch(url as string, init);
    });
    const res = await checkout({ itemId: "thank-you-wakeup" }, await frenCookie());
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, reason: "btcpay: invoice create 500" });
    vi.stubGlobal("fetch", origFetch);
  });

  it("a switch Love turned OFF is honored once the truth is warm — no invoice against it", async () => {
    const { saveSiteConfig } = await import("@/lib/site-config");
    await saveSiteConfig({ payments: { btcpay: false, square: false } });
    const res = await checkout({ itemId: "thank-you-wakeup" }, await frenCookie());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      ok: false,
      reason: "payment rail not connected — the shelf is browse-only",
    });
    const card = await checkout({ itemId: "thank-you-wakeup", rail: "card" }, await frenCookie());
    expect(card.status).toBe(503);
    expect(await card.json()).toEqual({ ok: false, reason: "card rail not connected" });
    // restore the live truth (btcpay OFF, square ON) for anything that runs after
    await saveSiteConfig({ payments: { btcpay: false, square: true } });
  });
});

describe("the honest door words (fault 3 — the button says which rail and what price)", () => {
  it("buyDoorLabel: the word is CARD, never 'cash'; the price rides the button", async () => {
    const { buyDoorLabel } = await import("@/components/store/BuyPanel");
    expect(buyDoorLabel("btcpay", { sats: 11111, fiat: { amount: 1100, currency: "USD" } }))
      .toBe("GET IT ⚡ 11,111 sats");
    expect(buyDoorLabel("square", { sats: 11111, fiat: { amount: 1100, currency: "USD" } }))
      .toBe("PAY BY CARD $11");
    // a fiat-priced item on the bitcoin rail (fiat-denominated invoice) says so
    expect(buyDoorLabel("btcpay", { fiat: { amount: 1100, currency: "USD" } })).toBe("GET IT ⚡ $11");
    // derive-or-dash: no price, never a guessed number
    expect(buyDoorLabel("square", {})).toBe("PAY BY CARD —");
    expect(buyDoorLabel("btcpay", {})).toBe("GET IT ⚡ —");
  });

  it("addonDoorPlan: both doors when both rails can sell it, words when neither can", async () => {
    const { addonDoorPlan } = await import("@/components/store/AddonActions");
    const both = addonDoorPlan({
      btcpayLive: true, squareLive: true, satsLabel: "11,111 sats", fiatLabel: "$11",
    });
    expect(both).toEqual({ bitcoin: "GET IT ⚡ 11,111 sats", card: "PAY BY CARD $11", askLove: false });

    const cardOnly = addonDoorPlan({
      btcpayLive: false, squareLive: true, satsLabel: "11,111 sats", fiatLabel: "$11",
    });
    expect(cardOnly).toEqual({ bitcoin: null, card: "PAY BY CARD $11", askLove: false });

    // a sats-only item is honestly never card-purchasable (no invented rate)
    const satsOnly = addonDoorPlan({
      btcpayLive: false, squareLive: true, satsLabel: "11,111 sats", fiatLabel: null,
    });
    expect(satsOnly).toEqual({ bitcoin: null, card: null, askLove: true });

    const neither = addonDoorPlan({
      btcpayLive: false, squareLive: false, satsLabel: "11,111 sats", fiatLabel: "$11",
    });
    expect(neither).toEqual({ bitcoin: null, card: null, askLove: true });

    // the pre-T-147 caller contract keeps its one door (no rail truth handed down)
    expect(addonDoorPlan(undefined)).toEqual({ bitcoin: "Buy now ⚡", card: null, askLove: false });
  });
});
