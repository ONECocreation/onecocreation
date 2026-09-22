import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TENANT } from "@/lib/tenant";

/**
 * TASK-392 Build 2 — Stage 2's three-phase lifecycle (closed -> prepared ->
 * published), fail-closed on malformed KV (Astra's review, findings 5 & 7).
 *
 * Mirrors tests/studio-jitsi-door.test.ts's no-KV-mock style: the REAL
 * store.ts kv() runs, against a fake HTTP transport swapped onto
 * global.fetch (the after-hours-door.test.ts precedent) — never a
 * `vi.mock("@/lib/store")`. The fake is a proper key -> value map (not a
 * single `stored` slot) so this suite's own KV traffic can never collide
 * with any other module's key under the same tenant.
 */

const KEY = `stage2:state:${TENANT}`;

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

describe("getStage2State — fail-closed on malformed KV (finding 7)", () => {
  it("no stored value at all -> IDLE", async () => {
    const { getStage2State } = await import("@/lib/stage2");
    expect(await getStage2State()).toEqual({ phase: "closed", room: null, openedAtMs: null });
  });

  it("a good prepared state round-trips", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "prepared", room: "oc-0123456789abcdef", openedAtMs: 1000 }));
    const { getStage2State } = await import("@/lib/stage2");
    expect(await getStage2State()).toEqual({ phase: "prepared", room: "oc-0123456789abcdef", openedAtMs: 1000 });
  });

  it("a good published state round-trips", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "published", room: "oc-fedcba9876543210", openedAtMs: 2000 }));
    const { getStage2State } = await import("@/lib/stage2");
    expect(await getStage2State()).toEqual({ phase: "published", room: "oc-fedcba9876543210", openedAtMs: 2000 });
  });

  it("an out-of-set phase -> IDLE", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "open", room: "oc-0123456789abcdef", openedAtMs: 1000 }));
    const { getStage2State } = await import("@/lib/stage2");
    expect(await getStage2State()).toEqual({ phase: "closed", room: null, openedAtMs: null });
  });

  it("phase !== closed with room: null -> IDLE", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "prepared", room: null, openedAtMs: 1000 }));
    const { getStage2State } = await import("@/lib/stage2");
    expect(await getStage2State()).toEqual({ phase: "closed", room: null, openedAtMs: null });
  });

  it("phase === closed with a non-null room -> IDLE", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "closed", room: "oc-0123456789abcdef", openedAtMs: null }));
    const { getStage2State } = await import("@/lib/stage2");
    expect(await getStage2State()).toEqual({ phase: "closed", room: null, openedAtMs: null });
  });

  it("a room string that doesn't match oc-<16 hex> -> IDLE", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "published", room: "not-a-real-room", openedAtMs: 1000 }));
    const { getStage2State } = await import("@/lib/stage2");
    expect(await getStage2State()).toEqual({ phase: "closed", room: null, openedAtMs: null });
  });

  it("unparsable JSON -> IDLE, never throws", async () => {
    kvStore.store.set(KEY, "{not json");
    const { getStage2State } = await import("@/lib/stage2");
    await expect(getStage2State()).resolves.toEqual({ phase: "closed", room: null, openedAtMs: null });
  });

  it("storage failure (kv() throwing) -> IDLE, never rejects (finding 7)", async () => {
    global.fetch = (async () => {
      throw new Error("kv down");
    }) as unknown as typeof fetch;
    const { getStage2State } = await import("@/lib/stage2");
    await expect(getStage2State()).resolves.toEqual({ phase: "closed", room: null, openedAtMs: null });
  });
});

describe("prepareStage2 / publishStage2 / closeStage2 — the three-phase transitions", () => {
  it("prepareStage2 on closed mints once, writes prepared", async () => {
    const { prepareStage2, getStage2State } = await import("@/lib/stage2");
    const s = await prepareStage2();
    expect(s.phase).toBe("prepared");
    expect(s.room).toMatch(/^oc-[0-9a-f]{16}$/);
    expect(await getStage2State()).toEqual(s);
  });

  it("prepareStage2 called again on prepared returns the SAME room, mints nothing", async () => {
    const { prepareStage2 } = await import("@/lib/stage2");
    const first = await prepareStage2();
    const second = await prepareStage2();
    expect(second.room).toBe(first.room);
    expect(second.phase).toBe("prepared");
  });

  it("prepareStage2 on an already-published state is idempotent too (mints nothing)", async () => {
    const { prepareStage2, publishStage2 } = await import("@/lib/stage2");
    await prepareStage2();
    const published = await publishStage2();
    const again = await prepareStage2();
    expect(again).toEqual(published);
  });

  it("publishStage2 on prepared keeps the same room, flips to published", async () => {
    const { prepareStage2, publishStage2 } = await import("@/lib/stage2");
    const prepared = await prepareStage2();
    const published = await publishStage2();
    expect(published.phase).toBe("published");
    expect(published.room).toBe(prepared.room);
    expect(published.openedAtMs).toBe(prepared.openedAtMs);
  });

  it("publishStage2 on already-published is a no-op", async () => {
    const { prepareStage2, publishStage2 } = await import("@/lib/stage2");
    await prepareStage2();
    const first = await publishStage2();
    const second = await publishStage2();
    expect(second).toEqual(first);
  });

  it("publishStage2 on closed mints AND publishes in one step", async () => {
    const { publishStage2 } = await import("@/lib/stage2");
    const s = await publishStage2();
    expect(s.phase).toBe("published");
    expect(s.room).toMatch(/^oc-[0-9a-f]{16}$/);
  });

  it("closeStage2 from any phase writes IDLE verbatim", async () => {
    const { prepareStage2, publishStage2, closeStage2, getStage2State } = await import("@/lib/stage2");
    await prepareStage2();
    await publishStage2();
    const closed = await closeStage2();
    expect(closed).toEqual({ phase: "closed", room: null, openedAtMs: null });
    expect(await getStage2State()).toEqual(closed);
  });

  it("closeStage2 on an already-closed state is trivially idempotent", async () => {
    const { closeStage2 } = await import("@/lib/stage2");
    const a = await closeStage2();
    const b = await closeStage2();
    expect(a).toEqual(b);
  });

  it("a second prepare+publish after close mints a NEW room, never the old one (rotation)", async () => {
    const { prepareStage2, publishStage2, closeStage2 } = await import("@/lib/stage2");
    await prepareStage2();
    const first = await publishStage2();
    await closeStage2();
    await prepareStage2();
    const second = await publishStage2();
    expect(second.room).not.toBe(first.room);
  });
});
