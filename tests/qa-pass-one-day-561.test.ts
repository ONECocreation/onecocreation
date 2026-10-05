import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { doorDay, doorExpired, type DoorState } from "@/lib/door-lifecycle";
import { qaAccessFromOrders, qaEntitled } from "@/lib/qa-entitlement";
import { markQaPassUsed } from "@/lib/qa-entitlement";
import { tierForSubject } from "@/lib/member-tier";
import type { OrderState } from "@/lib/store";

/**
 * TASK-561 (block 970,086) — the Admiral's ruling: "the qa pass 33.33 is a
 * one time deal for that one session." Pass: ONE Q&A day (the door's own
 * America/Denver calendar day), then spent; tier C never spends one.
 * Pure core + day helper + the live `qaEntitled` over a faked orders read
 * (no vault: the used-day store runs on its in-memory stand-in) + the
 * ReadingDay decision it feeds.
 */

const ordersFake = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock("@/lib/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/store")>()),
  listOrdersForSubject: vi.fn(async () => ordersFake.list),
}));
vi.mock("@/lib/member-tier", () => ({ tierForSubject: vi.fn() }));
const mockTier = vi.mocked(tierForSubject);
const authState = vi.hoisted(() => ({ signedIn: true }));
vi.mock("@/lib/member-auth", () => ({
  sessionsFromCookieHeader: () =>
    authState.signedIn ? [{ token: "t", handle: "oneday", space: "onecocreation" }] : [],
}));
vi.mock("next/headers", () => ({ headers: async () => ({ get: () => null }) }));

const SUBJECT = "oneday@onecocreation";
const QA = "q-a-meetup-with-love";
const DAY1 = "2026-10-10";
const DAY2 = "2026-10-11";

interface O {
  id: string;
  state: OrderState;
  entitlementSubject: string;
  lineItems: { itemId: string }[];
  createdAtMs: number;
  settledAtMs?: number;
}
const pass = (id: string, over: Partial<O> = {}): O => ({
  id,
  state: "settled",
  entitlementSubject: SUBJECT,
  lineItems: [{ itemId: QA }],
  createdAtMs: 1_000,
  ...over,
});

describe("qaAccessFromOrders — the one-day rule, pure", () => {
  it("tier C is entitled via tier with no orders, spends nothing", () => {
    expect(qaAccessFromOrders("C", SUBJECT, [], {}, DAY1)).toEqual({ entitled: true, via: "tier", orderId: null, firstUse: false });
  });

  it("tier C with a spent pass is still entitled via tier", () => {
    const a = qaAccessFromOrders("C", SUBJECT, [pass("a")], { a: DAY1 }, DAY2);
    expect(a.via).toBe("tier");
  });

  it("an unused pass is entitled, names its order, and is a first use", () => {
    expect(qaAccessFromOrders(null, SUBJECT, [pass("a")], {}, DAY1)).toEqual({ entitled: true, via: "pass", orderId: "a", firstUse: true });
  });

  it("a pass used TODAY is still entitled (same day, not a first use)", () => {
    expect(qaAccessFromOrders(null, SUBJECT, [pass("a")], { a: DAY1 }, DAY1)).toEqual({ entitled: true, via: "pass", orderId: "a", firstUse: false });
  });

  it("a pass used on an EARLIER day is spent", () => {
    expect(qaAccessFromOrders(null, SUBJECT, [pass("a")], { a: DAY1 }, DAY2).entitled).toBe(false);
  });

  it("refunded, disputed and created orders never grant", () => {
    for (const state of ["refunded", "disputed", "created"] as OrderState[]) {
      expect(qaAccessFromOrders(null, SUBJECT, [pass("a", { state })], {}, DAY1).entitled).toBe(false);
    }
  });

  it("another subject's order never grants", () => {
    expect(qaAccessFromOrders(null, SUBJECT, [pass("a", { entitlementSubject: "x@onecocreation" })], {}, DAY1).entitled).toBe(false);
  });

  it("an order with no pass line item never grants", () => {
    expect(qaAccessFromOrders(null, SUBJECT, [pass("a", { lineItems: [{ itemId: "other" }] })], {}, DAY1).entitled).toBe(false);
  });

  it("two passes, one spent earlier and one unused: entitled, names the unused one", () => {
    const r = qaAccessFromOrders(null, SUBJECT, [pass("a"), pass("b", { createdAtMs: 2_000 })], { a: DAY1 }, DAY2);
    expect(r).toEqual({ entitled: true, via: "pass", orderId: "b", firstUse: true });
  });

  it("oldest unused first, by settledAtMs ?? createdAtMs", () => {
    const orders = [
      pass("late", { createdAtMs: 100, settledAtMs: 9_000 }),
      pass("early", { createdAtMs: 5_000, settledAtMs: 2_000 }),
      pass("nosettle", { createdAtMs: 3_000 }),
    ];
    expect(qaAccessFromOrders(null, SUBJECT, orders, {}, DAY1).orderId).toBe("early");
  });

  it("the pass already used today wins over an older unused one (one pass per day)", () => {
    const orders = [pass("a"), pass("b", { createdAtMs: 2_000 })];
    expect(qaAccessFromOrders(null, SUBJECT, orders, { b: DAY1 }, DAY1)).toEqual({ entitled: true, via: "pass", orderId: "b", firstUse: false });
  });
});

