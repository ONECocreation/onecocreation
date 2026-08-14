import { NextResponse } from "next/server";
import { getBooking } from "@/lib/booking-orders";
import { getOrder } from "@/lib/store";
import { liveAdapter } from "@/lib/payments";
import { recordChargeEvent } from "@/lib/store";
import { settleBookingFromOrder } from "@/lib/booking-fulfil";

export const dynamic = "force-dynamic";

/**
 * Booking status — the booking id IS the capability (same law as the order
 * id on a store receipt), so this is public and unguessable rather than
 * gated behind a session a gift recipient may not have.
 *
 * It also serves as THE RECONCILE PATH (spec §2): rather than trusting that
 * the webhook arrived, it asks the processor for the charge's real state and
 * funnels the answer through the same commit function the webhook uses. A
 * booking cannot get stuck "held" just because a webhook was lost.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) return NextResponse.json({ ok: false, reason: "no such booking" }, { status: 404 });

  let order = await getOrder(booking.orderId);

  // Poll the processor when the money hasn't landed yet — the order blob is
  // the record of fact, not the live feed.
  const adapter = liveAdapter();
  const pending = order && !["settled", "fulfilled", "refunded", "disputed"].includes(order.state);
  if (adapter && order && pending) {
    const chargeId = order.chargeIds[order.chargeIds.length - 1];
    if (chargeId) {
      try {
        const state = await adapter.status(chargeId);
        if (state) {
          const updated = await recordChargeEvent(order.id, { type: state, chargeId });
          if (updated) {
            order = updated;
            await settleBookingFromOrder(updated); // per-line bookings included
          }
        }
      } catch {
        /* processor unreachable — answer with what we have, never invent */
      }
    }
  }

  const fresh = (await getBooking(id)) ?? booking;

  return NextResponse.json({
    ok: true,
    booking: {
      id: fresh.id,
      serviceId: fresh.serviceId,
      serviceTitle: fresh.serviceTitle,
      startUtc: fresh.startUtc,
      endUtc: fresh.endUtc,
      artistTz: fresh.artistTz,
      state: fresh.state,
      // the link is earned, not listed — only a confirmed booking gets it
      meetingUrl: fresh.state === "confirmed" ? fresh.meetingUrl : undefined,
    },
    payment: order ? { state: order.state, amount: order.priceSnapshot.amount, currency: order.priceSnapshot.currency } : null,
  });
}
