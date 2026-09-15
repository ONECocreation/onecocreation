import type { Metadata } from "next";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PaletteVars from "@/components/PaletteVars";
import PopupHost from "@/components/PopupHost";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";

/* TASK-295 (0018.06.25 a₿ · block 967,178): this page now reads the Puck
   store — without this Next would bake it at build time and a page Love
   publishes would never land until the next deploy (the same line /about,
   /packages and /store already carry). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Terms & Conditions — One Cocreation" };

/** Plain-language terms, v1 — DRAFT for Love's (and counsel's) review;
 *  the footer promised this page, so it exists honestly rather than 404ing. */
export default async function TermsPage() {
  // PUCK P4 (TASK-295 wave A pair 2), mirroring /about byte-for-byte: once
  // Love publishes the Puck rebuild (/style/terms -> Publish to live), the
  // live /terms serves it. Until then, the hand-built page below is
  // untouched — nothing changes for visitors until she chooses it. No route
  // gates on this page: it reads no site switches, so the T-232 gate-first
  // idiom has nothing to put first.
  const puck = await getPuckPage("terms");
  if (puck) {
    return (
      <>
        <SiteHeader />
        <PaletteVars />
        <main><Render config={config} data={puck as Data} /></main>
        <SiteFooter />
        {/* STUDIO P2: the popup host rides the designer branch (the fallback
            never had one — byte-identical law — so it is not added there) */}
        <PopupHost />
      </>
    );
  }

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
          <p><b>What you&apos;re buying.</b> Digital offerings (meditations, affirmations, courses) unlock for the signed-in account that bought them. Memberships open their tier&apos;s rooms and content for the paid period. In-person sessions are booked for a specific time and place.</p>
          <p><b>Payment.</b> Prices are shown in dollars and sats. Bitcoin payments (lightning or on-chain) settle to One Cocreation&apos;s own wallet — non-custodial, no third parties holding funds. A payment is complete when the invoice settles.</p>
          <p><b>Rescheduling &amp; refunds.</b> Life happens — reach out and we&apos;ll work with you. Refunds of bitcoin payments are returned in sats to an address you provide. Pay-what-you-can offers are accepted or kindly declined by Love; declined offers are refunded in full.</p>
          <p><b>Sessions.</b> Booked times are held for you; unpaid holds release automatically. In-person visits depend on location — the mobile studio travels, and your city/state/zip at checkout tells us where.</p>
          <p><b>Not medical advice.</b> Sessions, meditations and classes are spiritual and wellness offerings, not medical or psychological treatment.</p>
          <p><b>Your account.</b> Keys are yours; we never hold them. Email sign-in codes are single-use and short-lived. Be kind in community rooms — Love may remove access for harm.</p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
