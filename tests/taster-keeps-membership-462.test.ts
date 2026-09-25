import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { grantTier, getEntitlement, revokeTier } from "@/lib/entitlement";
import type { OrderRecord, StoreItem } from "@/lib/store";
import { getItem } from "@/lib/store";
import { settleEntitlementFromOrder } from "@/lib/entitlement-fulfil";

/**
 * F2 (fix round, block 968,543): `entitlement.ts` is real throughout this
 * file (backed by the KV fixture below) — only the OUTER boundaries of
 * `settleEntitlementFromOrder` are mocked: `@/lib/store`'s `getItem` (the
 * `tests/stage2-access.test.ts` idiom), `@/lib/matrix` (the
 * `tests/ceremony-revoke-own-door.test.ts` idiom, extended to also track
 * `inviteToTierRooms` calls), and `@/lib/mail-queue`'s `enqueue` (so the
 * closing letter never touches a real queue).
 */
const kicked: { mxid: string; reason?: string }[] = [];
const invited: { mxid: string; tier: string }[] = [];
const mailed: unknown[] = [];

vi.mock("@/lib/store", () => ({ getItem: vi.fn() }));
vi.mock("@/lib/matrix", () => ({
  inviteToTierRooms: vi.fn(async (mxid: string, tier: string) => {
    invited.push({ mxid, tier });
    return [{ room: `#room-${tier}`, ok: true }];
  }),
  removeFromTierRooms: vi.fn(async (mxid: string, opts?: { reason?: string }) => {
    kicked.push({ mxid, reason: opts?.reason });
    return [{ room: "#kicked", ok: true }];
  }),
  matrixConfigured: () => true,
  isMxid: (v: string) => typeof v === "string" && v.startsWith("@"),
  mxidForSubject: (s: string) => `@${s}`,
}));
vi.mock("@/lib/mail-queue", () => ({
  enqueue: vi.fn(async (items: unknown[]) => {
    mailed.push(...items);
    return items.length;
  }),
}));

const mockGetItem = vi.mocked(getItem);

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
  kicked.length = 0;
  invited.length = 0;
  mailed.length = 0;
  mockGetItem.mockReset();
  mockGetItem.mockResolvedValue({
    id: "qa-day-pass",
    schemaVersion: 2,
    title: "Q&A Day Pass",
    blurb: "one day in the Evening Star",
    images: [],
    kind: "package",
    price: { fiat: { amount: 1100, currency: "USD" }, sats: 11_111 },
    fulfillment: "package",
    status: "live",
    entitlementTier: "C",
    entitlementDays: 1,
  } satisfies StoreItem);
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

  it("F1 (fix round, block 968,543): revoking a LAPSED taster's own order still falls back — refunds usually land after the pass has already closed", async () => {
    await grantTier(NPUB, "A", "order-1", {}); // permanent Weekly Intuitive
    await grantTier(NPUB, "C", "order-2", { expiresAtMs: T0 + 1 * DAY }); // the Q&A day pass, under=A

    vi.setSystemTime(T0 + 1 * DAY + 1); // Saturday night — the pass has already lapsed
    expect((await getEntitlement(NPUB))?.tier).toBe("A"); // the gate already reads the fallback

    // Monday: Love refunds the pass's OWN order — a lapsed record now, not a live one
    const after = await revokeTier(NPUB, "order-2");
    expect(after?.tier).toBe("A");
    expect(after?.orderId).toBe("order-1");
    expect(after?.expiresAtMs).toBeUndefined();
    expect(after?.revokedAtMs).toBeUndefined(); // NOT closed — the member keeps what they paid for

    const rec = await persisted();
    expect(rec.tier).toBe("A");
  });
});

describe("grantTier — F3 (fix round, block 968,543): an outranked purchase still becomes the new `under` when it beats what's there", () => {
  it("F3a: a permanent purchase between the taster and its `under` replaces the `under`, not lost", async () => {
    await grantTier(NPUB, "A", "order-1", {}); // permanent A underneath
    await grantTier(NPUB, "C", "order-2", { expiresAtMs: T0 + 1 * DAY }); // the C day pass, under=A
    await grantTier(NPUB, "B", "order-3", {}); // a permanent B purchase, while C is still live and outranks it

    // the top record (C) is untouched — same tier, same expiry
    const top = await persisted();
    expect(top.tier).toBe("C");
    expect(top.expiresAtMs).toBe(T0 + 1 * DAY);

    vi.setSystemTime(T0 + 1 * DAY + 1); // the day pass closes
    const rec = await persisted();
    expect(rec.tier).toBe("B"); // NOT A — B outranks A and is itself permanent, so it beats the old `under`
    expect(rec.expiresAtMs).toBeUndefined();
    expect(rec.orderId).toBe("order-3");
  });

  it("F3b: refunding the ORIGINAL standing order while a later, outranked purchase sits as `under` falls back to THAT purchase", async () => {
    await grantTier(NPUB, "C", "order-1", {}); // permanent Evening Star
    await grantTier(NPUB, "B", "order-2", {}); // a permanent Observer purchase, outranked by the standing C — becomes `under` (nothing there yet)

    const top = await persisted();
    expect(top.tier).toBe("C");
    expect(top.orderId).toBe("order-1"); // preserved — the purchase that lost the top slot never overwrites the audit trail of the one that holds it

    const after = await revokeTier(NPUB, "order-1"); // refund the C order specifically
    expect(after?.tier).toBe("B");
    expect(after?.orderId).toBe("order-2");
    expect(after?.revokedAtMs).toBeUndefined();
  });

  it("F3c: the retry guard still returns the same record unchanged after an outranked purchase updated `under`", async () => {
    await grantTier(NPUB, "A", "order-1", {});
    await grantTier(NPUB, "C", "order-2", { expiresAtMs: T0 + 1 * DAY }); // under=A
    await grantTier(NPUB, "B", "order-3", {}); // outranked by the live C; beats A, becomes the new under
    const before = await persisted();

    const again = await grantTier(NPUB, "C", "order-2", { expiresAtMs: T0 + 999 * DAY }); // the taster's own webhook, re-delivered
    expect(again).toEqual(before);
    expect(await persisted()).toEqual(before);
  });
});

