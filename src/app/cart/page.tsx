import type { Metadata } from "next";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PaletteVars from "@/components/PaletteVars";
import PopupHost from "@/components/PopupHost";
import CartPanel from "@/components/store/CartPanel";
import StackedHero from "@/components/StackedHero";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";
import { applyCartRailsToPuck } from "@/lib/puck-blocks/cart-panel";
import { getSiteConfig } from "@/lib/site-config";
import { liveAdapter, ensureSquareVault } from "@/lib/payments";

export const metadata: Metadata = {
  title: "Your basket — One Cocreation",
};

export const dynamic = "force-dynamic";

/** TASK-393 (R4 of the block-968,133 amendment) — the basket's one-line
 *  promise, judged against BOTH rails cart/page.tsx already computes
 *  below (never a third switch): both live keeps the original words
 *  whole; one dark drops the absent rail from the sentence; neither
 *  live drops the checkout promise entirely — a plain resting line in
 *  the page's own voice, never a claim on a dark rail. Pure + exported
 *  so the four states are pinned as a table (tests/feature-switches
 *  .test.ts), the same idiom as packages/[slug]/page.tsx's
 *  tierJoinedBanner. */
export function cartCheckoutLine(rails: { btc: boolean; card: boolean }): string {
  if (rails.btc && rails.card) return "one checkout — everything settles together, by lightning or by card.";
  if (rails.btc) return "one checkout — everything settles together, by lightning.";
  if (rails.card) return "one checkout — everything settles together, by card.";
  return "your basket is holding everything — checkout opens the moment a payment rail does.";
}

/** The basket, wearing the night (Admiral, 0018.05.15). */
export default async function CartPage() {
  /* TASK-186 (0018.06.18 a₿) — WARM BEFORE YOU JUDGE, the item page's own
     T-147 pattern: the basket's price words and its "$ · sats" toggle follow
     the LIVE rails (fiat default only when the card rail can actually
     charge), so the truth is judged once here, server-side, and handed down
     — CartPanel is a client component and can't judge adapters itself.
     TASK-296: the judging stays AHEAD of the Puck read, verbatim (the
     route-gate-first idiom) — both branches ride the same rails. */
  await getSiteConfig();
  await ensureSquareVault();
  const rails = { btc: liveAdapter() !== null, card: liveAdapter("square") !== null };

  /* TASK-296 (0018.06.25 a₿ · block ~967,200) — PUCK first, mirroring
     /about (page.tsx:68-88) byte-for-byte: once the Puck rebuild is
     published (/style/cart -> Publish), the live /cart serves it — with
     the SAME rails injected into the CartPanel block's props at render
     time (applyCartRailsToPuck; the injection is never written back to
     the store, so no rail state can fossilise). Until then, the
     hand-built page below is untouched. */
  const puck = await getPuckPage("cart");
  if (puck) {
    return (
      <>
        <SiteHeader />
        <PaletteVars />
        <main><Render config={config} data={applyCartRailsToPuck(puck as Data, rails)} /></main>
        <SiteFooter />
        {/* STUDIO P2: popup host rides both branches of this page */}
        <PopupHost />
      </>
    );
  }

  return (
    <main>
      <SiteHeader />
      <section>
        <div className="wrap" style={{ maxWidth: 720 }}>
          <div className="center reveal" style={{ marginBottom: 26 }}>
            <StackedHero kicker="The Store" lines={[{ t: "YOUR" }, { t: "BASKET 🧺", tone: "teal" }]} />
            <p style={{ color: "var(--muted)", fontSize: ".9rem", margin: "14px 0 0" }}>
              {cartCheckoutLine(rails)}
            </p>
          </div>
          <CartPanel rails={rails} />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
