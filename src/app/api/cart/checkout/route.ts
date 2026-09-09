import { getSiteConfig } from "@/lib/site-config";
import { orderDoorUrl } from "@/lib/order-receipt";
import { NextResponse } from "next/server";
import { cartIdFromRequest, getCart, clearCart, mergeCarts, type CartLine } from "@/lib/cart";
import {
  createOrder,
  attachCharge,
  newOrderId,
  ordersConfigured,
  getItem,
  type OrderRecord,
  type PriceSnapshot,
  type Price,
} from "@/lib/store";
import { getService } from "@/lib/booking";
import {
  getClaim,
  createBooking,
  bookingsConfigured,
  type BookingRecord,
} from "@/lib/booking-orders";
import { liveAdapter, ensureSquareVault } from "@/lib/payments";
import { frenFromRequest } from "@/lib/fren-auth";
import { findDiscount, applyDiscount } from "@/lib/discounts";
import { settleEntitlementFromOrder } from "@/lib/entitlement-fulfil";
import { settleBookingFromOrder } from "@/lib/booking-fulfil";
import { settleGiftsFromOrder } from "@/lib/gift-vouchers";
import { sendOfferNotify } from "@/lib/pwyc-letters";

export const dynamic = "force-dynamic";

/**
 * THE BASKET'S CHECKOUT (v1.5): every line in ONE order, one invoice, one
 * rail (ruling #2). Goods lines fan out to entitlements as before; SESSION
 * lines (held slots) become real bookings that confirm at settle. A line may
 * carry a pay-what-you-can OFFER — paid up front; below list price the order
 * waits on Love's review (accept = the jar may carry the gap; decline =
 * refund with a kind letter). Digital/package lines require a signed-in
 * member (ruling #3).
 */
/** TASK-198 (0018.06.18 a₿) — the sats-first price of a line, OR its fiat
 *  price on the card rail (never both, never a rate between them): mirrors
 *  store/checkout's per-item honesty at the basket's own multi-line scale.
 *  A missing price on the asked rail is a 409 in the caller's own words,
 *  never a silent fallback to the other rail's number. */
