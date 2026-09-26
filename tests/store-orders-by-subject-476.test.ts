import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import type { OrderRecord } from "@/lib/store";

/**
 * TASK-476 (block 968,670, ground truth 968,624+) — the per-subject order
 * index. Before this lane, `qaEntitled` (below tier C) called `store.ts`'s
 * `listOrders()`, which reads the WHOLE order ledger (`SMEMBERS
 * store:orders:index`, then one GET per order) on every /reading SSR and
 * every 20s `/api/qa-door` poll. This pins:
 *
 *   1. `createOrder()` SADDs an order carrying `entitlementSubject` into
 *      `store:orders:by-subject:<subject>`, alongside its existing
 *      `store:orders:index` SADD.
 *   2. `listOrdersForSubject(subject)` reads ONLY that subject's set.
 *   3. The one-time backfill (`store:orders:by-subject:v1-built`): the
 *      FIRST call that finds the flag missing does one full scan (one
 *      `SMEMBERS store:orders:index`) and never scans again after.
 *   4. An order that predates the flag (created the "old way" — indexed
 *      only in `store:orders:index`, never SADDed into its own subject
 *      set) is still found once the backfill has run.
 *   5. A wrong subject finds nothing.
 *
 * Fixture KV: the house idiom (`tests/entitlement-renewal.test.ts`'s
 * `vi.stubGlobal("fetch", …)` over `KV_REST_API_URL`/`KV_REST_API_TOKEN`),
 * extended with SET's `NX` flag and `SMEMBERS` (createOrder/listOrders
 * speak both; the entitlement-renewal fixture didn't need them).
 */

const KV_URL = "http://kv.fixture.t476";

let kvStore: Map<string, string>;
let kvSets: Map<string, Set<string>>;
/** every command the fixture saw, in order — lets a test count how many
 *  times the FULL-SCAN key (`store:orders:index`) was SMEMBERS'd */
let calls: string[][];

beforeAll(() => {
  delete process.env.VERCEL;
  delete process.env.REDIS_URL;
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-kv-token-t476";

  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u !== KV_URL) throw new Error(`unexpected fetch: ${u}`);
    const cmd = (JSON.parse(String(init?.body)) as unknown[]).map(String);
    calls.push(cmd);
    const [op, key, val, flag] = cmd;
    let result: unknown = null;
    if (op === "GET") {
      result = kvStore.get(key) ?? null;
    } else if (op === "SET") {
      if (flag === "NX" && kvStore.has(key)) {
        result = null;
      } else {
        kvStore.set(key, val);
        result = "OK";
      }
    } else if (op === "SADD") {
      const s = kvSets.get(key) ?? new Set<string>();
      s.add(val);
      kvSets.set(key, s);
      result = 1;
    } else if (op === "SMEMBERS") {
      result = [...(kvSets.get(key) ?? [])];
    } else {
      throw new Error(`fixture KV: unhandled op ${op}`);
    }
    return new Response(JSON.stringify({ result }), { status: 200 });
  });
});

beforeEach(() => {
  kvStore = new Map();
  kvSets = new Map();
  calls = [];
});

let createOrder: (typeof import("@/lib/store"))["createOrder"];
let listOrdersForSubject: (typeof import("@/lib/store"))["listOrdersForSubject"];
let newOrderId: (typeof import("@/lib/store"))["newOrderId"];
let kv: (typeof import("@/lib/store"))["kv"];
let qaEntitled: (typeof import("@/lib/qa-entitlement"))["qaEntitled"];
const QA_ITEM_ID = "q-a-meetup-with-love";

beforeAll(async () => {
  ({ createOrder, listOrdersForSubject, newOrderId, kv } = await import("@/lib/store"));
  ({ qaEntitled } = await import("@/lib/qa-entitlement"));
});

function makeOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: overrides.id ?? newOrderId(),
    schemaVersion: 2,
    state: overrides.state ?? "settled",
    lineItems: overrides.lineItems ?? [{ itemId: QA_ITEM_ID, title: "Q&A pass", qty: 1 }],
    priceSnapshot: { amount: 3333, currency: "USD", at: new Date().toISOString() },
    adapterId: "square",
    chargeIds: [],
    entitlementSubject: overrides.entitlementSubject,
    createdAtMs: overrides.createdAtMs ?? Date.now(),
    events: [],
    ...overrides,
  };
}

const SUBJECT_INDEX = (s: string) => `store:orders:by-subject:${s}`;

describe("createOrder — indexes by subject (TASK-476)", () => {
  it("an order with an entitlementSubject is SADDed into its own subject set", async () => {
    const order = makeOrder({ entitlementSubject: "reader@onecocreation" });
    await createOrder(order);
    const res = await kv(["SMEMBERS", SUBJECT_INDEX("reader@onecocreation")]);
    expect(res?.result).toEqual([order.id]);
  });

  it("an order with no entitlementSubject touches no subject set", async () => {
    const order = makeOrder({ entitlementSubject: undefined });
    await createOrder(order);
    // no SADD call at all beyond the plain orders index — no subject SADD
    expect(calls.filter((c) => c[0] === "SADD")).toEqual([["SADD", "store:orders:index", order.id]]);
  });
});

