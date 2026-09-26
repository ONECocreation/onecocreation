import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { TENANT } from "@/lib/tenant";
import { tierForSubject } from "@/lib/member-tier";

/**
 * TASK-439 (block 968,218, rulings 1 & 4; Amendment 1 of block 968,222) —
 * THE PAID DOOR, BEHAVIORAL. The two K117 watch items live here:
 *
 *  WATCH ITEM 2 — a free member's /api/stage2 answer carries NO `room`
 *  key and NEVER triggers the Jitsi probe. The fake fetch COUNTS HEAD
 *  requests and the tests assert the count is zero — "the room is null"
 *  is not accepted as proof, per the dispatch.
 *
 * The gate sits BEFORE the probe in the route, so a tier that doesn't
 * satisfy STAGE2_MIN_TIER, a thrown membership check, an anonymous
 * caller, and an expired (post-midnight-Denver) state all answer without
 * a single HEAD leaving the process.
 *
 * `@/lib/member-tier`'s `tierForSubject` is the ONE mocked boundary; the
 * KV transport and the reachability probe keep the
 * tests/stage2-route.test.ts fakes (a real key -> value map, HEAD vs KV
 * POST dispatched on method).
 */

vi.mock("@/lib/member-tier", () => ({ tierForSubject: vi.fn() }));
const mockTier = vi.mocked(tierForSubject);

const CONFIG_KEY = `site:config:${TENANT}`;
const CATALOG_KEY = "store:catalog";
const STATE_KEY = `stage2:state:${TENANT}`;
const DOMAIN = "meet.stage2-fixture.invalid";

// TASK-465 (block 968,561) moved the floor to Observer (observer-one-week);
// TASK-471 (block 968,624, the Admiral's Saturday-night minimal fix) moved
// it back to Weekly Intuitive (weekly-one-week) for this room, so the $11
// one-time pass admits.
const WEEK_ITEM = {
  id: "weekly-one-week",
  schemaVersion: 2,
  title: "Weekly Intuitive — One Week Pass",
  blurb: "one week of the Weekly Intuitive package",
  images: [],
  kind: "package",
  price: { fiat: { amount: 2200, currency: "USD" }, sats: 22_222 },
  fulfillment: "package",
  status: "live",
};

function fakeTransport() {
  const kv = new Map<string, string>();
  let reachable = 200;
  let heads = 0;

  const fetchMock = async (url: string | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    if (method === "HEAD") {
      heads += 1;
      return new Response(null, { status: reachable });
    }
    const cmd = JSON.parse(String(init?.body)) as unknown[];
    const [op, key, value] = cmd as [string, string, string?];
    if (op === "SET") {
      kv.set(key, value as string);
      return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
    }
    return new Response(JSON.stringify({ result: kv.has(key) ? kv.get(key) : null }), { status: 200 });
  };

  return {
    fetchMock,
    kv,
    headCount: () => heads,
    setReachable: (v: number) => {
      reachable = v;
    },
    seedSiteConfig: (jitsiDomain: string) => kv.set(CONFIG_KEY, JSON.stringify({ meeting: { jitsiDomain } })),
    seedWeekItem: (status: "live" | "hidden") =>
      kv.set(CATALOG_KEY, JSON.stringify({ schemaVersion: 2, items: [{ ...WEEK_ITEM, status }] })),
  };
}

const realFetch = global.fetch;
let transport: ReturnType<typeof fakeTransport>;
let memberCookie: string;

beforeAll(async () => {
  process.env.SEAT_SECRET = "task-439-paid-door-secret";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeMemberToken } = await import("@/lib/member-auth");
  memberCookie = `pa-fren=${makeMemberToken("stage2tester", "onecocreation")}`;
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
  const { GET } = await import("@/app/api/stage2/route");
  return GET(new Request("http://test.local/api/stage2", { headers: cookie ? { cookie } : {} }));
}

const publish = () => import("@/lib/stage2").then((m) => m.publishStage2());

function expectNoStore(res: Response) {
  expect(res.headers.get("Cache-Control")).toBe("no-store");
}

