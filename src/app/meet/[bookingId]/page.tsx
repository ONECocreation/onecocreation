import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import JitsiRoom from "@/components/booking/JitsiRoom";
import { getBooking } from "@/lib/booking-orders";
import { getService } from "@/lib/booking";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { getSiteConfig } from "@/lib/site-config";
import { meetStudioPath, directorDeskPath } from "@/lib/live-links";

export const metadata: Metadata = { title: "Your session — One Cocreation" };
export const dynamic = "force-dynamic";

/** TASK-137 (0018.06.17 a₿) — pure, so tests/nav-config.test.ts can pin the
    fallback without rendering the whole server page (next/navigation's
    redirect()/notFound() throw, and this route also needs request headers
    for the vdo branch — the resolution logic is the only part worth
    isolating). The service's own url wins when filled in; a blank/old one
    falls back to the site-wide standing link; neither set → null (no link
    to invent). */
export function resolveStaticMeetingUrl(serviceUrl: string | undefined, siteStaticUrl: string): string | null {
  const own = serviceUrl?.trim();
  if (own) return own;
  const site = siteStaticUrl?.trim();
  return site || null;
}

/**
 * /meet/<bookingId> — the confirmed session's own room, on our ground.
 * The booking id is the capability (same law as the receipt); only a
 * CONFIRMED booking opens, and a non-jitsi rail bounces to its real URL.
 *
 * TASK-129 (0018.06.16 a₿): the VDO.Ninja rail stays ON this page too — an
 * on-site panel with the guest link for the member and, for the operator's
 * eyes only, the director link. The room name is the booking id slug (the
 * capability itself), so no room name is ever invented. Params per the
 * ship's VDO.Ninja knowledge: `?room=<name>` groups guests, `?director=
 * <name>` claims the director seat (first director to join owns the room).
 */
export default async function MeetPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const booking = await getBooking(bookingId);
  if (!booking) notFound();
  if (booking.state !== "confirmed") notFound();

  const service = await getService(booking.serviceId);
  const rail = service?.meetingRail;
  if (rail?.kind === "static") {
    // TASK-137 (0018.06.17 a₿): the standing link belongs in /a/site — "the
    // standing link is entered in /a/site by the operator (never in
    // code)" (Operator runbook).
    const url = resolveStaticMeetingUrl(rail.url, (await getSiteConfig()).meeting.staticUrl);
    if (!url) notFound(); // neither set — no link to invent, no dead redirect
    redirect(url);
  }

  if (rail?.kind === "vdo") {
    const operator = operatorFromCookieHeader((await headers()).get("cookie"));
    /* TASK-297 (0018.06.25 a₿): the guest door flips IN-SITE — the member
       opens `/meet/studio/<bookingId>` (the booking id is the room id, this
       branch's own derivation, and that page's booking capability check is
       the same read this page just made), never the studio's address
       (T-292 DESIGN.md §2 Page B: "the URL the site hands out is OURS").
       TASK-306: the operator's director door follows — the SITE route
       `/a/studio/room/<bookingId>` (T-292 §2 Page A), whose own server
       mints the keyed director src at request time. The keyed studio URL
       no longer sits in this href at all: the same key the guest frame
       carries is derived THERE (live.ts's one-derivation-per-room law),
       so director and guests still land in ONE room. */
    return (
      <main className="mgmt-ground">
        <SiteHeader />
        <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 1020 }}>
          <header className="mgmt-head">
            <p className="mgmt-eyebrow">Your session</p>
            <h1 className="mgmt-title">{booking.serviceTitle}</h1>
          </header>
          <div style={{ textAlign: "center", padding: "30px 0 10px" }}>
            <p style={{ color: "var(--muted)", maxWidth: 520, margin: "0 auto 18px" }}>
              Your room opens right here on the site — camera and mic, peer to peer. Keep
              this page; the link is yours alone.
            </p>
            <a
              className="btn btn-gold"
              href={meetStudioPath(bookingId)}
              target="_blank"
              rel="noopener"
            >
              Join your session →
            </a>
            {operator && (
              <div style={{ marginTop: 26 }}>
                <p style={{ fontSize: ".78rem", color: "var(--muted)", margin: "0 0 8px" }}>
                  operator only — the director seat (first to join claims the room):
                </p>
                <a
                  className="btn btn-ghost btn-sm"
                  href={directorDeskPath(bookingId)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open the director room
                </a>
              </div>
            )}
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

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
