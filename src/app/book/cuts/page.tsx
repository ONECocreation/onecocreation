import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CosmicSky from "@/components/CosmicSky";
import NotOpenYet from "@/components/NotOpenYet";
import CutsChooser from "@/components/booking/CutsChooser";
import { getSiteConfig } from "@/lib/site-config";
import { cartridge } from "@/brand/cartridge";

export const metadata: Metadata = {
  title: "ConsciousCuts & Soul Work — book a session",
  description: "Where are you, which session, when — the mobile studio comes to you.",
};

export const dynamic = "force-dynamic";

/* The cuts door (Admiral, 0018.05.17): location → session → time.

   TASK-165 (0018.06.17 a₿ · block 966,080 — the T-152 seam, ruled B):
   the public door wears the house style now, the same wrapper T-152 gave
   /book — the night hero (keep-dark + sky-veil + the page-scoped
   book-hero-veil, CosmicSky settling in behind), every word on the house
   faces (kicker / stack-hero / lead — no page-local font, no page-local
   hex, NO serifs), and the chooser on its own dark shelf (keep-dark +
   book-shelf-veil, the rose galaxy rising behind the steps). */
export default async function CutsPage() {
  /* ── TASK-165 GATE (0018.06.17 a₿ · block 966,080) — the T-160 idiom,
     adopted not rebuilt. The brief read "keep T-160's switch gate —
     verify, don't rebuild"; verification on the base found /book/cuts was
     NEVER gated (T-160 covered /classes, /book, /store — the `cuts` switch
     only hid the nav/sections doors), so the minimal branch lands here,
     FIRST, byte-for-byte the T-160 shape: the route follows its switch —
     cuts OFF (Love's streamlined default) means a direct /book/cuts URL
     renders the shared NotOpenYet quiet panel (T-137) inside the site
     chrome, never the chooser. ── */
  const switches = await getSiteConfig();
  if (!switches.features.cuts) {
    return (
      <main>
        <SiteHeader />
        <NotOpenYet
          title="Conscious Cuts isn't open yet"
          body="Love's mobile studio calendar is still being set up — check back soon, or write in from the contact page."
        />
        <SiteFooter />
      </main>
    );
  }
  /* ── end TASK-165 GATE ── */

  return (
    <main>
      <SiteHeader />
      {/* ══ the hero — the same night /book holds (T-152): keep-dark +
          sky-veil + the page-scoped veil from house.css, CosmicSky behind ══ */}
      <section className="keep-dark sky-veil book-hero-veil" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
        <CosmicSky />
        <div className="wrap center reveal" style={{ position: "relative", zIndex: 2, padding: "64px 22px 56px" }}>
          <p className="kicker">ConsciousCuts &amp; Waxing 🦋</p>
          <h1 className="stack-hero">
            <span className="sh-ink">BOOK</span>
            <span className="sh-teal">YOUR SESSION</span>
          </h1>
          <div className="constellation" aria-hidden style={{ color: "var(--ink-strong)" }}>{cartridge.constellation}</div>
          {/* the house lede (.lead, the home shelf's own class) — the same
              measure /book's hero carries */}
          <p className="lead" style={{ fontSize: "1.05rem", maxWidth: 460, margin: "18px auto 0" }}>
            The studio comes to you — say where, pick your session, choose a time.
          </p>
        </div>
      </section>

      {/* ══ the chooser — on its own night with the rose galaxy rising
          behind the steps (T-152's shelf veil) ══ */}
      <section className="keep-dark book-shelf-veil" style={{ padding: "56px 0 70px" }}>
        <div className="wrap" style={{ maxWidth: 780 }}>
          <CutsChooser />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
