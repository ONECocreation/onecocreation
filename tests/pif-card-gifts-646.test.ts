import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { StoreItem } from "@/lib/store";

/**
 * TASK-646 (block 976,007) — PAY IT FORWARD STEP 1, THREE FIXED DOLLAR GIFTS
 * (Lumen's brief LUMEN-oc-pif-card-gifts-GO-975999, card 15). Pins:
 *
 *  1. THE GATE (decideGiftPanel): the panel opens when the jars switch is on
 *     and at least one rail is live with something to give; each row shows
 *     only for its own live rail; a dollar button only while its own item is
 *     live with a dollar price; the amounts are read from the items.
 *  2. THE SHELF: the three gift items stay off the shelf grid and Related,
 *     their crumb points at the drawer, and they give to Gifts of Gratitude.
 *  3. THE MIXED BASKET (basketRails): which live rail can carry a basket,
 *     and the plain sentence when none can.
 *  4. THE WORDS: the first travel card says only what the page can do.
 *  5. THE ROW (TipJar, static render): the dollar row has three buttons and
 *     Give, no own-amount box; the sats row keeps its box; both together.
 */

function giftItem(id: string, cents: number | null, over: Partial<StoreItem> = {}): StoreItem {
  return {
    id,
    schemaVersion: 2,
    title: id,
    blurb: "",
    images: [],
    kind: "digital",
    price: cents == null ? { sats: 111 } : { fiat: { amount: cents, currency: "USD" } },
    fulfillment: "digital",
    status: "live",
    ...over,
  } as StoreItem;
}

const G1 = giftItem("pay-it-forward-gift-1", 1_100);
const G2 = giftItem("pay-it-forward-gift-2", 3_300);
const G3 = giftItem("pay-it-forward-gift-3", 11_100);

describe("1. the gate, rail by rail", () => {
  it("bitcoin off, card on (the live state): the dollar row only, $11 / $33 / $111, read from the items", async () => {
    const { decideGiftPanel } = await import("@/lib/gift-panel");
    const p = decideGiftPanel({ jarsSwitch: true, btc: false, card: true, liveJars: ["payforward"], giftItems: [G3, G1, G2] });
    expect(p.open).toBe(true);
    expect(p.satsJars).toEqual([]);
    expect(p.dollarGifts.map((g) => g.amount)).toEqual([1_100, 3_300, 11_100]);
  });

  it("both rails on: both rows", async () => {
    const { decideGiftPanel } = await import("@/lib/gift-panel");
    const p = decideGiftPanel({ jarsSwitch: true, btc: true, card: true, liveJars: ["payforward"], giftItems: [G1, G2, G3] });
    expect(p.satsJars).toEqual(["payforward"]);
    expect(p.dollarGifts).toHaveLength(3);
  });

  it("no rail on: no panel", async () => {
    const { decideGiftPanel } = await import("@/lib/gift-panel");
    const p = decideGiftPanel({ jarsSwitch: true, btc: false, card: false, liveJars: ["payforward"], giftItems: [G1, G2, G3] });
    expect(p).toMatchObject({ open: false, satsJars: [], dollarGifts: [] });
  });

  it("the jars switch off: no panel, whatever the rails", async () => {
    const { decideGiftPanel } = await import("@/lib/gift-panel");
    const p = decideGiftPanel({ jarsSwitch: false, btc: true, card: true, liveJars: ["payforward"], giftItems: [G1, G2, G3] });
    expect(p.open).toBe(false);
  });

  it("card on but no gift item made yet (the code lands dark): no panel", async () => {
    const { decideGiftPanel } = await import("@/lib/gift-panel");
    const p = decideGiftPanel({ jarsSwitch: true, btc: false, card: true, liveJars: [], giftItems: [null, null, null] });
    expect(p.open).toBe(false);
  });

  it("derive-or-dash per button: hidden, coming soon, no dollar price, or another currency drop out", async () => {
    const { decideGiftPanel } = await import("@/lib/gift-panel");
    const p = decideGiftPanel({
      jarsSwitch: true, btc: false, card: true, liveJars: [],
      giftItems: [
        G1,
        { ...G2, status: "hidden" },
        { ...G3, comingSoon: true },
        giftItem("pay-it-forward-gift-x", null),
        giftItem("pay-it-forward-gift-y", 500, { price: { fiat: { amount: 500, currency: "EUR" } } }),
      ],
    });
    expect(p.dollarGifts.map((g) => g.id)).toEqual(["pay-it-forward-gift-1"]);
  });

  it("Love changes a price in her desk: the button follows, no code holds the number", async () => {
    const { decideGiftPanel } = await import("@/lib/gift-panel");
    const p = decideGiftPanel({ jarsSwitch: true, btc: false, card: true, liveJars: [], giftItems: [{ ...G2, price: { fiat: { amount: 2_200, currency: "USD" } } }] });
    expect(p.dollarGifts[0].amount).toBe(2_200);
    const { readFileSync } = await import("fs");
    const src = readFileSync("src/components/TipJar.tsx", "utf8") + readFileSync("src/lib/gift-panel.ts", "utf8");
    expect(src).not.toMatch(/\b(1100|3300|11100)\b/);
  });
});