describe("doorDay — flips at the door's own Denver midnight", () => {
  const closing = (anchor: number): DoorState => ({ phase: "published", room: "oc-0123456789abcdef", openedAtMs: anchor, publishedAtMs: anchor, cameraShownAtMs: null });

  it("an ordinary day: 23:59 Denver vs 00:00 Denver", () => {
    expect(doorDay(Date.parse("2026-10-11T05:59:59Z"))).toBe("2026-10-10");
    expect(doorDay(Date.parse("2026-10-11T06:00:00Z"))).toBe("2026-10-11");
  });

  it("fall back (2026-11-01, MDT to MST): midnight 2026-11-01 is 06:00Z, 2026-11-02 is 07:00Z", () => {
    expect(doorDay(Date.parse("2026-11-01T05:59:59Z"))).toBe("2026-10-31");
    expect(doorDay(Date.parse("2026-11-01T06:00:00Z"))).toBe("2026-11-01");
    expect(doorDay(Date.parse("2026-11-02T06:59:59Z"))).toBe("2026-11-01");
    expect(doorDay(Date.parse("2026-11-02T07:00:00Z"))).toBe("2026-11-02");
  });

  it("spring forward (2027-03-14, MST to MDT): midnight 2027-03-14 is 07:00Z, 2027-03-15 is 06:00Z", () => {
    expect(doorDay(Date.parse("2027-03-14T06:59:59Z"))).toBe("2027-03-13");
    expect(doorDay(Date.parse("2027-03-14T07:00:00Z"))).toBe("2027-03-14");
    expect(doorDay(Date.parse("2027-03-15T05:59:59Z"))).toBe("2027-03-14");
    expect(doorDay(Date.parse("2027-03-15T06:00:00Z"))).toBe("2027-03-15");
  });

  it("is the SAME boundary doorExpired closes on", () => {
    const anchor = Date.parse("2026-11-01T20:00:00Z");
    expect(doorExpired(closing(anchor), Date.parse("2026-11-02T06:59:59Z"))).toBe(false);
    expect(doorExpired(closing(anchor), Date.parse("2026-11-02T07:00:00Z"))).toBe(true);
  });
});

describe("qaEntitled (live) and ReadingDay's decision — one pass, one day", () => {
  beforeEach(() => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.REDIS_URL;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    vi.useFakeTimers({ toFake: ["Date"] });
    mockTier.mockReset();
    ordersFake.list = [];
  });
  afterEach(() => vi.useRealTimers());

  it("an unused pass reads as entitled; read never writes (still unused after)", async () => {
    vi.setSystemTime(new Date("2026-10-10T20:00:00Z"));
    ordersFake.list = [pass("live-unused")];
    expect(await qaEntitled(SUBJECT, null)).toBe(true);
    expect(await qaEntitled(SUBJECT, null)).toBe(true);
  });

  it("spent: stamped on day 1 is entitled that day, NOT the next; stamp is write-once", async () => {
    ordersFake.list = [pass("live-spent")];
    vi.setSystemTime(new Date("2026-10-10T20:00:00Z"));
    expect(await markQaPassUsed("live-spent")).toBe(DAY1);
    vi.setSystemTime(new Date("2026-10-11T20:00:00Z"));
    expect(await markQaPassUsed("live-spent")).toBe(DAY1); // never moves
    expect(await qaEntitled(SUBJECT, null)).toBe(false);
    vi.setSystemTime(new Date("2026-10-10T21:00:00Z"));
    expect(await qaEntitled(SUBJECT, null)).toBe(true);
  });

  it("fails closed when the orders read throws", async () => {
    const store = await import("@/lib/store");
    vi.mocked(store.listOrdersForSubject).mockRejectedValueOnce(new Error("vault down"));
    expect(await qaEntitled(SUBJECT, null)).toBe(false);
  });

  it("ReadingDay hands the body qaEntitled=false for a spent pass, true for an unused one", async () => {
    const ReadingDay = (await import("@/components/reading/ReadingDay")).default;
    authState.signedIn = true;
    mockTier.mockResolvedValue(null);
    vi.setSystemTime(new Date("2026-10-10T20:00:00Z"));
    ordersFake.list = [pass("rd-spent")];
    await markQaPassUsed("rd-spent");
    vi.setSystemTime(new Date("2026-10-11T20:00:00Z"));
    expect(((await ReadingDay())!.props as { qaEntitled: boolean }).qaEntitled).toBe(false);
    ordersFake.list = [pass("rd-spent"), pass("rd-fresh", { createdAtMs: 2_000 })];
    expect(((await ReadingDay())!.props as { qaEntitled: boolean }).qaEntitled).toBe(true);
  });
});
