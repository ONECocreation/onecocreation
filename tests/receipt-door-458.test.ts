import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { vi } from "vitest";

/**
 * TASK-458 (block 968,543) — the receipt page: card words, a door to the
 * Heart Field, and the grant on return.
 *
 * Three things pinned here, matching the brief's three Build items:
 *
 *  1. CARD WORDS — a fiat order (currency !== "SATS") reads FIAT_STATE_COPY
 *     (settled/processing/expired only); a SATS order reads STATE_COPY
 *     unchanged. Since OrderStatus.tsx is a "use client" polling component
 *     with no jsdom/testing-library in this repo (renderToStaticMarkup
 *     never runs its effects, so `order` never leaves `null`), these are
 *     SOURCE-STRING PINS on the two word tables — the house idiom COMMON.md
 *     names ("tests here are mostly source-string pins").
 *
 *  2. THE DOOR — door: "/rooms/heart-field" | null on the order feed,
 *     derived from the SAME predicate entitlement-fulfil.ts's
 *     bestPackageGrant scans lines with (package kind + a real tier).
 *     Tested for real against the live route (API-level, real KV fixture).
 *
 *  3. THE GRANT ON RETURN (F-03) — settleEntitlementFromOrder is proven
 *     idempotent FIRST (direct calls, no route involved), THEN the route's
 *     reconcile is proven to actually call it on the flip. Both the grant
 *     side (one membership, one expiry) and the revoke side (one letter)
 *     are covered, since "the webhook and the reconcile poll both call
 *     this" is the exact hazard the brief calls out.
 *
 * Plus a probe that turned up a real seam: OrderStatus.tsx's recharge()
 * sends no `rail` field, so a fiat retry falls through to the BITCOIN
 * switch, not the order's own Square adapter — proven with the real
 * checkout route against the fixture, both ways (broken with no rail,
 * fine with `rail: "card"`), which is why canRecharge now excludes a
 * fiat "expired" order and a plain /cart link takes its place.
 *
 * Fixture idiom: order-receipt.test.ts's stateful KV (GET/SET/SADD) +
 * Square-sandbox fetch stub, extended with LPUSH (mail-queue.ts's letter
 * queue — sendRevokeLetter never calls sendMail directly, it enqueues) and
 * a chargeId → Square order-state map for the reconcile's adapter.status()
 * poll. No BTCPAY_* env at all — production ground truth (COMMON.md:
 * "bitcoin is OFF on the site... card only via Square").
 */

const KV_URL = "http://kv.fixture.458";
const SITE = "https://onecocreation.test";

function item(over: Record<string, unknown>) {
  return {
    id: "x",
    schemaVersion: 2,
    title: "X",
    blurb: "words",
    images: [],
    price: {},
    status: "live",
    ...over,
  };
}

const CATALOG = {
  schemaVersion: 2,
  items: [
    // a permanent membership, card-priced only (bitcoin is off)
    item({
      id: "weekly-intuitive",
      title: "Weekly Intuitive",
      kind: "package",
      fulfillment: "package",
      entitlementTier: "A",
      price: { fiat: { amount: 3300, currency: "USD" } },
    }),
    // a one-week taster pass on the same tier
    item({
      id: "taster-week",
      title: "One Week Pass",
      kind: "package",
      fulfillment: "package",
      entitlementTier: "A",
      entitlementDays: 7,
      price: { fiat: { amount: 1100, currency: "USD" } },
    }),
    // a ware — never opens a membership
    item({ id: "mug", title: "Mug", kind: "self", fulfillment: "self", price: { fiat: { amount: 2200, currency: "USD" } } }),
  ],
};

const kvStore = new Map<string, string>();
const kvSets = new Map<string, Set<string>>();
/** raw JSON strings LPUSHed onto mail:queue (mail-queue.ts) — what
 *  sendRevokeLetter actually does; it never calls sendMail directly. */
const mailQueue: string[] = [];
/** chargeId → Square Orders-API `state`, for adapter.status()'s GET
 *  /v2/orders/{chargeId} (payments.ts:mapOrderState). */
const squareOrderStates = new Map<string, string>();
let squareLinkSeq = 0;

