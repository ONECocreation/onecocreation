import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { TENANT } from "@/lib/tenant";
import type { Stage1State } from "@/lib/stage1";

/**
 * TASK-438 (block 968,222; HOLD LIFTED block 968,269) — Stage 1's OWN
 * three-phase lifecycle (closed -> prepared -> published), mirroring
 * tests/stage2-state.test.ts's no-KV-mock style: the REAL store.ts kv()
 * runs against a fake HTTP transport swapped onto global.fetch, a proper
 * key -> value map, never a vi.mock("@/lib/store").
 *
 * Where Stage 1 deliberately DIFFERS from Stage 2 (the brief's Build 1):
 * publish from closed — including an expired stored state — is REFUSED
 * (null, nothing written, never a mint), because Stage 1's room must only
 * ever exist after Love has prepared it and is standing inside it.
 * `stage2Expired` is imported read-only (structural typing — the
 * "America/Denver" literal is never copied here), so the same midnight
 * close applies: an expired state reads IDLE and the next Prepare mints
 * fresh.
 */

const KEY = `stage1:state:${TENANT}`;
const STAGE2_KEY = `stage2:state:${TENANT}`;
const IDLE: Stage1State = { phase: "closed", room: null, openedAtMs: null, publishedAtMs: null };

function fakeKvStore() {
  const store = new Map<string, string>();
  const fetchMock = async (_url: string | URL, init?: RequestInit) => {
    const cmd = JSON.parse(String(init?.body)) as unknown[];
    const [op, key, value] = cmd as [string, string, string?];
    if (op === "SET") {
      store.set(key, value as string);
      return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
    }
    return new Response(JSON.stringify({ result: store.has(key) ? store.get(key) : null }), { status: 200 });
  };
  return { fetchMock, store };
}

const realFetch = global.fetch;
let kvStore: ReturnType<typeof fakeKvStore>;

beforeEach(() => {
  kvStore = fakeKvStore();
  process.env.KV_REST_API_URL = "https://kv.test.local/exec";
  process.env.KV_REST_API_TOKEN = "test-token";
  global.fetch = kvStore.fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = realFetch;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
});

/* The midnight close reads anchors as America/Denver CALENDAR dates (the
   imported stage2Expired), so fixtures that must survive the cutoff use
   now-relative stamps. */
const fresh = () => Date.now();
/** Always at least one Denver calendar day in the past (36 h back crosses
 *  a Denver midnight from any starting instant). */
const stale = () => Date.now() - 36 * 3_600_000;

