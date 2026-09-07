import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import type { BookingConfig, Service } from "@/lib/booking-time";

/**
 * TASK-125 (0018.06.16 a₿) — the API seam T-122 could not own: `viewerTz`
 * wired end to end. Request-level: the real route handlers are called with
 * real Requests against a throwaway file-vault cwd (the dev driver), a frozen
 * clock, and a stubbed BTCPay rail.
 *
 * Fixtures are mid-June 2026 like booking-time.test.ts: New York keeps EDT
 * (UTC-4) and Denver keeps MDT (UTC-6), so a visitor's 11:11 is 15:11Z and
 * the artist's 11:11 is 17:11Z — and those are DIFFERENT instants.
 */

const NOW = Date.parse("2026-06-15T12:00:00Z"); // Monday

/** 11:11 as the VISITOR in New York sees it (sacred there) vs 11:11 on the
 *  ARTIST's Denver clock (sacred there, 1:11 PM in New York — not sacred). */
const NY_SACRED = "2026-06-16T15:11:00.000Z";
const DENVER_SACRED = "2026-06-16T17:11:00.000Z";

const service: Service = {
  id: "discovery-call",
  schemaVersion: 1,
  title: "Discovery call",
  blurb: "",
  durationMin: 60,
  bufferMin: 15,
  price: { sats: 21000 },
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

let operatorCookie: string;
let tmpDir: string;
let prevCwd: string;

const slotsGET = async () => (await import("@/app/api/bookings/slots/route")).GET;
const checkoutPOST = async () => (await import("@/app/api/bookings/checkout/route")).POST;
const calendarGET = async () => (await import("@/app/api/admin/calendar/route")).GET;

beforeAll(async () => {
  // the dev file drivers, never a vault: no KV, no redis, no blob
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.REDIS_URL;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.VERCEL;
  // a payment rail that is "configured"; its one network call is stubbed below
  process.env.BTCPAY_URL = "https://btcpay.test";
  process.env.BTCPAY_STORE_ID = "store-test";
  process.env.BTCPAY_API_KEY = "key-test";
  // an operator seat for the admin feed (same mint as recon-img.test.ts)
  const pk = getPublicKey(generateSecretKey());
  process.env.SEAT_SECRET = "test-seat-secret";
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  operatorCookie = `fe-operator=${makeOperatorToken(pk)}`;
  // the rail's only fetch — the invoice mint
  vi.stubGlobal("fetch", async (url: unknown) => {
    if (String(url).includes("/invoices")) {
      return new Response(JSON.stringify({ id: "inv_test", checkoutLink: "https://pay.test/inv_test" }), { status: 200 });
    }
    throw new Error(`unexpected fetch: ${String(url)}`);
  });
});

beforeEach(async () => {
  prevCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-bapi-"));
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

const checkout = (body: Record<string, unknown>) =>
  checkoutPOST().then((POST) =>
    POST(new Request("http://localhost/api/bookings/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })),
  );

/** startUtc instants whose wall-clock DATE in `tz` is `date` (en-CA = YYYY-MM-DD). */
function onDate(slots: { startUtc: string }[], date: string, tz: string): string[] {
  return slots
    .filter((s) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
        .format(new Date(s.startUtc)) === date)
    .map((s) => s.startUtc);
}

describe("GET /api/bookings/slots — the visitor's board (TASK-125)", () => {
  it("a New York visitor's board is the sacred minutes in NEW YORK", async () => {
    const GET = await slotsGET();
    const res = await GET(new Request(
      "http://localhost/api/bookings/slots?service=discovery-call&viewerTz=America/New_York",
    ));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    const tuesday = onDate(data.slots, "2026-06-16", "America/New_York");
    expect(tuesday).toEqual([
      "2026-06-16T14:10:00.000Z", // 10:10 in New York
      "2026-06-16T15:11:00.000Z", // 11:11
      "2026-06-16T16:12:00.000Z", // 12:12
      "2026-06-16T18:22:00.000Z", // 2:22
      "2026-06-16T19:33:00.000Z", // 3:33
    ]);
    expect(data.service.artistTz).toBe("America/Denver");
  });

  it("missing or invalid tz = the legacy artist-clock board, unchanged", async () => {
    const GET = await slotsGET();
    const legacy = [
      "2026-06-16T16:10:00.000Z", // 10:10 in Denver
      "2026-06-16T17:11:00.000Z", // 11:11
      "2026-06-16T18:12:00.000Z", // 12:12
      "2026-06-16T20:22:00.000Z", // 2:22
      "2026-06-16T21:33:00.000Z", // 3:33
    ];
    for (const url of [
      "http://localhost/api/bookings/slots?service=discovery-call",
      "http://localhost/api/bookings/slots?service=discovery-call&viewerTz=Mars/Olympus_Mons",
    ]) {
      const res = await GET(new Request(url));
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(onDate(data.slots, "2026-06-16", "America/Denver")).toEqual(legacy);
    }
  });
});

describe("POST /api/bookings/checkout — the gate follows the visitor's frame (TASK-125)", () => {
  it("a Denver-sacred instant that is NOT NY-sacred is rejected when viewerTz=NY", async () => {
    const res = await checkout({
      serviceId: "discovery-call",
      startUtc: DENVER_SACRED, // 11:11 on Love's clock = 1:11 PM in New York
      viewerTz: "America/New_York",
      rail: "lightning",
      customer: { name: "Test Visitor", email: "visitor@example.com" },
    });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.reason).toBe("that time isn't open");
    // …and no hold was silently taken
    const { takenSlots } = await import("@/lib/booking-orders");
    expect((await takenSlots()).size).toBe(0);
  });

  it("the same instant WITHOUT viewerTz rides the legacy path and books", async () => {
    const res = await checkout({
      serviceId: "discovery-call",
      startUtc: DENVER_SACRED, // sacred on the artist's clock — the old behaviour
      rail: "lightning",
      customer: { name: "Legacy Visitor", email: "legacy@example.com" },
    });
    const data = await res.json();
    expect(data.ok).toBe(true);
    const { getBooking } = await import("@/lib/booking-orders");
    const rec = await getBooking(data.bookingId);
    expect(rec?.startUtc).toBe(DENVER_SACRED);
    expect(rec?.visitorTz).toBeUndefined(); // legacy bookings carry no visitor frame
  });

  it("an NY-sacred instant books with viewerTz — and visitorTz persists into the admin feed", async () => {
    const res = await checkout({
      serviceId: "discovery-call",
      startUtc: NY_SACRED, // 11:11 in New York (09:11 on Love's clock)
      viewerTz: "America/New_York",
      rail: "lightning",
      customer: { name: "New York Visitor", email: "ny@example.com" },
    });
    const data = await res.json();
    expect(data.ok).toBe(true);

    // persisted on the booking record
    const { getBooking } = await import("@/lib/booking-orders");
    const rec = await getBooking(data.bookingId);
    expect(rec?.visitorTz).toBe("America/New_York");
    expect(rec?.artistTz).toBe("America/Denver");

    // surfaced on Love's Desk's week feed — both clocks, in words
    const GET = await calendarGET();
    const feedRes = await GET(new Request(
      "http://localhost/api/admin/calendar?start=2026-06-16&days=1",
      { headers: { cookie: operatorCookie } },
    ));
    expect(feedRes.status).toBe(200);
    const feed = await feedRes.json();
    expect(feed.ok).toBe(true);
    const chip = feed.bookings.find((b: { bookingId: string }) => b.bookingId === data.bookingId);
    expect(chip).toBeDefined();
    expect(chip.startUtc).toBe(NY_SACRED);
    expect(chip.artistTz).toBe("America/Denver");
    expect(chip.visitorTz).toBe("America/New_York");
  });
});