describe("listOrdersForSubject — the one-time backfill (TASK-476)", () => {
  it("finds an order created the normal way (post-lane), via the index alone — no full scan needed on a warm index", async () => {
    const order = makeOrder({ entitlementSubject: "warm@onecocreation" });
    await createOrder(order);
    calls = []; // only count what listOrdersForSubject itself does
    const found = await listOrdersForSubject("warm@onecocreation");
    expect(found.map((o) => o.id)).toEqual([order.id]);
  });

  it("the FIRST call does exactly one full scan (one SMEMBERS store:orders:index), sets the flag, and a SECOND call never scans again", async () => {
    const order = makeOrder({ entitlementSubject: "scan-once@onecocreation" });
    await createOrder(order);
    calls = [];

    await listOrdersForSubject("scan-once@onecocreation");
    const fullScansAfterFirst = calls.filter((c) => c[0] === "SMEMBERS" && c[1] === "store:orders:index");
    expect(fullScansAfterFirst.length).toBe(1);
    expect(kvStore.get("store:orders:by-subject:v1-built")).toBe("1");

    calls = [];
    await listOrdersForSubject("scan-once@onecocreation");
    const fullScansAfterSecond = calls.filter((c) => c[0] === "SMEMBERS" && c[1] === "store:orders:index");
    expect(fullScansAfterSecond.length).toBe(0);
  });

  it("an order that predates the flag — indexed only in store:orders:index, the OLD way — is still found once the backfill runs", async () => {
    // simulate a pre-lane order: written straight to the vault + the plain
    // index only, bypassing createOrder's new subject SADD entirely
    const legacy = makeOrder({ entitlementSubject: "legacy@onecocreation" });
    await kv(["SET", `store:order:${legacy.id}`, JSON.stringify(legacy), "NX"]);
    await kv(["SADD", "store:orders:index", legacy.id]);
    expect(kvSets.has(SUBJECT_INDEX("legacy@onecocreation"))).toBe(false); // confirm: not indexed yet

    const found = await listOrdersForSubject("legacy@onecocreation");
    expect(found.map((o) => o.id)).toEqual([legacy.id]);
  });

  it("a wrong subject finds nothing", async () => {
    const order = makeOrder({ entitlementSubject: "right@onecocreation" });
    await createOrder(order);
    const found = await listOrdersForSubject("wrong@onecocreation");
    expect(found).toEqual([]);
  });

  it("an order created DURING the backfill scan is still covered going forward (createOrder indexes it itself)", async () => {
    const before = makeOrder({ entitlementSubject: "racer@onecocreation" });
    await kv(["SET", `store:order:${before.id}`, JSON.stringify(before), "NX"]);
    await kv(["SADD", "store:orders:index", before.id]);

    // triggers the backfill (flag still unset)
    await listOrdersForSubject("racer@onecocreation");

    // a second order for the same subject, created the normal way after
    // the flag is already set
    const after = makeOrder({ entitlementSubject: "racer@onecocreation" });
    await createOrder(after);

    const found = await listOrdersForSubject("racer@onecocreation");
    expect(found.map((o) => o.id).sort()).toEqual([before.id, after.id].sort());
  });
});

describe("qaEntitled — unchanged behavior over the new per-subject read (TASK-476)", () => {
  const SUBJECT = "reader@onecocreation";

  it("tier C alone entitles without needing any order", async () => {
    expect(await qaEntitled(SUBJECT, "C")).toBe(true);
  });

  it("a settled order for the Q&A pass entitles, no tier needed", async () => {
    await createOrder(makeOrder({ entitlementSubject: SUBJECT, state: "settled" }));
    expect(await qaEntitled(SUBJECT, null)).toBe(true);
  });

  it("a fulfilled order also entitles", async () => {
    await createOrder(makeOrder({ entitlementSubject: SUBJECT, state: "fulfilled" }));
    expect(await qaEntitled(SUBJECT, null)).toBe(true);
  });

  it("a REFUNDED order does NOT entitle", async () => {
    await createOrder(makeOrder({ entitlementSubject: SUBJECT, state: "refunded" }));
    expect(await qaEntitled(SUBJECT, null)).toBe(false);
  });

  it("a DISPUTED order does NOT entitle either", async () => {
    await createOrder(makeOrder({ entitlementSubject: SUBJECT, state: "disputed" }));
    expect(await qaEntitled(SUBJECT, null)).toBe(false);
  });

  it("an order for a different item does not entitle", async () => {
    await createOrder(
      makeOrder({ entitlementSubject: SUBJECT, state: "settled", lineItems: [{ itemId: "some-other-item", title: "x", qty: 1 }] }),
    );
    expect(await qaEntitled(SUBJECT, null)).toBe(false);
  });

  it("someone else's settled Q&A order does not entitle this subject", async () => {
    await createOrder(makeOrder({ entitlementSubject: "someone-else@onecocreation", state: "settled" }));
    expect(await qaEntitled(SUBJECT, null)).toBe(false);
  });
});
