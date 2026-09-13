import { describe, it, expect, beforeAll, vi } from "vitest";
import type { PaymentAdapter, ChargeRequest } from "@/lib/payments";

/**
 * TASK-223 (0018.06.23 a₿) — Love's call #7: the Square receipt had "no
 * product description, unreadable order number". This pins
 * src/app/api/tip/route.ts's createCharge call passing the jar's own
 * existing label word (the same words TipJar.tsx's JARS table and /a's
 * JAR_LABELS already show — grepped, not reinvented) as description, and
 * the tip's own minted tipId (already the one identifier this route
 * returns to the buyer) as referenceId — by fixturing the PaymentAdapter,
 * same shape as the store/bookings T-223 tests. Currency is always SATS
 * here, so this rail is BTCPay in practice (Square refuses sats) — the
 * fixture stands in for "whichever rail liveAdapter() resolves", which is
 * exactly what the route itself asks for.
 */

const createChargeCalls: ChargeRequest[] = [];

const fakeAdapter: PaymentAdapter = {
  id: "btcpay",
  rails: ["onchain", "lightning"],
  configured: () => true,
  createCharge: vi.fn(async (req: ChargeRequest) => {
    createChargeCalls.push(req);
    return { chargeId: `inv_${createChargeCalls.length}`, payUrl: "https://pay.fixture/i/fixture" };
  }),
  status: async () => "charge_created",
  verifyWebhook: async () => null,
};

vi.mock("@/lib/payments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments")>();
  return {
    ...actual,
    ensureSquareVault: vi.fn(async () => {}),
    liveAdapter: vi.fn(() => fakeAdapter),
  };
});

let tipPOST: (typeof import("@/app/api/tip/route"))["POST"];

beforeAll(async () => {
  delete process.env.VERCEL;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  ({ POST: tipPOST } = await import("@/app/api/tip/route"));
});

function tip(body: Record<string, unknown>) {
  return tipPOST(
    new Request("http://localhost/api/tip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/tip — the Square receipt names what was bought (T-223)", () => {
  it.each([
    ["love", "Tip Love"],
    ["onecocreation", "Tip One Cocreation"],
    ["payforward", "Gifts of Gratitude"],
  ])("jar %s carries description %j — reusing the house's own existing words", async (jar, label) => {
    const res = await tip({ target: jar, amountSats: 2100 });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    const call = createChargeCalls.at(-1)!;
    expect(call.description).toBe(label);
    // the tip's own minted id — already the one identifier returned to the
    // buyer (`tipId`) — reused as referenceId, never a second number
    expect(call.referenceId).toBe(data.tipId);
    expect(data.tipId).toMatch(new RegExp(`^tip-${jar}-`));
  });
});
