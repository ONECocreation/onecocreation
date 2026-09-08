import { describe, it, expect } from "vitest";
import { storeCardModel } from "@/components/store/StoreItemCard";
import type { StoreItem } from "@/lib/store";

/**
 * TASK-148 (0018.06.17 a₿) — the Admiral: "the cards on the meditations in
 * /store are not flipping — it extends the card in an unnatural way, it
 * goes outside the box. The cards for all items across the page should
 * behave the same, like the discovery-call session card: it turns over and
 * turns back." The QuickView peek Sheet (its position:fixed trapped by the
 * card's backdrop-filter containing block) is retired; the shelf now rides
 * the ONE house flip contract. These pins hold the card's derived model:
 * price words, sale/sold-out flags, the deliverable line, the picture
 * fallback — derive-or-dash, never a fake number.
 *
 * The flip itself is the house.css `.flip-card` contract (the session
 * cards' own mechanism, pinned by the /book shots) — the model is what a
 * node-environment suite can honestly cover.
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

describe("storeCardModel — the shelf card's derived face", () => {
  it("a sats price speaks in sats, no fiat echo without a fiat price", () => {
    const m = storeCardModel(item({ price: { sats: 11111 } }));
    expect(m.priceLabel).toBe("11,111 sats");
    expect(m.fiatSecondary).toBeNull();
  });

  it("sats + fiat leads with dollars by default (T-186: fiat first when the card rail is live), the sats echo second", () => {
    const m = storeCardModel(item({ price: { sats: 11111, fiat: { amount: 1100, currency: "USD" } } }));
    expect(m.priceLabel).toBe("$11");
    expect(m.fiatSecondary).toBe("or 11,111 sats");
  });

  it("a fiat-only price speaks in dollars — whole dollars, no cents (the flat-dollars law)", () => {
    expect(storeCardModel(item({ price: { fiat: { amount: 5500, currency: "USD" } } })).priceLabel).toBe("$55");
    expect(storeCardModel(item({ price: { fiat: { amount: 5550, currency: "USD" } } })).priceLabel).toBe("$55.50");
  });

  it("no price is a dash, never a fake number (derive-or-dash)", () => {
    expect(storeCardModel(item({ price: {} })).priceLabel).toBe("—");
  });

  it("a sale price rides the gold rail and the card says so in words", () => {
    const m = storeCardModel(item({
      price: { sats: 21000 },
      sale: { sats: 11111 },
    }));
    expect(m.priceLabel).toBe("11,111 sats");
    expect(m.onSale).toBe(true);
  });

  it("sold out is a flag the card speaks, not a color", () => {
    expect(storeCardModel(item({ status: "soldout" })).soldOut).toBe(true);
    expect(storeCardModel(item({ status: "live" })).soldOut).toBe(false);
  });

  it("the deliverable line surfaces only when a deliverable exists", () => {
    const withFile = storeCardModel(item({
      media: { images: [], deliverable: { kind: "audio", label: "the MP3" } },
    }));
    expect(withFile.deliverableLabel).toBe("the MP3");
    expect(storeCardModel(item({})).deliverableLabel).toBeNull();
  });

  it("the picture prefers the v2 media block, falls back to legacy images, then to null (the icon face)", () => {
    expect(storeCardModel(item({
      images: ["/legacy.webp"],
      media: { images: ["/v2.webp"] },
    })).img).toBe("/v2.webp");
    expect(storeCardModel(item({ images: ["/legacy.webp"] })).img).toBe("/legacy.webp");
    expect(storeCardModel(item({})).img).toBeNull();
  });
});
