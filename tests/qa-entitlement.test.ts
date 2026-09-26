import { describe, it, expect } from "vitest";
import { qaEntitledFromOrders } from "@/lib/qa-entitlement";
import type { OrderState } from "@/lib/store";

/**
 * TASK-475 (block 968,624) — the pure core of the Q&A's entitlement
 * decision: tier C (Evening Star) OR a `settled`/`fulfilled` order
 * carrying the Q&A pass (`QA_ITEM_ID`, `q-a-meetup-with-love`). No KV, no
 * fs — a handful of fabricated orders in memory.
 *
 * The adversarial review (block 968,624) caught that `disputed` must NOT
 * count as entitled here — `entitlement-fulfil.ts` treats a disputed
 * order the SAME as a refunded one (it revokes the tier and removes the
 * member from rooms), so this decision only grants on the two states
 * that mean money actually landed and stayed: `settled` and `fulfilled`
 * — narrower than `store.ts`'s own `SETTLED_FAMILY`, which also includes
 * `refunded` and `disputed`.
 */

const SUBJECT = "reader@onecocreation";
const QA_ITEM_ID = "q-a-meetup-with-love";

const order = (overrides: Partial<{ state: OrderState; entitlementSubject: string; itemId: string }> = {}) => ({
  state: overrides.state ?? "settled",
  entitlementSubject: overrides.entitlementSubject ?? SUBJECT,
  lineItems: [{ itemId: overrides.itemId ?? QA_ITEM_ID }],
});

describe("qaEntitledFromOrders", () => {
  it("tier C alone entitles, no orders needed", () => {
    expect(qaEntitledFromOrders("C", SUBJECT, [])).toBe(true);
  });

  it("no tier, no orders -> not entitled", () => {
    expect(qaEntitledFromOrders(null, SUBJECT, [])).toBe(false);
  });

  it("tier A or B alone does not entitle", () => {
    expect(qaEntitledFromOrders("A", SUBJECT, [])).toBe(false);
    expect(qaEntitledFromOrders("B", SUBJECT, [])).toBe(false);
  });

  it("a settled order for the Q&A pass entitles, even with no tier", () => {
    expect(qaEntitledFromOrders(null, SUBJECT, [order({ state: "settled" })])).toBe(true);
  });

  it("a fulfilled order also entitles", () => {
    expect(qaEntitledFromOrders(null, SUBJECT, [order({ state: "fulfilled" })])).toBe(true);
  });

  it("a REFUNDED order does NOT entitle", () => {
    expect(qaEntitledFromOrders(null, SUBJECT, [order({ state: "refunded" })])).toBe(false);
  });

  it("a DISPUTED order does NOT entitle either — entitlement-fulfil.ts revokes on dispute the same as on refund, so this decision must agree", () => {
    expect(qaEntitledFromOrders(null, SUBJECT, [order({ state: "disputed" })])).toBe(false);
  });

  it("a created (not yet settled) order does not entitle", () => {
    expect(qaEntitledFromOrders(null, SUBJECT, [order({ state: "created" })])).toBe(false);
  });

  it("an order for a different item does not entitle", () => {
    expect(qaEntitledFromOrders(null, SUBJECT, [order({ itemId: "some-other-item" })])).toBe(false);
  });

  it("an order for a different subject does not entitle", () => {
    expect(qaEntitledFromOrders(null, SUBJECT, [order({ entitlementSubject: "someone-else@onecocreation" })])).toBe(false);
  });

  it("a mixed ledger: one refunded, one settled for the right item/subject -> entitled", () => {
    const orders = [order({ state: "refunded" }), order({ state: "settled" })];
    expect(qaEntitledFromOrders(null, SUBJECT, orders)).toBe(true);
  });
});
