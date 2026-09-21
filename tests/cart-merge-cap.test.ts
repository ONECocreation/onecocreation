import { describe, it, expect, beforeAll, vi } from "vitest";

/**
 * TASK-357 (0018.07.02 a₿, block 967,916 — D1–D4 all RULED (a)) — THE MERGE
 * OBEYS THE 1..21 LAW: a guest with 21 of an item signing in to a member
 * cart that already holds 21 of the same item used to land at 42, and
 * checkout charged for 42 — the add path would never allow that.
 * `mergeCarts` now sums (and pushes) through the one shared `clampQty`, and
 * `getCart` heals a poisoned qty on READ (D2a), in memory only, so an old
 * 42 can't keep re-spreading. These pin:
 *
 *  · `clampQty`'s own table (the law's one source, including the NaN/string
 *    poison fix — `null` in KV becomes `1`, never `null`).
 *  · `mergeCarts`: an ordinary sum, a summed cap, a pushed-line cap, and a
 *    held slot line riding over whole, untouched.
 *  · D2(a): a legacy-poisoned cart reads healed, but KV itself keeps the
 *    raw value until the next save — and a legacy 42 merging with a fresh
 *    guest 5 reads 21, sums to 26, and stores 21.
 *  · the add path (`/api/cart`) stores 1 for a non-numeric qty, never the
 *    old `null`.
 *  · D3: the clamp is silent — no message rides the cart response.
 *
 * All network is a stubbed global fetch (a stateful fixture KV) — every
 * credential below is a fixture string, never a real one.
 */

const KV_URL = "http://kv.fixture";

/** one goods item, mirroring the shelf's own shape (fixture) */
const CATALOG = {
  schemaVersion: 2,
  items: [
    {
      id: "candle",
      schemaVersion: 2,
      title: "Cap Candle",
      blurb: "a good candle to test a cap with",
      images: [],
      media: { images: [] },
      kind: "digital",
      price: { sats: 1000, fiat: { amount: 100, currency: "USD" } },
      fulfillment: "digital",
      status: "live",
    },
  ],
};

/** stateful fixture KV — SET remembers, GET reads back, DEL removes */
const kvStore = new Map<string, string>();

function seedCart(id: string, lines: unknown[]) {
  kvStore.set(`cart:${id}`, JSON.stringify({ lines, updatedAtMs: Date.now() }));
}

beforeAll(async () => {
  delete process.env.VERCEL;
  delete process.env.REDIS_URL;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-kv-token";
  process.env.SEAT_SECRET = "test-seat-secret";

  kvStore.set("store:catalog", JSON.stringify(CATALOG));

  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u === KV_URL) {
      const cmd = JSON.parse(String(init?.body)) as unknown[];
      const [op, key] = cmd.map(String);
      let result: unknown = null;
      if (op === "GET") result = kvStore.get(key) ?? null;
      else if (op === "SET") {
        const [, k, v] = cmd.map(String);
        kvStore.set(k, v);
        result = "OK";
      } else if (op === "DEL") {
        kvStore.delete(key);
        result = 1;
      }
      return new Response(JSON.stringify({ result }), { status: 200 });
    }
    throw new Error(`unexpected fetch: ${u}`);
  });
});

describe("clampQty — the 1..21 law, one source (T-357)", () => {
  it("0 -> 1 (the floor, never zero)", async () => {
    const { clampQty } = await import("@/lib/cart");
    expect(clampQty(0)).toBe(1);
  });

  it("-3 -> 1", async () => {
    const { clampQty } = await import("@/lib/cart");
    expect(clampQty(-3)).toBe(1);
  });

  it("1.9 -> 1 (floored, never rounded)", async () => {
    const { clampQty } = await import("@/lib/cart");
    expect(clampQty(1.9)).toBe(1);
  });

  it("21 -> 21 (the ceiling itself, unclamped)", async () => {
    const { clampQty } = await import("@/lib/cart");
    expect(clampQty(21)).toBe(21);
  });

  it("22 -> 21 (one past the ceiling)", async () => {
    const { clampQty } = await import("@/lib/cart");
    expect(clampQty(22)).toBe(21);
  });

  it("NaN -> 1", async () => {
    const { clampQty } = await import("@/lib/cart");
    expect(clampQty(NaN)).toBe(1);
  });

  it("a non-numeric string ('abc') -> 1 — the poison fix, never the old NaN/null", async () => {
    const { clampQty } = await import("@/lib/cart");
    expect(clampQty("abc" as unknown as number)).toBe(1);
  });

  it("a numeric string ('5') behaves as the old literal did — Math.floor('5') is still 5", async () => {
    const { clampQty } = await import("@/lib/cart");
    expect(clampQty("5" as unknown as number)).toBe(5);
  });

  it("+Infinity -> 21, exactly as the old line gave", async () => {
    const { clampQty } = await import("@/lib/cart");
    expect(clampQty(Infinity)).toBe(21);
  });

  it("-Infinity -> 1, exactly as the old line gave", async () => {
    const { clampQty } = await import("@/lib/cart");
    expect(clampQty(-Infinity)).toBe(1);
  });
});