describe("underFrom — F4 (fix round, block 968,543): a taster on a taster on a permanent membership compresses to exactly one level", () => {
  it("keeps the higher-ranked of the two (B), never chaining past it down to A", async () => {
    await grantTier(NPUB, "A", "order-1", {}); // permanent Weekly Intuitive
    await grantTier(NPUB, "B", "order-2", { expiresAtMs: T0 + 7 * DAY }); // the Observer week pass, under=A
    expect((await persisted()).tier).toBe("B");

    vi.setSystemTime(T0 + 2 * DAY); // 2 days into the week pass — still live
    await grantTier(NPUB, "C", "order-3", { expiresAtMs: T0 + 3 * DAY }); // the Q&A day pass, bought on top of B
    expect((await persisted()).tier).toBe("C");

    vi.setSystemTime(T0 + 3 * DAY + 1); // the day pass closes — the week pass still has 4 days left
    const rec = await persisted();
    expect(rec.tier).toBe("B"); // the higher-ranked of {B, A} survives as the ONE level kept
    expect(rec.expiresAtMs).toBe(T0 + 7 * DAY); // B's own window, untouched

    vi.setSystemTime(T0 + 7 * DAY + 1); // the week pass itself now closes too
    // the chain never goes past one level — A was compressed OUT the moment
    // C was bought on top of B, so nothing is left to fall back to here.
    // This is the spec's own "never chain more than one level" rule, pinned
    // as intended behavior, not a bug.
    expect(await getEntitlement(NPUB)).toBeNull();
  });
});

const FULFIL_NPUB = "love-guest@example.com@email"; // safeNpub's email pattern; npubOfOrder's "@email" shortcut returns it unchanged
const MXID = "@love-guest:matrix.onecocreation.com";

function refundOrder(over: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "order-x",
    schemaVersion: 2,
    state: "refunded",
    lineItems: [{ itemId: "qa-day-pass", title: "Q&A Day Pass", qty: 1 }],
    priceSnapshot: { amount: 1100, currency: "USD", at: new Date(T0).toISOString() },
    adapterId: "square",
    chargeIds: ["ch_fixture"],
    entitlementSubject: FULFIL_NPUB,
    contact: { email: "love-guest@example.com" },
    createdAtMs: T0,
    events: [],
    ...over,
  } as OrderRecord;
}

describe("settleEntitlementFromOrder — F2 (fix round, block 968,543): a fallback re-invites to the tier it actually still holds", () => {
  it("a refund that falls back kicks (tier-blind) then re-invites to the fallback tier — no closing letter", async () => {
    await grantTier(FULFIL_NPUB, "A", "order-1", { mxid: MXID }); // permanent Weekly Intuitive
    await grantTier(FULFIL_NPUB, "C", "order-2", { expiresAtMs: T0 + 1 * DAY }); // the Q&A day pass, under=A

    const result = await settleEntitlementFromOrder(refundOrder({ id: "order-2" }));

    expect(result.tier).toBe("A");
    expect(result.revoked).toBe(false);
    expect(kicked).toEqual([{ mxid: MXID, reason: "refunded" }]);
    expect(invited).toEqual([{ mxid: MXID, tier: "A" }]); // re-invited to the tier they ACTUALLY still hold
    expect(result.rooms).toEqual([{ room: "#kicked", ok: true }, { room: "#room-A", ok: true }]); // kick, then invite
    expect(mailed).toEqual([]); // a fallback is not a close — no "membership closed" letter

    expect((await getEntitlement(FULFIL_NPUB))?.tier).toBe("A");
  });

  it("a refund that fully closes kicks only — no re-invite, and the closing letter goes out (the close path, untouched)", async () => {
    await grantTier(FULFIL_NPUB, "C", "order-3", { expiresAtMs: T0 + 1 * DAY, mxid: MXID }); // a taster, nothing underneath

    const result = await settleEntitlementFromOrder(refundOrder({ id: "order-3" }));

    expect(result.tier).toBe("C");
    expect(result.revoked).toBe(true);
    expect(kicked).toEqual([{ mxid: MXID, reason: "refunded" }]);
    expect(invited).toEqual([]); // nothing to fall back to — no re-invite
    expect(result.rooms).toEqual([{ room: "#kicked", ok: true }]);
    expect(mailed.length).toBe(1); // the closing letter DID go out

    expect(await getEntitlement(FULFIL_NPUB)).toBeNull();
  });
});