describe("getStage1State — fail-closed on malformed KV (the stage2.ts invariant, mirrored)", () => {
  it("no stored value at all -> IDLE", async () => {
    const { getStage1State } = await import("@/lib/stage1");
    expect(await getStage1State()).toEqual(IDLE);
  });

  it("a good prepared state round-trips (a stored doc without publishedAtMs reads it as null)", async () => {
    const openedAtMs = fresh();
    kvStore.store.set(KEY, JSON.stringify({ phase: "prepared", room: "oc-0123456789abcdef", openedAtMs }));
    const { getStage1State } = await import("@/lib/stage1");
    expect(await getStage1State()).toEqual({ phase: "prepared", room: "oc-0123456789abcdef", openedAtMs, publishedAtMs: null });
  });

  it("a good published state round-trips", async () => {
    const openedAtMs = fresh();
    const publishedAtMs = fresh();
    kvStore.store.set(KEY, JSON.stringify({ phase: "published", room: "oc-fedcba9876543210", openedAtMs, publishedAtMs }));
    const { getStage1State } = await import("@/lib/stage1");
    expect(await getStage1State()).toEqual({ phase: "published", room: "oc-fedcba9876543210", openedAtMs, publishedAtMs });
  });

  it("an out-of-set phase -> IDLE", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "open", room: "oc-0123456789abcdef", openedAtMs: fresh() }));
    const { getStage1State } = await import("@/lib/stage1");
    expect(await getStage1State()).toEqual(IDLE);
  });

  it("phase !== closed with room: null -> IDLE", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "prepared", room: null, openedAtMs: fresh() }));
    const { getStage1State } = await import("@/lib/stage1");
    expect(await getStage1State()).toEqual(IDLE);
  });

  it("phase === closed with a non-null room -> IDLE", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "closed", room: "oc-0123456789abcdef", openedAtMs: null }));
    const { getStage1State } = await import("@/lib/stage1");
    expect(await getStage1State()).toEqual(IDLE);
  });

  it("a room string that doesn't match oc-<16 hex> -> IDLE", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "published", room: "not-a-real-room", openedAtMs: fresh() }));
    const { getStage1State } = await import("@/lib/stage1");
    expect(await getStage1State()).toEqual(IDLE);
  });

  it("unparsable JSON -> IDLE, never throws", async () => {
    kvStore.store.set(KEY, "{not json");
    const { getStage1State } = await import("@/lib/stage1");
    await expect(getStage1State()).resolves.toEqual(IDLE);
  });

  it("storage failure (kv() throwing) -> IDLE, never rejects", async () => {
    global.fetch = (async () => {
      throw new Error("kv down");
    }) as unknown as typeof fetch;
    const { getStage1State } = await import("@/lib/stage1");
    await expect(getStage1State()).resolves.toEqual(IDLE);
  });

  it("an UNCONFIGURED vault (kv() returns null) -> IDLE, never throws", async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    const { getStage1State } = await import("@/lib/stage1");
    await expect(getStage1State()).resolves.toEqual(IDLE);
  });
});

describe("its OWN KV key — never Stage 2's, never the studio door's, never site-config", () => {
  it("a doc under Stage 2's key never leaks into Stage 1's read", async () => {
    kvStore.store.set(
      STAGE2_KEY,
      JSON.stringify({ phase: "published", room: "oc-fedcba9876543210", openedAtMs: fresh(), publishedAtMs: fresh() }),
    );
    const { getStage1State } = await import("@/lib/stage1");
    expect(await getStage1State()).toEqual(IDLE);
  });

  it("prepareStage1 writes Stage 1's key only — Stage 2's key stays untouched", async () => {
    const { prepareStage1 } = await import("@/lib/stage1");
    await prepareStage1();
    expect(kvStore.store.has(KEY)).toBe(true);
    expect(kvStore.store.has(STAGE2_KEY)).toBe(false);
  });
});

describe("getStage1State — the midnight close lives HERE (the imported stage2Expired, never a copied literal)", () => {
  it("a summer (MDT) publish lives until Denver midnight, then dies AT midnight — nothing written on read", async () => {
    kvStore.store.set(
      KEY,
      JSON.stringify({
        phase: "published",
        room: "oc-fedcba9876543210",
        openedAtMs: Date.parse("2026-09-26T18:00:00Z"),
        publishedAtMs: Date.parse("2026-09-26T19:30:00Z"),
      }),
    );
    const { getStage1State } = await import("@/lib/stage1");
    /* still the same Denver day -> live */
    expect(await getStage1State(Date.parse("2026-09-27T05:59:59Z"))).toEqual({
      phase: "published",
      room: "oc-fedcba9876543210",
      openedAtMs: Date.parse("2026-09-26T18:00:00Z"),
      publishedAtMs: Date.parse("2026-09-26T19:30:00Z"),
    });
    /* one second past Denver midnight -> closed, the stored doc untouched */
    expect(await getStage1State(Date.parse("2026-09-27T06:00:00Z"))).toEqual(IDLE);
    expect(kvStore.store.get(KEY)).toContain("oc-fedcba9876543210");
  });

  it("the winter (MST) case — the boundary moves with the zone", async () => {
    kvStore.store.set(
      KEY,
      JSON.stringify({
        phase: "published",
        room: "oc-0123456789abcdef",
        openedAtMs: Date.parse("2026-12-05T19:00:00Z"),
        publishedAtMs: Date.parse("2026-12-05T20:00:00Z"),
      }),
    );
    const { getStage1State } = await import("@/lib/stage1");
    expect((await getStage1State(Date.parse("2026-12-06T06:59:59Z"))).phase).toBe("published");
    expect(await getStage1State(Date.parse("2026-12-06T07:00:00Z"))).toEqual(IDLE);
  });

  it("a non-closed stored doc with NO anchor reads IDLE (fail closed)", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "prepared", room: "oc-0123456789abcdef" }));
    const { getStage1State } = await import("@/lib/stage1");
    expect(await getStage1State(fresh())).toEqual(IDLE);
  });
});

