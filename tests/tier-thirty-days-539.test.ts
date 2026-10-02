import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { getEntitlement, lapsedEntitlement, TIER_TERM_DAYS, LEGACY_TIER_END_MS } from "@/lib/entitlement";
import type { OrderRecord, StoreItem } from "@/lib/store";
import { getItem } from "@/lib/store";
import { settleEntitlementFromOrder } from "@/lib/entitlement-fulfil";

/**
 * T-539 (block 969,584): a tier purchase grants a 30-day TERM (no catalog
 * data needed), tasters keep their own days, a repeat purchase extends from
 * the standing end, a refund still closes the door. Every settle path
 * (webhook, reconcile, the 100%-code cart path) funnels through
 * settleEntitlementFromOrder, so that is the unit under test; entitlement.ts
 * stays real over an in-memory KV.
 */
vi.mock("@/lib/store", () => ({ getItem: vi.fn() }));
vi.mock("@/lib/matrix", () => ({
  inviteToTierRooms: vi.fn(async () => []),
  removeFromTierRooms: vi.fn(async () => []),
  matrixConfigured: () => false,
  isMxid: () => false,
  mxidForSubject: (s: string) => `@${s}`,
}));
vi.mock("@/lib/mail-queue", () => ({ enqueue: vi.fn(async () => 0) }));
vi.mock("@/lib/subscribers", () => ({
  siteBase: () => "https://x.test",
  addSubscriberTag: vi.fn(async () => {}),
  removeSubscriberTag: vi.fn(async () => {}),
  READING_SEAT_TAG: "reading-seat",
}));

const KV_URL = "http://kv.fixture.t539";
const DAY = 86_400_000;
const T0 = 1_700_000_000_000;
let kvStore: Map<string, string>;
let kvSets: Map<string, Set<string>>;

const base = { schemaVersion: 2 as const, blurb: "", images: [], price: { fiat: { amount: 3300, currency: "USD" } }, fulfillment: "package" as const, status: "live" as const, kind: "package" as const };
const CATALOG: Record<string, StoreItem> = {
  "weekly-intuitive": { ...base, id: "weekly-intuitive", title: "Weekly Intuitive", entitlementTier: "A" } as StoreItem,
  "observer": { ...base, id: "observer", title: "Observer", entitlementTier: "B" } as StoreItem,
  "observer-one-week": { ...base, id: "observer-one-week", title: "Observer week", entitlementTier: "B", entitlementDays: 7 } as StoreItem,
  "weekly-one-week": { ...base, id: "weekly-one-week", title: "Weekly week", entitlementTier: "A", entitlementDays: 7 } as StoreItem,
};

// email-member subject keys the grant by the subject string itself
const SUBJECT = "pac@x.org@email";
const o = (id: string, itemId: string, state: OrderRecord["state"] = "settled", over: Partial<OrderRecord> = {}) =>
  ({
    id, schemaVersion: 2, state,
    lineItems: [{ itemId, title: itemId, qty: 1 }],
    priceSnapshot: { amount: 3300, currency: "USD" },
    adapterId: "square", chargeIds: [], entitlementSubject: SUBJECT, createdAtMs: T0, events: [],
    ...over,
  }) as unknown as OrderRecord;

beforeAll(() => {
  delete process.env.VERCEL;
  delete process.env.REDIS_URL;
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-kv-token-t539";
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
    if (String(url) !== KV_URL) throw new Error(`unexpected fetch: ${String(url)}`);
    const [op, ...args] = (JSON.parse(String(init?.body)) as unknown[]).map(String);
    let result: unknown = null;
    if (op === "GET") result = kvStore.get(args[0]) ?? null;
    else if (op === "SET") { kvStore.set(args[0], args[1]); result = "OK"; }
    else if (op === "SADD") { const s = kvSets.get(args[0]) ?? new Set<string>(); s.add(args[1]); kvSets.set(args[0], s); result = 1; }
    else throw new Error(`fixture KV: unhandled op ${op}`);
    return new Response(JSON.stringify({ result }), { status: 200 });
  });
});
beforeEach(() => {
  kvStore = new Map(); kvSets = new Map();
  vi.useFakeTimers(); vi.setSystemTime(T0);
  vi.mocked(getItem).mockReset();
  vi.mocked(getItem).mockImplementation(async (id: string) => CATALOG[id] ?? null);
});
afterEach(() => vi.useRealTimers());
const held = () => getEntitlement(SUBJECT);

