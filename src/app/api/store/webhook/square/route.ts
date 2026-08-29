import { NextResponse } from "next/server";
import { squareAdapter, squareOrderMetadata } from "@/lib/payments";
import { recordChargeEvent } from "@/lib/store";
import { settleBookingFromOrder } from "@/lib/booking-fulfil";
import { settleEntitlementFromOrder } from "@/lib/entitlement-fulfil";
import { settleGiftsFromOrder } from "@/lib/gift-vouchers";

export const dynamic = "force-dynamic";

/**
 * The Square webhook (mirrors webhook/btcpay/route.ts's shape). RAW body
 * first — the HMAC is over the raw bytes, so no framework JSON parsing may
 * touch the request before verification. An unverifiable POST gets a
 * 200-shaped nothing (no oracle for forgers); a verified event flips the
 * order through the ONE sanctioned commit function.
 *
 * Unlike BTCPay (whose invoice metadata carries our orderId directly in
 * the webhook body), Square's payment.updated events don't embed the
 * order's metadata inline — so after verifying, this route re-reads the
 * order (squareOrderMetadata()) to recover `metadata.orderId`, the value
 * createCharge() stamped on the Square order at checkout time. One extra
 * API read per event; simple and always-correct beats parsing two
 * different Square payload shapes for the same fact.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const event = await squareAdapter.verifyWebhook(rawBody, request.headers);
  if (!event) return NextResponse.json({ ok: true });

  const metadata = await squareOrderMetadata(event.chargeId);
  const orderId = metadata?.orderId;
  if (orderId) {
    const order = await recordChargeEvent(orderId, event);
    // no bookingId guard — cart orders (v1.5) carry bookings per LINE, and
    // the settle helper returns fast when an order has none at all
    if (order) await settleBookingFromOrder(order);
    if (order) await settleEntitlementFromOrder(order);
    if (order) await settleGiftsFromOrder(order).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
