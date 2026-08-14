import { NextResponse } from "next/server";
import { frenFromRequest } from "@/lib/fren-auth";
import { memberGroup } from "@/lib/member-links";
import { listOrders, ordersConfigured } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Your purchases (any member — key or email). Matched on entitlementSubject
 * (`handle@space`), which is stamped at checkout and SURVIVES the scheduled
 * PII purge — contact email does not, by design (privacy call #3).
 */
export async function GET(request: Request) {
  const fren = frenFromRequest(request);
  if (!fren) return NextResponse.json({ ok: false }, { status: 401 });
  if (!ordersConfigured()) return NextResponse.json({ ok: true, orders: [] });

  const subjects = new Set(await memberGroup(`${fren.handle}@${fren.space}`));
  const mine = (await listOrders())
    .filter((o) => o.entitlementSubject && subjects.has(o.entitlementSubject))
    .map((o) => ({
      id: o.id,
      state: o.state,
      createdAtMs: o.createdAtMs,
      title: o.lineItems[0]?.title ?? o.lineItems[0]?.itemId ?? "order",
      amount: o.priceSnapshot,
      bookingId: o.bookingId ?? null,
    }));
  return NextResponse.json({ ok: true, orders: mine });
}
