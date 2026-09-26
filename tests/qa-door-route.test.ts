import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { TENANT } from "@/lib/tenant";
import { tierForSubject } from "@/lib/member-tier";

/**
 * TASK-475 (block 968,624) — `/api/qa-door`, the Q&A's member door.
 * BEHAVIORAL, the same "call the export" idiom `tests/stage2-route.test.ts`
 * / `tests/stage2-paid-door.test.ts` already use: `@/lib/member-tier`'s
 * `tierForSubject` is the one mocked boundary, KV is a fake key -> value
 * transport on `global.fetch` (HEAD dispatched separately for the
 * reachability probe), and orders ride the SAME transport's KV index/blob
 * so `@/lib/store`'s real `listOrders()` runs end to end — never mocked.
 *
 * Covers the brief's four entitlement cases: signed-out, tier C, a
 * settled non-refunded Q&A order, and a refunded order (NOT entitled).
 */

vi.mock("@/lib/member-tier", () => ({ tierForSubject: vi.fn() }));
const mockTier = vi.mocked(tierForSubject);

const CONFIG_KEY = `site:config:${TENANT}`;
const ORDER_KEY = (id: string) => `store:order:${id}`;
const ORDERS_INDEX = "store:orders:index";
const DOMAIN = "meet.qa-fixture.invalid";
const QA_ITEM_ID = "q-a-meetup-with-love";

/** `store.ts`'s `safeOrderId` requires exactly 24 lowercase hex chars —
 *  a plain "order-1" would fail the check silently (getOrder returns
 *  null, listOrders drops it), so every fixture id below is real hex. */
const ORDER_ID = (n: number) => n.toString(16).padStart(24, "0");

function fakeTransport() {
  const kv = new Map<string, string>();
  let reachable: number | "throw" = 200;
  let heads = 0;

  const fetchMock = async (_url: string | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    if (method === "HEAD") {
      heads += 1;
      if (reachable === "throw") throw new Error("network down");
      return new Response(null, { status: reachable });
    }
    const cmd = JSON.parse(String(init?.body)) as unknown[];
    const [op, key, value, member] = cmd as [string, string, string?, string?];
    if (op === "SET") {
      kv.set(key, value as string);
      return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
    }
    if (op === "SADD") {
      const existing = JSON.parse(kv.get(key) ?? "[]") as string[];
      if (!existing.includes(member as string)) existing.push(member as string);
      kv.set(key, JSON.stringify(existing));
      return new Response(JSON.stringify({ result: 1 }), { status: 200 });
    }
    if (op === "SMEMBERS") {
      return new Response(JSON.stringify({ result: JSON.parse(kv.get(key) ?? "[]") }), { status: 200 });
    }
    return new Response(JSON.stringify({ result: kv.has(key) ? kv.get(key) : null }), { status: 200 });
  };

  return {
    fetchMock,
    kv,
    headCount: () => heads,
    setReachable: (v: typeof reachable) => {
      reachable = v;
    },
    seedSiteConfig: (jitsiDomain: string) => kv.set(CONFIG_KEY, JSON.stringify({ meeting: { jitsiDomain } })),
    seedOrder: (id: string, order: Record<string, unknown>) => {
      kv.set(ORDER_KEY(id), JSON.stringify({ id, ...order }));
      const idx = JSON.parse(kv.get(ORDERS_INDEX) ?? "[]") as string[];
      idx.push(id);
      kv.set(ORDERS_INDEX, JSON.stringify(idx));
    },
  };
}

const realFetch = global.fetch;
let transport: ReturnType<typeof fakeTransport>;
let memberCookie: string;

beforeAll(async () => {
  process.env.SEAT_SECRET = "task-475-qa-door-secret";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeMemberToken } = await import("@/lib/member-auth");
  memberCookie = `pa-fren=${makeMemberToken("qatester", "onecocreation")}`;
});

beforeEach(() => {
  mockTier.mockReset();
  transport = fakeTransport();
  transport.seedSiteConfig(DOMAIN);
  process.env.KV_REST_API_URL = "https://kv.test.local/exec";
  process.env.KV_REST_API_TOKEN = "test-token";
  global.fetch = transport.fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = realFetch;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
});

async function memberGet(cookie?: string) {
  const { GET } = await import("@/app/api/qa-door/route");
  return GET(new Request("http://test.local/api/qa-door", { headers: cookie ? { cookie } : {} }));
}

const publish = () => import("@/lib/qa-door").then((m) => m.publishQa());

const SUBJECT = "qatester@onecocreation";

const baseOrder = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 2,
  state: "settled",
  lineItems: [{ itemId: QA_ITEM_ID, title: "Q&A with Love", qty: 1 }],
  priceSnapshot: { amount: 3333, currency: "USD", at: new Date().toISOString() },
  adapterId: "test",
  chargeIds: ["c1"],
  entitlementSubject: SUBJECT,
  createdAtMs: Date.now(),
  events: [],
  ...overrides,
});

