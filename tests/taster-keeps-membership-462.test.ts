import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { grantTier, getEntitlement, revokeTier } from "@/lib/entitlement";

/**
 * TASK-462 (block 968,543): a taster that outranks a live standing grant must
 * not erase it. THE BUG (confirmed on 9db8532, `entitlement.ts:222-257`): one
 * record per npub — when a taster OUTRANKS the standing grant, `grantTier`'s
 * final `else` (:244-245) sets `expiresAtMs = opts.expiresAtMs` on the
 * WINNING tier and drops the standing grant's own record entirely. A
 * permanent Weekly Intuitive (A) or Observer (B) member who buys the Evening
 * Star (C) day pass — exactly the Saturday Q&A taster window — loses their
 * paid membership the moment that pass closes.
 *
 * House idioms carried over from `tests/entitlement-renewal.test.ts` (T-403):
 * the KV fixture is `tests/discovery-checkout.test.ts`'s
 * `vi.stubGlobal("fetch", …)` pattern trimmed to `grantTier`'s own GET/SET/
 * SADD surface; fake timers via `vi.useFakeTimers()` + `vi.setSystemTime(T)`.
 * Every row asserts against the PERSISTED record — a fresh `getEntitlement`
 * read, never the in-memory return value alone.
 */

const KV_URL = "http://kv.fixture.t462";
const NPUB = "b".repeat(64); // safeNpub: a 64-char hex string is the clean fixture
const DAY = 86_400_000;
const T0 = 1_700_000_000_000; // an arbitrary fixed instant — block-time house, no civil dates

let kvStore: Map<string, string>;
let kvSets: Map<string, Set<string>>;

beforeAll(() => {
  delete process.env.VERCEL;
  delete process.env.REDIS_URL;
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-kv-token-t462";

  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u !== KV_URL) throw new Error(`unexpected fetch: ${u}`);
    const cmd = (JSON.parse(String(init?.body)) as unknown[]).map(String);
    const [op, ...args] = cmd;
    let result: unknown = null;
    if (op === "GET") {
      result = kvStore.get(args[0]) ?? null;
    } else if (op === "SET") {
      kvStore.set(args[0], args[1]);
      result = "OK";
    } else if (op === "SADD") {
      const s = kvSets.get(args[0]) ?? new Set<string>();
      s.add(args[1]);
      kvSets.set(args[0], s);
      result = 1;
    } else {
      throw new Error(`fixture KV: unhandled op ${op}`);
    }
    return new Response(JSON.stringify({ result }), { status: 200 });
  });
});

