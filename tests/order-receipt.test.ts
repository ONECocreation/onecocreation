import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-173 (0018.06.17 a₿ · block 966094) — the meditation receipt + the
 * unlock without a second ceremony. Pins, per spec:
 *
 *  1. The receipt letter goes out ONCE per settled order — a retried
 *     webhook settle and a direct re-call both no-op on the KV marker
 *     `order:<id>:receipt-sent`.
 *  2. The letter's words carry the title + the amount as paid + the SIGNED
 *     DOOR (/store/order/<id>?key=…) — and NEVER the file's blobPath
 *     (THE LEAK RULE).
 *  3. Token round-trip: a valid key unlocks (and answers the order's own
 *     email), a tampered key refuses, another order's key refuses, an
 *     expired key refuses.
 *  4. The Square return URL carries the same key.
 *  5. The receipt page's own feed unlocks on ?key= — the answer reads
 *     unlocked AND pours the email-session cookie (same cookie the sign-in
 *     code sets); a wrong key stays locked, no cookie.
 *  6. BuyPanel's words promise the receipt-page door (source pin, the
 *     house's read-the-source pattern).
 *
 * All network is a stubbed global fetch (a stateful fixture KV + the Square
 * API); nodemailer is mocked at the seam and captures sends. Every
 * credential below is a fixture string, never a real one.
 */

const KV_URL = "http://kv.fixture";
const SITE = "https://onecocreation.test";

/** the meditation on the shelf, with a paid deliverable (fixture) */
const CATALOG = {
  schemaVersion: 2,
  items: [
    {
      id: "thank-you-wakeup",
      schemaVersion: 2,
      title: "Thank You Wake Up Affirmations",
      blurb: "Wake Up Affirmations · 1 hr 11 min",
      images: ["/images/affirmation-thankyou.webp"],
      media: {
        images: ["/images/affirmation-thankyou.webp"],
        deliverable: { kind: "audio", label: "the affirmations audio", blobPath: "deliverables/fixture-meditation.mp3" },
      },
      kind: "digital",
      price: { sats: 11111, fiat: { amount: 1100, currency: "USD" } },
      fulfillment: "digital",
      status: "live",
    },
  ],
};

/** stateful fixture KV — SET remembers (NX honored), GET reads back */
const kvStore = new Map<string, string>();

/** what the mocked mail rail carried */
const sentMail: { to: string; subject: string; html: string }[] = [];
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: async (args: (typeof sentMail)[number]) => {
        sentMail.push(args);
      },
    }),
  },
}));

/** Square's payment-link create bodies, for the return-URL pin */
const squareCreateBodies: string[] = [];

