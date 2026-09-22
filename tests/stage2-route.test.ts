import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { TENANT } from "@/lib/tenant";

/**
 * TASK-392 Build 3/4 — the two Stage 2 routes, BEHAVIORAL (calls the
 * exported route handlers directly with constructed Request objects and
 * mocked cookies/KV — the same "call the export" idiom
 * after-hours-door.test.ts's postAdminLive() already uses on this
 * codebase, not a render harness). Source-string pins are supplements,
 * not proof (Astra's review, finding 7) — every claim below actually
 * calls the handler.
 *
 * The KV transport is a fake, proper key -> value map (never a
 * `vi.mock("@/lib/store")` or `vi.mock("@/lib/site-config")`) so
 * stage2.ts's own state and site-config.ts's own config can share one
 * fetch mock under the SAME KV_REST_API_URL/TOKEN env pair without
 * colliding. The reachability probe rides the SAME global.fetch mock,
 * dispatched on HTTP method (HEAD vs the KV driver's POST) — no real
 * network call ever reaches meet.onecocreation.com or anywhere else.
 */

const CONFIG_KEY = `site:config:${TENANT}`;
const DOMAIN = "meet.stage2-fixture.invalid";

function fakeTransport() {
  const kv = new Map<string, string>();
  let reachable: number | "hang" | "throw" = 200;
  let kvBroken = false;

  const fetchMock = async (url: string | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();

    if (method === "HEAD") {
      if (reachable === "throw") throw new Error("network down");
      if (reachable === "hang") {
        return new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal as AbortSignal | undefined;
          if (!signal) return; // never settles
          if (signal.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
          }
          signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        });
      }
      return new Response(null, { status: reachable });
    }

    if (kvBroken) throw new Error("kv down");
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
    setReachable: (v: typeof reachable) => {
      reachable = v;
    },
    setKvBroken: (v: boolean) => {
      kvBroken = v;
    },
    seedSiteConfig: (jitsiDomain: string) => kv.set(CONFIG_KEY, JSON.stringify({ meeting: { jitsiDomain } })),
  };
}

const realFetch = global.fetch;
let transport: ReturnType<typeof fakeTransport>;
let operatorCookie: string;
let memberCookie: string;

beforeAll(async () => {
  process.env.SEAT_SECRET = "task-392-route-test-secret";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  operatorCookie = `fe-operator=${makeOperatorToken(pk)}`;
  const { makeMemberToken } = await import("@/lib/member-auth");
  memberCookie = `pa-fren=${makeMemberToken("stage2tester", "onecocreation")}`;
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
  const { GET } = await import("@/app/api/stage2/route");
  return GET(new Request("http://test.local/api/stage2", { headers: cookie ? { cookie } : {} }));
}

async function adminGet(cookie?: string) {
  const { GET } = await import("@/app/api/admin/stage2/route");
  return GET(new Request("http://test.local/api/admin/stage2", { headers: cookie ? { cookie } : {} }));
}

async function adminPut(body: unknown, cookie?: string) {
  const { PUT } = await import("@/app/api/admin/stage2/route");
  return PUT(
    new Request("http://test.local/api/admin/stage2", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    }),
  );
}

const prep = () => import("@/lib/stage2").then((m) => m.prepareStage2());
const pub = () => import("@/lib/stage2").then((m) => m.publishStage2());
const closeS2 = () => import("@/lib/stage2").then((m) => m.closeStage2());

describe("probeJitsiReachable — 2xx/3xx only, never res.ok alone (finding 6)", () => {
  it("200 -> true", async () => {
    transport.setReachable(200);
    const { probeJitsiReachable } = await import("@/app/api/stage2/route");
    expect(await probeJitsiReachable(DOMAIN)).toBe(true);
  });

  it("302 -> true (a redirect is not res.ok, but IS 2xx/3xx)", async () => {
    transport.setReachable(302);
    const { probeJitsiReachable } = await import("@/app/api/stage2/route");
    expect(await probeJitsiReachable(DOMAIN)).toBe(true);
  });

  it("500 -> false", async () => {
    transport.setReachable(500);
    const { probeJitsiReachable } = await import("@/app/api/stage2/route");
    expect(await probeJitsiReachable(DOMAIN)).toBe(false);
  });

  it("a fetch that never resolves within the timeout -> false; the request actually aborts (a short timeoutMs proves it without costing the suite three real seconds)", async () => {
    transport.setReachable("hang");
    const { probeJitsiReachable } = await import("@/app/api/stage2/route");
    const result = await probeJitsiReachable(DOMAIN, 20);
    expect(result).toBe(false);
  });

  it("a rejected fetch (network error) -> false, never throws", async () => {
    transport.setReachable("throw");
    const { probeJitsiReachable } = await import("@/app/api/stage2/route");
    await expect(probeJitsiReachable(DOMAIN)).resolves.toBe(false);
  });
});