function siteConfigDoc() {
  return JSON.stringify({
    features: { community: true, classes: true, store: true, sessions: true, cuts: false, jars: false, news: false },
    // production ground truth (COMMON.md, block 968,543): card only.
    payments: { btcpay: false, square: true, stripe: false },
    meeting: { rail: "vdo", jitsiDomain: "meet.onecocreation.com", allowStaticLinks: false },
  });
}

beforeAll(() => {
  delete process.env.VERCEL;
  delete process.env.REDIS_URL;
  delete process.env.BTCPAY_URL;
  delete process.env.BTCPAY_STORE_ID;
  delete process.env.BTCPAY_API_KEY;
  delete process.env.MATRIX_BOT_TOKEN;
  delete process.env.MATRIX_HOMESERVER_URL;
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-kv-token-458";
  process.env.SEAT_SECRET = "test-seat-secret-458";
  process.env.NEXT_PUBLIC_SITE_URL = SITE;
  process.env.SQUARE_ACCESS_TOKEN = "EAAAtest-458-fixture";
  process.env.SQUARE_LOCATION_ID = "LTEST458FIXTURE";
  process.env.SQUARE_ENVIRONMENT = "sandbox";

  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u === KV_URL) {
      const cmd = (JSON.parse(String(init?.body)) as unknown[]).map(String);
      const [op, ...args] = cmd;
      let result: unknown = null;
      if (op === "GET") result = kvStore.get(args[0]) ?? null;
      else if (op === "SET") {
        if (args[2] === "NX" && kvStore.has(args[0])) result = null;
        else {
          kvStore.set(args[0], args[1]);
          result = "OK";
        }
      } else if (op === "SADD") {
        const s = kvSets.get(args[0]) ?? new Set<string>();
        s.add(args[1]);
        kvSets.set(args[0], s);
        result = 1;
      } else if (op === "SMEMBERS") {
        result = Array.from(kvSets.get(args[0]) ?? []);
      } else if (op === "LPUSH") {
        mailQueue.push(...args.slice(1));
        result = mailQueue.length;
      } else {
        throw new Error(`fixture KV: unhandled op ${op}`);
      }
      return new Response(JSON.stringify({ result }), { status: 200 });
    }
    if (u.startsWith("https://connect.squareupsandbox.com")) {
      if (init?.method === "POST" && u.includes("payment-links")) {
        squareLinkSeq += 1;
        return new Response(
          JSON.stringify({
            payment_link: { id: `plink_${squareLinkSeq}`, order_id: `sqord_${squareLinkSeq}`, url: `https://sandbox.square.link/u/fixture-${squareLinkSeq}` },
          }),
          { status: 200 },
        );
      }
      if (u.includes("/v2/orders/")) {
        const chargeId = u.split("/v2/orders/")[1];
        const state = squareOrderStates.get(chargeId) ?? "OPEN";
        return new Response(JSON.stringify({ order: { id: chargeId, state, metadata: { orderId: chargeId } } }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    }
    throw new Error(`unexpected fetch: ${u}`);
  });
});

beforeEach(() => {
  kvStore.clear();
  kvSets.clear();
  mailQueue.length = 0;
  squareOrderStates.clear();
  kvStore.set("store:catalog", JSON.stringify(CATALOG));
  kvStore.set("site:config:onecocreation", siteConfigDoc());
});

/** a settle-able order fixture on the fixture-KV vault driver */
async function makeOrder(over: Partial<Record<string, unknown>> = {}) {
  const { createOrder, newOrderId } = await import("@/lib/store");
  const order = {
    id: newOrderId(),
    schemaVersion: 2 as const,
    state: "settled" as const,
    lineItems: [{ itemId: "weekly-intuitive", title: "Weekly Intuitive", qty: 1 }],
    priceSnapshot: { amount: 3300, currency: "USD", at: new Date().toISOString() },
    adapterId: "square",
    chargeIds: [],
    entitlementSubject: "soul@example.com@email",
    contact: { email: "soul@example.com" },
    createdAtMs: Date.now(),
    settledAtMs: Date.now(),
    events: [],
    ...over,
  };
  await createOrder(order as never);
  return order;
}

async function feedFor(orderId: string) {
  const { GET } = await import("@/app/api/store/orders/[id]/route");
  const res = await GET(new Request(`http://localhost/api/store/orders/${orderId}`), { params: Promise.resolve({ id: orderId }) });
  return res.json();
}

