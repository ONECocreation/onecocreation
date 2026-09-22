import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { BookingConfig, Service } from "@/lib/booking-time";
import type { PaymentAdapter, ChargeRequest } from "@/lib/payments";

/**
 * TASK-395 (block 968,132) — the discovery call pays through the basket,
 * not "the bitcoin way". Three pin groups:
 *
 *   A. HANDLER REACHABILITY (the ask's "route test", sharpened by Astra
 *      finding 6). This repo's vitest runs `environment: "node"` — no
 *      jsdom (tests/kit-components.test.ts's own note: "no DOM keydown to
 *      dispatch under environment: node") — and no component-mount harness
 *      exists anywhere in tests/ (grepped at cut: nothing imports
 *      @testing-library/react or renders with a DOM). Per the brief, the
 *      fallback is branch-scoped source extraction, named here rather than
 *      silently substituted: SlotPicker.tsx's render conditions are pinned
 *      as exact literal text (never a paraphrase), and book()'s own
 *      function body is proven to be the ONLY place /api/bookings/checkout
 *      and payInModal are called — the "What is lintable?" grep, made
 *      executable instead of just narrated.
 *
 *   B. NOTE PERSISTENCE, end to end (Astra §4, this lane's lintable): a
 *      real POST /api/cart (the cart-add handler) carrying a unique
 *      composed note, then a real POST /api/cart/checkout with a MOCKED
 *      card adapter (@/lib/payments mocked the same way
 *      tests/bookings-checkout-receipt.test.ts does) — the resulting
 *      createBooking record's customer.note is read back with getBooking,
 *      not merely "the POST contains a field". Storage is a small fixture
 *      Upstash-REST KV (GET/SET/DEL/HGET/HSET/HSETNX/HDEL/SADD/SMEMBERS)
 *      shared by cart.ts, booking.ts's config, booking-orders.ts's claims
 *      + records and store.ts's orders — every one of those modules
 *      speaks the identical ["OP", ...args] REST protocol against
 *      KV_REST_API_URL/TOKEN (verified by reading each file at cut), so
 *      one fixture store serves the whole real chain.
 *
 *   C. THE RAIL-UI PINS: the rail picker and the on-chain wait notice
 *      carry !isDiscovery in their render condition (literal text), and
 *      the `rail` useState sits before the component's early returns and
 *      its own render — unconditional, hooks-law-safe (Build 2b).
 */

const SRC_PATH = path.join(process.cwd(), "src/components/booking/SlotPicker.tsx");
const src = readFileSync(SRC_PATH, "utf8");

describe("A — handler reachability (source-extraction fallback: no jsdom, no component-mount harness in tests/)", () => {
  it("the book() door's render condition is voucherId || rescheduleBookingId || !isDiscovery, and wraps onClick={book} only", () => {
    const marker = "{(voucherId || rescheduleBookingId || !isDiscovery) && (";
    const doorsStart = src.indexOf(marker);
    expect(doorsStart, "book() door's render condition not found").toBeGreaterThan(-1);
    const basketCommentIdx = src.indexOf("v1.5: the basket door", doorsStart);
    expect(basketCommentIdx, "the basket door's own comment not found after the book() door").toBeGreaterThan(doorsStart);
    const bookBlock = src.slice(doorsStart, basketCommentIdx);
    expect(bookBlock).toContain("onClick={book}");
    expect(bookBlock).not.toContain("onClick={addToBasket}");
    /* the truth table this literal expression pins: false ONLY when
       voucherId and rescheduleBookingId are both falsy AND isDiscovery is
       true — i.e. book() is unreachable from the ordinary discovery
       purchase, and reachable from gifts (voucherId), moves
       (rescheduleBookingId) and every non-discovery service (!isDiscovery,
       unchanged). */
  });

  it("the basket door stays reachable whenever it isn't a gift/move — its condition never gained !isDiscovery", () => {
    const idx = src.indexOf("onClick={addToBasket}");
    expect(idx, "the addToBasket button not found").toBeGreaterThan(-1);
    const before = src.slice(Math.max(0, idx - 200), idx);
    expect(before).toContain("!(voucherId || rescheduleBookingId) && (");
    expect(before).not.toContain("isDiscovery");
  });

  it("book()'s own function body is the ONLY place /api/bookings/checkout and payInModal are called (the Build's own grep, executable)", () => {
    const bookStart = src.indexOf("async function book()");
    const basketFnStart = src.indexOf("async function addToBasket()");
    expect(bookStart, "async function book() not found").toBeGreaterThan(-1);
    expect(basketFnStart, "async function addToBasket() not found").toBeGreaterThan(bookStart);
    const bookFn = src.slice(bookStart, basketFnStart);
    // everything outside book() EXCEPT the top-of-file import line — an
    // import naming payInModal is not a call to it
    const importLine = 'import { payInModal } from "@/lib/btcpay-modal";';
    expect(src, "the expected import line moved or changed").toContain(importLine);
    const outsideBook = (src.slice(0, bookStart) + src.slice(basketFnStart)).replace(importLine, "");
    expect(bookFn).toContain("/api/bookings/checkout");
    expect(bookFn).toContain("payInModal(");
    expect(outsideBook).not.toContain("/api/bookings/checkout");
    expect(outsideBook).not.toContain("payInModal(");
  });

  it("the name/email inputs step aside ONLY for the ordinary discovery purchase — gifts (voucherId) keep them, same as every non-discovery service", () => {
    const cond = "!rescheduleBookingId && (!isDiscovery || voucherId)";
    const occurrences = src.split(cond).length - 1;
    expect(occurrences, "expected this exact condition on both the name and the email input").toBe(2);
  });

  it("the discount-code input steps aside for the ordinary discovery purchase only — the basket's own checkout carries its own door", () => {
    expect(src).toContain("!(voucherId || rescheduleBookingId) && !isDiscovery && <input");
  });

  it("the basket POST composes note: noteOut — the same composed note the direct-pay path already sends", () => {
    expect(src).toContain("JSON.stringify({ serviceId, startUtc: chosen, viewerTz, note: noteOut })");
  });
});

