import { NextResponse } from "next/server";
import { btcpayAdapter } from "@/lib/payments";
import { recordChargeEvent } from "@/lib/store";
import { settleBookingFromOrder } from "@/lib/booking-fulfil";

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
    if (order?.bookingId) await settleBookingFromOrder(order);
  }
  return NextResponse.json({ ok: true });
}
