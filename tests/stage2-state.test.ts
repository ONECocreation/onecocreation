import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TENANT } from "@/lib/tenant";
import type { Stage2State } from "@/lib/stage2";

/**
 * TASK-392 Build 2 — Stage 2's three-phase lifecycle (closed -> prepared ->
 * published), fail-closed on malformed KV (Astra's review, findings 5 & 7).
 * TASK-439 (block 968,218, ruling 4) — the MIDNIGHT CLOSE: `Stage2State`
 * gains `publishedAtMs`, `stage2Expired` compares America/Denver calendar
 * dates, and `getStage2State` fails closed to IDLE on an expired state —
 * so a Friday room can never be re-used on Saturday (security critic
 * finding 3, closed in `getStage2State`, not in the routes).
 *
 * Mirrors tests/studio-jitsi-door.test.ts's no-KV-mock style: the REAL
 * store.ts kv() runs, against a fake HTTP transport swapped onto
 * global.fetch (the after-hours-door.test.ts precedent) — never a
 * `vi.mock("@/lib/store")`. The fake is a proper key -> value map (not a
 * single `stored` slot) so this suite's own KV traffic can never collide
 * with any other module's key under the same tenant.
 */

const KEY = `stage2:state:${TENANT}`;
const IDLE: Stage2State = { phase: "closed", room: null, openedAtMs: null, publishedAtMs: null };

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

/* TASK-439: the midnight close reads anchors as America/Denver CALENDAR
   dates, so fixtures that must survive the cutoff use now-relative stamps
   (the exact-1000/2000 fixtures predate ruling 4 and would read expired). */
const fresh = () => Date.now();
/** Always at least one Denver calendar day in the past (36 h back crosses
 *  a Denver midnight from any starting instant). */
const stale = () => Date.now() - 36 * 3_600_000;

describe("stage2Expired — the midnight close, ruling 4 (pure)", () => {
  const PUBLISHED_SUMMER = {
    phase: "published" as const,
    room: "oc-0123456789abcdef",
    openedAtMs: Date.parse("2026-09-26T18:00:00Z"),
    publishedAtMs: Date.parse("2026-09-26T19:30:00Z"),
  };

  it("a summer (MDT) publish lives until Denver midnight, then dies AT midnight — zone arithmetic, not a fixed offset", async () => {
    const { stage2Expired } = await import("@/lib/stage2");
    expect(stage2Expired(PUBLISHED_SUMMER, Date.parse("2026-09-27T05:59:59Z"))).toBe(false);
    expect(stage2Expired(PUBLISHED_SUMMER, Date.parse("2026-09-27T06:00:00Z"))).toBe(true);
  });

  it("the winter (MST) case — the boundary moves with the zone", async () => {
    const { stage2Expired } = await import("@/lib/stage2");
    const winter = {
      ...PUBLISHED_SUMMER,
      openedAtMs: Date.parse("2026-12-05T19:00:00Z"),
      publishedAtMs: Date.parse("2026-12-05T20:00:00Z"),
    };
    expect(stage2Expired(winter, Date.parse("2026-12-06T06:59:59Z"))).toBe(false);
    expect(stage2Expired(winter, Date.parse("2026-12-06T07:00:00Z"))).toBe(true);
  });

  it("a PREPARED state anchors on openedAtMs: Friday 8 PM MDT's prepare is expired by Saturday 1 PM MDT", async () => {
    const { stage2Expired } = await import("@/lib/stage2");
    const prepared = {
      phase: "prepared" as const,
      room: "oc-0123456789abcdef",
      openedAtMs: Date.parse("2026-09-26T02:00:00Z"),
      publishedAtMs: null,
    };
    expect(stage2Expired(prepared, Date.parse("2026-09-26T19:00:00Z"))).toBe(true);
  });

  it("the published anchor wins over openedAtMs when both exist", async () => {
    const { stage2Expired } = await import("@/lib/stage2");
    /* prepared Friday evening, published Saturday afternoon: at Saturday
       1 PM MDT the prepare anchor is already stale but the publish anchor
       is not — the state must still be live. */
    const state = {
      phase: "published" as const,
      room: "oc-0123456789abcdef",
      openedAtMs: Date.parse("2026-09-26T02:00:00Z"),
      publishedAtMs: Date.parse("2026-09-26T19:30:00Z"),
    };
    expect(stage2Expired(state, Date.parse("2026-09-26T19:00:00Z"))).toBe(false);
  });

  it("closed is never expired", async () => {
    const { stage2Expired } = await import("@/lib/stage2");
    expect(stage2Expired(IDLE, Date.parse("2027-01-01T00:00:00Z"))).toBe(false);
  });

  it("a non-closed state with NO anchor is expired (fail closed)", async () => {
    const { stage2Expired } = await import("@/lib/stage2");
    const anchorless = { phase: "prepared" as const, room: "oc-0123456789abcdef", openedAtMs: null, publishedAtMs: null };
    expect(stage2Expired(anchorless, fresh())).toBe(true);
  });
});

