import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { isolateCwd } from "./helpers/isolate-cwd";
import {
  attachCharge,
  createOrder,
  getItem,
  newOrderId,
  recordChargeEvent,
  upsertItem,
  type OrderRecord,
  type StoreItem,
} from "@/lib/store";

/**
 * TASK-163 (0018.06.17 a₿ · block 966080) — the catalog write lock. The
 * read-modify-write on `store:catalog` used to lose races: two settles in
 * the same instant or an editor save beside a settle each read the same
 * doc and the last writer won. Pins:
 *
 *  1. KV driver (a fake vault behind the REST env pair): two concurrent
 *     settles spending qty 2 on an inventory of 3 end at 0 + soldout —
 *     never 1 (the lost-decrement shape).
 *  2. An editor save DURING a settle keeps both changes — the new title
 *     AND the spent inventory.
 *  3. A lock held by someone else past the ~2 s patience gives up in
 *     words — and writes nothing.
 *  4. The dev file driver (vault env dark) serializes the same two
 *     concurrent settles on the process-local promise chain.
 *
 * The fake kv answers store.ts's own REST transport (a fetch stub against
 * KV_REST_API_URL) with real latency, so an unlocked run would genuinely
 * interleave reads ahead of writes. The only EVAL in the house is the
 * lock's compare-and-delete release, and the fake implements exactly that.
 */

const iso = isolateCwd("oc-task163-");

const LOCK_KEY = "store:catalog:lock";

function makeFakeKv() {
  const data = new Map<string, string>();
  const expiry = new Map<string, number>();
  const sets = new Map<string, Set<string>>();

  const alive = (key: string): boolean => {
    const exp = expiry.get(key);
    if (exp != null && Date.now() >= exp) {
      data.delete(key);
      expiry.delete(key);
      return false;
    }
    return true;
  };

  async function run(cmd: unknown[]): Promise<unknown> {
    // real latency — wide enough that an UNLOCKED pair of mutations would
    // both finish their reads before either writes
    await new Promise((r) => setTimeout(r, 8 + Math.floor(Math.random() * 8)));
    const [op, ...args] = cmd.map(String);
    switch (op.toUpperCase()) {
      case "GET":
        return alive(args[0]) ? (data.get(args[0]) ?? null) : null;
      case "SET": {
        const [key, val, ...flags] = args;
        const pxAt = flags.indexOf("PX");
        if (flags.includes("NX") && alive(key) && data.has(key)) return null;
        data.set(key, val);
        if (pxAt >= 0) expiry.set(key, Date.now() + Number(flags[pxAt + 1]));
        return "OK";
      }
      case "SADD": {
        const cur = sets.get(args[0]) ?? new Set<string>();
        cur.add(args[1]);
        sets.set(args[0], cur);
        return 1;
      }
      case "SMEMBERS":
        return [...(sets.get(args[0]) ?? new Set<string>())];
      case "EVAL": {
        // the lock's release: delete only when the token matches
        const [, , key, token] = args; // EVAL <script> 1 <key> <token>
        if (alive(key) && data.get(key) === token) {
          data.delete(key);
          return 1;
        }
        return 0;
      }
      default:
        throw new Error(`fake kv: unhandled ${op}`);
    }
  }

  const fetchStub = (async (_url: unknown, init?: { body?: unknown }) => {
    const result = await run(JSON.parse(String(init?.body)));
    return { ok: true, json: async () => ({ result }) };
  }) as unknown as typeof fetch;

  return { run, fetchStub };
}

function makeItem(over: Partial<StoreItem>): StoreItem {
  return {
    id: "x",
    schemaVersion: 2,
    title: "X",
    blurb: "words",
    images: [],
    kind: "self",
    price: { sats: 100 },
    fulfillment: "self",
    status: "live",
    ...over,
  };
}

