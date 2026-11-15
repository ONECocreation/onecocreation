import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { isolateCwd } from "./helpers/isolate-cwd";
import type { OrderRecord } from "@/lib/store";

const cwd = isolateCwd("oc-t646-books-");

/**
 * TASK-646 (block 976,007) — THE JARS COUNT THE BASKET GIFTS. The fault
 * (number-one/outbox/DONE-oc-pif-books-question-975999.md): since T-411 a
 * jar gift is a basket order with a hex order id, its BTCPay invoice never
 * carried `tip-`, so the jars stood still. Pins:
 *
 *  1. A settled basket order on a jar item adds to that jar.
 *  2. Sats and dollars are kept apart: a card gift adds to settledFiat,
 *     never to settledSats.
 *  3. A refunded order is listed and never totalled.
 *  4. A pre-T-411 `tip-` invoice still counts; a basket gift's invoice
 *     (hex order id) is never counted a second time through BTCPay.
 *  5. THE REPORTS EXPORT: one row for one gift. The gift is a "tips" row
 *     (the order id, "tip — <jar>"); the order row is not also written. A
 *     mixed order writes its order row for the other lines only, with the
 *     gift's amount taken out.
 *  6. THE JUMP: before the fix the jars read 0 from these orders; after,
 *     they read the gifts. Pinned so the change in the Money room is
 *     known to be the fix, not new money.
 */

const NOW = Date.UTC(2026, 10, 15, 12);

function order(over: Partial<OrderRecord> & Pick<OrderRecord, "id" | "lineItems" | "priceSnapshot" | "state">): OrderRecord {
  return {
    schemaVersion: 2,
    adapterId: over.priceSnapshot.currency === "SATS" ? "btcpay" : "square",
    chargeIds: [],
    createdAtMs: NOW,
    settledAtMs: NOW,
    events: [],
    ...over,
  };
}

const SATS_GIFT = order({
  id: "a".repeat(24),
  state: "settled",
  lineItems: [{ itemId: "gifts-of-gratitude", title: "Gifts of Gratitude", qty: 1, offerSats: 11_111, listSats: 111 }],
  priceSnapshot: { amount: 11_111, currency: "SATS", at: new Date(NOW).toISOString() },
});
const LOVE_GIFT = order({
  id: "b".repeat(24),
  state: "fulfilled",
  lineItems: [{ itemId: "tip-love", title: "Tip Love", qty: 1, offerSats: 2_100, listSats: 111 }],
  priceSnapshot: { amount: 2_100, currency: "SATS", at: new Date(NOW).toISOString() },
});
const REFUNDED_GIFT = order({
  id: "c".repeat(24),
  state: "refunded",
  lineItems: [{ itemId: "gifts-of-gratitude", title: "Gifts of Gratitude", qty: 1, offerSats: 111_111, listSats: 111 }],
  priceSnapshot: { amount: 111_111, currency: "SATS", at: new Date(NOW).toISOString() },
});
const CARD_GIFT = order({
  id: "d".repeat(24),
  state: "settled",
  lineItems: [{ itemId: "gifts-of-gratitude", title: "Gifts of Gratitude", qty: 1, listFiat: 3_300 }],
  priceSnapshot: { amount: 3_300, currency: "USD", at: new Date(NOW).toISOString() },
});
const MIXED = order({
  id: "e".repeat(24),
  state: "settled",
  lineItems: [
    { itemId: "a-candle", title: "A Candle", qty: 1, listSats: 5_000 },
    { itemId: "tip-one-cocreation", title: "Tip One Cocreation", qty: 1, offerSats: 2_100, listSats: 111 },
  ],
  priceSnapshot: { amount: 7_100, currency: "SATS", at: new Date(NOW).toISOString() },
});
const PLAIN = order({
  id: "f".repeat(24),
  state: "settled",
  lineItems: [{ itemId: "a-candle", title: "A Candle", qty: 1, listSats: 5_000 }],
  priceSnapshot: { amount: 5_000, currency: "SATS", at: new Date(NOW).toISOString() },
});
const PENDING_GIFT = order({
  id: "0".repeat(24),
  state: "charge_created",
  settledAtMs: undefined,
  lineItems: [{ itemId: "gifts-of-gratitude", title: "Gifts of Gratitude", qty: 1, offerSats: 2_100, listSats: 111 }],
  priceSnapshot: { amount: 2_100, currency: "SATS", at: new Date(NOW).toISOString() },
});
const ALL = [SATS_GIFT, LOVE_GIFT, REFUNDED_GIFT, CARD_GIFT, MIXED, PLAIN, PENDING_GIFT];

