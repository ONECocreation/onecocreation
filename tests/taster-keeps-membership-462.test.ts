import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { grantTier, getEntitlement, revokeTier, type Entitlement } from "@/lib/entitlement";
import { classStartingAudience } from "@/lib/live";
import type { MatrixRoom } from "@/lib/matrix-rooms";
import type { OrderRecord, StoreItem } from "@/lib/store";
import { getItem } from "@/lib/store";
import { settleEntitlementFromOrder } from "@/lib/entitlement-fulfil";

/**
 * ROUND 4 (block 968,548): the FINAL adversarial review on `8d84694` found
 * one more confirmed defect in round 3's own "narrowed" `revokeTier` — a
 * plain, single, NEVER-redelivered refund of an ALREADY-LAPSED taster pass
 * still closed the permanent membership underneath it and mailed a false
 * "membership closed" letter naming the WRONG tier, because `revokeTier(npub)`
 * has no `orderId` to check at all and just blindly closes whatever
 * `getEntitlement` currently shows. Fix: a new pure `isLapsedPassOrder`
 * (`entitlement.ts`) reads the RAW record and answers "is `orderId` this
 * record's own order, already lapsed, with a live grant still under it?" —
 * `entitlement-fulfil.ts`'s refunded/disputed branch checks it FIRST and, if
 * true, does nothing at all (no room removal, no revoke, no letter). A
 * refund of a STILL-LIVE pass, or of the standing grant's own order, is
 * unaffected — same blunt base close as before this round.
 *
 * These integration tests need the fulfil layer's outer boundaries mocked —
 * `@/lib/store`'s `getItem` and `@/lib/matrix`'s five exports, the same
 * idiom this file's own round-2 F2 rows used (and the reviewer's own probe,
 * `probe462final/review.test.ts`, reuses) — while `entitlement.ts` stays
 * real throughout, backed by the SAME KV fixture as every other test below.
 */
const fulfilKicked: { mxid: string; reason?: string }[] = [];
const fulfilMailed: unknown[] = [];

