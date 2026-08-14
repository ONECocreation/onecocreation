import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CartPanel from "@/components/store/CartPanel";

export const metadata: Metadata = {
  title: "Your basket — One Cocreation",
};

/** The basket, wearing the night (Admiral, 0018.05.15). */
export default function CartPage() {
  return (
    <main>
      <SiteHeader />
      <section>
        <div className="wrap" style={{ maxWidth: 720 }}>
          <div className="center reveal" style={{ marginBottom: 26 }}>
            <p className="kicker">The Store</p>
            <h1 className="stack-hero">
              <span className="sh-ink">YOUR</span>
              <span className="sh-teal">BASKET 🧺</span>
            </h1>
            <p style={{ color: "var(--muted)", fontSize: ".9rem", margin: "14px 0 0" }}>
              one checkout, one lightning invoice — everything settles together.
            </p>
          </div>
          <CartPanel />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