function railPrice(
  price: Price,
  wantsCard: boolean,
): { amount: number; currency: string } | null {
  if (wantsCard) return price.fiat ? { amount: price.fiat.amount, currency: price.fiat.currency } : null;
  return price.sats != null ? { amount: price.sats, currency: "SATS" } : null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    discountCode?: string;
    contact?: { email?: string };
    shipping?: { name?: string; address?: string };
    /** where the mobile studio drives — required with an in-person session */
    location?: { city?: string; state?: string; zip?: string };
    name?: string;
    /** TASK-198 — the money word's own rail: "card" asks for Square
     *  (fiat-only, mirrors /api/store/checkout); omitted keeps today's
     *  sats-first default (BTCPay). */
    rail?: "card";
  };
  const wantsCard = body.rail === "card";

  await getSiteConfig(); // T-147 seam 1 (Number One): warm the switch truth before judging a rail on a cold instance
  await ensureSquareVault();
  const adapter = liveAdapter(wantsCard ? "square" : undefined);
  if (!adapter) {
    return NextResponse.json(
      { ok: false, reason: wantsCard ? "card rail not connected" : "payment rail not connected" },
      { status: 503 },
    );
  }
  if (!ordersConfigured()) return NextResponse.json({ ok: false, reason: "order store not configured" }, { status: 503 });

  const fren = frenFromRequest(request);
  const { id: rawId, anon } = cartIdFromRequest(request);
  if (!rawId) return NextResponse.json({ ok: false, reason: "your basket is empty" }, { status: 400 });

  // a signed-in soul's anonymous basket follows them through the door
  let cartId = rawId;
  if (fren && anon) {
    const memberId = `${fren.handle}@${fren.space}`;
    await mergeCarts(rawId, memberId);
    cartId = memberId;
  }

  const cart = await getCart(cartId);
  if (cart.lines.length === 0) return NextResponse.json({ ok: false, reason: "your basket is empty" }, { status: 400 });

  // TASK-198 — an offer is a sats word (the PWYC rail's own law, CartPanel's
  // own comment above cartTotalFiat): there is no fiat truth for it, so the
  // card rail never carries one — honest refusal, never a silent drop or an
  // invented fiat number for the gap.
  if (wantsCard && cart.lines.some((l) => l.offerSats != null)) {
    return NextResponse.json(
      {
        ok: false,
        reason: "a pay-what-you-can offer in this basket only settles in sats — pay by bitcoin, or clear the offer, to use a card",
      },
      { status: 409 },
    );
  }

  let totalAmount = 0;
  let fiatCurrency: string | null = null;
  let needsShipping = false;
  let hasGated = false;
  let hasInPerson = false;
  let pwycPending = false;
  const lineItems: OrderRecord["lineItems"] = [];
  const slotLines: { line: CartLine; serviceTitle: string; endUtc: string; artistTz: string }[] = [];

  for (const l of cart.lines) {
    if (l.serviceGift) {
      // a gift-session voucher: the recipient books their own time later
      const service = await getService(l.itemId);
      if (!service || service.status !== "live") {
        return NextResponse.json({ ok: false, reason: `that session left the shelf — remove it and retry` }, { status: 409 });
      }
      const priced = railPrice(service.price, wantsCard);
      if (!priced) {
        return NextResponse.json(
          {
            ok: false,
            reason: wantsCard
              ? `"${service.title}" has no fiat price — not purchasable by card`
              : `"${service.title}" has no sats price — cart checkout is sats-first`,
          },
          { status: 409 },
        );
      }
      if (wantsCard) {
        if (fiatCurrency && fiatCurrency !== priced.currency) {
          return NextResponse.json({ ok: false, reason: "this basket's prices don't share one currency — can't total it by card" }, { status: 409 });
        }
        fiatCurrency = priced.currency;
      }
      const lineAmount = l.offerSats ?? priced.amount;
      totalAmount += lineAmount;
      if (!wantsCard && l.offerSats != null && l.offerSats < priced.amount) pwycPending = true;
      lineItems.push({
        itemId: service.id,
        title: service.title,
        qty: 1,
        offerSats: l.offerSats,
        listSats: wantsCard ? undefined : priced.amount,
        giftTo: l.giftTo,
        voucher: true,
      });
      continue;
    }
    if (l.slot) {
      if (!bookingsConfigured()) {
        return NextResponse.json({ ok: false, reason: "booking store not configured" }, { status: 503 });
      }
      const service = await getService(l.itemId);
      if (!service || service.status !== "live") {
        return NextResponse.json({ ok: false, reason: `that session left the shelf — remove it and retry` }, { status: 409 });
      }
      // the hold must still be OURS and alive — an expired basket can't book
      const claim = await getClaim(l.itemId, l.slot.startUtc);
      const alive = claim?.bookingId === l.slot.holdId
        && (claim.state === "confirmed" || (claim.untilMs != null && claim.untilMs > Date.now()));
      if (!alive) {
        return NextResponse.json(
          { ok: false, reason: `your held time for "${service.title}" lapsed — pick a fresh one` },
          { status: 409 },
        );
      }
      const priced = railPrice(service.price, wantsCard);
      if (!priced) {
        return NextResponse.json(
          {
            ok: false,
            reason: wantsCard
              ? `"${service.title}" has no fiat price — not purchasable by card`
              : `"${service.title}" has no sats price — cart checkout is sats-first`,
          },
          { status: 409 },
        );
      }
      if (wantsCard) {
        if (fiatCurrency && fiatCurrency !== priced.currency) {
          return NextResponse.json({ ok: false, reason: "this basket's prices don't share one currency — can't total it by card" }, { status: 409 });
        }
        fiatCurrency = priced.currency;
      }
      const lineAmount = l.offerSats ?? priced.amount;
      totalAmount += lineAmount;
      if (!wantsCard && l.offerSats != null && l.offerSats < priced.amount) pwycPending = true;
      if (service.meetingRail?.kind === "inPerson") hasInPerson = true;
      lineItems.push({
        itemId: service.id,
        title: service.title,
        qty: 1,
        bookingId: l.slot.holdId,
        offerSats: l.offerSats,
        listSats: wantsCard ? undefined : priced.amount,
        giftTo: l.giftTo,
      });
      slotLines.push({ line: l, serviceTitle: service.title, endUtc: l.slot.endUtc, artistTz: service.artistTz });
      continue;
    }

    const item = await getItem(l.itemId);
    if (!item || item.status !== "live") {
      return NextResponse.json({ ok: false, reason: `"${l.itemId}" left the shelf — remove it and retry` }, { status: 409 });
    }
    const eff = item.sale ?? item.price;
    const priced = railPrice(eff, wantsCard);
    if (!priced) {
      return NextResponse.json(
        {
          ok: false,
          reason: wantsCard
            ? `"${item.title}" has no fiat price — not purchasable by card`
            : `"${item.title}" has no sats price — cart checkout is sats-first`,
        },
        { status: 409 },
      );
    }
    if (wantsCard) {
      if (fiatCurrency && fiatCurrency !== priced.currency) {
        return NextResponse.json({ ok: false, reason: "this basket's prices don't share one currency — can't total it by card" }, { status: 409 });
      }
      fiatCurrency = priced.currency;
    }
    const listAmount = priced.amount * l.qty;
    const lineAmount = l.offerSats ?? listAmount;
    totalAmount += lineAmount;
    if (!wantsCard && l.offerSats != null && l.offerSats < listAmount) pwycPending = true;
    if (item.kind === "self" || item.kind === "fourthwall") needsShipping = true;
    // retreat seats ride the gated rail too — the guest must be reachable
    // (their email becomes the account, same as digital/package)
    if (item.kind === "digital" || item.kind === "package" || item.kind === "retreat") hasGated = true;
    lineItems.push({ itemId: item.id, title: item.title, qty: l.qty, size: l.size, offerSats: l.offerSats, listSats: wantsCard ? undefined : listAmount, giftTo: l.giftTo });
  }

  // a guest WITH an email checks out fine (Admiral, 0018.05.18): the email
  // becomes their account — grants settle to it, and signing in with that
  // same email later finds everything waiting. Only a guest with NO email
  // is turned back, kindly.
  const guestEmail = (body.contact?.email ?? "").trim().toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail);
  if (hasGated && !fren && !emailOk) {
    return NextResponse.json(
      { ok: false, reason: "add your email (it becomes your account) or sign in — part of this basket unlocks FOR you" },
      { status: 401 },
    );
  }
  if (needsShipping && (!body.shipping?.name || !body.shipping?.address)) {
    return NextResponse.json({ ok: false, reason: "this basket ships — name and address needed" }, { status: 400 });
  }
  if (hasInPerson && (!body.location?.city || !body.location?.state || !body.location?.zip)) {
    return NextResponse.json(
      { ok: false, reason: "an in-person session rides in this basket — city, state and zip tell the studio where to drive" },
      { status: 400 },
    );
  }
  if (slotLines.length > 0 && !fren && !body.contact?.email) {
    return NextResponse.json(
      { ok: false, reason: "a session needs somewhere to send the confirmation — add an email" },
      { status: 400 },
    );
  }

  let snapshot: PriceSnapshot = {
    amount: totalAmount,
    currency: wantsCard ? fiatCurrency! : "SATS",
    at: new Date().toISOString(),
  };
  let discountApplied: { code: string; originalAmount: number } | undefined;
  if (body.discountCode) {
    const d = await findDiscount(body.discountCode);
    if (!d) return NextResponse.json({ ok: false, reason: "that code isn't active" }, { status: 400 });
    const reduced = applyDiscount(snapshot, d);
    if (!reduced) return NextResponse.json({ ok: false, reason: "that code doesn't fit this basket" }, { status: 400 });
    discountApplied = { code: d.code, originalAmount: snapshot.amount };
    snapshot = reduced;
  }

  const orderId = newOrderId();

  // ── the bookings, before any money: each held slot becomes a record the
  //    settle hook can confirm; the claim (holdId) is already ours ─────────
  for (const s of slotLines) {
    const booking: BookingRecord = {
      id: s.line.slot!.holdId,
      schemaVersion: 1,
      serviceId: s.line.itemId,
      serviceTitle: s.serviceTitle,
      startUtc: s.line.slot!.startUtc,
      endUtc: s.endUtc,
      artistTz: s.artistTz,
      state: "held",
      orderId,
      customer: {
        name: body.name?.trim() || body.shipping?.name?.trim() || undefined,
        email: body.contact?.email?.trim() || (cartId.endsWith("@email") ? cartId.slice(0, -"@email".length) : undefined),
        city: body.location?.city?.trim() || undefined,
        state: body.location?.state?.trim() || undefined,
        zip: body.location?.zip?.trim() || undefined,
        npub: fren ? `${fren.handle}@${fren.space}` : undefined,
      },
      createdAtMs: Date.now(),
    };
    await createBooking(booking);
  }

  const order: OrderRecord = {
    id: orderId,
    schemaVersion: 2,
    state: "created",
    lineItems,
    priceSnapshot: snapshot,
    adapterId: adapter.id,
    chargeIds: [],
    entitlementSubject: fren ? `${fren.handle}@${fren.space}` : emailOk ? `${guestEmail}@email` : undefined,
    contact: body.contact,
    shipping: needsShipping ? body.shipping : undefined,
    discount: discountApplied,
    pwycPending: pwycPending || undefined,
    createdAtMs: Date.now(),
    events: [],
  };

  if (snapshot.amount === 0 && discountApplied) {
    order.state = "settled";
    order.settledAtMs = Date.now();
    order.events.push({ type: "settled", chargeId: `discount:${discountApplied.code}`, atMs: Date.now() });
    await createOrder(order);
    if (order.pwycPending) {
      // Love's offer letter — one-tap doors ride in it; a mail hiccup must
      // never block the checkout (the desk still shows the offer)
      try { await sendOfferNotify(order); } catch { /* desk remains the backstop */ }
    }
    await settleEntitlementFromOrder(order);
    await settleBookingFromOrder(order);
    await settleGiftsFromOrder(order);
    await clearCart(cartId);
    return NextResponse.json({ ok: true, orderId: order.id, paid: true });
  }

  await createOrder(order);
  if (order.pwycPending) {
    try { await sendOfferNotify(order); } catch { /* desk remains the backstop */ }
  }
  const origin = new URL(request.url).origin;
  const charge = await adapter.createCharge(
    {
      orderId: order.id,
      amount: snapshot.amount,
      currency: snapshot.currency,
      buyerEmail: body.contact?.email,
      redirectUrl: orderDoorUrl(order, origin), // T-173: the basket's return carries the signed key too
    },
    `${order.id}:0`,
  );
  await attachCharge(order.id, charge.chargeId);
  await clearCart(cartId);
  return NextResponse.json({ ok: true, orderId: order.id, payUrl: charge.payUrl });
}
