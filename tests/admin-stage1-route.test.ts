import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { TENANT } from "@/lib/tenant";

/**
 * TASK-438 (block 968,222; HOLD LIFTED block 968,269) — `/api/admin/stage1`,
 * Stage 1's OPERATOR door, mirroring `api/admin/stage2/route.ts`'s gate
 * shape exactly (401 without an operator, actions prepare|publish|close,
 * 400 for bad input) with this lane's one deliberate difference: Publish
 * from closed — including an expired stored state — is REFUSED with 409
 * (Stage 1's room only ever exists after Prepare; never mint on Publish).
 *
 * BEHAVIORAL: the exported GET/PUT are called directly with constructed
 * Requests, the operator cookie is a REAL `makeOperatorToken` under a
 * test SEAT_SECRET/OPERATOR_NPUBS pair (tests/stage2-route.test.ts's own
 * harness), and KV is a fake key -> value transport on global.fetch.
 */

const CONFIG_KEY = `site:config:${TENANT}`;
const STATE_KEY = `stage1:state:${TENANT}`;
const DOMAIN = "meet.stage1-fixture.invalid";

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
  process.env.SEAT_SECRET = "task-438-route-test-secret";
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
  const { GET } = await import("@/app/api/admin/stage1/route");
  return GET(new Request("http://test.local/api/admin/stage1", { headers: cookie ? { cookie } : {} }));
}

async function adminPut(body: unknown, cookie?: string, rawBody?: string) {
  const { PUT } = await import("@/app/api/admin/stage1/route");
  return PUT(
    new Request("http://test.local/api/admin/stage1", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
      body: rawBody ?? JSON.stringify(body),
    }),
  );
}

describe("the operator gate (mirrors api/admin/stage2/route.ts)", () => {
  it("GET 401s with no fe-operator cookie", async () => {
    const res = await adminGet();
    expect(res.status).toBe(401);
    expect((await res.json()).ok).toBe(false);
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

describe("Publish from closed is REFUSED with 409 — never a mint on Publish (the brief's Build 2)", () => {
  it("closed -> 409, ok:false, and the state stays closed with no room", async () => {
    const res = await adminPut({ action: "publish" }, operatorCookie);
    expect(res.status).toBe(409);
    expect((await res.json()).ok).toBe(false);
    const after = await (await adminGet(operatorCookie)).json();
    expect(after.phase).toBe("closed");
    expect(after.room).toBeNull();
    expect(transport.kv.has(STATE_KEY)).toBe(false);
  });

  it("an EXPIRED stored state (reads closed past Denver midnight) -> 409 the same way, the stored doc untouched", async () => {
    const stored = JSON.stringify({
      phase: "published",
      room: "oc-fedcba9876543210",
      openedAtMs: Date.now() - 36 * 3_600_000,
      publishedAtMs: Date.now() - 36 * 3_600_000,
    });
    transport.kv.set(STATE_KEY, stored);
    const res = await adminPut({ action: "publish" }, operatorCookie);
    expect(res.status).toBe(409);
    expect(transport.kv.get(STATE_KEY)).toBe(stored);
  });

  it("the refused publish carries no-store too", async () => {
    const res = await adminPut({ action: "publish" }, operatorCookie);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("SEC-4 (K122 item 5) — with the vault down, a failed write answers a NO-STORE 500 with honest words, never a bare throw past the handler", () => {
  it("PUT prepare and PUT close both answer 500 { ok:false, reason } with Cache-Control: no-store", async () => {
    global.fetch = (async () => {
      throw new Error("vault unreachable");
    }) as unknown as typeof fetch;

    const prep = await adminPut({ action: "prepare" }, operatorCookie);
    expect(prep.status).toBe(500);
    expect(prep.headers.get("Cache-Control")).toBe("no-store");
    expect(await prep.json()).toEqual({ ok: false, reason: "the stage store didn't answer — nothing changed" });

    const close = await adminPut({ action: "close" }, operatorCookie);
    expect(close.status).toBe(500);
    expect(close.headers.get("Cache-Control")).toBe("no-store");
    expect(await close.json()).toEqual({ ok: false, reason: "the stage store didn't answer — nothing changed" });
  });
});

describe("the happy path — prepare -> publish -> close, every response no-store", () => {
  it("walks the lifecycle, asserting exactly what each response carries", async () => {
    /* closed */
    const closed = await (await adminGet(operatorCookie)).json();
    expect(closed).toEqual({ ok: true, phase: "closed", room: null, jitsiDomain: DOMAIN });

    /* prepare — minted privately */
    const prepRes = await adminPut({ action: "prepare" }, operatorCookie);
    expect(prepRes.headers.get("Cache-Control")).toBe("no-store");
    const prepared = await prepRes.json();
    expect(prepared.ok).toBe(true);
    expect(prepared.phase).toBe("prepared");
    expect(prepared.room).toMatch(/^oc-[0-9a-f]{16}$/);
    expect(prepared.jitsiDomain).toBe(DOMAIN);

    /* publish — the SAME room, no remint */
    const pubRes = await adminPut({ action: "publish" }, operatorCookie);
    expect(pubRes.status).toBe(200);
    const published = await pubRes.json();
    expect(published.phase).toBe("published");
    expect(published.room).toBe(prepared.room);

    /* close — IDLE verbatim */
    const closeRes = await adminPut({ action: "close" }, operatorCookie);
    expect(closeRes.status).toBe(200);
    const closedAgain = await closeRes.json();
    expect(closedAgain.phase).toBe("closed");
    expect(closedAgain.room).toBeNull();
  });

  it("the GET and the 401/400s carry no-store as well", async () => {
    expect((await adminGet(operatorCookie)).headers.get("Cache-Control")).toBe("no-store");
    expect((await adminGet()).headers.get("Cache-Control")).toBe("no-store");
    expect((await adminPut({ action: "open" }, operatorCookie)).headers.get("Cache-Control")).toBe("no-store");
  });
});