beforeEach(() => {
  kvStore = new Map();
  kvSets = new Map();
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

/** The PERSISTED record — a fresh read through the module's own gate, never
 *  the `grantTier`/`revokeTier` return value alone. */
async function persisted() {
  const rec = await getEntitlement(NPUB);
  expect(rec).not.toBeNull();
  return rec!;
}

describe("grantTier / getEntitlement — a taster keeps the membership under it", () => {
  it("permanent A + a C taster (1 day): reads C now, reads A (permanent) once the pass closes", async () => {
    await grantTier(NPUB, "A", "order-1", {}); // permanent Weekly Intuitive
    await grantTier(NPUB, "C", "order-2", { expiresAtMs: T0 + 1 * DAY }); // the Evening Star day pass
    expect((await persisted()).tier).toBe("C");

    vi.setSystemTime(T0 + 1 * DAY + 1); // just past the pass's own close
    const rec = await persisted();
    expect(rec.tier).toBe("A");
    expect(rec.expiresAtMs).toBeUndefined(); // the permanent membership, not itself a taster
    expect(rec.orderId).toBe("order-1"); // the audit trail points back to the ORIGINAL membership order
  });

  it("permanent B + a C taster: reads B (permanent) once the pass closes", async () => {
    await grantTier(NPUB, "B", "order-1", {}); // permanent Observer
    await grantTier(NPUB, "C", "order-2", { expiresAtMs: T0 + 1 * DAY });
    expect((await persisted()).tier).toBe("C");

    vi.setSystemTime(T0 + 1 * DAY + 1);
    const rec = await persisted();
    expect(rec.tier).toBe("B");
    expect(rec.expiresAtMs).toBeUndefined();
  });

  it("permanent A + a B taster (the $22 week pass): reads A (permanent) once the pass closes", async () => {
    await grantTier(NPUB, "A", "order-1", {}); // permanent Weekly Intuitive
    await grantTier(NPUB, "B", "order-2", { expiresAtMs: T0 + 7 * DAY }); // the Observer week pass
    expect((await persisted()).tier).toBe("B");

    vi.setSystemTime(T0 + 7 * DAY + 1);
    const rec = await persisted();
    expect(rec.tier).toBe("A");
    expect(rec.expiresAtMs).toBeUndefined();
  });

  it("a taster (week pass) plus a taster on top (day pass): the day pass, then the week pass until ITS OWN end, then nothing", async () => {
    await grantTier(NPUB, "A", "order-1", { expiresAtMs: T0 + 7 * DAY }); // the week pass, expiry T0+604,800,000
    await grantTier(NPUB, "C", "order-2", { expiresAtMs: T0 + 1 * DAY }); // the day pass, bought on top
    expect((await persisted()).tier).toBe("C");

    vi.setSystemTime(T0 + 1 * DAY + 1); // the day pass closes — the week pass still has 6 days left
    const rec = await persisted();
    expect(rec.tier).toBe("A");
    expect(rec.expiresAtMs).toBe(T0 + 7 * DAY); // the week pass's OWN end — untouched by the day pass

    vi.setSystemTime(T0 + 7 * DAY + 1); // the week pass itself now closes too
    expect(await getEntitlement(NPUB)).toBeNull(); // nothing underneath it — today's rule, unchanged
  });

  it("permanent C + a C taster: stays permanent C — a same-tier taster cannot touch it (today's rule, unchanged)", async () => {
    await grantTier(NPUB, "C", "order-1", {});
    await grantTier(NPUB, "C", "order-2", { expiresAtMs: T0 + 1 * DAY });
    const rec = await persisted();
    expect(rec.tier).toBe("C");
    expect(rec.expiresAtMs).toBeUndefined();

    vi.setSystemTime(T0 + 1 * DAY + 1); // well past the taster's own would-be close
    const after = await persisted();
    expect(after.tier).toBe("C");
    expect(after.expiresAtMs).toBeUndefined();
  });

  it("nothing + a C taster: reads C, then nothing once it closes (today's rule, unchanged)", async () => {
    await grantTier(NPUB, "C", "order-1", { expiresAtMs: T0 + 1 * DAY });
    expect((await persisted()).tier).toBe("C");

    vi.setSystemTime(T0 + 1 * DAY + 1);
    expect(await getEntitlement(NPUB)).toBeNull();
  });

  it("a permanent purchase at the taster's own tier clears `under` — the earlier membership does not resurface", async () => {
    await grantTier(NPUB, "A", "order-1", {}); // permanent A underneath
    await grantTier(NPUB, "C", "order-2", { expiresAtMs: T0 + 1 * DAY }); // a C taster on top
    await grantTier(NPUB, "C", "order-3", {}); // now a REAL, permanent Evening Star purchase

    vi.setSystemTime(T0 + 1 * DAY + 1); // past the taster's old close
    const rec = await persisted();
    expect(rec.tier).toBe("C");
    expect(rec.expiresAtMs).toBeUndefined(); // permanent — not merely outliving the old taster window
  });

  it("the retry guard still returns the same record unchanged when a taster sits on a permanent grant", async () => {
    await grantTier(NPUB, "A", "order-1", {});
    await grantTier(NPUB, "C", "order-2", { expiresAtMs: T0 + 1 * DAY });
    const before = await persisted();

    vi.setSystemTime(T0 + 1000); // still well within the pass — a webhook's second knock
    const again = await grantTier(NPUB, "C", "order-2", { expiresAtMs: T0 + 999 * DAY }); // same order, same tier
    expect(again).toEqual(before);
    expect((await persisted())).toEqual(before); // nothing was rewritten
  });

  it("an old record with no `under` field reads exactly as before — no fallback, no crash", async () => {
    const legacy = { npub: NPUB, tier: "C", orderId: "order-old", grantedAtMs: T0, expiresAtMs: T0 + 1 * DAY };
    kvStore.set(`oco:tier:${NPUB}`, JSON.stringify(legacy)); // written directly, bypassing grantTier — the format entitlement.ts's own `key()` uses
    expect((await getEntitlement(NPUB))?.tier).toBe("C");

    vi.setSystemTime(T0 + 1 * DAY + 1);
    expect(await getEntitlement(NPUB)).toBeNull(); // no `under` to fall back to — reads as nothing, exactly as before this lane
  });
});

describe("revokeTier — refunding the taster's own order falls back, not closes", () => {
  it("revoking the TASTER's own order falls back to the permanent grant underneath it", async () => {
    await grantTier(NPUB, "A", "order-1", {}); // permanent A underneath
    await grantTier(NPUB, "C", "order-2", { expiresAtMs: T0 + 1 * DAY }); // the taster on top

    const after = await revokeTier(NPUB, "order-2"); // a refund of the taster's OWN order
    expect(after?.tier).toBe("A");
    expect(after?.orderId).toBe("order-1");
    expect(after?.expiresAtMs).toBeUndefined();
    expect(after?.revokedAtMs).toBeUndefined(); // NOT a closed door — a live fallback

    const rec = await persisted();
    expect(rec.tier).toBe("A");
  });

  it("revoking the UNDER grant's own order closes everything, exactly as today", async () => {
    await grantTier(NPUB, "A", "order-1", {});
    await grantTier(NPUB, "C", "order-2", { expiresAtMs: T0 + 1 * DAY });

    const after = await revokeTier(NPUB, "order-1"); // the permanent's own order, not the taster's
    expect(after?.revokedAtMs).toBeDefined();
    expect(await getEntitlement(NPUB)).toBeNull();
  });

  it("revoking with no orderId still closes everything, exactly as today (the admin ceremony route's own call shape)", async () => {
    await grantTier(NPUB, "A", "order-1", {});
    await grantTier(NPUB, "C", "order-2", { expiresAtMs: T0 + 1 * DAY });

    const after = await revokeTier(NPUB); // no orderId — main's call shape, unchanged
    expect(after?.revokedAtMs).toBeDefined();
    expect(await getEntitlement(NPUB)).toBeNull();
  });

  it("revoking a taster order that has no standing grant underneath closes everything (no `under` to fall back to)", async () => {
    await grantTier(NPUB, "C", "order-1", { expiresAtMs: T0 + 1 * DAY }); // a taster, nothing underneath

    const after = await revokeTier(NPUB, "order-1");
    expect(after?.revokedAtMs).toBeDefined();
    expect(await getEntitlement(NPUB)).toBeNull();
  });
});
