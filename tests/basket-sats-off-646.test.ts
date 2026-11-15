// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

/**
 * T-646 fix round (block 976,021), his Mark 2: "only show sats when bitcoin
 * is on." This lane's part: the basket. While bitcoin is off, the basket
 * shows no "$ / sats" switch and no sats word on any line or on the total.
 *
 * The real CartPanel is rendered in happy-dom with a fake /api/cart, so the
 * test reads what a visitor would read, not the source. The basket holds
 * what can be added with bitcoin off: a $33 dollar gift, an item with both
 * prices, and an item priced only in sats (a shelf item Love never gave a
 * dollar price).
 */

const LINES = [
  { itemId: "pay-it-forward-gift-2", qty: 1, title: "Pay It Forward Gift 2", kind: "digital", sats: null, listSats: null, offerSats: null,
    fiat: { amount: 3_300, currency: "USD" }, giftTo: null, image: null, physical: false, gated: false, inPerson: false, slot: null },
  { itemId: "a-candle", qty: 2, title: "A Candle", kind: "physical", sats: 5_000, listSats: 5_000, offerSats: null,
    fiat: { amount: 500, currency: "USD" }, giftTo: null, image: null, physical: false, gated: false, inPerson: false, slot: null },
  { itemId: "a-sats-only-song", qty: 1, title: "A Song", kind: "digital", sats: 11_111, listSats: 11_111, offerSats: null,
    fiat: null, giftTo: null, image: null, physical: false, gated: false, inPerson: false, slot: null },
];

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

async function renderBasket(rails: { btc: boolean; card: boolean }): Promise<HTMLElement> {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const body = String(url).startsWith("/api/cart")
      ? { ok: true, lines: LINES, totalSats: 21_111, expired: [] }
      : { ok: true, signedIn: false };
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  }));
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const { default: CartPanel } = await import("@/components/store/CartPanel");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(createElement(CartPanel, { rails }));
  });
  // the basket reads /api/cart on a microtask; let it land
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
  return host;
}

describe("Mark 2 in the basket: no sats while bitcoin is off", () => {
  it("bitcoin off, card on: no $ / sats switch and no sats word anywhere in the basket", async () => {
    const host = await renderBasket({ btc: false, card: true });
    const text = host.textContent ?? "";
    // the basket really rendered its lines (the test is not reading a loading state)
    expect(text).toContain("Pay It Forward Gift 2");
    expect(text).toContain("A Candle");
    expect(text).toContain("$33");
    expect(text).toContain("$5 each");
    // no switch
    expect(host.querySelector('[aria-label="show prices in"]')).toBeNull();
    expect(text).not.toContain("⚡");
    // no sats line, no sats word
    expect(text.toLowerCase()).not.toContain("sats");
    expect(text).not.toContain("5,000");
    expect(text).not.toContain("11,111");
    // the sats-only line still gets its plain sentence, naming the rail, not the unit
    expect(text).toContain("An item that pays only by bitcoin is in this basket, and bitcoin checkout is closed right now.");
  });

  it("the same basket with both rails on does show the switch (the test can see it when it is there)", async () => {
    const host = await renderBasket({ btc: true, card: true });
    expect(host.querySelector('[aria-label="show prices in"]')).not.toBeNull();
    expect((host.textContent ?? "").toLowerCase()).toContain("sats");
  });
});
