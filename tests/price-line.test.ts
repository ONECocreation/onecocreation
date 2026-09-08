import { describe, it, expect } from "vitest";
import { priceLine, storeCardModel } from "@/components/store/StoreItemCard";
import type { StoreItem } from "@/lib/store";

/**
 * TASK-157 (0018.06.17 a₿, cut from the T-147 review): the item page showed
 * "11,111 sats" above the panel while the only live door was PAY BY CARD
 * $11 — a price in a currency no rail could actually charge. priceLine()
 * is buyDoorLabel()'s sibling (T-147, BuyPanel.tsx): the same rail truth
 * (railLive/squareLive off liveAdapter()), now judging the price LINE
 * instead of the button. THE RULE:
 *   - bitcoin OFF          → the line leads with dollars (or a dash if
 *                            card's off too)
 *   - both live            → sats first, the dollar echo second
 *   - only bitcoin live    → sats alone, no fiat echo — that rail isn't
 *                            open, even when the item carries a fiat price
 *   - neither live         → a dash (derive-or-dash, same law as no price
 *                            at all)
 * One helper backs both faces: the item page (src/app/store/[id]/page.tsx)
 * and the shelf card (storeCardModel, StoreItemCard.tsx) — pinned here
 * word for word.
 */

function item(over: Partial<StoreItem>): StoreItem {
  return {
    id: "x",
    schemaVersion: 2,
    title: "X",
    blurb: "words",
    images: [],
    kind: "digital",
    price: {},
    fulfillment: "digital",
    status: "live",
    ...over,
  };
}

const BOTH = { btc: true, card: true };
const BTC_ONLY = { btc: true, card: false };
const CARD_ONLY = { btc: false, card: true };
const NEITHER = { btc: false, card: false };

const bothPrices = { sats: 11111, fiat: { amount: 1100, currency: "USD" } };

describe("priceLine — the price line follows the live rails", () => {
  it("both rails live: sats first, the dollar echo second", () => {
    expect(priceLine(item({ price: bothPrices }), BOTH)).toEqual({
      primary: "11,111 sats",
      secondary: "$11",
    });
  });

  it("bitcoin OFF, card live: the line leads with dollars, no sats anywhere", () => {
    expect(priceLine(item({ price: bothPrices }), CARD_ONLY)).toEqual({
      primary: "$11",
      secondary: null,
    });
  });

  it("only bitcoin live: sats alone — the fiat echo is dropped even though the item carries a fiat price", () => {
    expect(priceLine(item({ price: bothPrices }), BTC_ONLY)).toEqual({
      primary: "11,111 sats",
      secondary: null,
    });
  });

  it("neither rail live: a dash, never a price no door can charge (derive-or-dash beats price availability)", () => {
    expect(priceLine(item({ price: bothPrices }), NEITHER)).toEqual({
      primary: "—",
      secondary: null,
    });
  });

  it("both live, sats-only item: sats lead, no echo — there is no fiat price to echo", () => {
    expect(priceLine(item({ price: { sats: 11111 } }), BOTH)).toEqual({
      primary: "11,111 sats",
      secondary: null,
    });
  });

  it("both live, fiat-only item: dollars lead — there is no sats price to lead with", () => {
    expect(priceLine(item({ price: { fiat: { amount: 5500, currency: "USD" } } }), BOTH)).toEqual({
      primary: "$55",
      secondary: null,
    });
  });

  it("bitcoin OFF, card OFF too, fiat-only item: still a dash — no rail is open to charge it", () => {
    expect(priceLine(item({ price: { fiat: { amount: 5500, currency: "USD" } } }), NEITHER)).toEqual({
      primary: "—",
      secondary: null,
    });
  });

  it("card live, item has no fiat price at all: a dash, never an invented number", () => {
    expect(priceLine(item({ price: { sats: 11111 } }), CARD_ONLY)).toEqual({
      primary: "—",
      secondary: null,
    });
  });

  it("the sale price rides the same rule as the shelf price", () => {
    expect(priceLine(item({ price: { sats: 21000 }, sale: { sats: 11111 } }), BOTH)).toEqual({
      primary: "11,111 sats",
      secondary: null,
    });
  });

  it("whole dollars, no cents unless they carry information (the flat-dollars law) — carried through by the echo too", () => {
    expect(priceLine(item({ price: { sats: 1, fiat: { amount: 5550, currency: "USD" } } }), BOTH).secondary).toBe("$55.50");
  });
});

describe("storeCardModel — the shelf card adopts the same rule, backward-compatible when rails aren't known", () => {
  it("no rails argument still assumes both live — every T-148 pin holds unchanged", () => {
    const m = storeCardModel(item({ price: bothPrices }));
    expect(m.priceLabel).toBe("11,111 sats");
    expect(m.fiatSecondary).toBe("$11");
  });

  it("a caller that knows the live rails gets the same honest line as the item page", () => {
    const m = storeCardModel(item({ price: bothPrices }), CARD_ONLY);
    expect(m.priceLabel).toBe("$11");
    expect(m.fiatSecondary).toBeNull();
  });

  it("only bitcoin live on the shelf: sats alone, same as the item page", () => {
    const m = storeCardModel(item({ price: bothPrices }), BTC_ONLY);
    expect(m.priceLabel).toBe("11,111 sats");
    expect(m.fiatSecondary).toBeNull();
  });

  it("neither rail live on the shelf: a dash, not a stale number", () => {
    const m = storeCardModel(item({ price: bothPrices }), NEITHER);
    expect(m.priceLabel).toBe("—");
  });
});