describe("/api/qa-door — signed out and closed", () => {
  it("signed out, closed -> hidden, no room, reachable null", async () => {
    const data = await (await memberGet()).json();
    expect(data).toEqual({ ok: true, open: false, decision: "hidden", reachable: null });
  });

  it("signed out, published -> signin, still no room", async () => {
    await publish();
    const data = await (await memberGet()).json();
    expect(data.decision).toBe("signin");
    expect(data.room).toBeUndefined();
    expect(data.jitsiDomain).toBeUndefined();
  });

  it("signed in, closed -> hidden even though a session exists", async () => {
    const data = await (await memberGet(memberCookie)).json();
    expect(data).toEqual({ ok: true, open: false, decision: "hidden" });
  });

  it("Cache-Control: no-store on every answer", async () => {
    const res = await memberGet(memberCookie);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("/api/qa-door — entitled via tier C (Evening Star)", () => {
  it("published, tier C, reachable -> open, room rides the wire, no jitsiDomain (matches /api/stage2's own shape exactly)", async () => {
    mockTier.mockResolvedValue("C");
    transport.setReachable(200);
    const published = await publish();
    const data = await (await memberGet(memberCookie)).json();
    expect(data.decision).toBe("open");
    expect(data.open).toBe(true);
    expect(data.reachable).toBe(true);
    expect(data.room).toBe(published.room);
    expect(data.jitsiDomain).toBeUndefined();
  });

  it("unreachable -> no room, even though entitled", async () => {
    mockTier.mockResolvedValue("C");
    transport.setReachable(500);
    await publish();
    const data = await (await memberGet(memberCookie)).json();
    expect(data.decision).toBe("open");
    expect(data.reachable).toBe(false);
    expect(data.room).toBeNull();
  });

  it("tier B (Observer) alone does NOT satisfy the Q&A floor", async () => {
    mockTier.mockResolvedValue("B");
    await publish();
    const data = await (await memberGet(memberCookie)).json();
    expect(data.decision).toBe("package");
    expect(data.room).toBeUndefined();
  });
});

describe("/api/qa-door — entitled via a settled Q&A order (the show stopper this lane fixes)", () => {
  it("no tier at all, but a settled order for the Q&A pass -> open, WITH the room", async () => {
    mockTier.mockResolvedValue(null);
    transport.setReachable(200);
    transport.seedOrder(ORDER_ID(1), baseOrder({ state: "settled" }));
    const published = await publish();
    const data = await (await memberGet(memberCookie)).json();
    expect(data.decision).toBe("open");
    expect(data.room).toBe(published.room);
  });

  it("a fulfilled order (also in SETTLED_FAMILY) is entitled too", async () => {
    mockTier.mockResolvedValue(null);
    transport.setReachable(200);
    transport.seedOrder(ORDER_ID(2), baseOrder({ state: "fulfilled" }));
    await publish();
    const data = await (await memberGet(memberCookie)).json();
    expect(data.decision).toBe("open");
  });

  it("a REFUNDED order is NOT entitled — the package door shows instead, zero HEAD requests", async () => {
    mockTier.mockResolvedValue(null);
    transport.seedOrder(ORDER_ID(3), baseOrder({ state: "refunded" }));
    await publish();
    const data = await (await memberGet(memberCookie)).json();
    expect(data.decision).toBe("package");
    expect(data.room).toBeUndefined();
    expect(transport.headCount()).toBe(0);
  });

  it("an order for a DIFFERENT item never grants the Q&A", async () => {
    mockTier.mockResolvedValue(null);
    transport.seedOrder(ORDER_ID(4), baseOrder({ lineItems: [{ itemId: "some-other-item", title: "x", qty: 1 }] }));
    await publish();
    const data = await (await memberGet(memberCookie)).json();
    expect(data.decision).toBe("package");
  });

  it("an order for a DIFFERENT subject never grants the Q&A", async () => {
    mockTier.mockResolvedValue(null);
    transport.seedOrder(ORDER_ID(5), baseOrder({ entitlementSubject: "someone-else@onecocreation" }));
    await publish();
    const data = await (await memberGet(memberCookie)).json();
    expect(data.decision).toBe("package");
  });

  it("a created (not yet settled) order never grants the Q&A", async () => {
    mockTier.mockResolvedValue(null);
    transport.seedOrder(ORDER_ID(6), baseOrder({ state: "created" }));
    await publish();
    const data = await (await memberGet(memberCookie)).json();
    expect(data.decision).toBe("package");
  });
});

describe("/api/qa-door — fail closed on a thrown tier lookup", () => {
  it("503, no room, and the order ledger is never even read", async () => {
    mockTier.mockRejectedValue(new Error("registry vault down"));
    await publish();
    const res = await memberGet(memberCookie);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