let operatorCookie = "";

beforeAll(async () => {
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.VERCEL;
  delete process.env.BTCPAY_URL;
  delete process.env.BTCPAY_STORE_ID;
  delete process.env.BTCPAY_API_KEY;
  const dir = path.join(cwd.dir, "data", "store-orders");
  await fs.mkdir(dir, { recursive: true });
  for (const o of ALL) await fs.writeFile(path.join(dir, `${o.id}.json`), JSON.stringify(o));
  process.env.SEAT_SECRET = "task-646-books-secret";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  operatorCookie = `fe-operator=${makeOperatorToken(pk)}`;
});

afterAll(() => cwd.cleanup());

describe("1-3. the jars count the basket orders", () => {
  it("a settled or fulfilled jar line adds to its jar; pending and refunded do not", async () => {
    const { tipsFromOrders, ledgerFrom } = await import("@/lib/tips");
    const l = ledgerFrom(tipsFromOrders(ALL));
    expect(l.totals.payforward.settledSats).toBe(11_111);
    expect(l.totals.love.settledSats).toBe(2_100);
    expect(l.totals.onecocreation.settledSats).toBe(2_100);
    expect(l.totals.payforward.count).toBe(2); // the sats gift and the card gift
    // the refunded and the pending gifts are listed, never totalled
    expect(l.tips.find((t) => t.orderId === REFUNDED_GIFT.id)?.status).toBe("refunded");
    expect(l.tips.find((t) => t.orderId === PENDING_GIFT.id)?.status).toBe("pending");
    // a plain order is not a gift
    expect(l.tips.some((t) => t.orderId === PLAIN.id)).toBe(false);
  });

  it("dollars and sats are never added: a card gift lands in settledFiat only", async () => {
    const { tipsFromOrders, ledgerFrom } = await import("@/lib/tips");
    const l = ledgerFrom(tipsFromOrders([CARD_GIFT]));
    expect(l.totals.payforward.settledSats).toBe(0);
    expect(l.totals.payforward.settledFiat).toEqual({ USD: 3_300 });
  });

  it("a card gift with no line record falls back to the one-line order's charge", async () => {
    const { tipsFromOrders } = await import("@/lib/tips");
    const old = { ...CARD_GIFT, lineItems: [{ itemId: "gifts-of-gratitude", title: "Gifts of Gratitude", qty: 1 }] };
    expect(tipsFromOrders([old])[0].fiat).toEqual({ amount: 3_300, currency: "USD" });
  });
});

describe("4. the old tip invoices still count, and nothing counts twice", () => {
  it("a tip- invoice counts; a basket gift's hex-id invoice is never read as a tip", async () => {
    const { tipsFromInvoices, tipsFromOrders, ledgerFrom } = await import("@/lib/tips");
    const invoices = [
      { id: "inv-old", amount: "0.00011111", currency: "BTC", status: "Settled", createdTime: NOW / 1000, metadata: { orderId: "tip-payforward-xyz" } },
      // the basket gift above, as BTCPay holds it: a hex order id
      { id: "inv-basket", amount: "0.00011111", currency: "BTC", status: "Settled", createdTime: NOW / 1000, metadata: { orderId: SATS_GIFT.id } },
    ];
    const fromInvoices = tipsFromInvoices(invoices);
    expect(fromInvoices.map((t) => t.id)).toEqual(["inv-old"]);
    const l = ledgerFrom([...tipsFromOrders([SATS_GIFT]), ...fromInvoices]);
    expect(l.totals.payforward.settledSats).toBe(11_111 + 11_111);
    expect(l.totals.payforward.count).toBe(2);
  });

  it("listTips() reads the orders with bitcoin unconfigured (the jars no longer need BTCPay to show)", async () => {
    const { listTips, tipsConfigured } = await import("@/lib/tips");
    expect(tipsConfigured()).toBe(true);
    const l = await listTips();
    expect(l.totals.payforward.settledSats).toBe(11_111);
    expect(l.totals.payforward.settledFiat).toEqual({ USD: 3_300 });
  });
});

