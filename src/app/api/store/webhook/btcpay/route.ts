import { NextResponse } from "next/server";
import { btcpayAdapter } from "@/lib/payments";
import { recordChargeEvent } from "@/lib/store";
import { settleBookingFromOrder } from "@/lib/booking-fulfil";
import { settleEntitlementFromOrder } from "@/lib/entitlement-fulfil";
import { settleGiftsFromOrder } from "@/lib/gift-vouchers";

export const dynamic = "force-dynamic";

/**
 * The BTCPay webhook. RAW body first — the HMAC is over the bytes, so no
 * framework JSON parsing may touch the request before verification. An
 * unverifiable POST gets a 200-shaped nothing (no oracle for forgers), a
 * verified event flips the order through the ONE sanctioned commit
 * function. Retries are no-ops there, so a 2xx is always safe to return.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const event = await btcpayAdapter.verifyWebhook(rawBody, request.headers);
  if (!event) return NextResponse.json({ ok: true });

  let orderId: string | undefined;
  try {
    const payload = JSON.parse(rawBody) as { metadata?: { orderId?: string } };
    orderId = payload.metadata?.orderId;
  } catch {
    /* verified but unparseable — nothing to flip */
  }
  if (orderId) {
    const order = await recordChargeEvent(orderId, event);
    // The settled flip is recorded FIRST (above), then downstream effects run
    // — each independently idempotent and re-derivable from order state, per
    // the spec's serverless fulfilment ruling. A booking order confirms its
    // slot here; a refund/dispute gives the time back.
    // no bookingId guard — cart orders (v1.5) carry bookings per LINE, and
    // the settle helper returns fast when an order has none at all
    if (order) await settleBookingFromOrder(order);
    // Packages: grant/revoke the tier and move the member in or out of the
    // rooms. Independently idempotent, so a retry or a late reconcile poll
    // lands on the same answer as the first delivery.
    if (order) await settleEntitlementFromOrder(order);
    if (order) await settleGiftsFromOrder(order).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