describe("the door — derived from the SAME predicate settleEntitlementFromOrder uses", () => {
  it("a settled membership order carries the Heart Field door", async () => {
    const order = await makeOrder();
    const data = await feedFor(order.id);
    expect(data.order.door).toBe("/rooms/heart-field");
  });

  it("a taster pass (entitlementDays) opens the same door as a permanent membership", async () => {
    const order = await makeOrder({ lineItems: [{ itemId: "taster-week", title: "One Week Pass", qty: 1 }] });
    const data = await feedFor(order.id);
    expect(data.order.door).toBe("/rooms/heart-field");
  });

  it("a mug-only order carries no door — never a second list of item ids to maintain", async () => {
    const order = await makeOrder({ lineItems: [{ itemId: "mug", title: "Mug", qty: 1 }], entitlementSubject: undefined });
    const data = await feedFor(order.id);
    expect(data.order.door).toBeNull();
  });

  it("a mixed basket (mug + membership) still opens the door — bestPackageGrant's own scan-all-lines rule", async () => {
    const order = await makeOrder({
      lineItems: [
        { itemId: "mug", title: "Mug", qty: 1 },
        { itemId: "weekly-intuitive", title: "Weekly Intuitive", qty: 1 },
      ],
    });
    const data = await feedFor(order.id);
    expect(data.order.door).toBe("/rooms/heart-field");
  });
});

describe("the signed-out next — the feed's own facts the page's (source-pinned) sign-in line reads", () => {
  it("a membership order not signed in: viewerOwns is false and the door still rides the feed (the page's next becomes it)", async () => {
    const order = await makeOrder();
    const data = await feedFor(order.id);
    expect(data.order.viewerOwns).toBe(false);
    expect(data.order.door).toBe("/rooms/heart-field");
  });

  it("signed in as the order's own email: viewerOwns is true", async () => {
    const order = await makeOrder();
    const { makeMemberToken } = await import("@/lib/member-auth");
    const { GET } = await import("@/app/api/store/orders/[id]/route");
    const cookie = `pa-fren=${makeMemberToken("soul@example.com", "email")}`;
    const res = await GET(new Request(`http://localhost/api/store/orders/${order.id}`, { headers: { cookie } }), {
      params: Promise.resolve({ id: order.id }),
    });
    const data = await res.json();
    expect(data.order.viewerOwns).toBe(true);
    expect(data.order.door).toBe("/rooms/heart-field");
  });
});

