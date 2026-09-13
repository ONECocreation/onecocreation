import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { isolateCwd } from "./helpers/isolate-cwd";
import type { PaymentAdapter, ChargeRequest } from "@/lib/payments";

/**
 * TASK-223 (0018.06.23 a₿) — Love's call #7: the Square receipt had "no
 * product description, unreadable order number". This pins
 * src/app/api/store/checkout/route.ts's TWO createCharge call sites (the
 * new single-item order, and the retry-on-an-expired-order path) each
 * passing a real description + referenceId — per the brief's own
 * instruction, by fixturing the PaymentAdapter itself rather than standing
 * up a second full Square/BTCPay network fixture (tests/cart-checkout.test.ts
 * already owns that harness for the basket). The dev file driver (store.ts,
 * order-store) is real — only the payment rail is a fixture.
 */

const iso = isolateCwd("oc-task223-store-");

const createChargeCalls: ChargeRequest[] = [];

const fakeSquare: PaymentAdapter = {
  id: "square",
  rails: ["card"],
  configured: () => true,
  createCharge: vi.fn(async (req: ChargeRequest) => {
    createChargeCalls.push(req);
    return { chargeId: `sqord_${createChargeCalls.length}`, payUrl: "https://sandbox.square.link/u/fixture" };
  }),
  status: async () => "charge_created",
  verifyWebhook: async () => null,
};

vi.mock("@/lib/payments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments")>();
  return {
    ...actual,
    ensureSquareVault: vi.fn(async () => {}),
    liveAdapter: vi.fn(() => fakeSquare),
    getAdapter: vi.fn((id: string) => (id === "square" ? fakeSquare : actual.getAdapter(id))),
  };
});

let upsertItem: (typeof import("@/lib/store"))["upsertItem"];
let createOrder: (typeof import("@/lib/store"))["createOrder"];
let newOrderId: (typeof import("@/lib/store"))["newOrderId"];
let checkoutPOST: (typeof import("@/app/api/store/checkout/route"))["POST"];

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  delete process.env.VERCEL;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  ({ upsertItem, createOrder, newOrderId } = await import("@/lib/store"));
  ({ POST: checkoutPOST } = await import("@/app/api/store/checkout/route"));

  await upsertItem({
    id: "meditation-single",
    schemaVersion: 2,
    title: "Sunrise Meditation",
    blurb: "a single ware",
    images: [],
    media: { images: [] },
    kind: "digital",
    price: { fiat: { amount: 2200, currency: "USD" } },
    fulfillment: "digital",
    status: "live",
  } as never);
});

afterAll(async () => {
  await iso.cleanup();
});

function post(body: Record<string, unknown>) {
  return checkoutPOST(
    new Request("http://localhost/api/store/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/store/checkout — the Square receipt names what was bought (T-223)", () => {
  it("a new single-item order passes the item's title as description and the house's short id as referenceId", async () => {
    const res = await post({ itemId: "meditation-single", contact: { email: "guest@example.com" } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    const call = createChargeCalls.at(-1)!;
    expect(call.description).toBe("Sunrise Meditation");
    expect(call.referenceId).toBe(data.orderId.slice(0, 8));
  });

  it("retrying an expired order's charge passes the SAME description/referenceId convention, derived from the stored order", async () => {
    const orderId = newOrderId();
    await createOrder({
      id: orderId,
      schemaVersion: 2,
      state: "expired",
      lineItems: [{ itemId: "meditation-single", title: "Sunrise Meditation", qty: 1 }],
      priceSnapshot: { amount: 2200, currency: "USD", at: new Date().toISOString() },
      adapterId: "square",
      chargeIds: [],
      createdAtMs: Date.now(),
      events: [],
    } as never);

    const res = await post({ orderId });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    const call = createChargeCalls.at(-1)!;
    expect(call.description).toBe("Sunrise Meditation");
    expect(call.referenceId).toBe(orderId.slice(0, 8));
  });
});

/** TASK-224 (0018.06.23 a₿) — the same two call sites now also carry an
 *  itemised `lines` candidate (Square's own per-row receipt); this file's
 *  fixture already isolates exactly these two call sites, so the itemised
 *  candidate is pinned here alongside T-223's description/referenceId. */
describe("POST /api/store/checkout — the Square receipt itemises the bill (T-224)", () => {
  it("a new order with rail: 'card' and qty 3 passes ONE line with the item's own unit price and the real qty", async () => {
    const res = await post({ itemId: "meditation-single", qty: 3, rail: "card", contact: { email: "guest@example.com" } });
    expect(res.status).toBe(200);
    const call = createChargeCalls.at(-1)!;
    expect(call.amount).toBe(6600); // 2200 × 3 — the money path, unchanged
    expect(call.lines).toEqual([{ name: "Sunrise Meditation", quantity: 3, unitAmount: 2200 }]);
  });

  it("retrying an expired order derives its one line from the order's own stored qty and total — never a fresh item lookup", async () => {
    const orderId = newOrderId();
    await createOrder({
      id: orderId,
      schemaVersion: 2,
      state: "expired",
      lineItems: [{ itemId: "meditation-single", title: "Sunrise Meditation", qty: 2 }],
      priceSnapshot: { amount: 4400, currency: "USD", at: new Date().toISOString() },
      adapterId: "square",
      chargeIds: [],
      createdAtMs: Date.now(),
      events: [],
    } as never);

    const res = await post({ orderId });
    expect(res.status).toBe(200);
    const call = createChargeCalls.at(-1)!;
    expect(call.amount).toBe(4400); // the money path, unchanged
    expect(call.lines).toEqual([{ name: "Sunrise Meditation", quantity: 2, unitAmount: 2200 }]);
  });

  it("retrying an order whose stored total doesn't divide evenly by its qty carries NO lines — the fallback description rides alone", async () => {
    const orderId = newOrderId();
    await createOrder({
      id: orderId,
      schemaVersion: 2,
      state: "expired",
      // a discount left an odd total (2199) that 2 doesn't divide evenly —
      // this must never guess a per-unit price the order didn't agree to
      lineItems: [{ itemId: "meditation-single", title: "Sunrise Meditation", qty: 2 }],
      priceSnapshot: { amount: 2199, currency: "USD", at: new Date().toISOString() },
      adapterId: "square",
      chargeIds: [],
      createdAtMs: Date.now(),
      events: [],
    } as never);

    const res = await post({ orderId });
    expect(res.status).toBe(200);
    const call = createChargeCalls.at(-1)!;
    expect(call.amount).toBe(2199); // the money path, unchanged
    expect(call.lines).toBeUndefined();
    expect(call.description).toBe("Sunrise Meditation");
  });
});