describe("prepareStage1 / publishStage1 / closeStage1 — the three-phase transitions", () => {
  it("prepareStage1 on closed mints once, writes prepared with publishedAtMs: null", async () => {
    const { prepareStage1, getStage1State } = await import("@/lib/stage1");
    const s = await prepareStage1();
    expect(s.phase).toBe("prepared");
    expect(s.room).toMatch(/^oc-[0-9a-f]{16}$/);
    expect(s.publishedAtMs).toBeNull();
    expect(await getStage1State()).toEqual(s);
  });

  it("prepareStage1 called again on prepared returns the SAME room, mints nothing", async () => {
    const { prepareStage1 } = await import("@/lib/stage1");
    const first = await prepareStage1();
    const second = await prepareStage1();
    expect(second.room).toBe(first.room);
    expect(second.phase).toBe("prepared");
  });

  it("prepareStage1 on an already-published state is idempotent too (mints nothing)", async () => {
    const { prepareStage1, publishStage1 } = await import("@/lib/stage1");
    await prepareStage1();
    const published = await publishStage1();
    const again = await prepareStage1();
    expect(again).toEqual(published);
  });

  it("an EXPIRED stored doc + prepareStage1() mints a NEW room — Friday's room is never re-used on Saturday", async () => {
    kvStore.store.set(
      KEY,
      JSON.stringify({ phase: "prepared", room: "oc-0123456789abcdef", openedAtMs: stale(), publishedAtMs: null }),
    );
    const { prepareStage1, getStage1State } = await import("@/lib/stage1");
    const next = await prepareStage1();
    expect(next.phase).toBe("prepared");
    expect(next.room).toMatch(/^oc-[0-9a-f]{16}$/);
    expect(next.room).not.toBe("oc-0123456789abcdef");
    expect(await getStage1State()).toEqual(next);
  });

  it("publishStage1 on prepared keeps the same room and openedAtMs, and STAMPS publishedAtMs", async () => {
    const { prepareStage1, publishStage1 } = await import("@/lib/stage1");
    const prepared = await prepareStage1();
    const before = Date.now();
    const published = await publishStage1();
    expect(published).not.toBeNull();
    expect(published!.phase).toBe("published");
    expect(published!.room).toBe(prepared.room);
    expect(published!.openedAtMs).toBe(prepared.openedAtMs);
    expect(published!.publishedAtMs).toBeGreaterThanOrEqual(before);
  });

  it("publishStage1 on already-published is a no-op (the first stamp stands)", async () => {
    const { prepareStage1, publishStage1 } = await import("@/lib/stage1");
    await prepareStage1();
    const first = await publishStage1();
    const second = await publishStage1();
    expect(second).toEqual(first);
  });

  it("publishStage1 on CLOSED is REFUSED — null, nothing written, NEVER a mint (the brief's Build 1)", async () => {
    const { publishStage1, getStage1State } = await import("@/lib/stage1");
    const refused = await publishStage1();
    expect(refused).toBeNull();
    expect(await getStage1State()).toEqual(IDLE);
    expect(kvStore.store.has(KEY)).toBe(false);
  });

  it("publishStage1 on an EXPIRED stored state is REFUSED the same way — the stored doc is left untouched", async () => {
    const stored = JSON.stringify({
      phase: "published",
      room: "oc-fedcba9876543210",
      openedAtMs: stale(),
      publishedAtMs: stale(),
    });
    kvStore.store.set(KEY, stored);
    const { publishStage1 } = await import("@/lib/stage1");
    const refused = await publishStage1();
    expect(refused).toBeNull();
    expect(kvStore.store.get(KEY)).toBe(stored); // expiry reads write nothing, and a refused publish writes nothing either
  });

  it("closeStage1 from any phase writes IDLE verbatim", async () => {
    const { prepareStage1, publishStage1, closeStage1, getStage1State } = await import("@/lib/stage1");
    await prepareStage1();
    await publishStage1();
    const closed = await closeStage1();
    expect(closed).toEqual(IDLE);
    expect(await getStage1State()).toEqual(closed);
  });

  it("closeStage1 on an already-closed state is trivially idempotent", async () => {
    const { closeStage1 } = await import("@/lib/stage1");
    const a = await closeStage1();
    const b = await closeStage1();
    expect(a).toEqual(b);
  });

  it("a second prepare+publish after close mints a NEW room, never the old one (rotation)", async () => {
    const { prepareStage1, publishStage1, closeStage1 } = await import("@/lib/stage1");
    await prepareStage1();
    const first = await publishStage1();
    await closeStage1();
    await prepareStage1();
    const second = await publishStage1();
    expect(second!.room).not.toBe(first!.room);
  });
});

