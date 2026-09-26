import { describe, it, expect } from "vitest";
import { qaEntitledFromOrders } from "@/lib/qa-entitlement";
import type { OrderState } from "@/lib/store";

/**
 * TASK-475 (block 968,624) — the pure core of the Q&A's entitlement
 * decision: tier C (Evening Star) OR a settled, non-refunded order
 * carrying the Q&A pass (`QA_ITEM_ID`, `q-a-meetup-with-love`). No KV, no
 * fs — a handful of fabricated orders in memory.
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

  it("a fulfilled order (also SETTLED_FAMILY) entitles", () => {
    expect(qaEntitledFromOrders(null, SUBJECT, [order({ state: "fulfilled" })])).toBe(true);
  });

  it("a REFUNDED order does NOT entitle, even though it's in SETTLED_FAMILY", () => {
    expect(qaEntitledFromOrders(null, SUBJECT, [order({ state: "refunded" })])).toBe(false);
  });

  it("a disputed order STILL entitles (the brief's literal spec: SETTLED_FAMILY minus refunded only, disputed is unresolved money, not returned money)", () => {
    expect(qaEntitledFromOrders(null, SUBJECT, [order({ state: "disputed" })])).toBe(true);
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