describe("getStage2State — fail-closed on malformed KV (finding 7)", () => {
  it("no stored value at all -> IDLE", async () => {
    const { getStage2State } = await import("@/lib/stage2");
    expect(await getStage2State()).toEqual(IDLE);
  });

  it("a good prepared state round-trips (a stored doc without publishedAtMs reads it as null)", async () => {
    const openedAtMs = fresh();
    kvStore.store.set(KEY, JSON.stringify({ phase: "prepared", room: "oc-0123456789abcdef", openedAtMs }));
    const { getStage2State } = await import("@/lib/stage2");
    expect(await getStage2State()).toEqual({ phase: "prepared", room: "oc-0123456789abcdef", openedAtMs, publishedAtMs: null });
  });

  it("a good published state round-trips", async () => {
    const openedAtMs = fresh();
    const publishedAtMs = fresh();
    kvStore.store.set(KEY, JSON.stringify({ phase: "published", room: "oc-fedcba9876543210", openedAtMs, publishedAtMs }));
    const { getStage2State } = await import("@/lib/stage2");
    expect(await getStage2State()).toEqual({ phase: "published", room: "oc-fedcba9876543210", openedAtMs, publishedAtMs });
  });

  it("an out-of-set phase -> IDLE", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "open", room: "oc-0123456789abcdef", openedAtMs: fresh() }));
    const { getStage2State } = await import("@/lib/stage2");
    expect(await getStage2State()).toEqual(IDLE);
  });

  it("phase !== closed with room: null -> IDLE", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "prepared", room: null, openedAtMs: fresh() }));
    const { getStage2State } = await import("@/lib/stage2");
    expect(await getStage2State()).toEqual(IDLE);
  });

  it("phase === closed with a non-null room -> IDLE", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "closed", room: "oc-0123456789abcdef", openedAtMs: null }));
    const { getStage2State } = await import("@/lib/stage2");
    expect(await getStage2State()).toEqual(IDLE);
  });

  it("a room string that doesn't match oc-<16 hex> -> IDLE", async () => {
    kvStore.store.set(KEY, JSON.stringify({ phase: "published", room: "not-a-real-room", openedAtMs: fresh() }));
    const { getStage2State } = await import("@/lib/stage2");
    expect(await getStage2State()).toEqual(IDLE);
  });

  it("unparsable JSON -> IDLE, never throws", async () => {
    kvStore.store.set(KEY, "{not json");
    const { getStage2State } = await import("@/lib/stage2");
    await expect(getStage2State()).resolves.toEqual(IDLE);
  });

  it("storage failure (kv() throwing) -> IDLE, never rejects (finding 7)", async () => {
    global.fetch = (async () => {
      throw new Error("kv down");
    }) as unknown as typeof fetch;
    const { getStage2State } = await import("@/lib/stage2");
    await expect(getStage2State()).resolves.toEqual(IDLE);
  });
});

