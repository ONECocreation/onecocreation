import { NextResponse } from "next/server";
import { frenFromRequest } from "@/lib/fren-auth";
import { memberGroup } from "@/lib/member-links";
import { listOrders, ordersConfigured } from "@/lib/store";
import { getBooking } from "@/lib/booking-orders";
import { getService } from "@/lib/booking";

export const dynamic = "force-dynamic";

/**
 * Your sessions, as a calendar feed (member-home v1): every order of yours
 * that carries a booking, joined to its time and meeting link. Upcoming
 * first; the .ics for each lives on the receipt.
 */
export async function GET(request: Request) {
  const fren = frenFromRequest(request);
  if (!fren) return NextResponse.json({ ok: false }, { status: 401 });
  if (!ordersConfigured()) return NextResponse.json({ ok: true, bookings: [] });

  const subjects = new Set(await memberGroup(`${fren.handle}@${fren.space}`));
  const mine = (await listOrders()).filter(
    (o) => o.entitlementSubject && subjects.has(o.entitlementSubject),
  );
  // one order may carry many sessions (cart v1.5) — a booking per line,
  // with the legacy order-level field still honored, deduped
  const pairs: { bookingId: string; title: string }[] = [];
  for (const o of mine) {
    for (const l of o.lineItems) {
      if (l.bookingId) pairs.push({ bookingId: l.bookingId, title: l.title });
    }
    if (o.bookingId && !pairs.some((p) => p.bookingId === o.bookingId)) {
      pairs.push({ bookingId: o.bookingId, title: o.lineItems[0]?.title ?? "Session" });
    }
  }
  const bookings = (
    await Promise.all(
      pairs.map(async ({ bookingId, title }) => {
        const b = await getBooking(bookingId);
        if (!b) return null;
        // an in-person session's PLACE — the studio's pinned address/geotag,
        // else the member's own area (Love confirms the exact spot)
        const service = await getService(b.serviceId);
        const rail = service?.meetingRail;
        const location =
          rail?.kind === "inPerson"
            ? {
                address: rail.address?.trim() || null,
                geo: rail.geo?.trim() || null,
                area: [b.customer.city, b.customer.state, b.customer.zip].filter(Boolean).join(", ") || null,
              }
            : null;
        return {
          bookingId,
          title,
          startUtc: b.startUtc,
          endUtc: b.endUtc,
          state: b.state,
          meetingUrl: b.state === "confirmed" ? (b.meetingUrl ?? null) : null,
          location,
        };
      }),
    )
  ).filter(Boolean);
  bookings.sort((a, b) => (a!.startUtc < b!.startUtc ? -1 : 1));
  return NextResponse.json({
    ok: true,
    bookings,
    // the door for "message Love" / cancel–reschedule notes
    contactEmail: process.env.BOOKING_ORGANIZER_EMAIL ?? null,
  });
}