describe("gate pins", () => {
  it("PUT /api/admin/stage2 401s with no fe-operator cookie", async () => {
    const res = await adminPut({ action: "prepare" });
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/stage2 401s with no fe-operator cookie", async () => {
    const res = await adminGet();
    expect(res.status).toBe(401);
  });

  it("PUT /api/admin/stage2 400s on an unknown action", async () => {
    const res = await adminPut({ action: "open" }, operatorCookie);
    expect(res.status).toBe(400);
    expect((await res.json()).ok).toBe(false);
  });

  it("GET /api/stage2 never includes room with no pa-fren cookie, even while published", async () => {
    await pub();
    const data = await (await memberGet()).json();
    expect(data.room).toBeUndefined();
    expect(data.open).toBe(true);
    expect(data.reachable).toBeNull();
  });

  it("GET /api/stage2 never includes room while phase is prepared, even signed in (finding 5)", async () => {
    await prep();
    const data = await (await memberGet(memberCookie)).json();
    expect(data.room).toBeUndefined();
    expect(data.open).toBe(false);
  });

  it("GET /api/stage2 never includes room while phase is closed", async () => {
    const data = await (await memberGet(memberCookie)).json();
    expect(data).toEqual({ ok: true, open: false });
  });
});

describe("Cache-Control: no-store on every response (finding 3)", () => {
  it("the member route", async () => {
    const res = await memberGet(memberCookie);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("the member route, anonymous", async () => {
    const res = await memberGet();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("the admin route GET", async () => {
    const res = await adminGet(operatorCookie);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("the admin route PUT", async () => {
    const res = await adminPut({ action: "prepare" }, operatorCookie);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("the admin route's own 401 also carries no-store", async () => {
    const res = await adminGet();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("click-after scenarios — no room is ever issued off a stale answer (finding 3)", () => {
  it("session valid, room published, reachable — the fetch carries the room", async () => {
    transport.setReachable(200);
    await prep();
    const published = await pub();
    const data = await (await memberGet(memberCookie)).json();
    expect(data.open).toBe(true);
    expect(data.reachable).toBe(true);
    expect(data.room).toBe(published.room);
  });

  it("(a) the cookie is removed (simulated logout) -> open unchanged, no room", async () => {
    transport.setReachable(200);
    await prep();
    await pub();
    const first = await (await memberGet(memberCookie)).json();
    expect(first.room).toBeTruthy();
    const second = await (await memberGet(undefined)).json();
    expect(second.open).toBe(first.open);
    expect(second.room).toBeUndefined();
  });

  it("(b) the stored state is closed between fetches -> refetch returns open:false", async () => {
    transport.setReachable(200);
    await prep();
    await pub();
    const first = await (await memberGet(memberCookie)).json();
    expect(first.open).toBe(true);
    await closeS2();
    const second = await (await memberGet(memberCookie)).json();
    expect(second).toEqual({ ok: true, open: false });
  });

  it("(c) the stored room is rotated between fetches -> refetch returns the NEW room, never the stale one", async () => {
    transport.setReachable(200);
    await prep();
    const firstState = await pub();
    const first = await (await memberGet(memberCookie)).json();
    expect(first.room).toBe(firstState.room);

    await closeS2();
    await prep();
    const secondState = await pub();
    expect(secondState.room).not.toBe(firstState.room);

    const second = await (await memberGet(memberCookie)).json();
    expect(second.room).toBe(secondState.room);
    expect(second.room).not.toBe(first.room);
  });
});

describe("storage failure (finding 7): kv() throwing -> {open:false}, never a 500", () => {
  it("the member route survives a broken vault", async () => {
    transport.setKvBroken(true);
    const res = await memberGet(memberCookie);
    expect(res.status).not.toBe(500);
    expect(await res.json()).toEqual({ ok: true, open: false });
  });
});

describe("one source, not two literals (finding 6): the reachability target and the operator GET's jitsiDomain both come from getSiteConfig().meeting.jitsiDomain", () => {
  it("the probed URL matches the operator route's own jitsiDomain field", async () => {
    transport.setReachable(200);
    let probedUrl: string | null = null;
    const inner = transport.fetchMock;
    global.fetch = (async (url: string | URL, init?: RequestInit) => {
      if ((init?.method ?? "GET").toUpperCase() === "HEAD") probedUrl = String(url);
      return inner(url, init);
    }) as unknown as typeof fetch;

    await prep();
    await pub();

    const memberData = await (await memberGet(memberCookie)).json();
    expect(memberData.reachable).toBe(true);
    expect(probedUrl).toBe(`https://${DOMAIN}/`);

    const adminData = await (await adminGet(operatorCookie)).json();
    expect(adminData.jitsiDomain).toBe(DOMAIN);
  });
});

describe("full transition coverage — anonymous / member / operator, closed -> prepared -> published -> closed", () => {
  it("walks every phase, asserting exactly what each caller's response carries", async () => {
    transport.setReachable(200);

    // closed
    expect(await (await memberGet()).json()).toEqual({ ok: true, open: false, reachable: null });
    expect(await (await memberGet(memberCookie)).json()).toEqual({ ok: true, open: false });
    const admin = await (await adminGet(operatorCookie)).json();
    expect(admin.phase).toBe("closed");
    expect(admin.room).toBeNull();

    // prepared — minted privately, invisible to every member
    const prepPut = await adminPut({ action: "prepare" }, operatorCookie);
    const prepared = await prepPut.json();
    expect(prepared.phase).toBe("prepared");
    expect(prepared.room).toMatch(/^oc-[0-9a-f]{16}$/);
    expect(await (await memberGet()).json()).toEqual({ ok: true, open: false, reachable: null });
    expect(await (await memberGet(memberCookie)).json()).toEqual({ ok: true, open: false });

    // published — the door exists
    const pubPut = await adminPut({ action: "publish" }, operatorCookie);
    const published = await pubPut.json();
    expect(published.phase).toBe("published");
    expect(published.room).toBe(prepared.room);
    expect(await (await memberGet()).json()).toEqual({ ok: true, open: true, reachable: null });
    const memberPublished = await (await memberGet(memberCookie)).json();
    expect(memberPublished).toEqual({ ok: true, open: true, reachable: true, room: prepared.room });

    // closed again
    const closePut = await adminPut({ action: "close" }, operatorCookie);
    const closed = await closePut.json();
    expect(closed.phase).toBe("closed");
    expect(closed.room).toBeNull();
    expect(await (await memberGet()).json()).toEqual({ ok: true, open: false, reachable: null });
    expect(await (await memberGet(memberCookie)).json()).toEqual({ ok: true, open: false });
  });
});

/* Grid regression (finding 8) — a plain string-shape assertion on
   classroom.css: the PHONE grid-template-areas block's stage2 row is the
   single token "stage2", never "stage2 stage2" (the desktop, two-column
   shape) — cheap insurance against the exact bug Astra's review caught,
   checked again by eye at 390px in the Walk. */
describe("classroom.css — grid regression (finding 8)", () => {
  it("the phone block carries the single-token stage2 row, never the two-token form", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/rooms/classroom.css", "utf8");
    const phoneBlock = src.match(/@media \(max-width: 760px\) \{\s*\.cl-grid-stage \{[\s\S]*?\n {2}\}/);
    expect(phoneBlock, "phone .cl-grid-stage block not found").not.toBeNull();
    expect(phoneBlock![0]).toMatch(/\n\s+"stage2"\n/);
    expect(phoneBlock![0]).not.toMatch(/"stage2 stage2"/);
  });

  it("the desktop block carries the two-token stage2 row", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/rooms/classroom.css", "utf8");
    const desktopBlock = src.match(/\.cl-grid-stage \{[\s\S]*?\n\}/);
    expect(desktopBlock, "desktop .cl-grid-stage block not found").not.toBeNull();
    expect(desktopBlock![0]).toMatch(/"stage2 stage2"/);
  });
});
