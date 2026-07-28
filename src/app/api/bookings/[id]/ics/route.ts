import { getBooking } from "@/lib/booking-orders";
import { buildIcs, icsFilename } from "@/lib/ics";
import { NIP05_DOMAIN, SPACE_NAME } from "@/lib/identity-config";

export const dynamic = "force-dynamic";

/**
 * The calendar file (spec: docs/booking-flow.md §6).
 *
 * Public, because the booking id IS the capability — same law as the receipt
 * page. A gift recipient on another device must be able to reach it without
 * an account.
 *
 * The event carries a VALARM, so the customer's own phone reminds them an
 * hour ahead. That covers the reminder need before the house can send email
 * at all — which is why this ships before the cron sweep.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) return new Response("no such booking", { status: 404 });

  /**
   * State maps onto real iCalendar semantics rather than being flattened:
   * an unpaid hold is genuinely TENTATIVE. Because the UID is stable and the
   * SEQUENCE climbs, a customer who saves the tentative event and downloads
   * again after paying gets their existing entry UPDATED in place — no
   * duplicate, no stale "unconfirmed" sitting in their calendar.
   */
  const status =
    booking.state === "confirmed" ? "CONFIRMED" : booking.state === "held" ? "TENTATIVE" : "CANCELLED";
  const sequence = booking.state === "held" ? 0 : booking.state === "confirmed" ? 1 : 2;

  const origin = new URL(request.url).origin;
  const receipt = `${origin}/book/receipt/${booking.id}`;

  const detail = [
    booking.meetingUrl ? `Join: ${booking.meetingUrl}` : "The host will send the meeting link.",
    "",
    `Your booking: ${receipt}`,
  ].join("\n");

  const ics = buildIcs({
    // globally unique, and stable across re-downloads
    uid: `${booking.id}@${NIP05_DOMAIN}`,
    startUtc: booking.startUtc,
    endUtc: booking.endUtc,
    summary: booking.serviceTitle,
    description: detail,
    location: booking.meetingUrl,
    url: receipt,
    // ORGANIZER is emitted only when a real host address is configured —
    // BOOKING_ORGANIZER_EMAIL joins the template contract. Absent, the file
    // simply carries no organizer rather than a fabricated one.
    organizer: process.env.BOOKING_ORGANIZER_EMAIL
      ? { name: SPACE_NAME, email: process.env.BOOKING_ORGANIZER_EMAIL }
      : undefined,
    status,
    sequence,
    alarmMinutesBefore: 60,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${icsFilename(booking.serviceTitle, booking.startUtc)}"`,
      "Cache-Control": "no-store",
    },
  });
}
