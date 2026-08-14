import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import TipJar from "@/components/TipJar";
import WildDoors from "@/components/WildDoors";
import StackedHero from "@/components/StackedHero";

export const metadata: Metadata = {
  title: "Support — One Cocreation",
  description: "Tend the field — gifts land whole with Love, and Pay It Forward flows onward to the beings holding this Earth.",
};

/**
 * /support, revamped (Admiral, 0018.05.15): a full room instead of a flat
 * strip — the field hero, the three jars with their purposes, the wild
 * doors (beasts grow out of their cells on hover), the other ways to hold
 * the work, and the money words spoken gently.
 */

const MORE_DOORS = [
  { icon: "🕊️", title: "Book a session", words: "a discovery call, a soul conversation, a silent cut", href: "/services" },
  { icon: "⭐", title: "Join a package", words: "the classrooms, the circle, the weekly rhythm", href: "/packages" },
  { icon: "🎁", title: "Gift a session", words: "any session in the store can be given to another", href: "/store#sessions" },
  { icon: "🌙", title: "Share the free meditation", words: "sometimes the greatest gift is a friend's ear", href: "/meditation" },
];

export default function SupportPage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* ── the field hero ── */}
        <section style={{ paddingBottom: 26 }}>
          <div className="wrap center reveal">
            <StackedHero kicker="Support This Work — Gently ⚡" lines={[{ t: "TEND" }, { t: "THE FIELD", tone: "teal" }]} constellation />
            <p className="lead" style={{ marginBottom: 0 }}>
              Everything here — the sessions, the rooms, the letters — is held by one pair of hands.
              A gift lands with Love <b style={{ color: "var(--gold-deep)" }}>whole</b>: no platform
              between, no cut taken. Choose the jar it fills.
            </p>
          </div>
        </section>

        {/* ── the jars ── */}
        <section style={{ padding: "10px 0 30px" }}>
          <div className="wrap reveal">
            <div style={{ background: "var(--warm-panel)",
              border: "1px solid var(--warm-edge)", borderRadius: 30, padding: "34px 38px", boxShadow: "var(--soft)" }}>
              <h2 style={{ fontWeight: 400, fontSize: "1.5rem", margin: 0 }}>The Three Jars</h2>
              <p style={{ color: "var(--muted)", margin: "4px 0 0", fontSize: ".95rem" }}>
                pick a jar, pick an amount — lightning opens, and it&apos;s done in a breath.
              </p>
              <TipJar />
              <p style={{ fontSize: ".82rem", color: "var(--muted)", marginTop: 18 }}>
                Bitcoin gifts travel the Lightning Network straight to Love&apos;s own wallet — nothing
                held, nothing routed by anyone else. Dollars are always welcome too: bitcoin is an
                option here, never a demand.
              </p>
            </div>
          </div>
        </section>

        {/* ── the wild doors ── */}
        <section style={{ padding: "20px 0 34px" }}>
          <div className="wrap">
            <div className="center reveal" style={{ marginBottom: 10 }}>
              <p className="kicker">Where Pay It Forward Flows 🎁</p>
              <h2 className="sec-h" style={{ fontSize: "1.7rem" }}>It Doesn&apos;t Stop Here</h2>
              <p style={{ color: "var(--muted)", maxWidth: 560, margin: "6px auto 0", fontSize: ".95rem" }}>
                The Pay-It-Forward jar funds sessions for those who can&apos;t right now — and Love
                passes it onward to the beings holding this Earth together.
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