function makeOrder(id: string, lines: { itemId: string; qty: number }[]): OrderRecord {
  return {
    id,
    schemaVersion: 2,
    state: "created",
    lineItems: lines.map((l) => ({ itemId: l.itemId, title: l.itemId, qty: l.qty })),
    priceSnapshot: { amount: 100, currency: "SATS", at: new Date().toISOString() },
    adapterId: "fixture",
    chargeIds: [],
    createdAtMs: Date.now(),
    events: [],
  };
}

async function settleOrder(itemId: string, qty: number, chargeId: string): Promise<void> {
  const orderId = newOrderId();
  await createOrder(makeOrder(orderId, [{ itemId, qty }]));
  await attachCharge(orderId, chargeId);
  await recordChargeEvent(orderId, { type: "settled", chargeId });
}

const realFetch = globalThis.fetch;

function vaultEnvOff() {
  delete process.env.VERCEL;
  delete process.env.REDIS_URL;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
}

afterAll(() => {
  globalThis.fetch = realFetch;
  vaultEnvOff();
  iso.cleanup();
});

describe("the dev file driver — the process-local chain is the lock", () => {
  beforeAll(() => {
    vaultEnvOff();
    globalThis.fetch = realFetch;
  });

  it("two concurrent spends on inventory 3 × qty 2 end at 0 + soldout, never 1", async () => {
    await upsertItem(makeItem({ id: "t163-file-ware", inventory: 3 }));
    await Promise.all([
      settleOrder("t163-file-ware", 2, "ch_file_1"),
      settleOrder("t163-file-ware", 2, "ch_file_2"),
    ]);
    const item = await getItem("t163-file-ware");
    expect(item?.inventory).toBe(0);
    expect(item?.status).toBe("soldout");
  });
});

describe("the vault driver (fake kv) — the KV lock", () => {
  const fake = makeFakeKv();

  beforeAll(() => {
    vaultEnvOff();
    process.env.KV_REST_API_URL = "https://fake-kv.invalid";
    process.env.KV_REST_API_TOKEN = "fake-token";
    globalThis.fetch = fake.fetchStub;
  });

  it("two concurrent spends on inventory 3 × qty 2 end at 0 + soldout, never 1", async () => {
    await upsertItem(makeItem({ id: "t163-kv-ware", inventory: 3 }));
    await Promise.all([
      settleOrder("t163-kv-ware", 2, "ch_kv_1"),
      settleOrder("t163-kv-ware", 2, "ch_kv_2"),
    ]);
    const item = await getItem("t163-kv-ware");
    expect(item?.inventory).toBe(0);
    expect(item?.status).toBe("soldout");
  });

  it("an editor save during a settle keeps BOTH changes", async () => {
    const seed = makeItem({ id: "t163-kv-edit", title: "Before", inventory: 3 });
    await upsertItem(seed);
    const orderId = newOrderId();
    await createOrder(makeOrder(orderId, [{ itemId: "t163-kv-edit", qty: 2 }]));
    await attachCharge(orderId, "ch_kv_3");
    await Promise.all([
      recordChargeEvent(orderId, { type: "settled", chargeId: "ch_kv_3" }),
      upsertItem({ ...seed, title: "After" }),
    ]);
    const item = await getItem("t163-kv-edit");
    expect(item?.title).toBe("After"); // the editor's save survived
    expect(item?.inventory).toBe(1); // and the settle's spend survived
    expect(item?.status).toBe("live");
  });

  it("a lock held past the ~2 s patience gives up in words — and writes nothing", async () => {
    await upsertItem(makeItem({ id: "t163-kv-busy", title: "Untouched", inventory: 3 }));
    // a foreign holder takes the lock for the full TTL (4 s > 2 s patience)
    expect(await fake.run(["SET", LOCK_KEY, "foreign-token", "NX", "PX", "4000"])).toBe("OK");
    await expect(
      upsertItem(makeItem({ id: "t163-kv-busy", title: "Overwritten", inventory: 3 })),
    ).rejects.toThrow(/catalog is busy .* nothing was saved/);
    const item = await getItem("t163-kv-busy");
    expect(item?.title).toBe("Untouched");
  }, 10000);
});