beforeAll(async () => {
  delete process.env.VERCEL;
  delete process.env.REDIS_URL;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-kv-token";
  process.env.SEAT_SECRET = "test-seat-secret";
  process.env.NEXT_PUBLIC_SITE_URL = SITE;
  // the mail rail "configured" — nodemailer above is a mock, nothing connects
  process.env.SMTP_HOST = "smtp.fixture";
  process.env.SMTP_USER_BOOKINGS = "bookings@fixture";
  process.env.SMTP_PASS_BOOKINGS = "fixture-pass";
  // the card rail (fixture, sandbox shape — the T-147 pattern)
  delete process.env.SQUARE_ACCESS_TOKEN;
  delete process.env.SQUARE_LOCATION_ID;
  kvStore.set("oc:square:access-token", "EAAAtest-sandbox-fixture");
  kvStore.set("oc:square:location-id", "LTESTFIXTURE0");
  kvStore.set("oc:square:environment", "sandbox");
  kvStore.set("oc:square:webhook-signature-key", "whsec_fixture");
  kvStore.set("oc:square:webhook-url", "https://example.com/api/webhooks/square");
  kvStore.set("site:config:onecocreation", JSON.stringify({
    features: { community: true, classes: true, store: true, sessions: true, cuts: false, jars: true, news: true },
    payments: { btcpay: false, square: true, stripe: false },
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
        const [, k, v, flag] = cmd.map(String);
        if (flag === "NX" && kvStore.has(k)) result = null;
        else { kvStore.set(k, v); result = "OK"; }
      } else if (op === "SADD" || op === "INCR") result = 1;
      else if (op === "EXPIRE" || op === "DEL") result = 1;
      else if (op === "EVAL") {
        // the catalog lock's compare-and-delete (catalog-lock.ts)
        const [, , , k, token] = cmd.map(String);
        if (kvStore.get(k) === token) { kvStore.delete(k); result = 1; } else result = 0;
      }
      return new Response(JSON.stringify({ result }), { status: 200 });
    }
    if (u.startsWith("https://connect.squareupsandbox.com")) {
      if (init?.method === "POST" && u.includes("payment-links")) {
        squareCreateBodies.push(String(init.body));
        return new Response(
          JSON.stringify({
            payment_link: { id: "plink_fixture", order_id: "sqord_fixture", url: "https://sandbox.square.link/u/fixture" },
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    }
    throw new Error(`unexpected fetch: ${u}`);
  });
});

beforeEach(() => {
  kvStore.delete("store:catalog");
  kvStore.set("store:catalog", JSON.stringify(CATALOG));
  sentMail.length = 0;
  squareCreateBodies.length = 0;
});

/** a settle-able order fixture on the fixture-KV vault driver */
async function makeOrder(over: Partial<Record<string, unknown>> = {}) {
  const { createOrder, newOrderId } = await import("@/lib/store");
  const order = {
    id: newOrderId(),
    schemaVersion: 2 as const,
    state: "charge_created" as const,
    lineItems: [{ itemId: "thank-you-wakeup", title: "Thank You Wake Up Affirmations", qty: 1 }],
    priceSnapshot: { amount: 1100, currency: "USD", at: new Date().toISOString() },
    adapterId: "square",
    chargeIds: ["ch_fixture"],
    entitlementSubject: "soul@example.com@email",
    contact: { email: "soul@example.com" },
    createdAtMs: Date.now(),
    events: [],
    ...over,
  };
  await createOrder(order as never);
  return order;
}

describe("the receipt letter — once per order, words carrying the door", () => {
  it("a settle sends the receipt exactly once — a retried settle and a direct re-call both no-op", async () => {
    const { recordChargeEvent, getOrder } = await import("@/lib/store");
    const { sendOrderReceipt } = await import("@/lib/order-receipt");
    const order = await makeOrder();

    const flipped = await recordChargeEvent(order.id, { type: "settled", chargeId: "ch_fixture" });
    expect(flipped?.state).toBe("settled");
    expect(sentMail.length).toBe(1);
    expect(sentMail[0].to).toBe("soul@example.com");

    // the webhook's own retry: same event again — the state flip no-ops
    await recordChargeEvent(order.id, { type: "settled", chargeId: "ch_fixture" });
    expect(sentMail.length).toBe(1);

    // a fresh settle event on another charge id that arrives late: the state
    // is already settled, the flip no-ops before the letter is even asked
    await recordChargeEvent(order.id, { type: "settled", chargeId: "ch_late" });
    expect(sentMail.length).toBe(1);

    // the marker itself: a direct re-call on the settled order no-ops
    const settled = await getOrder(order.id);
    const again = await sendOrderReceipt(settled!);
    expect(again).toEqual({ sent: false, reason: "receipt already sent" });
    expect(sentMail.length).toBe(1);
  });

  it("the words carry the title, the whole-dollar amount as paid, and the signed door — never the file path", async () => {
    const { recordChargeEvent } = await import("@/lib/store");
    const order = await makeOrder();
    await recordChargeEvent(order.id, { type: "settled", chargeId: "ch_fixture" });
    expect(sentMail.length).toBe(1);
    const html = sentMail[0].html;
    expect(html).toContain("Thank You Wake Up Affirmations");
    expect(html).toContain("$11"); // 1100 minor units, whole dollars
    const door = new RegExp(`${SITE}/store/order/${order.id}\\?key=[0-9]+\\.[a-f0-9]{64}`);
    expect(html).toMatch(door);
    // THE LEAK RULE — the paid file's pointer never rides the letter
    expect(html).not.toContain("fixture-meditation.mp3");
    expect(sentMail[0].subject).toBe("Your order — received with love");
  });

  it("a booking order's settle sends no store receipt (its own letter rides mail-booking)", async () => {
    const { recordChargeEvent, getOrder } = await import("@/lib/store");
    const { sendOrderReceipt } = await import("@/lib/order-receipt");
    const order = await makeOrder({ bookingId: "bk_fixture" });
    await recordChargeEvent(order.id, { type: "settled", chargeId: "ch_fixture" });
    expect(sentMail.length).toBe(0);
    const res = await sendOrderReceipt((await getOrder(order.id))!);
    expect(res).toEqual({ sent: false, reason: "a booking order — its own letter rides" });
  });
});

describe("the key — HMAC over order id + buyer email, one order's session only", () => {
  it("round-trip: valid unlocks and answers the email; tampered, foreign and expired keys refuse", async () => {
    const { mintOrderKey, verifyOrderKey, mintOrderKeyFor, buyerEmailOf } = await import("@/lib/order-receipt");
    const order = await makeOrder();
    const other = await makeOrder();

    const key = mintOrderKey(order)!;
    expect(key).toMatch(/^\d+\.[a-f0-9]{64}$/);
    expect(buyerEmailOf(order)).toBe("soul@example.com");

    const ok = verifyOrderKey(order, key);
    expect(ok).toEqual({ ok: true, email: "soul@example.com" });

    // tampered signature refuses
    const tampered = `${key.slice(0, -1)}${key.endsWith("0") ? "1" : "0"}`;
    expect(verifyOrderKey(order, tampered)).toEqual({ ok: false });

    // another order's key refuses — the key only ever unlocks its OWN order
    const foreign = mintOrderKey(other)!;
    expect(verifyOrderKey(order, foreign)).toEqual({ ok: false });

    // an expired key refuses (minted 91 days ago against the 90-day life)
    const stale = mintOrderKeyFor(order.id, "soul@example.com", Date.now() - 91 * 24 * 3600 * 1000)!;
    expect(verifyOrderKey(order, stale)).toEqual({ ok: false });

    // garbage refuses
    expect(verifyOrderKey(order, "not-a-key")).toEqual({ ok: false });
  });
});

describe("the Square return URL carries the key", () => {
  it("checkout's payment link redirects to /store/order/<id>?key=<token>, and that token verifies", async () => {
    const { POST } = await import("@/app/api/store/checkout/route");
    const res = await POST(
      new Request("http://localhost/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: "thank-you-wakeup", rail: "card", contact: { email: "soul@example.com" } }),
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    expect(squareCreateBodies.length).toBe(1);
    const redirect = JSON.parse(squareCreateBodies[0]).checkout_options.redirect_url as string;
    expect(redirect).toMatch(new RegExp(`^http://localhost/store/order/${data.orderId}\\?key=\\d+\\.[a-f0-9]{64}$`));

    // the carried key IS the order's key — it verifies against the record
    const { getOrder } = await import("@/lib/store");
    const { verifyOrderKey } = await import("@/lib/order-receipt");
    const order = (await getOrder(data.orderId))!;
    const key = new URL(redirect).searchParams.get("key")!;
    expect(verifyOrderKey(order, key)).toEqual({ ok: true, email: "soul@example.com" });
  });
});

describe("the receipt page's feed — the key unlocks, a wrong key stays honest", () => {
  it("?key= pours the email-session cookie (the sign-in code's own cookie) and reads unlocked", async () => {
    const { recordChargeEvent, getOrder } = await import("@/lib/store");
    const { mintOrderKey } = await import("@/lib/order-receipt");
    const order = await makeOrder();
    await recordChargeEvent(order.id, { type: "settled", chargeId: "ch_fixture" });
    const settled = (await getOrder(order.id))!;
    const key = mintOrderKey(settled)!;

    const { GET } = await import("@/app/api/store/orders/[id]/route");
    const res = await GET(
      new Request(`http://localhost/api/store/orders/${order.id}?key=${key}`),
      { params: Promise.resolve({ id: order.id }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.order.deliverable.locked).toBe(false);

    // the SAME cookie the email-code door sets: pa-fren, a fren token for
    // (soul@example.com, email) — the existing session helper verifies it
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("pa-fren=");
    expect(cookie).toContain("HttpOnly");
    const { sessionsFromCookieHeader } = await import("@/lib/fren-auth");
    const sessions = sessionsFromCookieHeader(cookie);
    expect(sessions.map((s) => `${s.handle}@${s.space}`)).toContain("soul@example.com@email");
  });

  it("a wrong key changes nothing: locked, no cookie", async () => {
    const { recordChargeEvent } = await import("@/lib/store");
    const order = await makeOrder();
    await recordChargeEvent(order.id, { type: "settled", chargeId: "ch_fixture" });

    const { GET } = await import("@/app/api/store/orders/[id]/route");
    const res = await GET(
      new Request(`http://localhost/api/store/orders/${order.id}?key=9999999999999.${"0".repeat(64)}`),
      { params: Promise.resolve({ id: order.id }) },
    );
    const data = await res.json();
    expect(data.order.deliverable.locked).toBe(true);
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});

describe("BuyPanel's words (source pin)", () => {
  it("promises the receipt-page door and the receipt letter — never the old overstatement", async () => {
    const src = await fs.readFile(
      path.join(process.cwd(), "src/components/store/BuyPanel.tsx"),
      "utf8",
    );
    expect(src).toContain("your download opens on the receipt page, and a receipt letter brings the door too");
    expect(src).not.toContain("unlocks for your account");
  });
});
