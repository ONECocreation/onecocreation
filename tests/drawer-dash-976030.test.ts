import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Block 976,030 — his desk answer A: take the dash off the store drawer's
 * "how gifts were received" line, to match the Pay It Forward page.
 *
 *  1. The drawer reads "How gifts were received will show here." with no dash.
 *  2. Those are the exact words /pay-it-forward already uses.
 *  3. The bitcoin note's dash ("wallet — nothing held") is left as it is;
 *     he was asked about one line only.
 */

const gift = {
  id: "pay-it-forward-gift-2",
  schemaVersion: 2,
  title: "Pay It Forward Gift 2",
  blurb: "",
  images: [],
  kind: "digital",
  price: { fiat: { amount: 3300, currency: "USD" } },
  fulfillment: "digital",
  status: "live",
};

async function drawer(liveJars: string[]) {
  const { default: GiftDrawer } = await import("@/components/store/GiftDrawer");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToStaticMarkup(createElement(GiftDrawer as any, { liveJars, dollarGifts: [gift] }));
}

describe("the drawer's gifts-received line (block 976,030)", () => {
  it("reads without the dash", async () => {
    const html = await drawer([]);
    expect(html).toContain("How gifts were received will show here.");
    expect(html).not.toContain("— how gifts were received");
  });

  it("uses the same words as /pay-it-forward", () => {
    const page = readFileSync("src/app/pay-it-forward/page.tsx", "utf8");
    const body = page.slice(page.indexOf("export default"));
    expect(body).toContain("How gifts were received will show here.");
  });

  it("leaves the bitcoin note's dash as it is", async () => {
    const html = await drawer(["love", "onecocreation", "payforward"]);
    expect(html).toContain("own wallet — nothing");
  });
});
