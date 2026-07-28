import type { OrderRecord } from "./store";
import { getService } from "./booking";
import { confirmBookingForOrder, releaseBookingForOrder, getBooking } from "./booking-orders";
import type { BookingRecord } from "./booking-orders";

/**
 * The bridge between money and time (spec: docs/booking-flow.md §4).
 *
 * Lives in its own module on purpose: store.ts must not import booking, and
 * booking must not import store's driver. Both the webhook and the reconcile
 * poll call this, which is what makes the effect re-derivable from order
 * state rather than dependent on catching a single event.
 *
 * Idempotent by construction — it reads the order's CURRENT state and makes
 * the booking match it. Running it twice, or late, or out of order, converges
 * on the same answer.
 */
export async function settleBookingFromOrder(order: OrderRecord): Promise<BookingRecord | null> {
  if (!order.bookingId) return null;

  switch (order.state) {
    case "settled":
    case "fulfilled": {
      // Resolve the meeting link at confirmation, never before — it is not
      // public information and has no business on a service page.
      const service = await getService(order.lineItems[0]?.itemId ?? "");
      const rail = service?.meetingRail;
      const meetingUrl =
        rail?.kind === "static"
          ? rail.url
          : rail?.kind === "jitsi"
            ? `https://${rail.domain}/${order.bookingId}`
            : undefined;
      return confirmBookingForOrder(order.id, order.bookingId, meetingUrl);
    }

    // Money came back or never landed → the time goes back on the board.
    case "refunded":
    case "disputed":
      return releaseBookingForOrder(order.bookingId, "canceled");
    case "expired":
    case "canceled":
      return releaseBookingForOrder(order.bookingId, "released");

    // created / charge_created / processing / underpaid: the hold stands on
    // its own TTL. `processing` deliberately keeps the slot — that buyer's
    // transaction is on the chain and the time is genuinely theirs.
    default:
      return getBooking(order.bookingId);
  }
}