vi.mock("@/lib/store", () => ({ getItem: vi.fn() }));
vi.mock("@/lib/matrix", () => ({
  inviteToTierRooms: vi.fn(async (mxid: string, tier: string) => [{ room: `#room-${tier}`, ok: true }]),
  removeFromTierRooms: vi.fn(async (mxid: string, opts?: { reason?: string }) => {
    fulfilKicked.push({ mxid, reason: opts?.reason });
    return [{ room: "#kicked", ok: true }];
  }),
  matrixConfigured: () => true,
  isMxid: (v: string) => typeof v === "string" && v.startsWith("@"),
  mxidForSubject: (s: string) => `@${s}`,
}));
vi.mock("@/lib/mail-queue", () => ({
  enqueue: vi.fn(async (items: unknown[]) => {
    fulfilMailed.push(...items);
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
 * SADD/SMEMBERS surface (SMEMBERS added in round 3 for `listEntitlements`,
 * `tests/discovery-checkout.test.ts:242`'s idiom); fake timers via
 * `vi.useFakeTimers()` + `vi.setSystemTime(T)`. Every row asserts against
 * the PERSISTED record — a fresh `getEntitlement` read, never the in-memory
 * return value alone.
 *
 * ROUND 3 (block 968,548) NARROWED this lane after two adversarial reviews
 * on `ec85417` found a confirmed blocker: round 2's refund-fallback in
 * `revokeTier` decided by exact-orderId match against the RAW record, but a
 * successful fallback REWRITES that record's own `orderId` to the `under`'s
 * order — so a routinely-redelivered `refunded` webhook (Square/BTCPay both
 * do this) no longer matches, falls through to the close branch, and closes
 * a member's PERMANENT membership on the SECOND delivery of the SAME refund
 * event. Per the production law ("narrow, don't rebuild, when blockers keep
 * coming"): the EXPIRY fallback (a taster lapsing naturally) is the
 * Saturday must and stays; the REFUND fallback goes back to base behavior
 * (`revokeTier(npub)`, no second arg, no fallback) until it can carry a
 * consumed-order marker (AFTER SATURDAY — see the register). Two smaller,
 * confirmed gaps were fixed in the same round: the `under` comparator
 * (`betterUnder`) now refuses to let a taster outrank a live PERMANENT
 * grant no matter its rank, and never lets an already-lapsed candidate win;
 * and `classStartingAudience` (`src/lib/live.ts`) now re-derives liveness
 * through the same `liveGrant` primitive `getEntitlement` uses, instead of
 * its own inline revoked/lapsed check that never knew about `under`.
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
    } else if (op === "SMEMBERS") {
      // round 3: `classStartingAudience` walks `listEntitlements`, which
      // reads the index set — `tests/discovery-checkout.test.ts:242`'s idiom
      result = [...(kvSets.get(args[0]) ?? new Set<string>())];
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
  fulfilKicked.length = 0;
  fulfilMailed.length = 0;
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

/** The RAW stored record — bypassing `getEntitlement`'s gate entirely, for
 *  the one case (F3b) where the fact under test (the standing order's own
 *  orderId, and what `under` holds) sits behind a PERMANENT top record that
 *  never naturally lapses, and round 3 removed the revoke-based fallback
 *  this test used to observe it through. */
function rawRecord(npub: string): Entitlement {
  const raw = kvStore.get(`oco:tier:${npub}`);
  expect(raw).toBeDefined();
  return JSON.parse(raw!);
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

describe("revokeTier — R1 (round 3, block 968,548): refunds close exactly as base, no fallback", () => {
  /**
   * The confirmed blocker: round 2's `revokeTier(npub, orderId)` matched the
   * RAW record's own `orderId` — but a successful fallback REWRITES that
   * field to the `under`'s order. A redelivered `refunded` webhook (routine
   * on Square/BTCPay) then no longer matches, falls through to the close
   * branch, and closes the member's permanent membership on the SECOND
   * delivery of the SAME event, plus sends a false closing letter and kicks
   * rooms. `revokeTier` is back to `9db8532`'s exact shape and behavior:
   * one argument, decide from `getEntitlement`, mark revoked. AFTER
   * SATURDAY: a pass refund falling back to the standing membership needs a
   * consumed-order marker so a redelivered webhook reads as a no-op instead
   * of a second, now-mismatched attempt to find the taster's own order.
   */
  it("a refund of the taster's own order closes the member's access exactly as base does — the permanent membership underneath is not spared", async () => {
    await grantTier(NPUB, "A", "order-1", {}); // permanent Weekly Intuitive
    await grantTier(NPUB, "C", "order-2", { expiresAtMs: T0 + 1 * DAY }); // the Q&A day pass, under=A

    const after = await revokeTier(NPUB); // base signature — no orderId, no fallback attempt
    expect(after?.revokedAtMs).toBeDefined();
    expect(await getEntitlement(NPUB)).toBeNull(); // CLOSED — same as base 9db8532, `under` and all
  });

  it("a redelivered refund event is a no-op the second time — Square/BTCPay routinely resend the same event", async () => {
    await grantTier(NPUB, "C", "order-1", {});
    const first = await revokeTier(NPUB);
    expect(first?.revokedAtMs).toBeDefined();

    const second = await revokeTier(NPUB); // the same webhook event, redelivered
    expect(second).toBeNull(); // already revoked — getEntitlement already reads it as nothing, nothing re-written
  });
});

describe("grantTier — F3 (block 968,543/968,548): an outranked purchase still becomes the new `under` when it beats what's there", () => {
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
    expect(rec.tier).toBe("B"); // NOT A — both A and B are permanent, so rank decides, and B outranks A
    expect(rec.expiresAtMs).toBeUndefined();
    expect(rec.orderId).toBe("order-3");
  });

  it("F3b: the standing order's own orderId is preserved, and an outranked permanent purchase is held as `under` — verified on the RAW record (round 3 removed the revoke-based fallback this used to observe)", async () => {
    await grantTier(NPUB, "C", "order-1", {}); // permanent Evening Star
    await grantTier(NPUB, "B", "order-2", {}); // a permanent Observer purchase, outranked by the standing C — becomes `under` (nothing there yet)

    const top = await persisted();
    expect(top.tier).toBe("C");
    expect(top.orderId).toBe("order-1"); // preserved — the purchase that lost the top slot never overwrites the audit trail of the one that holds it

    const raw = rawRecord(NPUB);
    expect(raw.under).toEqual({ tier: "B", orderId: "order-2" }); // JSON drops the undefined expiresAtMs key
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

describe("grantTier — R2 (round 3, block 968,548): one comparator for the `under` slot — a membership is never lost to a pass", () => {
  it("permanent A -> B week pass (under A) -> C day pass while B is live: under = A, PERMANENT beats taster regardless of rank; B's remaining days are the accepted cost, never chained past one level", async () => {
    await grantTier(NPUB, "A", "order-1", {}); // permanent Weekly Intuitive
    await grantTier(NPUB, "B", "order-2", { expiresAtMs: T0 + 7 * DAY }); // the Observer week pass, under=A
    expect((await persisted()).tier).toBe("B");

    vi.setSystemTime(T0 + 2 * DAY); // 2 days into the week pass — still live
    await grantTier(NPUB, "C", "order-3", { expiresAtMs: T0 + 3 * DAY }); // the Q&A day pass, bought on top of B
    expect((await persisted()).tier).toBe("C");

    vi.setSystemTime(T0 + 3 * DAY + 1); // the day pass closes
    const rec = await persisted();
    // round 2 pinned "B" here (the higher RANK) — re-trued in round 3: a
    // PERMANENT grant must never be lost to a pass, so the comparator checks
    // permanence BEFORE rank, and A (permanent) beats B (still just a pass).
    expect(rec.tier).toBe("A");
    expect(rec.expiresAtMs).toBeUndefined();
    expect(rec.orderId).toBe("order-1");
    // B's own remaining ~4 days are gone, not merely shadowed — the spec's
    // "never chain more than one level" rule; there is nothing further to
    // fall back to once A is read here (AFTER SATURDAY item — see register).
  });

  it("review 3b: a LAPSED `under` is replaced by a fresh outranked purchase, regardless of rank", async () => {
    await grantTier(NPUB, "A", "order-1", { expiresAtMs: T0 + 1 * DAY }); // an A taster, nothing under it
    await grantTier(NPUB, "C", "order-2", { expiresAtMs: T0 + 4 * DAY }); // a live C taster on top; under=A/order-1

    vi.setSystemTime(T0 + 2 * DAY); // the A taster's own window (T0+1day) has now lapsed; C (T0+4day) is still live
    await grantTier(NPUB, "A", "order-3", { expiresAtMs: T0 + 2 * DAY + 5 * DAY }); // a NEW A taster arrives, outranked by the live C

    const top = await persisted(); // the top (C) is untouched
    expect(top.tier).toBe("C");
    expect(top.expiresAtMs).toBe(T0 + 4 * DAY);

    vi.setSystemTime(T0 + 4 * DAY + 1); // C closes
    const rec = await persisted();
    expect(rec.tier).toBe("A");
    expect(rec.orderId).toBe("order-3"); // the FRESH taster, not the stale order-1 — a lapsed candidate never wins
    expect(rec.expiresAtMs).toBe(T0 + 2 * DAY + 5 * DAY);
  });

  it("review 3a: a permanent purchase beats a LIVE taster `under`, even at a lower rank", async () => {
    await grantTier(NPUB, "B", "order-1", { expiresAtMs: T0 + 7 * DAY }); // a B taster, nothing under it
    await grantTier(NPUB, "C", "order-2", { expiresAtMs: T0 + 1 * DAY }); // a C taster on top; under=B/order-1 (live)
    await grantTier(NPUB, "A", "order-3", {}); // a PERMANENT A purchase, outranked by the live C

    const top = await persisted();
    expect(top.tier).toBe("C");
    expect(top.expiresAtMs).toBe(T0 + 1 * DAY);

    vi.setSystemTime(T0 + 1 * DAY + 1); // C closes
    const rec = await persisted();
    expect(rec.tier).toBe("A"); // NOT B — a membership must never be lost to a pass, even a higher-ranked one
    expect(rec.orderId).toBe("order-3");
    expect(rec.expiresAtMs).toBeUndefined();
  });
});

describe("classStartingAudience — R3 (round 3, block 968,548): re-derives liveness through the same `liveGrant` `getEntitlement` uses", () => {
  it("a permanent A member with a LAPSED C taster on top is still counted in an A room's audience", async () => {
    const LIVE_NPUB = "audience-member@example.com@email"; // emailForGrantKey's own "@email" shortcut — no registry/nostr lookup needed
    await grantTier(LIVE_NPUB, "A", "order-1", {}); // permanent Weekly Intuitive
    await grantTier(LIVE_NPUB, "C", "order-2", { expiresAtMs: T0 + 1 * DAY }); // the Q&A day pass, under=A

    vi.setSystemTime(T0 + 1 * DAY + 1); // the pass has lapsed — the RAW record still says tier "C"

    const room: MatrixRoom = { id: "#test-room:onecocreation.com", title: "Test Room", kind: "community", minTier: "A" };
    const audience = await classStartingAudience(room);
    // before round 3: classStartingAudience read the raw record's own
    // revoked/lapsed fields directly, never consulting `under` — a member
    // whose taster had lapsed dropped out of every room's audience even
    // though their live grant (per getEntitlement/liveGrant) is still A.
    expect(audience).toContain("audience-member@example.com");
  });

  it("a room above the member's live (fallen-back) tier does not include them", async () => {
    const LIVE_NPUB = "audience-member-2@example.com@email";
    await grantTier(LIVE_NPUB, "A", "order-1", {});
    await grantTier(LIVE_NPUB, "C", "order-2", { expiresAtMs: T0 + 1 * DAY });
    vi.setSystemTime(T0 + 1 * DAY + 1); // falls back to A

    const bRoom: MatrixRoom = { id: "#test-room-b:onecocreation.com", title: "Test Room B", kind: "community", minTier: "B" };
    const audience = await classStartingAudience(bRoom);
    expect(audience).not.toContain("audience-member-2@example.com");
  });
});

const LAPSED_REFUND_NPUB = "lapsed-refund@example.com@email";
const LAPSED_REFUND_MXID = "@lapsed-refund:matrix.onecocreation.com";

function lapsedRefundOrder(over: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "order-taster",
    schemaVersion: 2,
    state: "refunded",
    lineItems: [{ itemId: "qa-day-pass", title: "Q&A Day Pass", qty: 1 }],
    priceSnapshot: { amount: 1100, currency: "USD", at: new Date(T0).toISOString() },
    adapterId: "square",
    chargeIds: ["ch_fixture"],
    entitlementSubject: LAPSED_REFUND_NPUB,
    contact: { email: "lapsed-refund@example.com" },
    createdAtMs: T0,
    events: [],
    ...over,
  } as OrderRecord;
}

describe("settleEntitlementFromOrder — round 4 (block 968,548): a refund of an already-lapsed pass leaves the membership under it alone", () => {
  it("a single, ordinary refund of an already-lapsed taster pass does nothing at all — no room removal, no revoke, no letter", async () => {
    await grantTier(LAPSED_REFUND_NPUB, "A", "order-permanent", { mxid: LAPSED_REFUND_MXID }); // paid, permanent Weekly Intuitive
    await grantTier(LAPSED_REFUND_NPUB, "C", "order-taster", { expiresAtMs: T0 + 1 * DAY }); // the Q&A day pass, under=A

    vi.setSystemTime(T0 + 3 * DAY); // the pass lapsed days ago — member correctly reads A
    expect((await getEntitlement(LAPSED_REFUND_NPUB))?.tier).toBe("A");

    vi.setSystemTime(T0 + 7 * DAY); // a week later, Love refunds the long-dead pass order — one ordinary delivery
    const result = await settleEntitlementFromOrder(lapsedRefundOrder());

    expect(result.note).toBe("the refunded pass had already ended; the membership under it stays");
    expect(result.revoked).toBe(false);
    expect(result.granted).toBe(false);
    expect(result.rooms).toEqual([]);

    const rec = await getEntitlement(LAPSED_REFUND_NPUB);
    expect(rec?.tier).toBe("A");
    expect(rec?.orderId).toBe("order-permanent");
    expect(rec?.revokedAtMs).toBeUndefined();

    expect(fulfilKicked).toEqual([]); // no room removal at all
    expect(fulfilMailed).toEqual([]); // no closing letter
  });

  it("a redelivered refund of the same lapsed order, and a dispute of it, are both no-ops — A stands every time", async () => {
    await grantTier(LAPSED_REFUND_NPUB, "A", "order-permanent", { mxid: LAPSED_REFUND_MXID });
    await grantTier(LAPSED_REFUND_NPUB, "C", "order-taster", { expiresAtMs: T0 + 1 * DAY });
    vi.setSystemTime(T0 + 3 * DAY); // lapsed

    await settleEntitlementFromOrder(lapsedRefundOrder()); // first delivery
    expect((await getEntitlement(LAPSED_REFUND_NPUB))?.tier).toBe("A");

    await settleEntitlementFromOrder(lapsedRefundOrder()); // Square/BTCPay redelivers the SAME refunded event
    expect((await getEntitlement(LAPSED_REFUND_NPUB))?.tier).toBe("A");

    await settleEntitlementFromOrder(lapsedRefundOrder({ state: "disputed" })); // a dispute of the same, already-refunded order
    const rec = await getEntitlement(LAPSED_REFUND_NPUB);
    expect(rec?.tier).toBe("A");
    expect(rec?.orderId).toBe("order-permanent");
    expect(rec?.revokedAtMs).toBeUndefined();

    // the guard reads only the raw record, which this whole path never
    // writes — nothing here can ever behave differently on a later call
    expect(fulfilKicked).toEqual([]);
    expect(fulfilMailed).toEqual([]);
  });

  it("refunding the taster's order WHILE the pass is still LIVE takes today's base behavior — revoked, letter names the pass (the known, disclosed gap)", async () => {
    await grantTier(LAPSED_REFUND_NPUB, "A", "order-permanent", { mxid: LAPSED_REFUND_MXID });
    await grantTier(LAPSED_REFUND_NPUB, "C", "order-taster", { expiresAtMs: T0 + 1 * DAY }); // still live — no lapse yet

    const result = await settleEntitlementFromOrder(lapsedRefundOrder()); // refunded WHILE C is still live

    expect(result.revoked).toBe(true);
    expect(result.tier).toBe("C"); // held.tier at refund time was the live pass
    expect(await getEntitlement(LAPSED_REFUND_NPUB)).toBeNull(); // CLOSED — the permanent A underneath is lost too: disclosed, unfixed (do not add a live-pass fallback)
    expect(fulfilKicked).toEqual([{ mxid: LAPSED_REFUND_MXID, reason: "refunded" }]);
    expect(fulfilMailed.length).toBe(1);
    expect(JSON.stringify(fulfilMailed[0])).toContain("Evening Star"); // TIERS.C.name — names the pass, since it was still live and truly held
  });

  it("refunding the STANDING grant's own order after the pass lapsed still closes everything — a real refund", async () => {
    await grantTier(LAPSED_REFUND_NPUB, "A", "order-permanent", { mxid: LAPSED_REFUND_MXID });
    await grantTier(LAPSED_REFUND_NPUB, "C", "order-taster", { expiresAtMs: T0 + 1 * DAY });
    vi.setSystemTime(T0 + 3 * DAY); // the pass lapsed — reads A

    mockGetItem.mockResolvedValue({
      id: "weekly-permanent",
      schemaVersion: 2,
      title: "Weekly Intuitive",
      blurb: "",
      images: [],
      kind: "package",
      price: { fiat: { amount: 3300, currency: "USD" }, sats: 55_555 },
      fulfillment: "package",
      status: "live",
      entitlementTier: "A",
    } satisfies StoreItem);

    const result = await settleEntitlementFromOrder(
      lapsedRefundOrder({ id: "order-permanent", lineItems: [{ itemId: "weekly-permanent", title: "Weekly Intuitive", qty: 1 }] }),
    );

    expect(result.revoked).toBe(true);
    expect(result.tier).toBe("A");
    expect(await getEntitlement(LAPSED_REFUND_NPUB)).toBeNull(); // genuinely refunded — closes as it should
  });
});
