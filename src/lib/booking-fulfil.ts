import type { OrderRecord } from "./store";
import { getService } from "./booking";
import { siteBase } from "./subscribers";
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
  // One order may carry MANY session lines now (cart v1.5) — each line
  // remembers its own bookingId. The legacy single-booking field still
  // reads; the pair list dedupes so old orders (both set) confirm once.
  const pairs: { bookingId: string; serviceId: string }[] = [];
  for (const l of order.lineItems) {
    if (l.bookingId) pairs.push({ bookingId: l.bookingId, serviceId: l.itemId });
  }
  if (order.bookingId && !pairs.some((p) => p.bookingId === order.bookingId)) {
    pairs.push({ bookingId: order.bookingId, serviceId: order.lineItems[0]?.itemId ?? "" });
  }
  if (pairs.length === 0) return null;

  let last: BookingRecord | null = null;
  for (const { bookingId, serviceId } of pairs) {
    last = await settleOneBooking(order, bookingId, serviceId);
  }
  return last;
}

async function settleOneBooking(
  order: OrderRecord,
  bookingId: string,
  serviceId: string,
): Promise<BookingRecord | null> {
  switch (order.state) {
    case "settled":
    case "fulfilled": {
      // Resolve the meeting link at confirmation, never before — it is not
      // public information and has no business on a service page.
      const service = await getService(serviceId);
      const rail = service?.meetingRail;
      // jitsi meetings live on OUR page (Admiral, 0018.05.17: the raw
      // meet.jit.si tab ends in their advertisement — /meet/<id> embeds the
      // same room and, when the call closes, keeps the member home with us)
      const meetingUrl =
        rail?.kind === "static"
          ? rail.url
          : rail?.kind === "jitsi"
            ? `${siteBase()}/meet/${bookingId}`
            : undefined;
      const confirmed = await confirmBookingForOrder(order.id, bookingId, meetingUrl);
      // The letter rides the settle but never steers it — a dark mail rail
      // must not unconfirm a paid booking. At-most-once via the vault flag.
      if (confirmed) {
        try {
          const { sendBookingConfirmation } = await import("./mail-booking");
          await sendBookingConfirmation(order, confirmed, service);
        } catch (err) {
          console.error("booking confirmation mail failed:", err);
        }
      }
      return confirmed;
    }

    // Money came back or never landed → the time goes back on the board.
    case "refunded":
    case "disputed":
      return releaseBookingForOrder(bookingId, "canceled");
    case "expired":
    case "canceled":
      return releaseBookingForOrder(bookingId, "released");

    // created / charge_created / processing / underpaid: the hold stands on
    // its own TTL. `processing` deliberately keeps the slot — that buyer's
    // transaction is on the chain and the time is genuinely theirs.
    default:
      return getBooking(bookingId);
  }
}
