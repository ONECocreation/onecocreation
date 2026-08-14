import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import JitsiRoom from "@/components/booking/JitsiRoom";
import { getBooking } from "@/lib/booking-orders";
import { getService } from "@/lib/booking";

export const metadata: Metadata = { title: "Your session — One Cocreation" };
export const dynamic = "force-dynamic";

/**
 * /meet/<bookingId> — the confirmed session's own room, on our ground.
 * The booking id is the capability (same law as the receipt); only a
 * CONFIRMED booking opens, and a non-jitsi rail bounces to its real URL.
 */
export default async function MeetPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const booking = await getBooking(bookingId);
  if (!booking) notFound();
  if (booking.state !== "confirmed") notFound();

  const service = await getService(booking.serviceId);
  const rail = service?.meetingRail;
  if (rail?.kind === "static") redirect(rail.url);
  if (rail?.kind !== "jitsi") notFound();

  return (
    <main className="mgmt-ground">
      <SiteHeader />
      <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 1020 }}>
        <header className="mgmt-head">
          <p className="mgmt-eyebrow">Your session</p>
          <h1 className="mgmt-title">{booking.serviceTitle}</h1>
        </header>
        <JitsiRoom
          domain={rail.domain}
          room={bookingId}
          displayName={booking.customer.name || undefined}
        />
      </section>
      <SiteFooter />
    </main>
  );
}
