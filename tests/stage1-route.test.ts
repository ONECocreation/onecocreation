import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TENANT } from "@/lib/tenant";

/**
 * TASK-438 (block 968,222; HOLD LIFTED block 968,269) — `/api/stage1`, the
 * PUBLIC status read ReadingStage's island polls. BEHAVIORAL (the exported
 * GET is called directly, the after-hours-door.test.ts idiom), against a
 * fake KV transport swapped onto global.fetch — the same one fetch mock
 * carries Stage 1's state AND site-config's own config under one
 * KV_REST_API_URL/TOKEN pair, so nothing here mocks `@/lib/store` or
 * `@/lib/site-config`.
 *
 * The contract (the brief's Build 2): body keys are only
 * `{ ok, phase, room, jitsiDomain }`; only a published, unexpired state
 * issues a room; the domain is read only for a published state; every
 * response is no-store; ZERO Jitsi probes (unlike /api/stage2 — a viewer
 * needs no reachability answer, the Watch click's fresh fetch is the
 * re-check); and no clock is ever taken from the request.
 */

const CONFIG_KEY = `site:config:${TENANT}`;
const STATE_KEY = `stage1:state:${TENANT}`;
const DOMAIN = "meet.stage1-fixture.invalid";

function fakeTransport() {
  const kv = new Map<string, string>();
  let kvBroken = false;
  const gets: string[] = [];
  const heads: string[] = [];

  const fetchMock = async (url: string | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    if (method === "HEAD") {
      /* a probe would be a BUG here — recorded so the tests can count it */
      heads.push(String(url));
      return new Response(null, { status: 200 });
    }
    if (kvBroken) throw new Error("kv down");
    const cmd = JSON.parse(String(init?.body)) as unknown[];
    const [op, key, value] = cmd as [string, string, string?];
    if (op === "GET") gets.push(key);
    if (op === "SET") {
      kv.set(key, value as string);
      return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
    }
    return new Response(JSON.stringify({ result: kv.has(key) ? kv.get(key) : null }), { status: 200 });
  };

  return {
    fetchMock,
    kv,
    gets,
    heads,
    setKvBroken: (v: boolean) => {
      kvBroken = v;
    },
    seedSiteConfig: (jitsiDomain: string) => kv.set(CONFIG_KEY, JSON.stringify({ meeting: { jitsiDomain } })),
  };
}

const realFetch = global.fetch;
let transport: ReturnType<typeof fakeTransport>;

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

async function publicGet(headers?: Record<string, string>) {
  const { GET } = await import("@/app/api/stage1/route");
  return GET(new Request("http://test.local/api/stage1", { headers }));
}

const prep = () => import("@/lib/stage1").then((m) => m.prepareStage1());
const pub = () => import("@/lib/stage1").then((m) => m.publishStage1());

const ALLOWLIST = ["jitsiDomain", "ok", "phase", "room"]; // sorted

describe("the exact body allowlist — { ok, phase, room, jitsiDomain } and nothing else, in every phase", () => {
  it("closed", async () => {
    const data = await (await publicGet()).json();
    expect(Object.keys(data).sort()).toEqual(ALLOWLIST);
    expect(data).toEqual({ ok: true, phase: "closed", room: null, jitsiDomain: null });
  });

  it("prepared — the phase is honest, but no room and no domain are issued (publishing, not preparing, makes the door exist)", async () => {
    await prep();
    const data = await (await publicGet()).json();
    expect(Object.keys(data).sort()).toEqual(ALLOWLIST);
    expect(data).toEqual({ ok: true, phase: "prepared", room: null, jitsiDomain: null });
  });

  it("an expired stored published doc reads closed — never a room", async () => {
    transport.kv.set(
      STATE_KEY,
      JSON.stringify({
        phase: "published",
        room: "oc-fedcba9876543210",
        openedAtMs: Date.now() - 36 * 3_600_000,
        publishedAtMs: Date.now() - 36 * 3_600_000,
      }),
    );
    const data = await (await publicGet()).json();
    expect(data).toEqual({ ok: true, phase: "closed", room: null, jitsiDomain: null });
  });

  it("published — the one phase that issues the room AND the domain", async () => {
    await prep();
    const published = await pub();
    const data = await (await publicGet()).json();
    expect(Object.keys(data).sort()).toEqual(ALLOWLIST);
    expect(data).toEqual({ ok: true, phase: "published", room: published!.room, jitsiDomain: DOMAIN });
  });
});

describe("the domain is read ONLY for a published state", () => {
  it("closed: site-config is never even read", async () => {
    await publicGet();
    expect(transport.gets).not.toContain(CONFIG_KEY);
  });

  it("prepared: site-config is never read either", async () => {
    await prep();
    await publicGet();
    expect(transport.gets).not.toContain(CONFIG_KEY);
  });

  it("published: the domain comes from getSiteConfig().meeting.jitsiDomain, the one source", async () => {
    await prep();
    await pub();
    const data = await (await publicGet()).json();
    expect(transport.gets).toContain(CONFIG_KEY);
    expect(data.jitsiDomain).toBe(DOMAIN);
  });
});

describe("ZERO Jitsi probes — no HEAD ever leaves this route", () => {
  it("not for closed, prepared, or published", async () => {
    await publicGet();
    await prep();
    await publicGet();
    await pub();
    await publicGet();
    expect(transport.heads).toEqual([]);
  });
});

describe("Cache-Control: no-store on every response", () => {
  it("closed", async () => {
    const res = await publicGet();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("published", async () => {
    await prep();
    await pub();
    const res = await publicGet();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("dependency failure fails CLOSED — a broken vault reads as a closed stage, never a 500, never a guessed-open room", () => {
  it("kv() throwing -> the closed body", async () => {
    transport.setKvBroken(true);
    const res = await publicGet();
    expect(res.status).not.toBe(500);
    expect(await res.json()).toEqual({ ok: true, phase: "closed", room: null, jitsiDomain: null });
  });
});

describe("no clock is ever taken from the request", () => {
  it("a far-future Date header changes nothing — the answer is identical", async () => {
    const plain = await (await publicGet()).json();
    const forged = await (
      await publicGet({ date: new Date(Date.now() + 365 * 24 * 3_600_000).toUTCString(), "x-now-ms": "99999999999999" })
    ).json();
    expect(forged).toEqual(plain);
  });
});