describe("T-539: the 30-day tier term", () => {
  it("TIER_TERM_DAYS is 30 and the legacy end is Oct 31 2026 end of day Pacific", () => {
    expect(TIER_TERM_DAYS).toBe(30);
    expect(new Date(LEGACY_TIER_END_MS).toISOString()).toBe("2026-11-01T06:59:59.999Z");
  });

  it("a standing tier item (no entitlementDays) grants exactly 30 days", async () => {
    const r = await settleEntitlementFromOrder(o("ord-1", "weekly-intuitive"));
    expect(r.granted).toBe(true);
    expect((await held())?.expiresAtMs).toBe(T0 + 30 * DAY);
  });

  it("a 100% discount-code order (priceSnapshot 0 + discount, state settled) also gets the 30-day term, not a permanent grant", async () => {
    const free = o("ord-free", "weekly-intuitive", "settled", {
      priceSnapshot: { amount: 0, currency: "USD" },
      discount: { code: "FREEWEEK" },
    } as Partial<OrderRecord>);
    await settleEntitlementFromOrder(free);
    const rec = await held();
    expect(rec?.tier).toBe("A");
    expect(rec?.expiresAtMs).toBe(T0 + 30 * DAY);
  });

  it("a taster keeps its own 7 days", async () => {
    await settleEntitlementFromOrder(o("ord-w", "weekly-one-week"));
    expect((await held())?.expiresAtMs).toBe(T0 + 7 * DAY);
  });

  it("a repeat purchase of the same tier extends from the standing end", async () => {
    await settleEntitlementFromOrder(o("ord-1", "weekly-intuitive"));
    vi.setSystemTime(T0 + 10 * DAY); // 20 days still standing
    await settleEntitlementFromOrder(o("ord-2", "weekly-intuitive"));
    expect((await held())?.expiresAtMs).toBe(T0 + 60 * DAY);
  });

  it("a repeat purchase after lapse starts fresh from now", async () => {
    await settleEntitlementFromOrder(o("ord-1", "weekly-intuitive"));
    vi.setSystemTime(T0 + 45 * DAY);
    expect(await held()).toBeNull();
    await settleEntitlementFromOrder(o("ord-2", "weekly-intuitive"));
    expect((await held())?.expiresAtMs).toBe(T0 + 75 * DAY);
  });

  it("taster then tier (same tier): the 30-day term adds onto the taster's end", async () => {
    await settleEntitlementFromOrder(o("ord-w", "weekly-one-week"));
    await settleEntitlementFromOrder(o("ord-m", "weekly-intuitive"));
    expect((await held())?.expiresAtMs).toBe(T0 + 37 * DAY);
  });

  it("tier then taster (same tier): the taster adds its 7 days, never shortens", async () => {
    await settleEntitlementFromOrder(o("ord-m", "weekly-intuitive"));
    await settleEntitlementFromOrder(o("ord-w", "weekly-one-week"));
    expect((await held())?.expiresAtMs).toBe(T0 + 37 * DAY);
  });

  it("a higher taster over a 30-day tier: reads the taster, then falls back to the tier's own end", async () => {
    await settleEntitlementFromOrder(o("ord-m", "weekly-intuitive"));
    await settleEntitlementFromOrder(o("ord-b", "observer-one-week"));
    expect((await held())?.tier).toBe("B");
    vi.setSystemTime(T0 + 8 * DAY);
    const rec = await held();
    expect(rec?.tier).toBe("A");
    expect(rec?.expiresAtMs).toBe(T0 + 30 * DAY);
  });

  it("same tier, both lines in one cart: the longer term wins", async () => {
    await settleEntitlementFromOrder({ ...o("ord-x", "weekly-one-week"), lineItems: [
      { itemId: "weekly-one-week", title: "w", qty: 1 }, { itemId: "weekly-intuitive", title: "m", qty: 1 }] } as OrderRecord);
    expect((await held())?.expiresAtMs).toBe(T0 + 30 * DAY);
  });

  it("refund behaviour is unchanged: a live term closes at once", async () => {
    await settleEntitlementFromOrder(o("ord-1", "weekly-intuitive"));
    const r = await settleEntitlementFromOrder(o("ord-1", "weekly-intuitive", "refunded"));
    expect(r.revoked).toBe(true);
    expect(await held()).toBeNull();
    expect(await lapsedEntitlement(SUBJECT)).toBeNull(); // a refund is not "ended"
  });

  it("lapsedEntitlement names the ended term once the 30 days pass, and only then", async () => {
    await settleEntitlementFromOrder(o("ord-1", "weekly-intuitive"));
    expect(await lapsedEntitlement(SUBJECT)).toBeNull(); // still live
    vi.setSystemTime(T0 + 31 * DAY);
    expect(await lapsedEntitlement(SUBJECT)).toEqual({ tier: "A", endedAtMs: T0 + 30 * DAY });
    await settleEntitlementFromOrder(o("ord-2", "weekly-intuitive")); // renewed
    expect(await lapsedEntitlement(SUBJECT)).toBeNull();
  });
});
