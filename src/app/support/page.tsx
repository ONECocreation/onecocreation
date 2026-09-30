import type { Metadata } from "next";
import Link from "next/link";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import WildDoors from "@/components/WildDoors";
import StackedHero from "@/components/StackedHero";
import PaletteVars from "@/components/PaletteVars";
import PopupHost from "@/components/PopupHost";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";

/**
 * TASK-498 (block 969,095 · R-072, settled Monday — the Admiral
 * [00:44:13–00:44:38]): the jars LEFT this room. The tip items live only
 * under Store, in their own drop-down at the bottom of /store
 * (src/components/store/GiftDrawer.tsx), gated exactly as they were here
 * (TASK-134's switch-plus-live-rail gate AND TASK-411's live-shelf-items
 * gate — the idiom moved with the jars, unchanged). What stays: the hero,
 * the Three Doors, and More Ways to Hold the Work.
 */

export const metadata: Metadata = {
  title: "Support — One Cocreation",
  description: "Tend the field — gifts land whole with Love.",
};

/**
 * /support, revamped (Admiral, 0018.05.15): a full room instead of a flat
 * strip — the field hero, the wild doors (beasts grow out of their cells
 * on hover), the other ways to hold the work, and the money words spoken
 * gently. (TASK-498: the three jars moved to the store's bottom drawer.)
 */

const MORE_DOORS = [
  { icon: "🕊️", title: "Book a session", words: "a discovery call or a soul conversation", href: "/services" },
  { icon: "⭐", title: "Join a package", words: "the classrooms, the circle, the weekly rhythm", href: "/packages" },
  { icon: "🎁", title: "Gift a session", words: "any session in the store can be given to another", href: "/store#sessions" },
  { icon: "🌙", title: "Share the free meditation", words: "sometimes the greatest gift is a friend's ear", href: "/meditation" },
];

export default async function SupportPage() {
  /* TASK-159 (0018.06.17 a₿ · block 966,055) — PUCK P4 first read, mirroring
     /about and T-153's /memberships byte-for-byte: once Love publishes the
     Puck rebuild (/studio/support -> Publish to live), the live /support
     serves it. Until then, the hand-built page below is untouched — nothing
     changes for visitors until she chooses it.
     ── LANE CONTRACT (T-160): the feature-switch gate (NotOpenYet)
     early-returns ABOVE this branch — the order is (1) switch gate,
     (2) this Puck-first read, (3) the hand-built fallback. ── */
  const puck = await getPuckPage("support");
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
        {/* ── the field hero ── */}
        <section style={{ paddingBottom: 26 }}>
          <div className="wrap center reveal">
            <StackedHero kicker="Support This Work — Gently" lines={[{ t: "TEND" }, { t: "THE FIELD", tone: "teal" }]} constellation />
            <p className="lead" style={{ marginBottom: 0 }}>
              Everything here — the sessions, the rooms, the letters — is held by one pair of hands.
              A gift lands with Love.
            </p>
          </div>
        </section>

        {/* ── the wild doors ── */}
        <section style={{ padding: "20px 0 34px" }}>
          <div className="wrap">
            <div className="center reveal" style={{ marginBottom: 10 }}>
              {/* TASK-126 (0018.06.16 a₿): the squares' heading — same words as the home section */}
              <h2 className="sec-h" style={{ fontSize: "1.7rem", margin: 0 }}>Three Doors</h2>
              <p style={{ color: "var(--muted)", maxWidth: 560, margin: "6px auto 0", fontSize: ".95rem" }}>
                Give forward, follow along, read with me.
              </p>
            </div>
            <div className="reveal" style={{ transitionDelay: ".12s" }}><WildDoors /></div>
          </div>
        </section>

        {/* ── other ways to hold the work ── */}
        <section style={{ padding: "20px 0 60px" }}>
          <div className="wrap">
            <div className="center reveal" style={{ marginBottom: 20 }}>
              <p className="kicker">More Ways to Hold the Work</p>
            </div>
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))" }}>
              {MORE_DOORS.map((d) => (
                <Link key={d.title} href={d.href} className="card" style={{ textDecoration: "none" }}>
                  <div className="body" style={{ padding: 20 }}>
                    <div style={{ fontSize: "1.6rem" }}>{d.icon}</div>
                    <h3 style={{ fontWeight: 400, fontSize: "1.05rem", margin: "6px 0 2px" }}>{d.title}</h3>
                    <p style={{ color: "var(--muted)", fontSize: ".84rem", margin: 0 }}>{d.words}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
