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
import TimeClock from "./TimeClock";

/* TASK-296 (0018.06.25 a₿): the page reads its Puck doc from KV now, so it
   carries the same force-dynamic line /about got under TASK-239 — without
   it `next build` would prerender a static snapshot and a published rebuild
   would never reach a real visitor until the next deploy. */
export const dynamic = "force-dynamic";

/**
 * /time — THE PLACEHOLDER PAGE (0018.05.26 a₿, TASK-03 Part 3).
 *
 * The template's time experience that used to live here (the orrery, the
 * half-wheel, the time door, the converters) was a template leak — it
 * belongs to the old brand and moved out as a transplant package
 * (transplant/frens-earth-time/ at the repo root, with its TRANSPLANT.md).
 * This page is the reduced, honest interim: the canonical BFT date + the
 * boxed-star height, live-or-dashes, in the house cartridge. A future
 * "different face for Love" (owner ruling 0018.04.28: different worlds,
 * same clock) replaces it — the design is deliberately NOT invented here.
 *
 * BFT-only dates (house law). The paper lives in its own repo (owner
 * ruling 0018.04.22, binding): github.com/PacsArcade/bitcoin-federated-time.
 */

const PAPER_URL = "https://github.com/PacsArcade/bitcoin-federated-time";

export const metadata: Metadata = {
  title: "The Clock — Bitcoin Federated Time — One Cocreation",
  description:
    "Bitcoin Federated Time, plainly: the canonical date and the live block height — read from the chain, never estimated.",
};

export default async function TimePage() {
  /* TASK-296 wave B, pair bb-time — PUCK first, mirroring /about
     (page.tsx:68-88) byte-for-byte: once Love publishes the Puck rebuild
     (/style/time -> Publish), the live /time serves it. Until then, the
     hand-built page below is untouched — nothing changes for visitors
     until she chooses it. No route gates on this page (no features.*
     switches read). The clock is never frozen either way: the designer
     branch renders it through the { id }-only BftClock block, client-live
     and live-or-dashes exactly like the fallback's — T-295 pair 6's ruled
     flag-and-stop lands here. */
  const puck = await getPuckPage("time");
  if (puck) {
    /* the ONE deviation from the /about precedent's plain <main>: this
       branch wears mgmt-ground/mgmt-body because the BftClock block embeds
       the app widget, whose utility classes (text-white/70, text-neon)
       assume the mgmt chrome's remapping — without it the clock's reading
       is illegible on the dawn ground (found on the lane's shots; the
       fallback's own environment, no src/components change needed) */
    return (
      <>
        <SiteHeader />
        <PaletteVars />
        <main className="mgmt-ground mgmt-body"><Render config={config} data={puck as Data} /></main>
        <SiteFooter />
        {/* STUDIO P2: the popup host rides the designer branch (the fallback
            never had one — byte-identical law — so it is not added there) */}
        <PopupHost />
      </>
    );
  }

  return (
    /* the same shell as every page on the site (the mgmt-ground/mgmt-body
       cartridge — see globals.css "SITE CONSOLE CHROME"). */
    <main className="mgmt-ground">
      <SiteHeader />
      <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 720 }}>
        <header className="mgmt-head">
          <p className="mgmt-eyebrow">The time door</p>
          <h1 className="mgmt-title">The clock that syncs to the block, not the sun</h1>
          <p className="mgmt-blurb">
            Bitcoin Federated Time, plainly: the canonical date and the live
            block height. The orrery that used to perform here has gone home
            to its own world — a new face for this door is being drawn.
          </p>
        </header>

        <TimeClock />

        <p className="font-mono text-[11px] uppercase tracking-[0.2em]">
          <a
            href={PAPER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-coin/80 underline underline-offset-4 hover:text-coin"
          >
            read the paper on GitHub
          </a>
        </p>

        <p className="mt-12 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-white/25">
          tick tock, it all comes back to the block
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}
