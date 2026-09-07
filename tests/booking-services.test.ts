import { describe, it, expect, afterEach, vi } from "vitest";
import type { BookingConfig, Service } from "@/lib/booking";

/**
 * TASK-128 (0018.06.16 a₿, block 965,942): Love no longer offers haircuts.
 * The `silent-haircut-*` services are RETIRED, never deleted — existing
 * bookings and receipts reference the ids. These pins:
 *
 *   1. retired services are ABSENT from the public service list — in both
 *      modes (live-only and includeHidden), even if a stored entry is still
 *      marked "live";
 *   2. the id still RESOLVES (getService), flagged `retired: true` — so an
 *      old booking's receipt keeps rendering;
 *   3. the receipt route itself serves an old booking on a retired id.
 *
 * The config is served through a stubbed KV fetch (the vault-first read
 * path); the receipt route's store/vault neighbours are mocked — the spec
 * pins the RETIREMENT behaviour, not redis.
 */

const svc = (id: string, status: "live" | "hidden"): Service => ({
  id,
  schemaVersion: 1,
  title: id,
  blurb: "",
  durationMin: 60,
  bufferMin: 15,
  price: { sats: 21000 },
  pricingMode: "fixed",
  minLeadHours: 24,
  maxAdvanceDays: 60,
  meetingRail: { kind: "inPerson" },
  artistTz: "America/Denver",
  status,
});

const CONFIG: BookingConfig = {
  schemaVersion: 1,
  services: [
    svc("discovery-call", "live"),
    svc("soul-conversation", "live"),
    // worst case on purpose: still "live" in storage — retirement must win
    svc("silent-haircut-women", "live"),
    svc("silent-haircut-men", "hidden"),
  ],
  rules: [],
  overrides: [],
};

/* an old booking from when the cuts were still offered */
const oldBooking = vi.hoisted(() => ({
  id: "0123456789abcdef01234567",
  schemaVersion: 1 as const,
  serviceId: "silent-haircut-women",
  serviceTitle: "Silent Haircut (Women ♀)",
  startUtc: "2025-06-16T17:11:00.000Z",
  endUtc: "2025-06-16T18:11:00.000Z",
  artistTz: "America/Denver",
  state: "confirmed" as const,
  orderId: "order-old-cut",
  customer: { email: "guest@example.com" },
  meetingUrl: "https://meet.example.invalid/room",
  createdAtMs: Date.parse("2025-06-01T00:00:00Z"),
  confirmedAtMs: Date.parse("2025-06-01T00:10:00Z"),
}));

vi.mock("@/lib/booking-orders", () => ({
  getBooking: async (id: string) => (id === oldBooking.id ? oldBooking : null),
}));

vi.mock("@/lib/store", () => ({
  getOrder: async (id: string) =>
    id === oldBooking.orderId
      ? {
          id,
          state: "settled",
          chargeIds: ["charge-old"],
          priceSnapshot: { amount: 22200, currency: "USD" },
        }
      : null,
  recordChargeEvent: async () => null,
}));

vi.mock("@/lib/payments", () => ({ liveAdapter: () => null }));
vi.mock("@/lib/booking-fulfil", () => ({ settleBookingFromOrder: async () => null }));

function stubConfigKv() {
  vi.stubEnv("KV_REST_API_URL", "https://kv.example.invalid");
  vi.stubEnv("KV_REST_API_TOKEN", "test-token");
  vi.stubGlobal("fetch", (async (_url: unknown, init?: { body?: unknown }) => {
    const cmd = JSON.parse(String(init?.body)) as string[];
    if (cmd[0] === "GET" && cmd[1] === "booking:config") {
      return { ok: true, json: async () => ({ result: JSON.stringify(CONFIG) }) };
    }
    return { ok: true, json: async () => ({ result: null }) };
  }) as typeof fetch);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("retired services (TASK-128)", () => {
  it("are absent from the public service list — even if still 'live' in storage", async () => {
    stubConfigKv();
    const { listServices } = await import("@/lib/booking");
    const ids = (await listServices()).map((s) => s.id);
    expect(ids).toEqual(["discovery-call", "soul-conversation"]);
    expect(ids).not.toContain("silent-haircut-women");
    expect(ids).not.toContain("silent-haircut-men");
  });

  it("stay out of the includeHidden listing too — no picker can surface them", async () => {
    stubConfigKv();
    const { listServices } = await import("@/lib/booking");
    const ids = (await listServices({ includeHidden: true })).map((s) => s.id);
    expect(ids).toEqual(["discovery-call", "soul-conversation"]);
  });

  it("still resolve by id, flagged retired — old receipts reference the ids", async () => {
    stubConfigKv();
    const { getService, isRetiredService } = await import("@/lib/booking");
    const retired = await getService("silent-haircut-women");
    expect(retired).not.toBeNull();
    expect(retired?.retired).toBe(true);
    const current = await getService("discovery-call");
    expect(current?.retired).toBeUndefined();
    expect(isRetiredService("silent-haircut-men")).toBe(true);
    expect(isRetiredService("soul-conversation")).toBe(false);
  });

  it("an old booking on a retired id still renders its receipt", async () => {
    const { GET } = await import("@/app/api/bookings/[id]/route");
    const res = await GET(new Request(`http://test/api/bookings/${oldBooking.id}`), {
      params: Promise.resolve({ id: oldBooking.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.booking.serviceId).toBe("silent-haircut-women");
    expect(body.booking.serviceTitle).toBe("Silent Haircut (Women ♀)");
    expect(body.booking.state).toBe("confirmed");
    // the link is earned — a confirmed old booking still shows it
    expect(body.booking.meetingUrl).toBe(oldBooking.meetingUrl);
    expect(body.payment).toEqual({ state: "settled", amount: 22200, currency: "USD" });
  });
});
