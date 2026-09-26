import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { TENANT } from "@/lib/tenant";

/**
 * TASK-475 (block 968,624) — `/api/admin/qa-door`, the Q&A's OPERATOR
 * door. Mirrors `tests/admin-stage1-route.test.ts`'s own harness exactly
 * (BEHAVIORAL: exported GET/PUT called with constructed Requests, a REAL
 * `makeOperatorToken` cookie, KV a fake key -> value transport).
 *
 * Unlike Stage 1, the Q&A door takes Stage 2's convenience path — Publish
 * from closed is NOT refused, so there is no 409 case here; that
 * behavior itself is proven directly against `qa-door.ts` in
 * `tests/qa-door-state.test.ts`.
 */

const CONFIG_KEY = `site:config:${TENANT}`;
const STATE_KEY = `qa:state:${TENANT}`;
const DOMAIN = "meet.admin-qa-fixture.invalid";

function fakeTransport() {
  const kv = new Map<string, string>();
  const fetchMock = async (_url: string | URL, init?: RequestInit) => {
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
    seedSiteConfig: (jitsiDomain: string) => kv.set(CONFIG_KEY, JSON.stringify({ meeting: { jitsiDomain } })),
  };
}

const realFetch = global.fetch;
let transport: ReturnType<typeof fakeTransport>;
let operatorCookie: string;

beforeAll(async () => {
  process.env.SEAT_SECRET = "task-475-admin-qa-door-secret";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  operatorCookie = `fe-operator=${makeOperatorToken(pk)}`;
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

async function adminGet(cookie?: string) {
  const { GET } = await import("@/app/api/admin/qa-door/route");
  return GET(new Request("http://test.local/api/admin/qa-door", { headers: cookie ? { cookie } : {} }));
}

async function adminPut(body: unknown, cookie?: string, rawBody?: string) {
  const { PUT } = await import("@/app/api/admin/qa-door/route");
  return PUT(
    new Request("http://test.local/api/admin/qa-door", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
      body: rawBody ?? JSON.stringify(body),
    }),
  );
}

describe("the operator gate (mirrors api/admin/stage1|stage2/route.ts)", () => {
  it("GET 401s with no fe-operator cookie", async () => {
    const res = await adminGet();
    expect(res.status).toBe(401);
    expect((await res.json()).ok).toBe(false);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("PUT 401s with no fe-operator cookie", async () => {
    const res = await adminPut({ action: "prepare" });
    expect(res.status).toBe(401);
  });

  it("PUT 400s on an unknown action", async () => {
    const res = await adminPut({ action: "open" }, operatorCookie);
    expect(res.status).toBe(400);
    expect((await res.json()).ok).toBe(false);
  });

  it("PUT 400s on an unparseable body", async () => {
    const res = await adminPut(null, operatorCookie, "{not json");
    expect(res.status).toBe(400);
  });
});

describe("publish from closed is NOT refused — the Q&A door takes the convenience path", () => {
  it("PUT publish on closed mints and publishes in one step, 200", async () => {
    const res = await adminPut({ action: "publish" }, operatorCookie);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.phase).toBe("published");
    expect(data.room).toMatch(/^oc-[0-9a-f]{16}$/);
  });
});

describe("SEC-4 — a failed write answers a NO-STORE 500, never a bare throw past the handler", () => {
  it("PUT prepare, publish and close all answer 500 { ok:false, reason } with Cache-Control: no-store", async () => {
    global.fetch = (async () => {
      throw new Error("vault unreachable");
    }) as unknown as typeof fetch;

    for (const action of ["prepare", "publish", "close"]) {
      const res = await adminPut({ action }, operatorCookie);
      expect(res.status, action).toBe(500);
      expect(res.headers.get("Cache-Control"), action).toBe("no-store");
      expect(await res.json(), action).toEqual({ ok: false, reason: "the stage store didn't answer — nothing changed" });
    }
  });
});

describe("the happy path — prepare -> publish -> close, every response no-store, ITS OWN KV key", () => {
  it("walks the lifecycle, asserting exactly what each response carries", async () => {
    const closed = await (await adminGet(operatorCookie)).json();
    expect(closed).toEqual({ ok: true, phase: "closed", room: null, jitsiDomain: DOMAIN, camera: "hidden" });

    const preparePut = await adminPut({ action: "prepare" }, operatorCookie);
    expect(preparePut.headers.get("Cache-Control")).toBe("no-store");
    const prepared = await preparePut.json();
    expect(prepared.phase).toBe("prepared");
    expect(prepared.room).toMatch(/^oc-[0-9a-f]{16}$/);

    const published = await (await adminPut({ action: "publish" }, operatorCookie)).json();
    expect(published.phase).toBe("published");
    expect(published.room).toBe(prepared.room);

    const closedAgain = await (await adminPut({ action: "close" }, operatorCookie)).json();
    expect(closedAgain).toEqual({ ok: true, phase: "closed", room: null, jitsiDomain: DOMAIN, camera: "hidden" });

    /* its own key — never stage1's or stage2's */
    expect(transport.kv.has(STATE_KEY)).toBe(true);
    expect(transport.kv.has(`stage1:state:${TENANT}`)).toBe(false);
    expect(transport.kv.has(`stage2:state:${TENANT}`)).toBe(false);
  });
});
