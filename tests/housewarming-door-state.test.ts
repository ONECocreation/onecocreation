import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TENANT } from "@/lib/tenant";
import type { HousewarmingState } from "@/lib/housewarming-door";

/**
 * TASK-481 (block 968,624+) — the Housewarming's own three-phase
 * lifecycle (closed -> prepared -> published), the SAME `door-lifecycle.ts`
 * factory `stage2.ts`/`qa-door.ts` ride. Mirrors `tests/qa-door-state.test.ts`'s
 * own no-KV-mock style: the REAL store.ts `kv()` runs against a fake HTTP
 * transport on `global.fetch`, a proper key -> value map, never
 * `vi.mock("@/lib/store")`.
 */

const KEY = `housewarming:state:${TENANT}`;
const IDLE: HousewarmingState = { phase: "closed", room: null, openedAtMs: null, publishedAtMs: null, cameraShownAtMs: null };

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

describe("housewarmingExpired — the midnight close (pure)", () => {
  it("a published state lives until Denver midnight, then dies AT midnight", async () => {
    const { housewarmingExpired } = await import("@/lib/housewarming-door");
    const published = {
      phase: "published" as const,
      room: "oc-0123456789abcdef",
      openedAtMs: Date.parse("2026-09-26T18:00:00Z"),
      publishedAtMs: Date.parse("2026-09-26T19:30:00Z"),
      cameraShownAtMs: null,
    };
    expect(housewarmingExpired(published, Date.parse("2026-09-27T05:59:59Z"))).toBe(false);
    expect(housewarmingExpired(published, Date.parse("2026-09-27T06:00:00Z"))).toBe(true);
  });

  it("closed is never expired", async () => {
    const { housewarmingExpired } = await import("@/lib/housewarming-door");
    expect(housewarmingExpired(IDLE, Date.parse("2027-01-01T00:00:00Z"))).toBe(false);
  });

  it("a non-closed state with NO anchor is expired (fail closed)", async () => {
    const { housewarmingExpired } = await import("@/lib/housewarming-door");
    const anchorless = {
      phase: "prepared" as const,
      room: "oc-0123456789abcdef",
      openedAtMs: null,
      publishedAtMs: null,
      cameraShownAtMs: null,
    };
    expect(housewarmingExpired(anchorless, Date.now())).toBe(true);
  });
});

describe("getHousewarmingState — fail-closed on malformed KV, and its own key", () => {
  it("no stored value at all -> IDLE", async () => {
    const { getHousewarmingState } = await import("@/lib/housewarming-door");
    expect(await getHousewarmingState()).toEqual(IDLE);
  });

  it("reads and writes ITS OWN key, never stage1's, stage2's, or the Q&A door's", async () => {
    const { prepareHousewarming } = await import("@/lib/housewarming-door");
    const s = await prepareHousewarming();
    expect(kvStore.store.has(KEY)).toBe(true);
    expect(kvStore.store.has(`stage1:state:${TENANT}`)).toBe(false);
    expect(kvStore.store.has(`stage2:state:${TENANT}`)).toBe(false);
    expect(kvStore.store.has(`qa:state:${TENANT}`)).toBe(false);
    expect(s.room).toMatch(/^oc-[0-9a-f]{16}$/);
  });

  it("an out-of-set phase -> IDLE", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "open", room: "oc-0123456789abcdef", openedAtMs: Date.now() }));
    const { getHousewarmingState } = await import("@/lib/housewarming-door");
    expect(await getHousewarmingState()).toEqual(IDLE);
  });

  it("unparsable JSON -> IDLE, never throws", async () => {
    kvStore.store.set(KEY, "{not json");
    const { getHousewarmingState } = await import("@/lib/housewarming-door");
    await expect(getHousewarmingState()).resolves.toEqual(IDLE);
  });

  it("storage failure (kv() throwing) -> IDLE, never rejects", async () => {
    global.fetch = (async () => {
      throw new Error("kv down");
    }) as unknown as typeof fetch;
    const { getHousewarmingState } = await import("@/lib/housewarming-door");
    await expect(getHousewarmingState()).resolves.toEqual(IDLE);
  });

  it("an EXPIRED stored prepared doc + prepareHousewarming() mints a NEW room — Friday's room is never re-used on Saturday", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "prepared", room: "oc-0123456789abcdef", openedAtMs: stale(), publishedAtMs: null }));
    const { prepareHousewarming, getHousewarmingState } = await import("@/lib/housewarming-door");
    const next = await prepareHousewarming();
    expect(next.phase).toBe("prepared");
    expect(next.room).not.toBe("oc-0123456789abcdef");
    expect(next.openedAtMs).toBeGreaterThan(stale());
    expect(await getHousewarmingState()).toEqual(next);
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
    const { getHousewarmingState } = await import("@/lib/housewarming-door");
    expect(await getHousewarmingState(Date.parse("2026-09-27T06:00:00Z"))).toEqual(IDLE);
    expect(kvStore.store.get(KEY)).toContain("oc-fedcba9876543210");
  });
});

