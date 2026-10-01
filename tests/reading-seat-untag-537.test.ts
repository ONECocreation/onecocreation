import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import type { SubscriberRecord } from "@/lib/subscribers";
import type { OrderRecord, StoreItem } from "@/lib/store";
import { getItem } from "@/lib/store";
import { getEntitlement, grantTier } from "@/lib/entitlement";

/**
 * TASK-537 part 3 (gap 3) - a refund takes the reading-seat tag away when
 * the refund takes the access away. T-519 wrote the tag at settle and left
 * it after a refund, so a refunded buyer kept getting the reading's join
 * letters. Ruled lean: after the refund/dispute branch, ask the one honest
 * question (does this npub still hold a live grant?). No live grant: remove
 * `reading-seat`. A live grant remains (the lapsed-pass early return):
 * the tag stays. The free `reading` list tag is NEVER touched. Failure
 * isolated: a tag hiccup never fails a refund.
 *
 * The REAL entitlement grant and the REAL subscribers writer run against a
 * stateful fixture KV; the catalog, matrix rail and mail queue are mocked.
 */

const tagControl = vi.hoisted(() => ({ throwNext: false }));

vi.mock("@/lib/store", () => ({ getItem: vi.fn() }));
vi.mock("@/lib/matrix", () => ({
  inviteToTierRooms: vi.fn(async () => []),
  removeFromTierRooms: vi.fn(async () => []),
  matrixConfigured: () => false,
  isMxid: (v: string) => typeof v === "string" && v.startsWith("@"),
  mxidForSubject: (s: string) => `@${s}`,
}));
const enqueue = vi.hoisted(() => vi.fn(async (items: unknown[]) => items.length));
vi.mock("@/lib/mail-queue", () => ({ enqueue }));
vi.mock("@/lib/subscribers", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/subscribers")>();
  return {
    ...actual,
    removeSubscriberTag: async (email: string, tag: string) => {
      if (tagControl.throwNext) {
        tagControl.throwNext = false;
        throw new Error("simulated KV failure");
      }
      return actual.removeSubscriberTag(email, tag);
    },
  };
});

const mockGetItem = vi.mocked(getItem);
const KV_URL = "http://kv.fixture";
const kvStore = new Map<string, string>();

beforeAll(() => {
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-kv-token";
  process.env.SEAT_SECRET = "test-seat-secret";
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
    if (String(url) === KV_URL) {
      const cmd = JSON.parse(String(init?.body)) as unknown[];
      const [op, key] = cmd.map(String);
      let result: unknown = null;
      if (op === "GET") result = kvStore.get(key) ?? null;
      else if (op === "SET") { kvStore.set(key, String(cmd[2])); result = "OK"; }
      else result = 1;
      return new Response(JSON.stringify({ result }), { status: 200 });
    }
    throw new Error(`unexpected fetch: ${String(url)}`);
  });
});
beforeEach(() => {
  kvStore.clear();
  enqueue.mockClear();
  tagControl.throwNext = false;
  mockGetItem.mockReset();
  vi.useRealTimers();
});

const NPUB = "soul@example.com@email";
const REC = "mail:sub:soul@example.com";
const passItem = (tier: "A" | "B"): StoreItem => ({
  id: "weekly-one-week",
  schemaVersion: 2,
  title: "One Week Pass",
  blurb: "one week",
  images: [],
  kind: "package",
  price: { fiat: { amount: 1100, currency: "USD" }, sats: 11_111 },
  fulfillment: "package",
  status: "live",
  entitlementTier: tier,
  entitlementDays: 7,
} as StoreItem);

function order(over: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "order-untag-1",
    schemaVersion: 2,
    state: "settled",
    lineItems: [{ itemId: "weekly-one-week", title: "One Week Pass", qty: 1 }],
    priceSnapshot: { amount: 1100, currency: "USD", at: new Date().toISOString() },
    adapterId: "square",
    chargeIds: ["ch_fixture"],
    entitlementSubject: NPUB,
    contact: { email: "soul@example.com" },
    createdAtMs: Date.now(),
    events: [],
    ...over,
  } as OrderRecord;
}
const settle = async (o: OrderRecord) => (await import("@/lib/entitlement-fulfil")).settleEntitlementFromOrder(o);
const rec = () => JSON.parse(kvStore.get(REC)!) as SubscriberRecord;
const putFreeReadingRecord = () =>
  kvStore.set(REC, JSON.stringify({ email: "soul@example.com", joinedAtMs: 5, source: "reading", tags: ["reading"], tz: "America/Chicago" }));

