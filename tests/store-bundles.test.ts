import { describe, it, expect } from "vitest";
import { groupItemsByBundle } from "@/lib/store-sections";
import { validateItem, type StoreItem } from "@/lib/store";

/**
 * TASK-215 (0018.06.23 a₿, Love's call #35) — "bundle items — 'hair
 * together, soul conversations together' — a bundle is items grouped
 * under one buy". The smallest shape that serves the shelf: a `bundle`
 * word on the item (same shape as `category`), a pure grouping function
 * (groupItemsByBundle, mirroring groupRoomsByPackage's own pattern), and
 * the shelf clusters them (ShelfSection.tsx). Each item keeps its OWN
 * price and its OWN door — never a shared cart, never a new money rail
 * (T-198 holds).
 */
function item(over: Partial<StoreItem>): StoreItem {
  return {
    id: "x",
    schemaVersion: 2,
    title: "X",
    blurb: "words",
    images: [],
    kind: "self",
    price: {},
    fulfillment: "self",
    status: "live",
    ...over,
  };
}

describe("groupItemsByBundle — items grouped under one shared heading", () => {
  it("items sharing a bundle word cluster together, in the given order", () => {
    const items = [
      item({ id: "a", bundle: "hair together" }),
      item({ id: "b" }), // standalone
      item({ id: "c", bundle: "hair together" }),
    ];
    expect(groupItemsByBundle(items)).toEqual([
      { bundle: "hair together", items: [items[0], items[2]] },
    ]);
  });

  it("multiple bundles preserve first-appearance order, each in its own cluster", () => {
    const items = [
      item({ id: "a", bundle: "soul conversations" }),
      item({ id: "b", bundle: "hair together" }),
      item({ id: "c", bundle: "soul conversations" }),
      item({ id: "d", bundle: "hair together" }),
    ];
    const groups = groupItemsByBundle(items);
    expect(groups.map((g) => g.bundle)).toEqual(["soul conversations", "hair together"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["a", "c"]);
    expect(groups[1].items.map((i) => i.id)).toEqual(["b", "d"]);
  });

  it("stray whitespace folds into the same bundle, same as category", () => {
    const items = [item({ id: "a", bundle: "hair together" }), item({ id: "b", bundle: " hair together " })];
    const groups = groupItemsByBundle(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(2);
  });

  it("no items carry a bundle → no groups, nothing invented", () => {
    expect(groupItemsByBundle([item({ id: "a" }), item({ id: "b" })])).toEqual([]);
  });
});

describe("bundle validation — the same honest-shapes law as category", () => {
  it("a bundle word is valid; each item keeps its own price (never a shared checkout)", () => {
    expect(validateItem(item({ bundle: "hair together", price: { sats: 21000 } }))).toEqual({ ok: true });
    expect(validateItem(item({ id: "b", bundle: "hair together", price: { sats: 33000 } }))).toEqual({ ok: true });
  });

  it("a bundle name over 64 chars is refused in words", () => {
    expect(validateItem(item({ status: "hidden", bundle: "x".repeat(65) }))).toEqual({
      ok: false,
      reason: "a bundle name as short text (max 64 chars)",
    });
  });
});