describe("2. the shelf: the gifts stay off it and give to Gifts of Gratitude", () => {
  it("the ids live once beside JAR_ITEMS, and give to the payforward jar", async () => {
    const { GIFT_ITEMS, OFF_SHELF_IDS, jarForItem, JAR_ITEMS } = await import("@/lib/jars");
    expect(GIFT_ITEMS).toEqual(["pay-it-forward-gift-1", "pay-it-forward-gift-2", "pay-it-forward-gift-3"]);
    for (const id of GIFT_ITEMS) expect(jarForItem(id)).toBe("payforward");
    for (const id of [...GIFT_ITEMS, ...Object.values(JAR_ITEMS)]) expect(OFF_SHELF_IDS.has(id)).toBe(true);
    expect(jarForItem("a-candle")).toBeNull();
  });

  it("the books: a settled $33 card gift counts to Gifts of Gratitude in dollars, never in sats", async () => {
    const { tipsFromOrders, ledgerFrom } = await import("@/lib/tips");
    const l = ledgerFrom(tipsFromOrders([{
      id: "9".repeat(24), schemaVersion: 2, state: "settled", adapterId: "square", chargeIds: [], events: [],
      createdAtMs: 1, settledAtMs: 1,
      lineItems: [{ itemId: "pay-it-forward-gift-2", title: "Pay It Forward Gift 2", qty: 1, listFiat: 3_300 }],
      priceSnapshot: { amount: 3_300, currency: "USD", at: "2026-11-15T00:00:00Z" },
    }]));
    expect(l.totals.payforward).toEqual({ settledSats: 0, settledFiat: { USD: 3_300 }, count: 1 });
  });

  it("the store desk derives the ids from the titles Love is asked to type", () => {
    const derive = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    expect(["Pay It Forward Gift 1", "Pay It Forward Gift 2", "Pay It Forward Gift 3"].map(derive)).toEqual([
      "pay-it-forward-gift-1", "pay-it-forward-gift-2", "pay-it-forward-gift-3",
    ]);
  });

  it("shelfGroups never holds a gift; the crumb points at the drawer", async () => {
    const { shelfGroups } = await import("@/components/store/ShelfSection");
    const groups = shelfGroups([G1, G2, G3]);
    expect(groups.flatMap((g) => g.items)).toHaveLength(0);
    const { sectionForItem } = await import("@/lib/store-sections");
    expect(sectionForItem(G2)).toEqual({ anchor: "gifts", pill: "Gifts" });
  });
});

describe("3. the mixed basket: a sentence, never a dead button", () => {
  const dollarGift = { itemId: "pay-it-forward-gift-2", sats: null, offerSats: null, fiat: { amount: 3_300, currency: "USD" } };
  const satsGift = { itemId: "gifts-of-gratitude", sats: 111, offerSats: 11_111, fiat: null };
  const both = { itemId: "a-candle", sats: 5_000, offerSats: null, fiat: { amount: 500, currency: "USD" } };

  it("a dollar gift alone, card live: card carries it, nothing to say", async () => {
    const { basketRails } = await import("@/lib/basket-rails");
    expect(basketRails([dollarGift], { btc: false, card: true })).toEqual({ btc: false, card: true, note: null });
  });

  it("a dollar gift beside a sats gift, both rails live: no rail carries it, the sentence says why", async () => {
    const { basketRails } = await import("@/lib/basket-rails");
    const r = basketRails([dollarGift, satsGift], { btc: true, card: true });
    expect(r.btc || r.card).toBe(false);
    expect(r.note).toBe(
      "A dollar gift pays by card and a sats gift or offer pays by bitcoin, so they cannot share one checkout. Remove one, check out, then add it back.",
    );
  });

  it("a dollar gift with bitcoin the only live rail: the sentence names the closed card checkout", async () => {
    const { basketRails } = await import("@/lib/basket-rails");
    const r = basketRails([dollarGift, both], { btc: true, card: false });
    expect(r.btc || r.card).toBe(false);
    expect(r.note).toBe("A dollar gift pays by card, and card checkout is closed right now. Remove it to check out the rest.");
  });

  it("both rails live, a dollar gift beside a two-priced item: card carries it and says so", async () => {
    const { basketRails } = await import("@/lib/basket-rails");
    expect(basketRails([dollarGift, both], { btc: true, card: true })).toEqual({
      btc: false, card: true, note: "This basket checks out by card.",
    });
  });

  it("CartPanel shows the sentence in the button's place and hides the sats offer door on a dollar-only line", async () => {
    const { readFileSync } = await import("fs");
    const src = readFileSync("src/components/store/CartPanel.tsx", "utf8");
    expect(src).toContain('{railFit.note && <p className="basket-rail-note">{railFit.note}</p>}');
    expect(src).toContain("{(railFit.btc || railFit.card || (!rails.btc && !rails.card)) && (");
    expect(src).toContain("dollarOnlyLine(l) ? null :");
  });

  it("the checkout route still refuses on its own (the charge is unchanged)", async () => {
    const { readFileSync } = await import("fs");
    const src = readFileSync("src/app/api/cart/checkout/route.ts", "utf8");
    expect(src).toContain("only settles in sats");
    expect(src).toContain("cart checkout is sats-first");
  });
});

