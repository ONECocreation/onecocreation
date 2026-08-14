import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MemberCalendar from "@/components/me/MemberCalendar";

export const metadata: Metadata = {
  title: "Your calendar — One Cocreation",
};

/** The member's calendar, v1 (list of their sessions). The community
 *  nostr-calendar and week-grid views layer on here next. */
export default function MemberCalendarPage() {
  return (
    <main className="mgmt-ground">
      <SiteHeader />
      <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 720 }}>
        <header className="mgmt-head">
          <p className="mgmt-eyebrow">Members</p>
          <h1 className="mgmt-title">Your calendar</h1>
          <p className="mgmt-blurb">Your booked sessions — meeting links open when they&apos;re confirmed.</p>
        </header>
        <MemberCalendar />
      </section>
      <SiteFooter />
    </main>
  );
}
