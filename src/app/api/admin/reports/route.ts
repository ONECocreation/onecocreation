import { NextResponse } from "next/server";
import { listOrders, getItem, ordersConfigured } from "@/lib/store";
import { listTips, tipsConfigured, tipsFromOrders } from "@/lib/tips";
import { jarForItem } from "@/lib/jars";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

/**
 * THE BOOKS (the Admiral's ask, 0018.05.12): pull the invoices by type and
 * date, save as CSV or a QuickBooks-style CSV. Categories are the tax
 * split he named — goods (store items), services (booked sessions),
 * tips (the jars). Numbers are what was actually charged: sats when the
 * invoice was sats, fiat minor-units when fiat; both columns always
 * present so the bookkeeper never guesses.
 *
 * TASK-646 (block 976,007) — ONE ROW FOR ONE GIFT. Since T-411 a jar gift
 * is a basket order. It is filed as a TIPS row (category "tips", the order
 * id as its id, "tip — <jar>" as its description), read from the jar
 * ledger, and the order row is NOT also written for it. An order holding
 * only gift lines writes no order row; a mixed order writes its order row
 * for the other lines, with the gift lines' amount taken out of it.
 * Pinned in tests/jar-books-646.test.ts.
 */
type Row = {
  date: string;
  id: string;
  category: "goods" | "services" | "tips";
  description: string;
  sats: number | "";
  fiatAmount: string;
  currency: string;
  discount: string;
  state: string;
};

function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ? Date.parse(url.searchParams.get("from")!) : 0;
  const to = url.searchParams.get("to")
    ? Date.parse(url.searchParams.get("to")!) + 24 * 3600 * 1000
    : Date.now() + 24 * 3600 * 1000;
  const type = url.searchParams.get("type") ?? "all";
  const format = url.searchParams.get("format") ?? "csv";

  const rows: Row[] = [];

  if (ordersConfigured() && type !== "tips") {
    for (const o of await listOrders()) {
      if (o.createdAtMs < from || o.createdAtMs > to) continue;
      if (!["settled", "fulfilled", "refunded"].includes(o.state)) continue;
      // T-646: a gift line is a tips row, never also an order row
      const goodsLines = o.lineItems.filter((l) => !jarForItem(l.itemId));
      if (goodsLines.length === 0) continue;
      const giftAmount = tipsFromOrders([o]).reduce((n, t) => n + (t.fiat ? t.fiat.amount : t.sats), 0);
      const amount = Math.max(0, o.priceSnapshot.amount - giftAmount);
      const hasSession = !!o.bookingId || goodsLines.some((l) => l.bookingId);
      const category: Row["category"] = hasSession ? "services" : "goods";
      if (type !== "all" && type !== category) continue;
      const li = goodsLines[0];
      const item = li && !o.bookingId ? await getItem(li.itemId) : null;
      const svcOrGoods = item?.kind === "service" ? "services" : category;
      rows.push({
        date: new Date(o.createdAtMs).toISOString().slice(0, 10),
        id: o.id,
        category: svcOrGoods as Row["category"],
        description: li?.title ?? "order",
        sats: o.priceSnapshot.currency === "SATS" ? amount : "",
        fiatAmount:
          o.priceSnapshot.currency !== "SATS"
            ? (amount / 100).toFixed(2)
            : "",
        currency: o.priceSnapshot.currency,
        discount: o.discount ? `${o.discount.code}` : "",
        state: o.state,
      });
    }
  }

  if (tipsConfigured() && (type === "all" || type === "tips")) {
    const ledger = await listTips();
    for (const t of ledger.tips) {
      // a refunded basket gift keeps its row, with its state (as its order row did)
      if (t.createdMs < from || t.createdMs > to || (t.status !== "settled" && t.status !== "refunded")) continue;
      rows.push({
        date: new Date(t.createdMs).toISOString().slice(0, 10),
        id: t.id,
        category: "tips",
        description: `tip — ${t.jar}`,
        sats: t.fiat ? "" : t.sats,
        fiatAmount: t.fiat ? (t.fiat.amount / 100).toFixed(2) : "",
        currency: t.fiat ? t.fiat.currency : "SATS",
        discount: "",
        state: t.status,
      });
    }
  }

  rows.sort((a, b) => (a.date < b.date ? -1 : 1));

  let body: string;
  let filename: string;
  if (format === "quickbooks") {
    /* QuickBooks sales-receipt import shape — one line per sale. */
    const header = "Date,Description,Category,Amount,Currency,Memo";
    body = [
      header,
      ...rows.map((r) =>
        [
          r.date,
          csvEscape(r.description),
          r.category,
          r.fiatAmount || (r.sats === "" ? "" : (Number(r.sats) / 100_000_000).toFixed(8)),
          r.fiatAmount ? r.currency : "BTC",
          csvEscape(`${r.id}${r.discount ? ` · code ${r.discount}` : ""}${r.sats !== "" ? ` · ${r.sats} sats` : ""}`),
        ].join(","),
      ),
    ].join("\n");
    filename = `onecocreation-quickbooks-${new Date().toISOString().slice(0, 10)}.csv`;
  } else {
    const header = "date,id,category,description,sats,fiat_amount,currency,discount_code,state";
    body = [
      header,
      ...rows.map((r) =>
        [r.date, r.id, r.category, csvEscape(r.description), r.sats, r.fiatAmount, r.currency, r.discount, r.state].join(","),
      ),
    ].join("\n");
    filename = `onecocreation-books-${new Date().toISOString().slice(0, 10)}.csv`;
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
