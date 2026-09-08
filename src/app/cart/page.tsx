import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CartPanel from "@/components/store/CartPanel";
import { getSiteConfig } from "@/lib/site-config";
import { liveAdapter, ensureSquareVault } from "@/lib/payments";

export const metadata: Metadata = {
  title: "Your basket — One Cocreation",
};

export const dynamic = "force-dynamic";

/** The basket, wearing the night (Admiral, 0018.05.15). */
export default async function CartPage() {
  /* TASK-186 (0018.06.18 a₿) — WARM BEFORE YOU JUDGE, the item page's own
     T-147 pattern: the basket's price words and its "$ · sats" toggle follow
     the LIVE rails (fiat default only when the card rail can actually
     charge), so the truth is judged once here, server-side, and handed down
     — CartPanel is a client component and can't judge adapters itself. */
  await getSiteConfig();
  await ensureSquareVault();
  const rails = { btc: liveAdapter() !== null, card: liveAdapter("square") !== null };
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
          <CartPanel rails={rails} />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
