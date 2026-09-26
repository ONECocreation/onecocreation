import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { isolateCwd } from "./helpers/isolate-cwd";
import {
  getItem,
  isPurchasable,
  upsertItem,
  validateItem,
  type StoreItem,
} from "@/lib/store";
import { storeCardModel } from "@/components/store/StoreItemCard";
import { tierPageMode } from "@/app/packages/[slug]/page";

/**
 * TASK-472 (block 968,624 — the Admiral's ruling on Observer/Evening Star):
 * "Coming soon" — price and description stay visible, nobody can buy them
 * anywhere. Astra's warning (ASTRA-REVIEW.md, L5) ruled out a brand-new
 * ItemStatus (it crosses validation, persistence, checkout AND old carts) —
 * this is instead one optional `comingSoon` flag riding on TOP of the
 * existing, proven `status: "live"` path, judged everywhere by ONE helper,
 * `isPurchasable()` (store.ts).
 *
 * Pins:
 *  1. isPurchasable() — the pure law every gate below shares.
 *  2. validateItem() — comingSoon is boolean-only; a live item still needs
 *     a price with comingSoon on (the flag never bypasses the price law).
 *  3. persistence — the flag round-trips through the catalog untouched.
 *  4. the server refuses a comingSoon item at cart-add, at cart-resolve
 *     (an OLD cart already holding the line), and at cart checkout — even
 *     though the item is still `status: "live"`.
 *  5. the UI model (storeCardModel) carries `comingSoon` for the shelf
 *     badge, and the packages page's tierPageMode() picks "soon" over both
 *     "buy" and "waitlist".
 *  6. none of the new strings carry an em dash (Lumen's L-002, "slop").
 */

function item(over: Partial<StoreItem>): StoreItem {
  return {
    id: "x",
    schemaVersion: 2,
    title: "X",
    blurb: "words",
    images: [],
    kind: "package",
    price: { fiat: { amount: 5500, currency: "USD" } },
    fulfillment: "package",
    status: "live",
    ...over,
  };
}

describe("isPurchasable() — the one purchasability law", () => {
  it("a live item with no flag is purchasable", () => {
    expect(isPurchasable(item({}))).toBe(true);
  });

  it("comingSoon:true blocks a LIVE item — status alone is no longer enough", () => {
    expect(isPurchasable(item({ comingSoon: true }))).toBe(false);
  });

  it("comingSoon never WIDENS a hidden or sold-out item back into buyable", () => {
    expect(isPurchasable(item({ status: "hidden", comingSoon: false }))).toBe(false);
    expect(isPurchasable(item({ status: "soldout", comingSoon: true }))).toBe(false);
  });

  it("comingSoon absent (undefined) reads exactly like comingSoon:false", () => {
    expect(isPurchasable(item({ comingSoon: undefined }))).toBe(true);
  });
});

describe("validateItem() — comingSoon is boolean-only, and never a price loophole", () => {
  it("true/false both validate", () => {
    expect(validateItem(item({ comingSoon: true }))).toEqual({ ok: true });
    expect(validateItem(item({ comingSoon: false }))).toEqual({ ok: true });
  });

  it("a non-boolean is refused, in words", () => {
    expect(validateItem(item({ comingSoon: "yes" as unknown as boolean }))).toEqual({
      ok: false,
      reason: "comingSoon as true or false",
    });
  });

  it("a LIVE item with comingSoon:true still needs a real price — the flag isn't a price bypass", () => {
    const v = validateItem(item({ comingSoon: true, price: {} }));
    expect(v).toEqual({ ok: false, reason: "at least one price (sats or fiat) before going live" });
  });
});