describe("failed writes never report success (the brief's Build 1)", () => {
  it("kv() throwing on the SET -> prepareStage1 rejects, never resolves a state it failed to store", async () => {
    global.fetch = (async (_url: string | URL, init?: RequestInit) => {
      const cmd = JSON.parse(String(init?.body)) as unknown[];
      if (cmd[0] === "SET") throw new Error("kv down");
      return new Response(JSON.stringify({ result: null }), { status: 200 });
    }) as unknown as typeof fetch;
    const { prepareStage1 } = await import("@/lib/stage1");
    await expect(prepareStage1()).rejects.toThrow();
  });

  it("an UNCONFIGURED vault (kv() returns null on the SET) -> prepareStage1 rejects too — a silent null must never read as written", async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    const { prepareStage1 } = await import("@/lib/stage1");
    await expect(prepareStage1()).rejects.toThrow();
  });

  it("publishStage1 on prepared with the SET failing -> rejects (the phase never advances unwritten)", async () => {
    const { prepareStage1, publishStage1, getStage1State } = await import("@/lib/stage1");
    await prepareStage1();
    const inner = kvStore.fetchMock;
    global.fetch = (async (url: string | URL, init?: RequestInit) => {
      const cmd = JSON.parse(String(init?.body)) as unknown[];
      if (cmd[0] === "SET") throw new Error("kv down");
      return inner(url, init);
    }) as unknown as typeof fetch;
    await expect(publishStage1()).rejects.toThrow();
    global.fetch = kvStore.fetchMock as unknown as typeof fetch;
    expect((await getStage1State()).phase).toBe("prepared");
  });

  it("closeStage1 with kv() throwing -> rejects (a failed Close never reports the stage closed)", async () => {
    global.fetch = (async () => {
      throw new Error("kv down");
    }) as unknown as typeof fetch;
    const { closeStage1 } = await import("@/lib/stage1");
    await expect(closeStage1()).rejects.toThrow();
  });
});

describe("stage1.ts source pins — the import-never-copy law (the brief's Build 1)", () => {
  it("never carries the zone literal — stage2Expired is IMPORTED, its zone arithmetic rides along", async () => {
    const src = await fs.readFile(path.join(process.cwd(), "src/lib/stage1.ts"), "utf8");
    expect(src).not.toContain("America/Denver");
    expect(src).toContain('from "@/lib/stage2"');
    expect(src).toContain("stage2Expired");
  });

  it("carries its own key prefix and never Stage 2's, the studio door's, or the live flag's", async () => {
    const src = await fs.readFile(path.join(process.cwd(), "src/lib/stage1.ts"), "utf8");
    expect(src).toContain("stage1:state:");
    expect(src).not.toContain("stage2:state");
    expect(src).not.toContain("studio:jitsi-door");
    expect(src).not.toContain("oc:live");
  });
});
