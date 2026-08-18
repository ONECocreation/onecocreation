import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CosmicSky from "@/components/CosmicSky";
import StackedHero from "@/components/StackedHero";
import ContactForm from "@/components/ContactForm";
import ContactDoors from "@/components/ContactDoors";
import { cartridge } from "@/brand/cartridge";

export const metadata: Metadata = {
  title: "Contact — One Cocreation",
  description: "E.T. Phone Home — I'll BE right here. Write to Love, catch the 11:11 lives, book a discovery call.",
};

/**
 * /contact — HER contact page brought home (Love designed the original,
 * 0018.05.15): E.T. Phone Home under a living sky, her real FAQ, the
 * write-to-me form on the house mail rails, and the discovery-call door.
 */

const glass: React.CSSProperties = {
  background: "var(--glass-strong)", backdropFilter: "blur(9px)",
  borderRadius: 28, border: "1.5px solid rgba(217,178,78,.4)",
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* ══ E.T. Phone Home — under the living sky ══ */}
        <section className="keep-dark sky-veil" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
          <CosmicSky />
          <div className="wrap center reveal" style={{ position: "relative", zIndex: 2, padding: "64px 22px 60px" }}>
            <p className="kicker" style={{ color: "#E7B2C3" }}>E.T. Phone Home</p>
            <h1 className="stack-hero">
              <span className="sh-ink" style={{ color: "var(--ink-strong)" }}>I&apos;LL BE</span>
              <span className="sh-teal" style={{ color: "#8FD0D8" }}>RIGHT HERE</span>
            </h1>
            <div className="constellation" aria-hidden style={{ color: "var(--ink-strong)" }}>{cartridge.constellation}</div>
          </div>
        </section>

        {/* ══ the three doors — shared with the homepage ══ */}
        <section className="sky-glass" style={{ padding: "50px 0 30px" }}>
          <div className="wrap">
            <ContactDoors />
          </div>
        </section>

        {/* ══ write to me — her form, our rails ══ */}
        <section className="sky-glass" style={{ padding: "40px 0" }}>
          <div className="wrap center reveal" style={{ maxWidth: 560 }}>
            <h2 className="sec-h" style={{ fontSize: "1.6rem" }}>Write to Me 💌</h2>
            <p style={{ color: "var(--muted)", fontSize: ".9rem", margin: "6px 0 20px" }}>
              a note lands gently in Love&apos;s inbox — she writes back to your email.
            </p>
            <div style={{ ...glass, padding: "26px 24px" }}>
              <ContactForm />
            </div>
          </div>
        </section>

        {/* ══ her FAQ — the real questions from her page ══ */}
        <section className="sky-night" style={{ padding: "50px 0 70px" }}>
          <div className="wrap reveal" style={{ maxWidth: 640 }}>
            <h2 className="sec-h center" style={{ fontSize: "1.6rem", marginBottom: 18 }}>FAQ</h2>
            <details style={{ ...glass, padding: "16px 20px", marginBottom: 12 }}>
              <summary style={{ cursor: "pointer", fontFamily: "var(--font-h3)", fontSize: "1.05rem", color: "var(--ink-strong)" }}>
                What time zones are the YouTube &ldquo;Live with Love&rdquo;?
              </summary>
              <div style={{ marginTop: 10, fontSize: ".9rem", color: "var(--ink-body)", lineHeight: 1.8 }}>
                <p style={{ margin: "0 0 8px" }}>
                  Time zones currently vary between <b>MST</b> (Mountain) and <b>PST</b> (Pacific) —{" "}
                  <b>Monday · Wednesday · Friday @ 11:11</b>, or there abouts ;)
                </p>
                <p style={{ margin: 0 }}>
                  👍🏽🪶🛎️ To hear of any changes, Leap events, and random lives — a YouTube hint: if you
                  haven&apos;t tapped a video or a thumbs-up 👍🏽 in a while, the lives and recent videos
                  stop popping up in your feed until you&apos;re active with the channel again.
                </p>
              </div>
            </details>
            <details style={{ ...glass, padding: "16px 20px" }}>
              <summary style={{ cursor: "pointer", fontFamily: "var(--font-h3)", fontSize: "1.05rem", color: "var(--ink-strong)" }}>
                How do I get a Silent Hair Cut?
              </summary>
              <div style={{ marginTop: 10, fontSize: ".9rem", color: "var(--ink-body)", lineHeight: 1.8 }}>
                <p style={{ margin: "0 0 10px" }}>
                  <b>Create an account</b> → visit the <b>ConsciousCuts</b> page → from there you&apos;ll
                  receive an email confirming your account and access to the booking calendar.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link className="btn btn-sm" href="/welcome">Create an account</Link>
                  <Link className="btn btn-ghost btn-sm" href="/services">ConsciousCuts ✂️</Link>
                </div>
              </div>
            </details>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
