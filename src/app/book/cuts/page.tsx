import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CutsChooser from "@/components/booking/CutsChooser";

export const metadata: Metadata = {
  title: "ConsciousCuts & Soul Work — book a session",
  description: "Where are you, which session, when — the mobile studio comes to you.",
};

export const dynamic = "force-dynamic";

/* The cuts door (Admiral, 0018.05.17): location → session → time. */
export default function CutsPage() {
  return (
    <main className="mgmt-ground">
      <SiteHeader />
      <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 780 }}>
        <header className="mgmt-head">
          <p className="mgmt-eyebrow">ConsciousCuts &amp; Waxing 🦋</p>
          <h1 className="mgmt-title">Book your session</h1>
          <p className="mgmt-blurb">The studio comes to you — say where, pick your session, choose a time.</p>
        </header>
        <CutsChooser />
      </section>
      <SiteFooter />
    </main>
  );
}
