import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import TimeClock from "./TimeClock";

/**
 * /time — THE PLACEHOLDER PAGE (0018.05.26 a₿, TASK-03 Part 3).
 *
 * The arcade time experience that used to live here (the orrery, the
 * half-wheel, the time door, the converters) was a template leak — it
 * belongs to frens.earth and moved out as a transplant package
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

export default function TimePage() {
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
