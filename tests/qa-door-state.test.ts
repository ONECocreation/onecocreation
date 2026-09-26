import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TENANT } from "@/lib/tenant";
import type { QaState } from "@/lib/qa-door";

/**
 * TASK-475 (block 968,624) — the Q&A door's own three-phase lifecycle
 * (closed -> prepared -> published), the SAME `door-lifecycle.ts` factory
 * `stage2.ts` rides. Mirrors `tests/stage2-state.test.ts`'s own no-KV-mock
 * style: the REAL store.ts `kv()` runs against a fake HTTP transport on
 * `global.fetch`, a proper key -> value map, never `vi.mock("@/lib/store")`.
 */

const KEY = `qa:state:${TENANT}`;
const IDLE: QaState = { phase: "closed", room: null, openedAtMs: null, publishedAtMs: null };

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

const stale = () => Date.now() - 36 * 3_600_000;

describe("qaExpired — the midnight close (pure)", () => {
  it("a published state lives until Denver midnight, then dies AT midnight", async () => {
    const { qaExpired } = await import("@/lib/qa-door");
    const published = {
      phase: "published" as const,
      room: "oc-0123456789abcdef",
      openedAtMs: Date.parse("2026-09-26T18:00:00Z"),
      publishedAtMs: Date.parse("2026-09-26T19:30:00Z"),
    };
    expect(qaExpired(published, Date.parse("2026-09-27T05:59:59Z"))).toBe(false);
    expect(qaExpired(published, Date.parse("2026-09-27T06:00:00Z"))).toBe(true);
  });

  it("closed is never expired", async () => {
    const { qaExpired } = await import("@/lib/qa-door");
    expect(qaExpired(IDLE, Date.parse("2027-01-01T00:00:00Z"))).toBe(false);
  });

  it("a non-closed state with NO anchor is expired (fail closed)", async () => {
    const { qaExpired } = await import("@/lib/qa-door");
    const anchorless = { phase: "prepared" as const, room: "oc-0123456789abcdef", openedAtMs: null, publishedAtMs: null };
    expect(qaExpired(anchorless, Date.now())).toBe(true);
  });
});

describe("getQaState — fail-closed on malformed KV, and its own key", () => {
  it("no stored value at all -> IDLE", async () => {
    const { getQaState } = await import("@/lib/qa-door");
    expect(await getQaState()).toEqual(IDLE);
  });

  it("reads and writes ITS OWN key, never stage1's or stage2's", async () => {
    const { prepareQa } = await import("@/lib/qa-door");
    const s = await prepareQa();
    expect(kvStore.store.has(KEY)).toBe(true);
    expect(kvStore.store.has(`stage2:state:${TENANT}`)).toBe(false);
    expect(kvStore.store.has(`stage1:state:${TENANT}`)).toBe(false);
    expect(s.room).toMatch(/^oc-[0-9a-f]{16}$/);
  });

  it("an out-of-set phase -> IDLE", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "open", room: "oc-0123456789abcdef", openedAtMs: Date.now() }));
    const { getQaState } = await import("@/lib/qa-door");
    expect(await getQaState()).toEqual(IDLE);
  });

  it("unparsable JSON -> IDLE, never throws", async () => {
    kvStore.store.set(KEY, "{not json");
    const { getQaState } = await import("@/lib/qa-door");
    await expect(getQaState()).resolves.toEqual(IDLE);
  });

  it("storage failure (kv() throwing) -> IDLE, never rejects", async () => {
    global.fetch = (async () => {
      throw new Error("kv down");
    }) as unknown as typeof fetch;
    const { getQaState } = await import("@/lib/qa-door");
    await expect(getQaState()).resolves.toEqual(IDLE);
  });

  it("an EXPIRED stored prepared doc + prepareQa() mints a NEW room — Friday's room is never re-used on Saturday", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "prepared", room: "oc-0123456789abcdef", openedAtMs: stale(), publishedAtMs: null }));
    const { prepareQa, getQaState } = await import("@/lib/qa-door");
    const next = await prepareQa();
    expect(next.phase).toBe("prepared");
    expect(next.room).not.toBe("oc-0123456789abcdef");
    expect(next.openedAtMs).toBeGreaterThan(stale());
    expect(await getQaState()).toEqual(next);
  });

  it("a stored published doc stamped the previous Denver day reads IDLE, nothing rewritten on read", async () => {
    kvStore.store.set(
      KEY,
      JSON.stringify({
        phase: "published",
        room: "oc-fedcba9876543210",
        openedAtMs: Date.parse("2026-09-26T18:00:00Z"),
        publishedAtMs: Date.parse("2026-09-26T19:30:00Z"),
      }),
    );
    const { getQaState } = await import("@/lib/qa-door");
    expect(await getQaState(Date.parse("2026-09-27T06:00:00Z"))).toEqual(IDLE);
    expect(kvStore.store.get(KEY)).toContain("oc-fedcba9876543210");
  });
});

describe("prepareQa / publishQa / closeQa — the three-phase transitions, including Stage 2's closed->publish convenience path", () => {
  it("prepareQa on closed mints once, writes prepared with publishedAtMs: null", async () => {
    const { prepareQa, getQaState } = await import("@/lib/qa-door");
    const s = await prepareQa();
    expect(s.phase).toBe("prepared");
    expect(s.room).toMatch(/^oc-[0-9a-f]{16}$/);
    expect(s.publishedAtMs).toBeNull();
    expect(await getQaState()).toEqual(s);
  });

  it("prepareQa called again on prepared returns the SAME room, mints nothing", async () => {
    const { prepareQa } = await import("@/lib/qa-door");
    const first = await prepareQa();
    const second = await prepareQa();
    expect(second.room).toBe(first.room);
  });

  it("publishQa on prepared keeps the same room, stamps publishedAtMs", async () => {
    const { prepareQa, publishQa } = await import("@/lib/qa-door");
    const prepared = await prepareQa();
    const before = Date.now();
    const published = await publishQa();
    expect(published.phase).toBe("published");
    expect(published.room).toBe(prepared.room);
    expect(published.publishedAtMs).toBeGreaterThanOrEqual(before);
  });

  it("publishQa on closed mints AND publishes in one step — the one-click Open path RoomsCard relies on", async () => {
    const { publishQa } = await import("@/lib/qa-door");
    const before = Date.now();
    const s = await publishQa();
    expect(s.phase).toBe("published");
    expect(s.room).toMatch(/^oc-[0-9a-f]{16}$/);
    expect(s.openedAtMs).toBeGreaterThanOrEqual(before);
    expect(s.publishedAtMs).toBeGreaterThanOrEqual(before);
  });

  it("publishQa on already-published is a no-op (the first stamp stands)", async () => {
    const { prepareQa, publishQa } = await import("@/lib/qa-door");
    await prepareQa();
    const first = await publishQa();
    const second = await publishQa();
    expect(second).toEqual(first);
  });

  it("closeQa from any phase writes IDLE verbatim", async () => {
    const { prepareQa, publishQa, closeQa, getQaState } = await import("@/lib/qa-door");
    await prepareQa();
    await publishQa();
    const closed = await closeQa();
    expect(closed).toEqual(IDLE);
    expect(await getQaState()).toEqual(closed);
  });

  it("a second open after close mints a NEW room, never the old one (rotation)", async () => {
    const { publishQa, closeQa } = await import("@/lib/qa-door");
    const first = await publishQa();
    await closeQa();
    const second = await publishQa();
    expect(second.room).not.toBe(first.room);
  });
});