describe("C — the rail-UI pins", () => {
  it("the rail picker's render condition carries !isDiscovery — hidden for every discovery state, unchanged for every other service", () => {
    expect(src).toContain("!(voucherId || rescheduleBookingId) && !isDiscovery && <label");
  });

  it("the on-chain wait notice's render condition carries !isDiscovery too", () => {
    expect(src).toContain('!(voucherId || rescheduleBookingId) && !isDiscovery && rail === "onchain" && (');
  });

  it("the rail useState sits before the component's early returns and its own render — unconditional, hooks-law-safe", () => {
    const useStateIdx = src.indexOf('const [rail, setRail] = useState<"lightning" | "onchain">("lightning");');
    const loadingReturnIdx = src.indexOf("if (loading) return");
    const mainRenderIdx = src.indexOf('<div className="mt-8">');
    expect(useStateIdx, "the rail useState not found").toBeGreaterThan(-1);
    expect(loadingReturnIdx, "the loading early return not found").toBeGreaterThan(-1);
    expect(mainRenderIdx, "the component's main render not found").toBeGreaterThan(-1);
    expect(useStateIdx).toBeLessThan(loadingReturnIdx);
    expect(useStateIdx).toBeLessThan(mainRenderIdx);
  });
});

/* ── B: note persistence, end to end ─────────────────────────────────── */

const NOW = Date.parse("2026-06-15T12:00:00Z"); // Monday

const service: Service = {
  id: "discovery-call",
  schemaVersion: 1,
  title: "Discovery Call",
  blurb: "",
  durationMin: 60,
  bufferMin: 15,
  price: { fiat: { amount: 5500, currency: "USD" } },
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

const KV_URL = "http://kv.fixture.t395";
const kvStore = new Map<string, string>();
const kvHashes = new Map<string, Map<string, string>>();
const kvSets = new Map<string, Set<string>>();

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

// same pattern as tests/bookings-checkout-receipt.test.ts: the card rail is
// exercised through a MOCKED adapter, not a simulated Square API.
vi.mock("@/lib/payments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments")>();
  return {
    ...actual,
    ensureSquareVault: vi.fn(async () => {}),
    liveAdapter: vi.fn(() => fakeAdapter),
  };
});