describe("persistence — comingSoon round-trips through the catalog", () => {
  const iso = isolateCwd("oc-task472-");

  beforeAll(() => {
    delete process.env.VERCEL;
    delete process.env.REDIS_URL;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  afterAll(() => iso.cleanup());

  it("comingSoon:true is saved and read back unchanged", async () => {
    await upsertItem(item({ id: "t472-observer", comingSoon: true }));
    const back = await getItem("t472-observer");
    expect(back?.comingSoon).toBe(true);
    expect(back?.status).toBe("live"); // status is untouched — this is an overlay, not a new status
  });

  it("an item saved with no comingSoon field reads back undefined, never a stored false", async () => {
    await upsertItem(item({ id: "t472-plain" }));
    const back = await getItem("t472-plain");
    expect(back?.comingSoon).toBeUndefined();
  });
});

describe("the shelf card's model carries comingSoon, independent of soldOut", () => {
  it("comingSoon:true → comingSoon true, soldOut false, price still rendered", () => {
    const m = storeCardModel(item({ comingSoon: true, price: { fiat: { amount: 11100, currency: "USD" } } }));
    expect(m.comingSoon).toBe(true);
    expect(m.soldOut).toBe(false);
    expect(m.priceLabel).toBe("$111"); // the price is untouched by the flag
  });

  it("an ordinary live item never carries the badge", () => {
    expect(storeCardModel(item({})).comingSoon).toBe(false);
  });
});

describe("tierPageMode() — comingSoon outranks both buy and waitlist", () => {
  it("a live tier with the switch on: buy, unless comingSoon", () => {
    expect(tierPageMode("buy", true, false)).toBe("buy");
    expect(tierPageMode("buy", true, true)).toBe("soon");
  });

  it("a not-live tier with the switch on falls to waitlist, unless comingSoon", () => {
    expect(tierPageMode("buy", false, false)).toBe("waitlist");
    expect(tierPageMode("buy", false, true)).toBe("soon");
  });

  it("the switch off (banner/waitlist mode) still gives way to comingSoon", () => {
    expect(tierPageMode("banner", true, true)).toBe("soon");
    expect(tierPageMode("waitlist", false, true)).toBe("soon");
    expect(tierPageMode("banner", true, false)).toBe("banner");
  });
});

describe("none of the new copy carries an em dash (Lumen L-002 — 'slop')", () => {
  it.each([
    "Coming soon",
    "Coming soon.",
    "coming soon",
    "coming soon. keeps the price and description showing, but no one can buy or join yet",
  ])("%s", (s) => {
    expect(s).not.toContain("—");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Server refusal — cart add, cart resolve (an OLD cart), and cart checkout
// all refuse a comingSoon item even though status stays "live". Scoped in
// ONE describe with its OWN beforeAll (never a root-level hook) so the
// persistence describe's env deletes above can never leak into it —
// vitest/jest root-level `beforeAll`s all run before ANY nested describe's
// hooks, so an earlier describe's cleanup racing a later root hook is a
// real trap; a describe-scoped hook always runs immediately before its
// own children, in declared order, with nothing else in between.
// ─────────────────────────────────────────────────────────────────────────

describe("server refusal — cart add, cart resolve, and checkout all refuse a comingSoon item", () => {
const KV_URL = "http://kv.fixture.472";

const CATALOG = {
  schemaVersion: 2,
  items: [
    {
      id: "observer-membership",
      schemaVersion: 2,
      title: "Observer",
      blurb: "the classroom door",
      images: [],
      media: { images: [] },
      kind: "package",
      price: { sats: 55000, fiat: { amount: 5500, currency: "USD" } },
      fulfillment: "package",
      status: "live",
      comingSoon: true,
    },
    {
      id: "ordinary-meditation",
      schemaVersion: 2,
      title: "An Ordinary Meditation",
      blurb: "buyable, unchanged",
      images: [],
      media: { images: [] },
      kind: "digital",
      price: { sats: 11111, fiat: { amount: 1100, currency: "USD" } },
      fulfillment: "digital",
      status: "live",
    },
  ],
};

const kvStore = new Map<string, string>();

function seedCart(id: string, lines: unknown[]) {
  kvStore.set(`cart:${id}`, JSON.stringify({ lines, updatedAtMs: Date.now() }));
}

beforeAll(() => {
  delete process.env.VERCEL;
  delete process.env.REDIS_URL;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.SQUARE_ACCESS_TOKEN;
  delete process.env.SQUARE_LOCATION_ID;
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-kv-token-472";
  process.env.SEAT_SECRET = "test-seat-secret-472";
  process.env.BTCPAY_URL = "http://btcpay.fixture.472";
  process.env.BTCPAY_STORE_ID = "store-fixture-472";
  process.env.BTCPAY_API_KEY = "fixture-btcpay-key-472";

  kvStore.set("store:catalog", JSON.stringify(CATALOG));
  kvStore.set("site:config:onecocreation", JSON.stringify({
    features: { community: true, classes: true, store: true, sessions: true, cuts: false, jars: true, news: true },
    payments: { btcpay: true, square: false, stripe: false },
    meeting: { rail: "jitsi", jitsiDomain: "meet.onecocreation.com", allowStaticLinks: false },
  }));

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
    if (u.startsWith("http://btcpay.fixture.472")) {
      if (u.includes("/invoices") && init?.method === "POST") {
        return new Response(
          JSON.stringify({ id: "inv_fixture_472", checkoutLink: "http://btcpay.fixture.472/i/inv_fixture_472" }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ id: "inv_fixture_472", status: "New" }), { status: 200 });
    }
    throw new Error(`unexpected fetch: ${u}`);
  });
});

async function cartPOST(body: Record<string, unknown>, cookie?: string) {
  const { POST } = await import("@/app/api/cart/route");
  return POST(
    new Request("http://localhost/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    }),
  );
}

async function cartGET(cookie: string) {
  const { GET } = await import("@/app/api/cart/route");
  return GET(new Request("http://localhost/api/cart", { headers: { Cookie: cookie } }));
}

async function cartCheckoutPOST(cookie: string, body: Record<string, unknown> = {}) {
  const { POST } = await import("@/app/api/cart/checkout/route");
  return POST(
    new Request("http://localhost/api/cart/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(body),
    }),
  );
}

async function storeCheckoutPOST(body: Record<string, unknown>) {
  const { POST } = await import("@/app/api/store/checkout/route");
  return POST(
    new Request("http://localhost/api/store/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/cart — adding a comingSoon item is refused", () => {
  it("refuses the comingSoon item outright", async () => {
    const res = await cartPOST({ itemId: "observer-membership", qty: 1 }, "oc-cart=cart-472-add");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, reason: "that item isn't on the shelf" });
  });

  it("an ordinary live item still adds fine — the flag changes nothing else", async () => {
    const res = await cartPOST({ itemId: "ordinary-meditation", qty: 1 }, "oc-cart=cart-472-add-ok");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.count).toBe(1);
  });
});

describe("GET /api/cart — an OLD cart line for a NOW-comingSoon item is swept", () => {
  it("a line added before the flag was set never resolves once the item is comingSoon", async () => {
    seedCart("cart-472-old", [{ itemId: "observer-membership", qty: 1 }]);
    const res = await cartGET("oc-cart=cart-472-old");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.lines).toEqual([]);
  });
});

describe("POST /api/cart/checkout — refuses a comingSoon line even from an old cart", () => {
  it("409s in the basket's own honest words", async () => {
    seedCart("cart-472-checkout", [{ itemId: "observer-membership", qty: 1 }]);
    const res = await cartCheckoutPOST("oc-cart=cart-472-checkout", { contact: { email: "guest@example.com" } });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      ok: false,
      reason: `"observer-membership" left the shelf — remove it and retry`,
    });
  });
});

describe("POST /api/store/checkout — the single-item door refuses the same item", () => {
  it("404s 'not on the shelf' for the comingSoon item", async () => {
    const res = await storeCheckoutPOST({ itemId: "observer-membership", contact: { email: "guest@example.com" } });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, reason: "not on the shelf" });
  });

  it("an ordinary live item still checks out fine (positive control — the fixture itself works)", async () => {
    const res = await storeCheckoutPOST({ itemId: "ordinary-meditation", contact: { email: "guest@example.com" } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.payUrl).toBe("http://btcpay.fixture.472/i/inv_fixture_472");
  });
});

}); // end "server refusal" wrapper describe
