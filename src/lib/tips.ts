/**
 * The tip ledger — reads the jars straight from BTCPay (the invoices ARE the
 * ledger; no second book to fall out of truth). Jar identity rides the
 * orderId prefix minted by /api/tip: tip-<jar>-<id>.
 *
 * Pay-it-forward gets first-class treatment on purpose: those sats are a
 * PROMISE to someone who hasn't arrived yet, so the ledger must always be
 * able to answer "how much is in that jar and how much has been granted."
 * (Grant-tracking lands with the gift-redemption design; today the jar total
 * is the honest number.)
 */

export type TipJarKey = "love" | "onecocreation" | "payforward";

export interface TipRecord {
  id: string;
  jar: TipJarKey;
  sats: number;
  status: "settled" | "pending" | "expired";
  createdMs: number;
}

export interface TipLedger {
  tips: TipRecord[];
  totals: Record<TipJarKey, { settledSats: number; count: number }>;
}

interface GfInvoice {
  id: string;
  amount: string;
  currency: string;
  status: string;
  createdTime: number;
  metadata?: { orderId?: string };
}

export function tipsConfigured(): boolean {
  return !!(process.env.BTCPAY_URL && process.env.BTCPAY_STORE_ID && process.env.BTCPAY_API_KEY);
}

export async function listTips(): Promise<TipLedger> {
  const empty: TipLedger = {
    tips: [],
    totals: {
      love: { settledSats: 0, count: 0 },
      onecocreation: { settledSats: 0, count: 0 },
      payforward: { settledSats: 0, count: 0 },
    },
  };
  if (!tipsConfigured()) return empty;

  const res = await fetch(
    `${process.env.BTCPAY_URL}/api/v1/stores/${process.env.BTCPAY_STORE_ID}/invoices?textSearch=tip-&take=200`,
    {
      headers: { Authorization: `token ${process.env.BTCPAY_API_KEY}` },
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`tip ledger: BTCPay ${res.status}`);
  const invoices = (await res.json()) as GfInvoice[];

  const ledger = empty;
  for (const inv of invoices) {
    const m = /^tip-(love|onecocreation|payforward)-/.exec(inv.metadata?.orderId ?? "");
    if (!m) continue;
    const jar = m[1] as TipJarKey;
    // invoices are minted in BTC; the ledger speaks sats
    const sats = Math.round(Number(inv.amount) * 1e8);
    const status =
      inv.status === "Settled" ? "settled" : inv.status === "Expired" || inv.status === "Invalid" ? "expired" : "pending";
    ledger.tips.push({ id: inv.id, jar, sats, status, createdMs: inv.createdTime * 1000 });
    if (status === "settled") {
      ledger.totals[jar].settledSats += sats;
      ledger.totals[jar].count += 1;
    }
  }
  ledger.tips.sort((a, b) => b.createdMs - a.createdMs);
  return ledger;
}