describe("WATCH ITEM 2 — the free member's door: no room key, and the probe never fires (counted, not assumed)", () => {
  it("signed in, tier null, published, week item live -> decision package, the week offer present, NO room/reachable keys, ZERO HEAD requests", async () => {
    transport.seedWeekItem("live");
    mockTier.mockResolvedValue(null);
    await publish();

    const res = await memberGet(memberCookie);
    expectNoStore(res);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.open).toBe(true);
    expect(data.decision).toBe("package");
    expect("room" in data).toBe(false);
    expect("reachable" in data).toBe(false);
    expect(data.package).toEqual({
      name: "Weekly Intuitive",
      href: "/packages/weekly-intuitive",
      week: { itemId: "weekly-one-week", price: "$22" },
    });
    expect(transport.headCount()).toBe(0);
  });

  it("the same free member with the week item HIDDEN (the Admiral's data step not yet done) -> package with week: null, still no room, still zero HEAD", async () => {
    transport.seedWeekItem("hidden");
    mockTier.mockResolvedValue(null);
    await publish();

    const res = await memberGet(memberCookie);
    expectNoStore(res);
    const data = await res.json();

    expect(data.decision).toBe("package");
    expect(data.package.week).toBeNull();
    expect(data.package.name).toBe("Weekly Intuitive");
    expect("room" in data).toBe(false);
    expect("reachable" in data).toBe(false);
    expect(transport.headCount()).toBe(0);
  });
});

describe("tier A alone now satisfies the floor again (TASK-471, block 968,624 — reversing TASK-465 for this room)", () => {
  it("tier A, published -> decision open (the $11 pass grants A, and A now clears the floor)", async () => {
    transport.seedWeekItem("live");
    mockTier.mockResolvedValue("A");
    await publish();

    const res = await memberGet(memberCookie);
    expectNoStore(res);
    const data = await res.json();

    expect(data.decision).toBe("open");
  });
});

describe("the paid member gets the room — tiers B and C both satisfy the raised minimum (TASK-465, block 968,561)", () => {
  it("tier B, published and reachable -> decision open, the room, and the probe DID fire (exactly one HEAD)", async () => {
    mockTier.mockResolvedValue("B");
    const published = await publish();

    const res = await memberGet(memberCookie);
    expectNoStore(res);
    const data = await res.json();

    expect(data).toEqual({ ok: true, open: true, decision: "open", reachable: true, room: published.room });
    expect(transport.headCount()).toBe(1);
  });

  it("tier C, published and reachable -> decision open, the room", async () => {
    mockTier.mockResolvedValue("C");
    const published = await publish();

    const res = await memberGet(memberCookie);
    expectNoStore(res);
    const data = await res.json();

    expect(data).toEqual({ ok: true, open: true, decision: "open", reachable: true, room: published.room });
    expect(transport.headCount()).toBe(1);
  });
});

describe("the membership check fails closed (finding 7)", () => {
  it("tierForSubject THROWS -> 503 'membership check failed', no room key, ZERO HEAD requests", async () => {
    mockTier.mockRejectedValue(new Error("registry vault down"));
    await publish();

    const res = await memberGet(memberCookie);
    expectNoStore(res);
    expect(res.status).toBe(503);
    const data = await res.json();

    expect(data).toEqual({ ok: false, reason: "membership check failed" });
    expect("room" in data).toBe(false);
    expect(transport.headCount()).toBe(0);
  });
});

describe("anonymous and expired states — hidden/signin, never a room, never a probe", () => {
  it("anonymous, published -> decision signin, reachable null, no room, ZERO HEAD requests", async () => {
    await publish();

    const res = await memberGet();
    expectNoStore(res);
    const data = await res.json();

    expect(data).toEqual({ ok: true, open: true, reachable: null, decision: "signin" });
    expect("room" in data).toBe(false);
    expect(transport.headCount()).toBe(0);
  });

  it("published the previous Denver day, tier A -> decision hidden, no room, ZERO HEAD requests (the midnight close read through the route)", async () => {
    const stale = Date.now() - 36 * 3_600_000;
    transport.kv.set(
      STATE_KEY,
      JSON.stringify({ phase: "published", room: "oc-0123456789abcdef", openedAtMs: stale, publishedAtMs: stale }),
    );
    mockTier.mockResolvedValue("A");

    const res = await memberGet(memberCookie);
    expectNoStore(res);
    const data = await res.json();

    expect(data).toEqual({ ok: true, open: false, decision: "hidden" });
    expect("room" in data).toBe(false);
    expect(transport.headCount()).toBe(0);
  });
});
