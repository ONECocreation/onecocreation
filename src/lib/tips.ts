/**
 * The tip ledger — the jars' books.
 *
 * TWO SOURCES, never one gift counted twice (TASK-646, block 976,007 · the
 * fault Lumen accepted at block 975,999):
 *
 *  1. THE BASKET ORDERS (since TASK-411). A jar gift is a basket line whose
 *     itemId is a jar's shelf item (JAR_ITEMS, @/lib/jars). Its order id is
 *     newOrderId()'s 24 hex characters, so its BTCPay invoice never carried
 *     the old `tip-` prefix and source 2 never saw it: every jar had stood
 *     still since T-411. Now a settled (or fulfilled) order line on a jar
 *     item adds to that jar; a refunded order comes out (it is listed, with
 *     its state, and never totalled).
 *  2. THE OLD TIP INVOICES (before TASK-411). BTCPay invoices whose
 *     metadata.orderId starts `tip-<jar>-`, minted by the retired /api/tip.
 *     Read the old way, kept so the books lose nothing from that season.
 *
 * Why never twice: an order id is /^[a-f0-9]{24}$/ (store.ts safeOrderId),
 * so it can never match source 2's `^tip-` pattern; a basket gift's invoice
 * is therefore only ever counted through its order.
 *
 * SATS AND DOLLARS ARE KEPT APART (the brief's part 6): a bitcoin order adds
 * sats, a card order adds fiat minor units under its own currency. No rate
 * ever joins them; no surface adds them together.
 *
 * Pay-it-forward gets first-class treatment on purpose: those gifts are a
 * PROMISE to someone who hasn't arrived yet, so the ledger must always be
 * able to answer "how much is in that jar".
 */

import { JAR_ITEMS, jarForItem } from "@/lib/jars";
import { listOrders, ordersConfigured, type OrderRecord } from "@/lib/store";

export type TipJarKey = keyof typeof JAR_ITEMS;

export interface TipRecord {
  id: string;
  jar: TipJarKey;
  /** sats given (0 for a card gift) */
  sats: number;
  /** a card gift: fiat minor units and its ISO-4217 code */
  fiat?: { amount: number; currency: string };
  status: "settled" | "pending" | "expired" | "refunded";
  createdMs: number;
  /** where the record was read: a basket order, or a pre-T-411 tip invoice */
  source: "order" | "invoice";
  /** the order a basket gift rode in (source "order" only) */
  orderId?: string;
  /** the gift item's title on the order line (source "order" only) */
  title?: string;
}

export interface JarTotal {
  settledSats: number;
  /** settled card gifts, minor units per currency (never mixed with sats) */
  settledFiat: Record<string, number>;
  count: number;
}

export interface TipLedger {
  tips: TipRecord[];
  totals: Record<TipJarKey, JarTotal>;
}

interface GfInvoice {
  id: string;
  amount: string;
  currency: string;
  status: string;
  createdTime: number;
  metadata?: { orderId?: string };
}

function btcpayConfigured(): boolean {
  return !!(process.env.BTCPAY_URL && process.env.BTCPAY_STORE_ID && process.env.BTCPAY_API_KEY);
}

/** Either source can be read. (Before T-646 this asked BTCPay alone, so a
 *  store with bitcoin unconfigured showed no jars at all.) */
export function tipsConfigured(): boolean {
  return btcpayConfigured() || ordersConfigured();
}

function emptyTotals(): Record<TipJarKey, JarTotal> {
  return {
    love: { settledSats: 0, settledFiat: {}, count: 0 },
    onecocreation: { settledSats: 0, settledFiat: {}, count: 0 },
    payforward: { settledSats: 0, settledFiat: {}, count: 0 },
  };
}

/** The pre-T-411 invoices — pure, so the never-twice rule is pinned. */
export function tipsFromInvoices(invoices: GfInvoice[]): TipRecord[] {
  const out: TipRecord[] = [];
  for (const inv of invoices) {
    const m = /^tip-(love|onecocreation|payforward)-/.exec(inv.metadata?.orderId ?? "");
    if (!m) continue;
    const jar = m[1] as TipJarKey;
    // invoices are minted in BTC; the ledger speaks sats
    const sats = Math.round(Number(inv.amount) * 1e8);
    const status =
      inv.status === "Settled" ? "settled" : inv.status === "Expired" || inv.status === "Invalid" ? "expired" : "pending";
    out.push({ id: inv.id, jar, sats, status, createdMs: inv.createdTime * 1000, source: "invoice" });
  }
  return out;
}

function orderStatus(state: OrderRecord["state"]): TipRecord["status"] {
  if (state === "settled" || state === "fulfilled") return "settled";
  if (state === "refunded" || state === "disputed") return "refunded";
  if (state === "expired" || state === "canceled" || state === "underpaid") return "expired";
  return "pending";
}

/**
 * The basket gifts — pure. One record per jar line. The amount is what the
 * line recorded at checkout: on the bitcoin rail its offer (or its list
 * sats); on the card rail its list fiat (listFiat, T-646). A one-line order
 * with no line record falls back to what the order was charged.
 */
export function tipsFromOrders(orders: OrderRecord[]): TipRecord[] {
  const out: TipRecord[] = [];
  for (const o of orders) {
    const sats = o.priceSnapshot.currency === "SATS";
    const lone = o.lineItems.length === 1;
    o.lineItems.forEach((l, i) => {
      const jar = jarForItem(l.itemId);
      if (!jar) return;
      const rec: TipRecord = {
        id: o.lineItems.length > 1 ? `${o.id}:${i}` : o.id,
        jar,
        sats: 0,
        status: orderStatus(o.state),
        createdMs: o.settledAtMs ?? o.createdAtMs,
        source: "order",
        orderId: o.id,
        title: l.title,
      };
      if (sats) {
        rec.sats = l.offerSats ?? l.listSats ?? (lone ? o.priceSnapshot.amount : 0);
      } else {
        const amount = l.listFiat ?? (lone ? o.priceSnapshot.amount : 0);
        rec.fiat = { amount, currency: o.priceSnapshot.currency };
      }
      out.push(rec);
    });
  }
  return out;
}

/** Totals from records — pure. Only settled records count; a refunded one
 *  is listed and never totalled. */
export function ledgerFrom(records: TipRecord[]): TipLedger {
  const totals = emptyTotals();
  for (const r of records) {
    if (r.status !== "settled") continue;
    const t = totals[r.jar];
    t.count += 1;
    t.settledSats += r.sats;
    if (r.fiat) t.settledFiat[r.fiat.currency] = (t.settledFiat[r.fiat.currency] ?? 0) + r.fiat.amount;
  }
  return { tips: [...records].sort((a, b) => b.createdMs - a.createdMs), totals };
}

export async function listTips(): Promise<TipLedger> {
  const records: TipRecord[] = [];
  if (ordersConfigured()) records.push(...tipsFromOrders(await listOrders()));
  if (btcpayConfigured()) {
    const res = await fetch(
      `${process.env.BTCPAY_URL}/api/v1/stores/${process.env.BTCPAY_STORE_ID}/invoices?textSearch=tip-&take=200`,
      {
        headers: { Authorization: `token ${process.env.BTCPAY_API_KEY}` },
        cache: "no-store",
      },
    );
    if (!res.ok) throw new Error(`tip ledger: BTCPay ${res.status}`);
    records.push(...tipsFromInvoices((await res.json()) as GfInvoice[]));
  }
  return ledgerFrom(records);
}