describe("B — the note rides the basket to the booking, end to end (Astra §4)", () => {
  beforeAll(() => {
    delete process.env.VERCEL;
    delete process.env.REDIS_URL;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.KV_REST_API_URL = KV_URL;
    process.env.KV_REST_API_TOKEN = "fixture-kv-token-t395";

    kvStore.set("booking:config", JSON.stringify(config));

    // a small fixture Upstash-REST KV — the exact ["OP", ...args] protocol
    // cart.ts / booking.ts / booking-orders.ts / store.ts all speak.
    vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
      const u = String(url);
      if (u !== KV_URL) throw new Error(`unexpected fetch: ${u}`);
      const cmd = (JSON.parse(String(init?.body)) as unknown[]).map(String);
      const [op, ...args] = cmd;
      let result: unknown = null;
      if (op === "GET") {
        result = kvStore.get(args[0]) ?? null;
      } else if (op === "SET") {
        const [key, value, ...flags] = args;
        if (flags.includes("NX") && kvStore.has(key)) result = null;
        else {
          kvStore.set(key, value);
          result = "OK";
        }
      } else if (op === "DEL") {
        result = kvStore.delete(args[0]) ? 1 : 0;
      } else if (op === "HGET") {
        result = kvHashes.get(args[0])?.get(args[1]) ?? null;
      } else if (op === "HSET") {
        const h = kvHashes.get(args[0]) ?? new Map<string, string>();
        h.set(args[1], args[2]);
        kvHashes.set(args[0], h);
        result = 1;
      } else if (op === "HSETNX") {
        const h = kvHashes.get(args[0]) ?? new Map<string, string>();
        if (h.has(args[1])) result = 0;
        else {
          h.set(args[1], args[2]);
          kvHashes.set(args[0], h);
          result = 1;
        }
      } else if (op === "HDEL") {
        result = kvHashes.get(args[0])?.delete(args[1]) ? 1 : 0;
      } else if (op === "HGETALL") {
        const h = kvHashes.get(args[0]);
        result = h ? Object.fromEntries(h.entries()) : {};
      } else if (op === "SADD") {
        const s = kvSets.get(args[0]) ?? new Set<string>();
        s.add(args[1]);
        kvSets.set(args[0], s);
        result = 1;
      } else if (op === "SMEMBERS") {
        result = [...(kvSets.get(args[0]) ?? new Set<string>())];
      } else {
        throw new Error(`fixture KV: unhandled op ${op}`);
      }
      return new Response(JSON.stringify({ result }), { status: 200 });
    });
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const slotsGET = async () => (await import("@/app/api/bookings/slots/route")).GET;
  const cartPOST = async () => (await import("@/app/api/cart/route")).POST;
  const cartCheckoutPOST = async () => (await import("@/app/api/cart/checkout/route")).POST;

  function addToCart(cartId: string, body: Record<string, unknown>) {
    return cartPOST().then((POST) =>
      POST(
        new Request("http://localhost/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: `oc-cart=${cartId}` },
          body: JSON.stringify(body),
        }),
      ),
    );
  }

  function checkout(cartId: string, body: Record<string, unknown>) {
    return cartCheckoutPOST().then((POST) =>
      POST(
        new Request("http://localhost/api/cart/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: `oc-cart=${cartId}` },
          body: JSON.stringify(body),
        }),
      ),
    );
  }

  it("a unique composed noteOut, submitted through the cart-add handler and a mocked card checkout, equals createBooking's customer.note", async () => {
    const GET = await slotsGET();
    const slotsRes = await GET(new Request("http://localhost/api/bookings/slots?service=discovery-call&viewerTz=America/Denver"));
    const slotsData = await slotsRes.json();
    expect(slotsData.ok).toBe(true);
    expect(slotsData.slots.length).toBeGreaterThan(0);
    const startUtc = slotsData.slots[0].startUtc;

    // mirrors SlotPicker.tsx:213's own composition (intent set, note filled)
    const uniqueSuffix = `t395-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const noteOut = `Calling about: A retreat 🏜️\nunique note ${uniqueSuffix}`;

    const addRes = await addToCart("cart-t395-note", {
      serviceId: "discovery-call",
      startUtc,
      viewerTz: "America/Denver",
      note: noteOut,
    });
    expect(addRes.status).toBe(200);
    const addData = await addRes.json();
    expect(addData.ok).toBe(true);
    const holdId = addData.lines[0].slot.holdId;

    const checkoutRes = await checkout("cart-t395-note", {
      rail: "card",
      contact: { email: "visitor@example.com" },
    });
    expect(checkoutRes.status).toBe(200);
    const checkoutData = await checkoutRes.json();
    expect(checkoutData.ok).toBe(true);
    // the card rail, actually exercised — not BTCPay
    expect(checkoutData.payUrl).toBe("https://sandbox.square.link/u/fixture");
    expect(createChargeCalls.length).toBe(1);

    const { getBooking } = await import("@/lib/booking-orders");
    const rec = await getBooking(holdId);
    expect(rec?.customer.note).toBe(noteOut);
  });

  it("a session add with no note carries no note key at all — additive, goods lines untouched", async () => {
    const GET = await slotsGET();
    const slotsRes = await GET(new Request("http://localhost/api/bookings/slots?service=discovery-call&viewerTz=America/Denver"));
    const slotsData = await slotsRes.json();
    const startUtc = slotsData.slots[1].startUtc; // a distinct slot from the test above

    const addRes = await addToCart("cart-t395-nonote", {
      serviceId: "discovery-call",
      startUtc,
      viewerTz: "America/Denver",
    });
    expect(addRes.status).toBe(200);
    const addData = await addRes.json();
    expect(addData.ok).toBe(true);

    const { getCart } = await import("@/lib/cart");
    const cart = await getCart("cart-t395-nonote");
    expect(cart.lines).toHaveLength(1);
    expect(Object.prototype.hasOwnProperty.call(cart.lines[0], "note")).toBe(false);
  });
});
