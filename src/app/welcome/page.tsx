import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CosmicSky from "@/components/CosmicSky";
import WelcomeFlow from "@/components/welcome/WelcomeFlow";

export const metadata: Metadata = {
  title: "Join the Field — One Cocreation",
  description: "Free membership in one breath — a discovery call credited toward your first session, the booking calendar, and Heartfield Commons.",
};

export const dynamic = "force-dynamic";

/**
 * /welcome — the two-breath front door (the Admiral's answers, 0018.05.15,
 * replacing the five-step wizard): join with an email, choose your names,
 * and you're in. The old wizard's remaining steps live on /me as the
 * constellation. Key folk take the quiet 🔑 door to /login.
 */
export default function WelcomePage() {
  return (
    <main>
      <SiteHeader />
      <section className="keep-dark sky-veil" style={{ padding: 0, position: "relative", overflow: "hidden", minHeight: "78vh" }}>
        <CosmicSky />
        <div className="wrap reveal" style={{ position: "relative", zIndex: 2, padding: "64px 22px 80px" }}>
          <WelcomeFlow />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