describe("3a - removeSubscriberTag, the mirror of addSubscriberTag", () => {
  it("no record is no write", async () => {
    const { removeSubscriberTag } = await import("@/lib/subscribers");
    await removeSubscriberTag("nobody@example.com", "reading-seat");
    expect(kvStore.size).toBe(0);
  });

  it("a record without the tag is no write", async () => {
    putFreeReadingRecord();
    const before = kvStore.get(REC);
    const { removeSubscriberTag } = await import("@/lib/subscribers");
    await removeSubscriberTag("soul@example.com", "reading-seat");
    expect(kvStore.get(REC)).toBe(before);
  });

  it("merges the tag out and keeps source, optedOut, joinedAtMs, tz and the other tags byte-preserved", async () => {
    kvStore.set(REC, JSON.stringify({
      email: "soul@example.com", joinedAtMs: 5, source: "reading", optedOut: true, tz: "America/Chicago",
      tags: ["reading", "reading-seat", "other"],
    }));
    const { removeSubscriberTag } = await import("@/lib/subscribers");
    await removeSubscriberTag("Soul@Example.com", "reading-seat");
    expect(rec()).toEqual({
      email: "soul@example.com", joinedAtMs: 5, source: "reading", optedOut: true, tz: "America/Chicago",
      tags: ["reading", "other"],
    });
  });
});

describe("3b - the refund and dispute branch untags when the access is gone", () => {
  it("settle a pass then refund it: the seat tag is gone, the free reading tag on the same record stays", async () => {
    mockGetItem.mockResolvedValue(passItem("A"));
    putFreeReadingRecord();
    await settle(order());
    expect(rec().tags).toEqual(["reading", "reading-seat"]);
    const res = await settle(order({ state: "refunded" }));
    expect(res.revoked).toBe(true);
    expect(rec().tags).toEqual(["reading"]);
    expect(rec().source).toBe("reading");
    expect(rec().tz).toBe("America/Chicago");
  });

  it("a disputed order behaves like a refunded one", async () => {
    mockGetItem.mockResolvedValue(passItem("A"));
    await settle(order());
    expect(rec().tags).toContain("reading-seat");
    await settle(order({ state: "disputed" }));
    expect(rec().tags ?? []).not.toContain("reading-seat");
  });

  it("a refund where a live membership stands underneath (the lapsed-pass return) leaves the tag", async () => {
    mockGetItem.mockResolvedValue(passItem("B"));
    await grantTier(NPUB, "A", "order-standing"); // the permanent membership under the pass
    await settle(order()); // a tier B pass on top: the standing A falls under it
    expect(rec().tags).toContain("reading-seat");
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 8 * 86_400_000); // the week pass has ended
    const res = await settle(order({ state: "refunded" }));
    expect(res.note).toMatch(/already ended/);
    expect((await getEntitlement(NPUB))?.tier).toBe("A");
    expect(rec().tags).toContain("reading-seat");
  });

  it("a redelivered refund is a no-op", async () => {
    mockGetItem.mockResolvedValue(passItem("A"));
    await settle(order());
    await settle(order({ state: "refunded" }));
    const after = kvStore.get(REC);
    await settle(order({ state: "refunded" }));
    expect(kvStore.get(REC)).toBe(after);
    expect(rec().tags ?? []).not.toContain("reading-seat");
  });

  it("a tag-write failure does not fail the refund: the revoke and the letter still stand", async () => {
    mockGetItem.mockResolvedValue(passItem("A"));
    await settle(order());
    enqueue.mockClear();
    tagControl.throwNext = true;
    const res = await settle(order({ state: "refunded" }));
    expect(res.revoked).toBe(true);
    expect(await getEntitlement(NPUB)).toBeNull();
    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it("an order with no contact email does not throw", async () => {
    mockGetItem.mockResolvedValue(passItem("A"));
    await settle(order({ contact: undefined }));
    const res = await settle(order({ state: "refunded", contact: undefined }));
    expect(res.revoked).toBe(true);
  });
});
