import { describe, it, expect } from "vitest";
import { priceLine, storeCardModel } from "@/components/store/StoreItemCard";
import { priceLine as itemPagePriceLine } from "@/app/store/[id]/page";
import type { StoreItem } from "@/lib/store";

/**
 * TASK-157 (0018.06.17 a₿, cut from the T-147 review): the price line
 * follows THE SWITCHES (T-129) — a rail that isn't live shows no price in
 * its currency, never an invented one.
 *
 * TASK-186 (0018.06.18 a₿): ONE CURRENCY AT A TIME. Both copies of
 * priceLine (the shelf card's, the item page's) are now thin shims over
 * THE ONE DISPLAY LAW — priceWords() in money-words.ts — so they cannot
 * drift. THE RULE:
 *   - the PREFERRED denomination first, the other as "or …" — only when
 *     both exist AND both rails are live
 *   - a single-denomination price shows alone
 *   - a dark rail's denomination stays silent, whichever way the
 *     preference leans (never an invented number)
 *   - neither live → a dash (derive-or-dash)
 *   - NEVER "≈" — both numbers are Love's own
 * The default preference (no `oc-money` word yet) is fiat when the card
 * rail is live, else sats — storeCardModel derives it from the rails.
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

describe("priceLine — the preferred denomination first, the other as \"or …\"", () => {
  it("both rails live, fiat preferred: dollars lead, the sats echo second", () => {
    expect(priceLine(item({ price: bothPrices }), BOTH, "fiat")).toEqual({
      primary: "$11",
      secondary: "or 11,111 sats",
    });
  });

  it("both rails live, sats preferred: sats lead, the dollar echo second", () => {
    expect(priceLine(item({ price: bothPrices }), BOTH, "sats")).toEqual({
      primary: "11,111 sats",
      secondary: "or $11",
    });
  });

  it("bitcoin OFF, card live: the line leads with dollars either way — no sats anywhere", () => {
    expect(priceLine(item({ price: bothPrices }), CARD_ONLY, "fiat")).toEqual({
      primary: "$11",
      secondary: null,
    });
    expect(priceLine(item({ price: bothPrices }), CARD_ONLY, "sats")).toEqual({
      primary: "$11",
      secondary: null,
    });
  });

  it("only bitcoin live: sats alone either way — the fiat echo is dropped even though the item carries a fiat price", () => {
    expect(priceLine(item({ price: bothPrices }), BTC_ONLY, "fiat")).toEqual({
      primary: "11,111 sats",
      secondary: null,
    });
    expect(priceLine(item({ price: bothPrices }), BTC_ONLY, "sats")).toEqual({
      primary: "11,111 sats",
      secondary: null,
    });
  });

  it("neither rail live: a dash, never a price no door can charge (derive-or-dash beats price availability)", () => {
    expect(priceLine(item({ price: bothPrices }), NEITHER, "fiat")).toEqual({
      primary: "—",
      secondary: null,
    });
  });

  it("both live, sats-only item: sats lead, no echo — there is no fiat price to echo", () => {
    expect(priceLine(item({ price: { sats: 11111 } }), BOTH, "fiat")).toEqual({
      primary: "11,111 sats",
      secondary: null,
    });
  });

  it("both live, fiat-only item: dollars lead — there is no sats price to lead with", () => {
    expect(priceLine(item({ price: { fiat: { amount: 5500, currency: "USD" } } }), BOTH, "sats")).toEqual({
      primary: "$55",
      secondary: null,
    });
  });

  it("bitcoin OFF, card OFF too, fiat-only item: still a dash — no rail is open to charge it", () => {
    expect(priceLine(item({ price: { fiat: { amount: 5500, currency: "USD" } } }), NEITHER, "fiat")).toEqual({
      primary: "—",
      secondary: null,
    });
  });

  it("card live, item has no fiat price at all: a dash, never an invented number", () => {
    expect(priceLine(item({ price: { sats: 11111 } }), CARD_ONLY, "fiat")).toEqual({
      primary: "—",
      secondary: null,
    });
  });

  it("the sale price rides the same rule as the shelf price", () => {
    expect(priceLine(item({ price: { sats: 21000 }, sale: { sats: 11111 } }), BOTH, "sats")).toEqual({
      primary: "11,111 sats",
      secondary: null,
    });
  });

  it("whole dollars, no cents unless they carry information (the flat-dollars law) — carried through by the echo too", () => {
    expect(priceLine(item({ price: { sats: 1, fiat: { amount: 5550, currency: "USD" } } }), BOTH, "sats").secondary)
      .toBe("or $55.50");
  });

  it("NEVER \"≈\" — no invented rate, both numbers are Love's own", () => {
    for (const prefer of ["fiat", "sats"] as const) {
      const w = priceLine(item({ price: bothPrices }), BOTH, prefer);
      expect(w.primary).not.toContain("≈");
      expect(w.secondary ?? "").not.toContain("≈");
    }
  });
});

describe("storeCardModel — the shelf card adopts the same rule, fiat first by default when the card rail is live", () => {
  it("no rails/prefer argument: both live assumed, fiat leads (Love's liked default), the sats echo second", () => {
    const m = storeCardModel(item({ price: bothPrices }));
    expect(m.priceLabel).toBe("$11");
    expect(m.fiatSecondary).toBe("or 11,111 sats");
  });

  it("an explicit sats word flips the line — the customer's choice", () => {
    const m = storeCardModel(item({ price: bothPrices }), BOTH, "sats");
    expect(m.priceLabel).toBe("11,111 sats");
    expect(m.fiatSecondary).toBe("or $11");
  });

  it("a caller that knows the live rails gets the same honest line as the item page", () => {
    const m = storeCardModel(item({ price: bothPrices }), CARD_ONLY);
    expect(m.priceLabel).toBe("$11");
    expect(m.fiatSecondary).toBeNull();
  });

  it("only bitcoin live on the shelf: sats alone (the default leans sats when the card rail is dark)", () => {
    const m = storeCardModel(item({ price: bothPrices }), BTC_ONLY);
    expect(m.priceLabel).toBe("11,111 sats");
    expect(m.fiatSecondary).toBeNull();
  });

  it("neither rail live on the shelf: a dash, not a stale number", () => {
    const m = storeCardModel(item({ price: bothPrices }), NEITHER);
    expect(m.priceLabel).toBe("—");
  });
});

describe("the item page's priceLine and the shelf's priceLine never drift apart", () => {
  const fixtures: [string, StoreItem, { btc: boolean; card: boolean }, "fiat" | "sats"][] = [
    ["both live, both prices, fiat", item({ price: bothPrices }), BOTH, "fiat"],
    ["both live, both prices, sats", item({ price: bothPrices }), BOTH, "sats"],
    ["bitcoin off, card live", item({ price: bothPrices }), CARD_ONLY, "sats"],
    ["only bitcoin live", item({ price: bothPrices }), BTC_ONLY, "fiat"],
    ["neither live", item({ price: bothPrices }), NEITHER, "fiat"],
    ["both live, sats only", item({ price: { sats: 11111 } }), BOTH, "fiat"],
    ["both live, fiat only", item({ price: { fiat: { amount: 5500, currency: "USD" } } }), BOTH, "sats"],
    ["both live, no price at all", item({ price: {} }), BOTH, "fiat"],
    ["a sale price", item({ price: { sats: 21000 }, sale: { sats: 11111, fiat: { amount: 900, currency: "USD" } } }), BOTH, "sats"],
  ];

  it.each(fixtures)("%s", (_label, it_, rails, prefer) => {
    expect(itemPagePriceLine(it_, rails, prefer)).toEqual(priceLine(it_, rails, prefer));
  });
});
