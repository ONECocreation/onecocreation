import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CosmicSky from "@/components/CosmicSky";
import RoomsShelf from "@/components/rooms/RoomsShelf";
import CommunitySpotlight from "@/components/CommunitySpotlight";
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
export default function ClassesPage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* ══ the commons, under a living sky ══ */}
        <section className="keep-dark sky-veil" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
          <CosmicSky />
          <div className="wrap center reveal" style={{ position: "relative", zIndex: 2, padding: "64px 22px 56px" }}>
            <p className="kicker" style={{ color: "var(--rose)" }}>The Heartfield Commons</p>
            <h1 className="stack-hero">
              <span className="sh-ink" style={{ color: "var(--ink-strong)" }}>CLASSES &amp;</span>
              <span className="sh-teal" style={{ color: "var(--teal-bright)" }}>COMMUNITY</span>
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
    </>
  );
}
