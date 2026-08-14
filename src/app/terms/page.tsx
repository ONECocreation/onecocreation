import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = { title: "Terms & Conditions — One Cocreation" };

/** Plain-language terms, v1 — DRAFT for Love's (and counsel's) review;
 *  the footer promised this page, so it exists honestly rather than 404ing. */
export default function TermsPage() {
  return (
    <main className="mgmt-ground">
      <SiteHeader />
      <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 720 }}>
        <header className="mgmt-head">
          <p className="mgmt-eyebrow">The fine print, kindly</p>
          <h1 className="mgmt-title">Terms &amp; Conditions</h1>
          <p className="mgmt-blurb">Draft v1 — plain language; final wording with Love.</p>
        </header>
        <div className="space-y-4 text-sm text-neutral-300">
          <p><b>What you're buying.</b> Digital offerings (meditations, affirmations, courses) unlock for the signed-in account that bought them. Memberships open their tier's rooms and content for the paid period. In-person sessions are booked for a specific time and place.</p>
          <p><b>Payment.</b> Prices are shown in dollars and sats. Bitcoin payments (lightning or on-chain) settle to One Cocreation's own wallet — non-custodial, no third parties holding funds. A payment is complete when the invoice settles.</p>
          <p><b>Rescheduling &amp; refunds.</b> Life happens — reach out and we'll work with you. Refunds of bitcoin payments are returned in sats to an address you provide. Pay-what-you-can offers are accepted or kindly declined by Love; declined offers are refunded in full.</p>
          <p><b>Sessions.</b> Booked times are held for you; unpaid holds release automatically. In-person visits depend on location — the mobile studio travels, and your city/state/zip at checkout tells us where.</p>
          <p><b>Not medical advice.</b> Sessions, meditations and classes are spiritual and wellness offerings, not medical or psychological treatment.</p>
          <p><b>Your account.</b> Keys are yours; we never hold them. Email sign-in codes are single-use and short-lived. Be kind in community rooms — Love may remove access for harm.</p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