describe("mergeCarts — the merge obeys the 1..21 law (T-357)", () => {
  it("21 + 21 -> 21 (a summed line caps, never 42)", async () => {
    const { mergeCarts, getCart } = await import("@/lib/cart");
    seedCart("anon-2121", [{ itemId: "candle", qty: 21 }]);
    seedCart("member-2121", [{ itemId: "candle", qty: 21 }]);
    await mergeCarts("anon-2121", "member-2121");
    const cart = await getCart("member-2121");
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].qty).toBe(21);
  });

  it("5 + 3 -> 8 (an ordinary sum, well under the cap)", async () => {
    const { mergeCarts, getCart } = await import("@/lib/cart");
    seedCart("anon-53", [{ itemId: "candle", qty: 3 }]);
    seedCart("member-53", [{ itemId: "candle", qty: 5 }]);
    await mergeCarts("anon-53", "member-53");
    const cart = await getCart("member-53");
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].qty).toBe(8);
  });

  it("a pushed line of 99 -> 21 (a NEW line in the member cart, not a sum)", async () => {
    const { mergeCarts, getCart } = await import("@/lib/cart");
    seedCart("anon-99", [{ itemId: "candle", qty: 99 }]);
    seedCart("member-99", []);
    await mergeCarts("anon-99", "member-99");
    const cart = await getCart("member-99");
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].qty).toBe(21);
  });

  it("a held slot line rides over whole — one-of-a-kind, never merged or clamped", async () => {
    const { mergeCarts, getCart } = await import("@/lib/cart");
    const slot = {
      startUtc: "2026-10-01T10:00:00.000Z",
      endUtc: "2026-10-01T11:00:00.000Z",
      holdId: "hold-fixture-1",
      holdUntilMs: Date.now() + 60_000,
    };
    seedCart("anon-slot", [{ itemId: "reiki-session", qty: 1, slot }]);
    seedCart("member-slot", []);
    await mergeCarts("anon-slot", "member-slot");
    const cart = await getCart("member-slot");
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].qty).toBe(1);
    expect(cart.lines[0].slot).toEqual(slot);
  });
});

describe("D2(a) — getCart heals a poisoned qty on read, in memory only (T-357)", () => {
  it("a legacy 42 reads as 21, but KV keeps the raw 42 until the next save", async () => {
    const { getCart } = await import("@/lib/cart");
    seedCart("member-legacy-42", [{ itemId: "candle", qty: 42 }]);
    const cart = await getCart("member-legacy-42");
    expect(cart.lines[0].qty).toBe(21);
    const raw = JSON.parse(kvStore.get("cart:member-legacy-42")!);
    expect(raw.lines[0].qty).toBe(42);
  });

  it("a legacy 42 + a guest 5 — reads as 21, sums to 26, stores 21", async () => {
    const { mergeCarts, getCart } = await import("@/lib/cart");
    seedCart("anon-heal-5", [{ itemId: "candle", qty: 5 }]);
    seedCart("member-heal-42", [{ itemId: "candle", qty: 42 }]);
    await mergeCarts("anon-heal-5", "member-heal-42");
    const cart = await getCart("member-heal-42");
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].qty).toBe(21);
  });
});

async function cartPOST(body: Record<string, unknown>, cookie?: string) {
  const { POST } = await import("@/app/api/cart/route");
  return POST(
    new Request("http://localhost/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    }),
  );
}

async function cartGET(cookie?: string) {
  const { GET } = await import("@/app/api/cart/route");
  return GET(new Request("http://localhost/api/cart", { headers: cookie ? { Cookie: cookie } : {} }));
}

describe("the add path stores 1 for a non-numeric qty, never null (the poison fix, T-357)", () => {
  it("POST with qty: 'abc' stores qty 1, not null", async () => {
    const anonId = "anon-poison-abc";
    const res = await cartPOST({ itemId: "candle", qty: "abc" }, `oc-cart=${anonId}`);
    expect(res.status).toBe(200);
    const stored = JSON.parse(kvStore.get(`cart:${anonId}`)!);
    expect(stored.lines[0].qty).toBe(1);
    expect(stored.lines[0].qty).not.toBeNull();
  });
});

describe("D3 — the clamp is silent, no message rides the cart response (T-357)", () => {
  it("a poisoned 42 heals silently on GET — the response carries no clamp message", async () => {
    const anonId = "anon-silent-42";
    seedCart(anonId, [{ itemId: "candle", qty: 42 }]);
    const res = await cartGET(`oc-cart=${anonId}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.lines[0].qty).toBe(21);
    expect(Object.keys(data).sort()).toEqual(["expired", "lines", "ok", "totalSats"]);
    expect(JSON.stringify(data)).not.toMatch(/clamp/i);
  });
});