describe("getStage2State — the midnight close lives HERE, not in the routes (ruling 4, watch item 1)", () => {
  it("a stored published doc stamped the previous Denver day reads IDLE", async () => {
    kvStore.store.set(
      KEY,
      JSON.stringify({
        phase: "published",
        room: "oc-fedcba9876543210",
        openedAtMs: Date.parse("2026-09-26T18:00:00Z"),
        publishedAtMs: Date.parse("2026-09-26T19:30:00Z"),
      }),
    );
    const { getStage2State } = await import("@/lib/stage2");
    /* still Saturday in Denver -> live */
    expect(await getStage2State(Date.parse("2026-09-27T05:59:59Z"))).toEqual({
      phase: "published",
      room: "oc-fedcba9876543210",
      openedAtMs: Date.parse("2026-09-26T18:00:00Z"),
      publishedAtMs: Date.parse("2026-09-26T19:30:00Z"),
    });
    /* one second past Denver midnight -> closed, nothing written on read */
    expect(await getStage2State(Date.parse("2026-09-27T06:00:00Z"))).toEqual(IDLE);
    expect(kvStore.store.get(KEY)).toContain("oc-fedcba9876543210");
  });

  it("WATCH ITEM 1: an EXPIRED stored prepared doc + prepareStage2() mints a NEW room — Friday's room is never re-used on Saturday", async () => {
    kvStore.store.set(
      KEY,
      JSON.stringify({ phase: "prepared", room: "oc-0123456789abcdef", openedAtMs: stale(), publishedAtMs: null }),
    );
    const { prepareStage2, getStage2State } = await import("@/lib/stage2");
    const next = await prepareStage2();
    expect(next.phase).toBe("prepared");
    expect(next.room).toMatch(/^oc-[0-9a-f]{16}$/);
    expect(next.room).not.toBe("oc-0123456789abcdef");
    expect(next.openedAtMs).toBeGreaterThan(stale());
    expect(await getStage2State()).toEqual(next);
  });

  it("the same holds for an expired stored PUBLISHED doc: prepare starts the new day fresh", async () => {
    kvStore.store.set(
      KEY,
      JSON.stringify({
        phase: "published",
        room: "oc-fedcba9876543210",
        openedAtMs: stale(),
        publishedAtMs: stale(),
      }),
    );
    const { prepareStage2 } = await import("@/lib/stage2");
    const next = await prepareStage2();
    expect(next.phase).toBe("prepared");
    expect(next.room).not.toBe("oc-fedcba9876543210");
  });
});

describe("prepareStage2 / publishStage2 / closeStage2 — the three-phase transitions", () => {
  it("prepareStage2 on closed mints once, writes prepared with publishedAtMs: null", async () => {
    const { prepareStage2, getStage2State } = await import("@/lib/stage2");
    const s = await prepareStage2();
    expect(s.phase).toBe("prepared");
    expect(s.room).toMatch(/^oc-[0-9a-f]{16}$/);
    expect(s.publishedAtMs).toBeNull();
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

  it("publishStage2 on prepared keeps the same room and openedAtMs, and STAMPS publishedAtMs", async () => {
    const { prepareStage2, publishStage2 } = await import("@/lib/stage2");
    const prepared = await prepareStage2();
    const before = Date.now();
    const published = await publishStage2();
    expect(published.phase).toBe("published");
    expect(published.room).toBe(prepared.room);
    expect(published.openedAtMs).toBe(prepared.openedAtMs);
    expect(published.publishedAtMs).toBeGreaterThanOrEqual(before);
  });

  it("publishStage2 on already-published is a no-op (the first stamp stands)", async () => {
    const { prepareStage2, publishStage2 } = await import("@/lib/stage2");
    await prepareStage2();
    const first = await publishStage2();
    const second = await publishStage2();
    expect(second).toEqual(first);
  });

  it("publishStage2 on closed mints AND publishes in one step, stamping both anchors", async () => {
    const { publishStage2 } = await import("@/lib/stage2");
    const before = Date.now();
    const s = await publishStage2();
    expect(s.phase).toBe("published");
    expect(s.room).toMatch(/^oc-[0-9a-f]{16}$/);
    expect(s.openedAtMs).toBeGreaterThanOrEqual(before);
    expect(s.publishedAtMs).toBeGreaterThanOrEqual(before);
  });

  it("closeStage2 from any phase writes IDLE verbatim", async () => {
    const { prepareStage2, publishStage2, closeStage2, getStage2State } = await import("@/lib/stage2");
    await prepareStage2();
    await publishStage2();
    const closed = await closeStage2();
    expect(closed).toEqual(IDLE);
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
