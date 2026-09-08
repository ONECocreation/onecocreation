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
import { liveAdapter, getAdapter, ensureSquareVault, type CreatedCharge, type PaymentAdapter, type ChargeRequest } from "@/lib/payments";
import { getSiteConfig } from "@/lib/site-config";
import { findDiscount, applyDiscount } from "@/lib/discounts";
import { settleEntitlementFromOrder } from "@/lib/entitlement-fulfil";
import { orderDoorUrl, sendOrderReceipt } from "@/lib/order-receipt";
import { frenFromRequest } from "@/lib/fren-auth";

export const dynamic = "force-dynamic";

/** TASK-147 (0018.06.17 a₿) — THE RAIL'S OWN SENTENCE, IN WORDS: a throwing
 *  adapter (Square 401, BTCPay unreachable, …) used to escape this route as
 *  a bare 500 — an HTML error page the BuyPanel's res.json() choked on, so
 *  the buyer saw "checkout unreachable", a lie: the rail WAS reached and
 *  refused. Answer JSON with the adapter's message verbatim; the panel
 *  prints it under the button. 502: the failure is upstream's, not ours. */
async function tryCharge(
  adapter: PaymentAdapter,
  req: ChargeRequest,
  idempotencyKey: string,
): Promise<CreatedCharge | { error: NextResponse }> {
  try {
    return await adapter.createCharge(req, idempotencyKey);
  } catch (err) {
    return {
      error: NextResponse.json(
        { ok: false, reason: err instanceof Error ? err.message : "the rail refused the charge" },
        { status: 502 },
      ),
    };
  }
}

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
    qty?: number;
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
  /* TASK-147 (0018.06.17 a₿) — WARM BEFORE YOU JUDGE, at the money boundary
     too: liveAdapter() reads siteSwitchesSync(), which on a COLD instance
     serves the DEFAULTS (btcpay:true) until the first getSiteConfig() read
     warms it — so a switch Love turned OFF at /a/site could still mint an
     invoice here (reproduced: fixture btcpay invoice answered 200 with
     payments.btcpay=false in the vault). One awaited read makes the switch
     mean what it says before any charge is created. (The same cold-defaults
     seam remains in the OTHER money routes — cart checkout, tip, booking;
     flagged in the SUMMARY for a payments.ts-level follow-up, outside this
     lane's OWNS.) */
  await getSiteConfig();
  await ensureSquareVault();
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
    const charge = await tryCharge(chargeAdapter, {
      orderId: order.id,
      amount: order.priceSnapshot.amount,
      currency: order.priceSnapshot.currency,
      buyerEmail: order.contact?.email,
      /* TASK-173 — the return URL carries the order's signed key, so the
         buyer's own browser lands unlocked the moment PAID lands */
      redirectUrl: orderDoorUrl(order, origin),
    }, `${order.id}:${order.chargeIds.length}`);
    if ("error" in charge) return charge.error;
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
  // THE BASKET RULE, on the item page too (Admiral, 0018.06.17 a₿ — after T-147's finding):
  // a guest WITH an email checks out fine — the email becomes their account, the grant
  // settles to it, and signing in with that email later finds it waiting (same words and
  // subject shape as /api/cart/checkout, 0018.05.18). Only a guest with NO email is stopped.
  let entitlementSubject: string | undefined;
  if (item.kind === "digital" || item.kind === "package") {
    const fren = frenFromRequest(request);
    const guestEmail = (body.contact?.email ?? "").trim().toLowerCase();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail);
    if (!fren && !emailOk) {
      return NextResponse.json(
        { ok: false, reason: "add your email (it becomes your account) or sign in — this unlocks FOR you" },
        { status: 401 }
      );
    }
    entitlementSubject = fren ? `${fren.handle}@${fren.space}` : `${guestEmail}@email`;
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
  /* TASK-177 — the wares' quantity stepper (BuyPanel): the SAME clamp law as
     the basket (/api/cart, 1..21); the snapshot is the LINE TOTAL (unit ×
     qty), repriced before any discount, and the line carries qty so the
     inventory countdown (recordChargeEvent) counts it down as it already
     knows how */
  const qty = Math.max(1, Math.min(21, Math.floor(body.qty ?? 1)));
  let snapshot: PriceSnapshot =
    !wantsCard && effective.sats != null
      ? { amount: effective.sats * qty, currency: "SATS", at: new Date().toISOString() }
      : { amount: effective.fiat!.amount * qty, currency: effective.fiat!.currency, at: new Date().toISOString() };

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
    lineItems: [{ itemId: item.id, title: item.title, qty, size: item.sizes?.length ? size : undefined }],
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
    /* TASK-173 — a code-settled order is still a settled order: the receipt
       letter goes out (idempotent inside, same as the webhook path) */
    await sendOrderReceipt(order).catch(() => {});
    return NextResponse.json({ ok: true, orderId: order.id, paid: true });
  }
  await createOrder(order);

  const charge = await tryCharge(adapter, {
    orderId: order.id,
    amount: snapshot.amount,
    currency: snapshot.currency,
    buyerEmail: body.contact?.email,
    /* TASK-173 — the key rides the return URL (see the retry path above) */
    redirectUrl: orderDoorUrl(order, origin),
  }, `${order.id}:0`);
  if ("error" in charge) return charge.error;
  await attachCharge(order.id, charge.chargeId);

  return NextResponse.json({ ok: true, orderId: order.id, payUrl: charge.payUrl, extras: charge.extras });
}
