import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = { title: "Privacy Policy — One Cocreation" };

/** Privacy, said plainly, v1 DRAFT — and honestly reflecting how the code
 *  actually behaves (PII purge, no trackers, non-custodial). */
export default function PrivacyPage() {
  return (
    <main className="mgmt-ground">
      <SiteHeader />
      <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 720 }}>
        <header className="mgmt-head">
          <p className="mgmt-eyebrow">Your data, plainly</p>
          <h1 className="mgmt-title">Privacy Policy</h1>
          <p className="mgmt-blurb">Draft v1 — this page describes what the site actually does.</p>
        </header>
        <div className="space-y-4 text-sm text-neutral-300">
          <p><b>What we collect.</b> Only what an order or letter needs: an email for receipts and sign-in codes; a name and address only when something ships; city/state/zip only for in-person visits; your nostr public key if you sign in with one. No ad trackers, no analytics beacons, no third-party cookies.</p>
          <p><b>What we forget.</b> Contact and shipping details on orders are automatically purged about 30 days after delivery — the returns window closes, and then we forget on purpose. Order records themselves (what was bought, for how much) remain for the books.</p>
          <p><b>Email.</b> The list is opt-in. Every newsletter carries a one-click unsubscribe. Sign-in codes expire in ten minutes.</p>
          <p><b>Payments.</b> Bitcoin invoices are processed by One Cocreation's own payment server. We never see card numbers (there are none) and never custody your keys.</p>
          <p><b>Your rights.</b> Ask and we'll show you what we hold about you, correct it, or delete what the law lets us delete. Write to the house at the addresses in the footer.</p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
