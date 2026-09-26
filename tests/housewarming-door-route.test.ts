import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { TENANT } from "@/lib/tenant";

/**
 * TASK-481 (block 968,624+) — `/api/housewarming-door`, the Housewarming's
 * member door. BEHAVIORAL, the same "call the export" idiom
 * `tests/qa-door-route.test.ts`/`tests/stage2-route.test.ts` already use:
 * KV is a fake key -> value transport on `global.fetch` (HEAD dispatched
 * separately for the reachability probe).
 *
 * Unlike `/api/qa-door`, there is NO tier/entitlement/package branch to
 * cover here — the Housewarming is FREE, so a signed-in visitor past a
 * published door goes straight to `decision: "open"` and the reachability
 * probe.
 */

const CONFIG_KEY = `site:config:${TENANT}`;
const DOMAIN = "meet.housewarming-fixture.invalid";

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
    setReachable: (v: typeof reachable) => {
      reachable = v;
    },
    seedSiteConfig: (jitsiDomain: string) => kv.set(CONFIG_KEY, JSON.stringify({ meeting: { jitsiDomain } })),
  };
}

const realFetch = global.fetch;
let transport: ReturnType<typeof fakeTransport>;
let memberCookie: string;

beforeAll(async () => {
  process.env.SEAT_SECRET = "task-481-housewarming-door-secret";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeMemberToken } = await import("@/lib/member-auth");
  memberCookie = `pa-fren=${makeMemberToken("hwtester", "onecocreation")}`;
});

beforeEach(() => {
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
  const { GET } = await import("@/app/api/housewarming-door/route");
  return GET(new Request("http://test.local/api/housewarming-door", { headers: cookie ? { cookie } : {} }));
}

const publish = () => import("@/lib/housewarming-door").then((m) => m.publishHousewarming());

describe("/api/housewarming-door — signed out and closed", () => {
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

describe("/api/housewarming-door — FREE: any signed-in visitor is entitled, no tier check", () => {
  it("published, signed in, reachable -> open, room rides the wire, no jitsiDomain (matches /api/stage2's own shape exactly)", async () => {
    transport.setReachable(200);
    const published = await publish();
    const data = await (await memberGet(memberCookie)).json();
    expect(data.decision).toBe("open");
    expect(data.open).toBe(true);
    expect(data.reachable).toBe(true);
    expect(data.room).toBe(published.room);
    expect(data.jitsiDomain).toBeUndefined();
  });

  it("unreachable -> no room, even though signed in and published", async () => {
    transport.setReachable(500);
    await publish();
    const data = await (await memberGet(memberCookie)).json();
    expect(data.decision).toBe("open");
    expect(data.reachable).toBe(false);
    expect(data.room).toBeNull();
  });

  it("never a 'package' decision — the Housewarming has no not-owned state at all", async () => {
    transport.setReachable(200);
    await publish();
    const data = await (await memberGet(memberCookie)).json();
    expect(data.decision).not.toBe("package");
    expect(data.package).toBeUndefined();
  });
});