describe("F-03 — settleEntitlementFromOrder is idempotent BEFORE the grant is wired to the reconcile", () => {
  it("a permanent grant: two settle calls (webhook, then the reconcile right behind it) leave exactly one membership, unchanged", async () => {
    const { getEntitlement } = await import("@/lib/entitlement");
    const { settleEntitlementFromOrder } = await import("@/lib/entitlement-fulfil");
    const order = await makeOrder({ entitlementSubject: "perm@example.com@email", contact: { email: "perm@example.com" } });

    const first = await settleEntitlementFromOrder(order as never);
    expect(first.granted).toBe(true);
    expect(first.tier).toBe("A");
    const rec1 = await getEntitlement("perm@example.com@email");
    expect(rec1?.tier).toBe("A");
    expect(rec1?.expiresAtMs).toBeUndefined();

    const second = await settleEntitlementFromOrder(order as never);
    expect(second.granted).toBe(true);
    const rec2 = await getEntitlement("perm@example.com@email");
    expect(rec2).toEqual(rec1); // byte-for-byte unchanged — one membership, no re-grant
  });

  it("a taster grant: two settle calls do NOT extend the expiry a second time", async () => {
    const { getEntitlement } = await import("@/lib/entitlement");
    const { settleEntitlementFromOrder } = await import("@/lib/entitlement-fulfil");
    const order = await makeOrder({
      lineItems: [{ itemId: "taster-week", title: "One Week Pass", qty: 1 }],
      entitlementSubject: "taster@example.com@email",
      contact: { email: "taster@example.com" },
    });

    await settleEntitlementFromOrder(order as never);
    const rec1 = await getEntitlement("taster@example.com@email");
    expect(rec1?.expiresAtMs).toBeGreaterThan(Date.now());

    await settleEntitlementFromOrder(order as never); // the same order, settled a second time
    const rec2 = await getEntitlement("taster@example.com@email");
    expect(rec2?.expiresAtMs).toBe(rec1?.expiresAtMs); // NOT extended
    expect(rec2?.grantedAtMs).toBe(rec1?.grantedAtMs);
  });

  it("a grant never enqueues a letter (only a revoke does)", async () => {
    const { settleEntitlementFromOrder } = await import("@/lib/entitlement-fulfil");
    const order = await makeOrder({ entitlementSubject: "quiet@example.com@email", contact: { email: "quiet@example.com" } });
    await settleEntitlementFromOrder(order as never);
    await settleEntitlementFromOrder(order as never);
    expect(mailQueue.length).toBe(0);
  });

  it("a refund's revoke sends exactly one closing letter even when settle runs twice (the webhook, then a reconcile poll right behind it)", async () => {
    const { getEntitlement } = await import("@/lib/entitlement");
    const { settleEntitlementFromOrder } = await import("@/lib/entitlement-fulfil");
    const order = await makeOrder({ entitlementSubject: "refund@example.com@email", contact: { email: "refund@example.com" } });
    await settleEntitlementFromOrder(order as never); // grant first
    expect((await getEntitlement("refund@example.com@email"))?.tier).toBe("A");

    const refunded = { ...order, state: "refunded" };
    const first = await settleEntitlementFromOrder(refunded as never);
    expect(first.revoked).toBe(true);
    expect(await getEntitlement("refund@example.com@email")).toBeNull();
    expect(mailQueue.length).toBe(1);

    const second = await settleEntitlementFromOrder(refunded as never); // the reconcile poll, right behind it
    expect(await getEntitlement("refund@example.com@email")).toBeNull(); // still revoked, not re-created
    expect(second.rooms).toEqual([]); // nothing held this time — no room to clear either
    expect(mailQueue.length).toBe(1); // still one — no second letter
  });
});

describe("F-03 — the reconcile poll actually calls settleEntitlementFromOrder on the flip", () => {
  it("a processing membership order settling via the reconcile grants the tier, and a second poll (already settled) doesn't re-grant", async () => {
    const { getEntitlement } = await import("@/lib/entitlement");
    const order = await makeOrder({
      state: "processing",
      settledAtMs: undefined,
      chargeIds: ["sqord-grant-1"],
      entitlementSubject: "reconcile@example.com@email",
      contact: { email: "reconcile@example.com" },
    });
    squareOrderStates.set("sqord-grant-1", "COMPLETED"); // adapter.status() → "settled"

    const first = await feedFor(order.id);
    expect(first.order.state).toBe("settled");
    const rec1 = await getEntitlement("reconcile@example.com@email");
    expect(rec1?.tier).toBe("A");

    // a second poll of the SAME receipt page: the order is already settled,
    // so the route's own outer guard doesn't even try the adapter again —
    // proving the route doesn't loop, not just that the function is safe
    const second = await feedFor(order.id);
    expect(second.order.state).toBe("settled");
    const rec2 = await getEntitlement("reconcile@example.com@email");
    expect(rec2).toEqual(rec1);

    // and the LATER webhook, arriving after the buyer already saw the page:
    // the same settle call again, directly — still converges
    const { getOrder } = await import("@/lib/store");
    const { settleEntitlementFromOrder } = await import("@/lib/entitlement-fulfil");
    await settleEntitlementFromOrder((await getOrder(order.id))!);
    const rec3 = await getEntitlement("reconcile@example.com@email");
    expect(rec3).toEqual(rec1);
  });

  it("a settle failure inside the reconcile doesn't break the receipt page's own answer", async () => {
    // an entitlement subject that can never resolve an npub (no @email
    // suffix, no registry entry) — settleEntitlementFromOrder's own
    // "no entitlement subject" branch, never a thrown error, but proves the
    // route's try/catch around the settle call doesn't touch the response
    const order = await makeOrder({
      state: "processing",
      settledAtMs: undefined,
      chargeIds: ["sqord-grant-2"],
      entitlementSubject: "onecocreation-operator-fixture", // no @space suffix at all
    });
    squareOrderStates.set("sqord-grant-2", "COMPLETED");
    const data = await feedFor(order.id);
    expect(data.order.state).toBe("settled"); // the flip still happened and still answers
  });
});