describe("5. the reports export: one row for one gift", () => {
  async function csv(type = "all"): Promise<string[][]> {
    const { GET } = await import("@/app/api/admin/reports/route");
    const res = await GET(new Request(`http://test.local/api/admin/reports?type=${type}`, { headers: { cookie: operatorCookie } }));
    expect(res.status).toBe(200);
    const text = await res.text();
    return text.split("\n").slice(1).map((r) => r.split(","));
  }

  it("a gift order is a tips row only; its order id is never also an order row", async () => {
    const rows = await csv();
    const forSats = rows.filter((r) => r[1] === SATS_GIFT.id);
    expect(forSats).toHaveLength(1);
    expect(forSats[0][2]).toBe("tips");
    expect(forSats[0][3]).toBe("tip — payforward");
    expect(forSats[0][4]).toBe("11111");
    const forCard = rows.filter((r) => r[1] === CARD_GIFT.id);
    expect(forCard).toHaveLength(1);
    expect(forCard[0].slice(2, 7)).toEqual(["tips", "tip — payforward", "", "33.00", "USD"]);
  });

  it("a refunded gift keeps one row, stated refunded", async () => {
    const rows = await csv();
    const r = rows.filter((x) => x[1] === REFUNDED_GIFT.id);
    expect(r).toHaveLength(1);
    expect(r[0][2]).toBe("tips");
    expect(r[0][8]).toBe("refunded");
  });

  it("a mixed order: the goods row without the gift, plus one tips row for the gift", async () => {
    const rows = await csv();
    const goods = rows.filter((r) => r[1] === MIXED.id);
    expect(goods).toHaveLength(1);
    expect(goods[0][2]).toBe("goods");
    expect(goods[0][3]).toBe("A Candle");
    expect(goods[0][4]).toBe("5000");
    const tip = rows.filter((r) => r[1] === `${MIXED.id}:1`);
    expect(tip).toHaveLength(1);
    expect(tip[0][4]).toBe("2100");
  });

  it("type=tips lists the basket gifts; type=goods never does", async () => {
    const tips = await csv("tips");
    expect(tips.some((r) => r[1] === SATS_GIFT.id)).toBe(true);
    const goods = await csv("goods");
    expect(goods.some((r) => r[1] === SATS_GIFT.id || r[1] === CARD_GIFT.id)).toBe(false);
    expect(goods.some((r) => r[1] === PLAIN.id)).toBe(true);
  });
});

describe("6. the jump is the fix, not new money", () => {
  it("the old reading of these orders was 0 in every jar; the new one counts the gifts", async () => {
    const { tipsFromInvoices, tipsFromOrders, ledgerFrom } = await import("@/lib/tips");
    // the old ledger saw basket gifts only through BTCPay, by the tip- prefix
    const asInvoices = ALL.map((o) => ({
      id: `inv-${o.id}`, amount: String(o.priceSnapshot.amount / 1e8), currency: "BTC",
      status: "Settled", createdTime: NOW / 1000, metadata: { orderId: o.id },
    }));
    const before = ledgerFrom(tipsFromInvoices(asInvoices)).totals;
    const after = ledgerFrom(tipsFromOrders(ALL)).totals;
    expect([before.love.settledSats, before.onecocreation.settledSats, before.payforward.settledSats]).toEqual([0, 0, 0]);
    expect([after.love.settledSats, after.onecocreation.settledSats, after.payforward.settledSats]).toEqual([2_100, 2_100, 11_111]);
  });
});
