import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import type { OrderRecord } from "@/lib/store";

/**
 * TASK-537 part 4 (gap 4) - the code-settled cart's receipt. A basket a 100%
 * code takes to zero settles in the cart route itself and, until now, never
 * called `sendOrderReceipt` (every other settle path does). The one call
 * sits just before Love's purchase letter, caught, so a mail hiccup never
 * changes the `{ ok: true, paid: true }` answer.
 */

const callLog = vi.hoisted(() => [] as string[]);
const mailControl = vi.hoisted(() => ({ throwForBookings: false }));
const sentMail = vi.hoisted(() => [] as Array<{ persona: string; to: string; subject: string }>);

vi.mock("@/lib/mail", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/mail")>();
  return {
    ...actual,
    mailConfigured: () => true,
    sendMail: async (persona: string, mail: { to: string; subject: string }) => {
      if (persona === "bookings" && mailControl.throwForBookings) throw new Error("simulated mail hiccup");
      sentMail.push({ persona, to: mail.to, subject: mail.subject });
    },
  };
});
vi.mock("@/lib/entitlement-fulfil", () => ({
  settleEntitlementFromOrder: async () => { callLog.push("entitlement"); return {}; },
}));
vi.mock("@/lib/booking-fulfil", () => ({
  settleBookingFromOrder: async () => { callLog.push("booking"); return {}; },
}));
vi.mock("@/lib/gift-vouchers", () => ({
  settleGiftsFromOrder: async () => { callLog.push("gifts"); return {}; },
}));
vi.mock("@/lib/order-receipt", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/order-receipt")>();
  return {
    ...actual,
    sendOrderReceipt: async (o: OrderRecord) => { callLog.push("receipt"); return actual.sendOrderReceipt(o); },
  };
});
vi.mock("@/lib/purchase-love-notify", () => ({
  sendPurchaseLoveNotify: async () => { callLog.push("love"); return { sent: true }; },
}));

const KV_URL = "http://kv.fixture";
const kvStore = new Map<string, string>();
const CATALOG = {
  schemaVersion: 2,
  items: [{
    id: "free-good", schemaVersion: 2, title: "Free Good Meditation", blurb: "x", images: [], media: { images: [] },
    kind: "digital", price: { sats: 21000, fiat: { amount: 2200, currency: "USD" } }, fulfillment: "digital", status: "live",
  }],
};

beforeAll(() => {
  delete process.env.VERCEL;
  delete process.env.REDIS_URL;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-kv-token";
  process.env.SEAT_SECRET = "test-seat-secret";
  process.env.BTCPAY_URL = "http://btcpay.fixture";
  process.env.BTCPAY_STORE_ID = "store-fixture";
  process.env.BTCPAY_API_KEY = "fixture-btcpay-key";
  kvStore.set("store:catalog", JSON.stringify(CATALOG));
  kvStore.set("site:config:onecocreation", JSON.stringify({
    features: { community: true, classes: true, store: true, sessions: true, cuts: false, jars: true, news: true },
    payments: { btcpay: true, square: false, stripe: false },
    meeting: { rail: "jitsi", jitsiDomain: "meet.onecocreation.com", allowStaticLinks: false },
  }));
  kvStore.set("store:discounts", JSON.stringify([{ code: "FREEALL", kind: "percent", value: 100, enabled: true }]));
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u === KV_URL) {
      const cmd = JSON.parse(String(init?.body)) as unknown[];
      const [op, key] = cmd.map(String);
      let result: unknown = null;
      if (op === "GET") result = kvStore.get(key) ?? null;
      else if (op === "SET") {
        const flag = cmd[3];
        if (flag === "NX" && kvStore.has(key)) result = null;
        else { kvStore.set(key, String(cmd[2])); result = "OK"; }
      } else if (op === "DEL") { kvStore.delete(key); result = 1; }
      else result = 1;
      return new Response(JSON.stringify({ result }), { status: 200 });
    }
    if (u.startsWith("http://btcpay.fixture")) return new Response(JSON.stringify({ id: "inv" }), { status: 200 });
    throw new Error(`unexpected fetch: ${u}`);
  });
});

beforeEach(() => {
  callLog.length = 0;
  sentMail.length = 0;
  mailControl.throwForBookings = false;
});

let n = 0;
async function checkout(body: Record<string, unknown>) {
  const cartId = `cart-537-${++n}`;
  kvStore.set(`cart:${cartId}`, JSON.stringify({ lines: [{ itemId: "free-good", qty: 1 }], updatedAtMs: Date.now() }));
  const { POST } = await import("@/app/api/cart/checkout/route");
  return POST(new Request("http://localhost/api/cart/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `oc-cart=${cartId}` },
    body: JSON.stringify({ discountCode: "FREEALL", ...body }),
  }));
}
const receipts = () => sentMail.filter((m) => m.persona === "bookings");

describe("4a - the cart's code-settle block sends the receipt", () => {
  it("a 100%-code basket with a contact email sends exactly one receipt, and the marker holds on a second hit", async () => {
    const res = await checkout({ contact: { email: "buyer@example.com" } });
    expect(await res.json()).toMatchObject({ ok: true, paid: true });
    expect(receipts()).toHaveLength(1);
    expect(receipts()[0].to).toBe("buyer@example.com");
    const { getOrder } = await import("@/lib/store");
    const orderId = [...kvStore.keys()].find((k) => k.endsWith(":receipt-sent"))!.split(":")[1];
    const order = (await getOrder(orderId))!;
    const { sendOrderReceipt } = await import("@/lib/order-receipt");
    const again = await sendOrderReceipt(order);
    expect(again.sent).toBe(false);
    expect(receipts()).toHaveLength(1);
  });

  it("a basket without a buyer email sends none and does not throw", async () => {
    // a digital good needs an email at the door, so use a signed-out cart with a blank-ish contact the route allows through
    kvStore.set("store:catalog", JSON.stringify({ ...CATALOG, items: [{ ...CATALOG.items[0], id: "free-good", kind: "self", fulfillment: "self" }] }));
    try {
      const res = await checkout({ shipping: { name: "Ship To", address: "1 Road" } });
      expect(await res.json()).toMatchObject({ ok: true, paid: true });
      expect(receipts()).toHaveLength(0);
    } finally {
      kvStore.set("store:catalog", JSON.stringify(CATALOG));
    }
  });

  it("a booking order gets no receipt from the route's call (its own confirmation rides)", async () => {
    const { sendOrderReceipt } = await import("@/lib/order-receipt");
    const res = await sendOrderReceipt({
      id: "order-with-booking", schemaVersion: 2, state: "settled",
      lineItems: [{ itemId: "discovery-call", title: "Discovery Call", qty: 1, bookingId: "bk-1" }],
      priceSnapshot: { amount: 0, currency: "USD", at: "2026-09-30T00:00:00.000Z" },
      adapterId: "btcpay", chargeIds: [], contact: { email: "buyer@example.com" }, createdAtMs: 1, events: [],
    } as unknown as OrderRecord);
    expect(res.sent).toBe(false);
    expect(receipts()).toHaveLength(0);
  });

  it("the receipt goes after the settle calls and before Love's letter", async () => {
    await checkout({ contact: { email: "order@example.com" } });
    expect(callLog).toEqual(["entitlement", "booking", "gifts", "receipt", "love"]);
  });

  it("a receipt mail hiccup never changes the { ok: true, paid: true } answer, and Love's letter still goes", async () => {
    mailControl.throwForBookings = true;
    const res = await checkout({ contact: { email: "hiccup@example.com" } });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, paid: true });
    expect(callLog).toContain("love");
  });
});
