import type { Metadata } from "next";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CosmicSky from "@/components/CosmicSky";
import RoomsShelf from "@/components/rooms/RoomsShelf";
import CommunitySpotlight from "@/components/CommunitySpotlight";
import PopupHost from "@/components/PopupHost";
import PaletteVars from "@/components/PaletteVars";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";
import { cartridge } from "@/brand/cartridge";

export const metadata: Metadata = {
  title: "Classes & Community — One Cocreation",
  description: "Your luminous rooms — classes and commons on One Cocreation's own server.",
};

export const dynamic = "force-dynamic";

/* C4: the REAL rooms page — the illustrative section retired the day the
 * homeserver's doors started opening by package. Dressed in the site's dark
 * sky (Admiral, 0018.05.15) — the mgmt wireframe robe retired, and the
 * "Chronicles of Wonderland" eyebrow with it (a Degen Wonderland remnant;
 * this house is the Heartfield). */
export default async function ClassesPage() {
  /* TASK-159 (0018.06.17 a₿ · block 966,055) — PUCK P4 first read, mirroring
     /about and T-153's /memberships byte-for-byte: once Love publishes the
     Puck rebuild (/studio/classes -> Publish to live), the live /classes
     serves it. Until then, the hand-built page below is untouched — nothing
     changes for visitors until she chooses it.
     ── LANE CONTRACT (T-160): the feature-switch gate (NotOpenYet)
     early-returns ABOVE this branch — the order is (1) switch gate,
     (2) this Puck-first read, (3) the hand-built fallback. ── */
  const puck = await getPuckPage("classes");
  if (puck) {
    return (
      <>
        <SiteHeader />
        <PaletteVars />
        <main><Render config={config} data={puck as Data} /></main>
        <SiteFooter />
        {/* STUDIO P2: popup host rides both branches of this page */}
        <PopupHost />
      </>
    );
  }
  /* ── end TASK-159 Puck-first branch; hand-built fallback below ── */

  return (
    <>
      <SiteHeader />
      <main>
        {/* ══ the commons, under a living sky ══ */}
        <section className="keep-dark sky-veil" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
          <CosmicSky />
          <div className="wrap center reveal" style={{ position: "relative", zIndex: 2, padding: "64px 22px 56px" }}>
            {/* TASK-156 (0018.06.17 a₿, Love's meeting): the words "Heart Field
                Commons" wear TEAL, "classes & community" wears PINK (the house
                pink is --rose) — two token swaps, no new tokens. */}
            <p className="kicker" style={{ color: "var(--teal-bright)" }}>The Heartfield Commons</p>
            <h1 className="stack-hero">
              <span className="sh-ink" style={{ color: "var(--rose)" }}>CLASSES &amp;</span>
              <span className="sh-teal" style={{ color: "var(--rose)" }}>COMMUNITY</span>
            </h1>
            <div className="constellation" aria-hidden style={{ color: "var(--ink-strong)" }}>{cartridge.constellation}</div>
            <p style={{ color: "var(--ink-body)", fontSize: ".95rem", maxWidth: 520, margin: "18px auto 0" }}>
              Your own luminous rooms — your keys, Love&apos;s server, nobody in between.
              Your package opens the doors.
            </p>
          </div>
        </section>

        {/* ══ who holds the field + the voices ══ */}
        <section className="sky-glass" style={{ padding: "50px 0 10px" }}>
          <div className="wrap" style={{ maxWidth: 1020 }}>
            <CommunitySpotlight />
          </div>
        </section>

        {/* ══ the rooms themselves ══ */}
        <section className="sky-night" style={{ padding: "30px 0 70px" }}>
          <div className="wrap" style={{ maxWidth: 1020 }}>
            <RoomsShelf />
          </div>
        </section>
      </main>
      <SiteFooter />
      {/* STUDIO P2: popup host — no-op unless a live popup lists /classes */}
      <PopupHost />
    </>
  );
}