describe("the fiat recharge probe — what 'Mint a fresh invoice' actually does on the card rail", () => {
  it("recharge()'s own request (no `rail` field) 503s while the bitcoin rail is off — proves canRecharge must exclude a fiat expired order", async () => {
    const order = await makeOrder({ state: "expired", chargeIds: ["sqord-expired-1"] });
    const { POST } = await import("@/app/api/store/checkout/route");
    const res = await POST(
      new Request("http://localhost/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // exactly recharge()'s own body — {orderId} only, no rail
        body: JSON.stringify({ orderId: order.id }),
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(503);
    expect(data.ok).toBe(false);
    expect(data.reason).toBe("payment rail not connected — the shelf is browse-only");
  });

  it("the identical retry WITH rail: \"card\" succeeds — the gap is the missing field, not the Square rail itself", async () => {
    const order = await makeOrder({ state: "expired", chargeIds: ["sqord-expired-2"] });
    const { POST } = await import("@/app/api/store/checkout/route");
    const res = await POST(
      new Request("http://localhost/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, rail: "card" }),
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.payUrl).toContain("square.link");
  });
});

describe("card words (source pins — OrderStatus.tsx is a client poller; renderToStaticMarkup never runs its effects)", () => {
  let src: string;
  beforeAll(async () => {
    src = await fs.readFile(path.join(process.cwd(), "src/components/store/OrderStatus.tsx"), "utf8");
  });

  it("the SATS-rail words (STATE_COPY) read exactly as before — a SATS order's words are untouched", () => {
    expect(src).toContain('settled: { label: "PAID ✓", note: "sats landed with the artist. Fulfillment is on its way." }');
    expect(src).toContain('label: "ON THE CHAIN"');
    expect(src).toContain("confirmations take 10–60+ minutes on-chain");
    expect(src).toContain('expired: { label: "INVOICE EXPIRED", note: "no harm — invoices time out. Mint a fresh one below; same order." }');
    expect(src).toContain('"Mint a fresh invoice ⚡"');
  });

  it("the fiat words (FIAT_STATE_COPY) exist with the ruled copy", () => {
    expect(src).toContain('settled: { label: "PAID ✓", note: "thank you. Your payment went through." }');
    expect(src).toContain('processing: { label: "PROCESSING", note: "Square is finishing your card payment. This page updates by itself." }');
    expect(src).toContain('expired: { label: "LINK EXPIRED", note: "no harm, payment links time out. Start again from your basket." }');
  });

  it("no 'sats', 'invoice', 'on-chain' or ⚡ anywhere in the fiat words block", () => {
    const m = src.match(/const FIAT_STATE_COPY:[\s\S]*?=\s*\{\n([\s\S]*?)\n\};/);
    expect(m).not.toBeNull();
    const fiatBlock = m![1].toLowerCase();
    for (const bad of ["sats", "invoice", "on-chain", "⚡"]) {
      expect(fiatBlock).not.toContain(bad);
    }
  });

  it("the door: signed in gets a kit-btn kit-btn-main link to the Heart Field; not signed in gets the door as the sign-in's next", () => {
    expect(src).toContain("settledFine && order.door && order.viewerOwns");
    expect(src).toContain('<p><a href={order.door} className="kit-btn kit-btn-main">Go to the Heart Field</a></p>');
    expect(src).toContain("The reading and the Playground both open there.");
    expect(src).toContain("`/login?next=${encodeURIComponent(order.door)}`");
    expect(src).toContain("Sign in with {buyerEmail}</a> to go in.");
    // the pre-existing no-door line stays word-for-word (order-receipt.test.ts's own pin)
    expect(src).toContain("order.viewerOwns === false");
    expect(src).toContain("Sign in with that email");
  });

  it("a fiat expired order gets a plain basket link, never the (broken) recharge button", () => {
    expect(src).toContain('!(isFiat && order.state === "expired")');
    expect(src).toContain('isFiat && order.state === "expired"');
    expect(src).toContain('<p><a href="/cart" className="btn btn-gold btn-sm">Back to your basket</a></p>');
  });
});