describe("prepareHousewarming / publishHousewarming / closeHousewarming — the three-phase transitions, including the closed->publish convenience path", () => {
  it("prepareHousewarming on closed mints once, writes prepared with publishedAtMs: null", async () => {
    const { prepareHousewarming, getHousewarmingState } = await import("@/lib/housewarming-door");
    const s = await prepareHousewarming();
    expect(s.phase).toBe("prepared");
    expect(s.room).toMatch(/^oc-[0-9a-f]{16}$/);
    expect(s.publishedAtMs).toBeNull();
    expect(await getHousewarmingState()).toEqual(s);
  });

  it("prepareHousewarming called again on prepared returns the SAME room, mints nothing", async () => {
    const { prepareHousewarming } = await import("@/lib/housewarming-door");
    const first = await prepareHousewarming();
    const second = await prepareHousewarming();
    expect(second.room).toBe(first.room);
  });

  it("publishHousewarming on prepared keeps the same room, stamps publishedAtMs", async () => {
    const { prepareHousewarming, publishHousewarming } = await import("@/lib/housewarming-door");
    const prepared = await prepareHousewarming();
    const before = Date.now();
    const published = await publishHousewarming();
    expect(published.phase).toBe("published");
    expect(published.room).toBe(prepared.room);
    expect(published.publishedAtMs).toBeGreaterThanOrEqual(before);
  });

  it("publishHousewarming on closed mints AND publishes in one step — the one-click Open path RoomsCard relies on", async () => {
    const { publishHousewarming } = await import("@/lib/housewarming-door");
    const before = Date.now();
    const s = await publishHousewarming();
    expect(s.phase).toBe("published");
    expect(s.room).toMatch(/^oc-[0-9a-f]{16}$/);
    expect(s.openedAtMs).toBeGreaterThanOrEqual(before);
    expect(s.publishedAtMs).toBeGreaterThanOrEqual(before);
  });

  it("publishHousewarming on already-published is a no-op (the first stamp stands)", async () => {
    const { prepareHousewarming, publishHousewarming } = await import("@/lib/housewarming-door");
    await prepareHousewarming();
    const first = await publishHousewarming();
    const second = await publishHousewarming();
    expect(second).toEqual(first);
  });

  it("closeHousewarming from any phase writes IDLE verbatim", async () => {
    const { prepareHousewarming, publishHousewarming, closeHousewarming, getHousewarmingState } = await import("@/lib/housewarming-door");
    await prepareHousewarming();
    await publishHousewarming();
    const closed = await closeHousewarming();
    expect(closed).toEqual(IDLE);
    expect(await getHousewarmingState()).toEqual(closed);
  });

  it("a second open after close mints a NEW room, never the old one (rotation)", async () => {
    const { publishHousewarming, closeHousewarming } = await import("@/lib/housewarming-door");
    const first = await publishHousewarming();
    await closeHousewarming();
    const second = await publishHousewarming();
    expect(second.room).not.toBe(first.room);
  });
});

describe("showHousewarmingCamera / hideHousewarmingCamera — TASK-487, valid ONLY while published", () => {
  it("refused (null, nothing written) while closed", async () => {
    const { showHousewarmingCamera, getHousewarmingState } = await import("@/lib/housewarming-door");
    expect(await showHousewarmingCamera()).toBeNull();
    expect(await getHousewarmingState()).toEqual(IDLE);
  });

  it("refused (null, nothing written) while merely prepared", async () => {
    const { prepareHousewarming, showHousewarmingCamera } = await import("@/lib/housewarming-door");
    const prepared = await prepareHousewarming();
    expect(await showHousewarmingCamera()).toBeNull();
    const { getHousewarmingState } = await import("@/lib/housewarming-door");
    expect(await getHousewarmingState()).toEqual(prepared);
  });

  it("stamps cameraShownAtMs while published; hideHousewarmingCamera clears it back to null", async () => {
    const { publishHousewarming, showHousewarmingCamera, hideHousewarmingCamera } = await import("@/lib/housewarming-door");
    await publishHousewarming();
    const before = Date.now();
    const shown = await showHousewarmingCamera();
    expect(shown?.cameraShownAtMs).toBeGreaterThanOrEqual(before);
    const hidden = await hideHousewarmingCamera();
    expect(hidden?.cameraShownAtMs).toBeNull();
    expect(hidden?.phase).toBe("published");
    expect(hidden?.room).toBe(shown?.room);
  });

  it("both are idempotent — a repeat call returns the SAME state, never a second stamp/write", async () => {
    const { publishHousewarming, showHousewarmingCamera, hideHousewarmingCamera } = await import("@/lib/housewarming-door");
    await publishHousewarming();
    const first = await showHousewarmingCamera();
    const second = await showHousewarmingCamera();
    expect(second).toEqual(first);
    const hiddenFirst = await hideHousewarmingCamera();
    const hiddenSecond = await hideHousewarmingCamera();
    expect(hiddenSecond).toEqual(hiddenFirst);
  });

  it("a fresh publish-from-closed always resets cameraShownAtMs to null (never carries a stale show)", async () => {
    const { publishHousewarming, showHousewarmingCamera, closeHousewarming } = await import("@/lib/housewarming-door");
    await publishHousewarming();
    await showHousewarmingCamera();
    await closeHousewarming();
    const reopened = await publishHousewarming();
    expect(reopened.cameraShownAtMs).toBeNull();
  });
});
