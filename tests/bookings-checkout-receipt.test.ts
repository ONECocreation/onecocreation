import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { BookingConfig, Service } from "@/lib/booking-time";
import type { PaymentAdapter, ChargeRequest } from "@/lib/payments";

/**
 * TASK-223 (0018.06.23 a₿) — Love's call #7: the Square receipt had "no
 * product description, unreadable order number". This pins
 * src/app/api/bookings/checkout/route.ts's createCharge call passing the
 * service's title + the slot's own civil time as description, and the
 * house's short order.id.slice(0, 8) convention as referenceId — by
 * fixturing the PaymentAdapter (per the brief), same shape as
 * tests/store-checkout-receipt.test.ts. The slot math, claim, and booking
 * record are all real (booking-api.test.ts's own fixture service/config/
 * clock), so the route's actual civil-time formatting is exercised, not a
 * pre-baked string.
 */

const NOW = Date.parse("2026-06-15T12:00:00Z"); // Monday
// 11:11 in Denver (the artist's own tz) — a sacred minute on the legacy board
const DENVER_SLOT = "2026-06-16T17:11:00.000Z";

const service: Service = {
  id: "discovery-call",
  schemaVersion: 1,
  title: "Discovery Call",
  blurb: "",
  durationMin: 60,
  bufferMin: 15,
  price: { fiat: { amount: 5000, currency: "USD" } },
  pricingMode: "fixed",
  minLeadHours: 0,
  maxAdvanceDays: 14,
  meetingRail: { kind: "static", url: "https://meet.example.com/love" },
  artistTz: "America/Denver",
  status: "live",
};

const config: BookingConfig = {
  schemaVersion: 1,
  services: [service],
  rules: ([0, 1, 2, 3, 4, 5, 6] as const).map((weekday, i) => ({
    id: `r${i}`,
    weekday,
    start: "08:00",
    end: "17:00",
    serviceIds: [],
  })),
  overrides: [],
};

const createChargeCalls: ChargeRequest[] = [];

const fakeAdapter: PaymentAdapter = {
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
    liveAdapter: vi.fn(() => fakeAdapter),
  };
});

let tmpDir: string;
let prevCwd: string;
const checkoutPOST = async () => (await import("@/app/api/bookings/checkout/route")).POST;

beforeAll(() => {
  delete process.env.VERCEL;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.REDIS_URL;
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

beforeEach(async () => {
  prevCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-task223-book-"));
  process.chdir(tmpDir);
  await fs.mkdir(path.join(tmpDir, "data"), { recursive: true });
  await fs.writeFile(path.join(tmpDir, "data", "booking-config.json"), JSON.stringify(config));
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(async () => {
  vi.useRealTimers();
  process.chdir(prevCwd);
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function checkout(body: Record<string, unknown>) {
  return checkoutPOST().then((POST) =>
    POST(
      new Request("http://localhost/api/bookings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
}

describe("POST /api/bookings/checkout — the Square receipt names what was bought (T-223)", () => {
  it("the service title + the slot's own civil time become the receipt description; referenceId is the house's short order id", async () => {
    const res = await checkout({
      serviceId: "discovery-call",
      startUtc: DENVER_SLOT,
      customer: { name: "Guest", email: "guest@example.com" },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    const call = createChargeCalls.at(-1)!;
    // civil time in America/Denver for 2026-06-16T17:11:00Z is 11:11 AM
    expect(call.description).toBe("Discovery Call — Jun 16, 11:11 AM");
    expect(call.referenceId).toBe(data.orderId.slice(0, 8));
  });
});