describe("4. the first travel card says what the page can do", () => {
  it("four states", async () => {
    const { travelWords } = await import("@/app/pay-it-forward/page");
    expect(travelWords({ sats: true, dollars: false })).toBe("any amount from 111 sats, given on-chain through your basket");
    expect(travelWords({ sats: false, dollars: true })).toBe("a dollar gift, paid by card through your basket");
    expect(travelWords({ sats: true, dollars: true })).toBe("a dollar gift by card, or any amount from 111 sats on-chain, through your basket");
    expect(travelWords({ sats: false, dollars: false })).toBe("giving opens again soon");
  });

  it("the page says gift, never donation or tax-deductible", async () => {
    const { readFileSync } = await import("fs");
    for (const f of ["src/app/pay-it-forward/page.tsx", "src/components/TipJar.tsx", "src/components/store/GiftDrawer.tsx", "src/lib/basket-rails.ts"]) {
      const body = readFileSync(f, "utf8").toLowerCase();
      expect(body, f).not.toContain("donation");
      expect(body, f).not.toContain("deductible");
    }
  });
});

describe("5. the row", () => {
  const gifts = [
    { id: "pay-it-forward-gift-1", title: "g1", amount: 1_100, currency: "USD" },
    { id: "pay-it-forward-gift-2", title: "g2", amount: 3_300, currency: "USD" },
    { id: "pay-it-forward-gift-3", title: "g3", amount: 11_100, currency: "USD" },
  ];

  it("card only: three dollar buttons and Give $33, no own-amount box, no sats", async () => {
    const { default: TipJar } = await import("@/components/TipJar");
    const html = renderToStaticMarkup(createElement(TipJar, { only: [], dollarGifts: gifts }));
    expect(html).toContain(">$11<");
    expect(html).toContain(">$33<");
    expect(html).toContain(">$111<");
    expect(html).toContain("Give $33");
    expect(html).not.toContain("<input");
    expect(html).not.toContain("sats");
  });

  it("both rows: the sats row keeps its own-amount box, each row says its unit", async () => {
    const { default: TipJar } = await import("@/components/TipJar");
    const html = renderToStaticMarkup(createElement(TipJar, { only: ["payforward"], dollarGifts: gifts }));
    expect(html).toContain('placeholder="custom sats"');
    expect(html).toContain("In sats");
    expect(html).toContain("In dollars, by card");
    expect(html).toContain("Give 11,111 sats");
    expect(html).toContain("Give $33");
    expect((html.match(/<input/g) ?? []).length).toBe(1);
  });

  it("the store drawer opens on the dollar row alone", async () => {
    const { default: GiftDrawer } = await import("@/components/store/GiftDrawer");
    const html = renderToStaticMarkup(createElement(GiftDrawer, { liveJars: [], dollarGifts: gifts }));
    expect(html).toContain("Give $33");
    expect(html).toContain("Card gifts go through Square");
    expect(html).not.toContain("Bitcoin gifts travel");
  });

  it("fix round: with no tip jar to give, the drawer drops the Tip the Field head and its line; Gifts of Gratitude heads the summary", async () => {
    const { default: GiftDrawer } = await import("@/components/store/GiftDrawer");
    const cardOnly = renderToStaticMarkup(createElement(GiftDrawer, { liveJars: [], dollarGifts: gifts }));
    expect(cardOnly).not.toContain("Tip the Field");
    expect(cardOnly).not.toContain("pick a jar, pick an amount");
    const summary = cardOnly.slice(cardOnly.indexOf("<summary"), cardOnly.indexOf("</summary>"));
    expect(summary).toContain("Gifts of Gratitude");
    expect(summary).toContain("A gift bought forward for someone who needs it");
    expect((cardOnly.match(/Gifts of Gratitude<\/h2>/g) ?? []).length).toBe(1);
    // a tip jar live: the head is back, Gifts of Gratitude under it
    const withTips = renderToStaticMarkup(createElement(GiftDrawer, { liveJars: ["love", "onecocreation", "payforward"], dollarGifts: gifts }));
    expect(withTips).toContain("Tip the Field");
    expect(withTips).toContain("pick a jar, pick an amount");
    const s2 = withTips.slice(withTips.indexOf("<summary"), withTips.indexOf("</summary>"));
    expect(s2).not.toContain("Gifts of Gratitude");
  });
});
