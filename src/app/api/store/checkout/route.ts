import { NextResponse } from "next/server";
import {
  getItem,
  getOrder,
  createOrder,
  attachCharge,
  newOrderId,
  ordersConfigured,
  type OrderRecord,
  type PriceSnapshot,
} from "@/lib/store";
import { liveAdapter, getAdapter } from "@/lib/payments";
import { findDiscount, applyDiscount } from "@/lib/discounts";
import { settleEntitlementFromOrder } from "@/lib/entitlement-fulfil";
import { frenFromRequest } from "@/lib/fren-auth";

export const dynamic = "force-dynamic";

/**
 * Single-item checkout (no cart — v1 scope, said out loud). Two shapes:
 * - { itemId, contact?, shipping? }  → new order + first charge
 * - { orderId }                      → fresh charge for an expired order
 * Digital/package items require a fren session — the entitlement subject is
 * captured HERE, because the paid webhook is server-to-server and the order
 * is the only identity source at grant time.
 *
 * PAYMENTS-LANE SEAM: `rail: "card"` asks for the Square rail specifically
 * (fiat-only; a sats-only item is honestly refused, never rate-converted —
 * see payments.ts's Square section). Omitted = today's unchanged default
 * (sats-first, BTCPay). Body is parsed BEFORE the adapter is resolved so
 * the requested rail can be read; a retry on an existing order always
 * recharges on the rail it was ORIGINALLY created on
 * (getAdapter(order.adapterId)), never whatever the retry's rail field
 * asks for — a sats order can't silently become a card charge on retry.
 */
export async function POST(request: Request) {
  if (!ordersConfigured()) {
    return NextResponse.json({ ok: false, reason: "order store not configured" }, { status: 503 });
  }

  let body: {
    itemId?: string;
    orderId?: string;
    size?: string;
    discountCode?: string;
    contact?: { email?: string };
    shipping?: { name?: string; address?: string };
    rail?: "card";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  }

  const wantsCard = body.rail === "card";
  const adapter = liveAdapter(wantsCard ? "square" : undefined);
  if (!adapter) {
    return NextResponse.json(
      {
        ok: false,
        reason: wantsCard ? "card rail not connected" : "payment rail not connected — the shelf is browse-only",
      },
      { status: 503 }
    );
  }

  const origin = new URL(request.url).origin;

  // re-charge an expired order: same order, fresh invoice — ALWAYS on the
  // rail it was originally created on (getAdapter(order.adapterId)), never
  // on whatever `rail` this retry happened to ask for. A sats order can't
  // silently become a card charge (or vice versa) on retry.
  if (body.orderId) {
    const order = await getOrder(body.orderId);
    if (!order) return NextResponse.json({ ok: false, reason: "no such order" }, { status: 404 });
    if (!["expired", "underpaid", "charge_created"].includes(order.state)) {
      return NextResponse.json({ ok: false, reason: `order is ${order.state}` }, { status: 409 });
    }
    const chargeAdapter = getAdapter(order.adapterId) ?? adapter;
    const charge = await chargeAdapter.createCharge(
      {
        orderId: order.id,
        amount: order.priceSnapshot.amount,
        currency: order.priceSnapshot.currency,
        buyerEmail: order.contact?.email,
        redirectUrl: `${origin}/store/order/${order.id}`,
      },
      `${order.id}:${order.chargeIds.length}`
    );
    await attachCharge(order.id, charge.chargeId);
    return NextResponse.json({ ok: true, orderId: order.id, payUrl: charge.payUrl, extras: charge.extras });
  }

  const item = body.itemId ? await getItem(body.itemId) : null;
  if (!item || item.status !== "live") {
    return NextResponse.json({ ok: false, reason: "not on the shelf" }, { status: 404 });
  }

  // sized wares require a chosen size — the artist can't ship "one of each"
  const size = typeof body.size === "string" ? body.size.trim() : "";
  if (item.sizes?.length && !item.sizes.includes(size)) {
    return NextResponse.json(
      { ok: false, reason: `pick a size: ${item.sizes.join(" / ")}` },
      { status: 400 }
    );
  }

  // the gate's subject: packages + digital goods buy AS someone
  let entitlementSubject: string | undefined;
  if (item.kind === "digital" || item.kind === "package") {
    const fren = frenFromRequest(request);
    if (!fren) {
      return NextResponse.json(
        { ok: false, reason: "sign in first (email or key) — this unlocks FOR you" },
        { status: 401 }
      );
    }
    entitlementSubject = `${fren.handle}@${fren.space}`;
  }

  // sats-primary: sale price (gold rail) wins when present — EXCEPT on the
  // card rail, which can only ever charge fiat (no invented sats↔fiat rate;
  // an item with no fiat price is honestly not card-purchasable)
  const effective = item.sale ?? item.price;
  if (wantsCard && !effective.fiat) {
    return NextResponse.json(
      { ok: false, reason: `"${item.title}" has no fiat price — not purchasable by card` },
      { status: 409 }
    );
  }
  let snapshot: PriceSnapshot =
    !wantsCard && effective.sats != null
      ? { amount: effective.sats, currency: "SATS", at: new Date().toISOString() }
      : { amount: effective.fiat!.amount, currency: effective.fiat!.currency, at: new Date().toISOString() };

  // ── the discount, if offered (store-level; reprices BEFORE any invoice) ──
  let discountApplied: { code: string; originalAmount: number } | undefined;
  if (body.discountCode) {
    const d = await findDiscount(body.discountCode);
    if (!d) return NextResponse.json({ ok: false, reason: "that code isn't active" }, { status: 400 });
    const reduced = applyDiscount(snapshot, d);
    if (!reduced) return NextResponse.json({ ok: false, reason: "that code doesn't fit this price" }, { status: 400 });
    discountApplied = { code: d.code, originalAmount: snapshot.amount };
    snapshot = reduced;
  }

  const order: OrderRecord = {
    id: newOrderId(),
    schemaVersion: 2,
    state: "created",
    lineItems: [{ itemId: item.id, title: item.title, qty: 1, size: item.sizes?.length ? size : undefined }],
    priceSnapshot: snapshot,
    adapterId: adapter.id,
    chargeIds: [],
    entitlementSubject,
    contact: body.contact,
    shipping: item.fulfillment === "self" ? body.shipping : undefined,
    discount: discountApplied,
    createdAtMs: Date.now(),
    events: [],
  };

  // ── a 100% code settles with no invoice at all — recorded, never silent ──
  if (snapshot.amount === 0 && discountApplied) {
    order.state = "settled";
    order.settledAtMs = Date.now();
    order.events.push({ type: "settled", chargeId: `discount:${discountApplied.code}`, atMs: Date.now() });
    await createOrder(order);
    await settleEntitlementFromOrder(order);
    return NextResponse.json({ ok: true, orderId: order.id, paid: true });
  }
  await createOrder(order);

  const charge = await adapter.createCharge(
    {
      orderId: order.id,
      amount: snapshot.amount,
      currency: snapshot.currency,
      buyerEmail: body.contact?.email,
      redirectUrl: `${origin}/store/order/${order.id}`,
    },
    `${order.id}:0`
  );
  await attachCharge(order.id, charge.chargeId);

  return NextResponse.json({ ok: true, orderId: order.id, payUrl: charge.payUrl, extras: charge.extras });
}
