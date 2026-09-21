import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CosmicSky from "@/components/CosmicSky";
import Card from "@/components/kit/Card";

export const metadata: Metadata = {
  title: "What's a key? — One Cocreation",
  description: "A plain-words explainer for email members curious what a nostr key is — and that it's coming to their seat.",
};

/**
 * /me/your-key — TASK-358, D6 (the Admiral, block 967,926: "explainer page
 * is good"). "Hold your own key" stays present-but-unlit for every email
 * member (block 967,919's ruling — a door into nostr for people who came
 * in through email, not a feature to hide from them). Landing them at
 * `/login` used to start a SECOND, unlinked key session instead of linking
 * one — the same trap T-352's Ground already found and held out of that
 * lane. This page names what's coming honestly instead: no fake done
 * state (reading a page would never earn the star — that bends the
 * one-rule-per-star line), no product pushed beyond nos2x named as one
 * example of a signer add-on, no date.
 *
 * The words below are the Admiral's own, drafted into the brief for his
 * PR read (TASK-358-oc-me-constellation.md, D6) — reproduced verbatim.
 *
 * Static prose, kit components only, no serif fonts, no fetch — the star's
 * `href` (a <Link>, ConstellationCard.tsx) is the only interactive element
 * that reaches here.
 */
export default function YourKeyExplainerPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="keep-dark sky-veil" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
          <CosmicSky />
          <div className="wrap reveal" style={{ position: "relative", zIndex: 2, padding: "56px 22px 70px", maxWidth: 640, margin: "0 auto" }}>
            <Card>
              <h1 style={{ fontSize: "1.7rem", margin: "0 0 18px", color: "var(--ink-strong)" }}>What&apos;s a key?</h1>
              <div style={{ fontSize: ".92rem", lineHeight: 1.75, color: "var(--ink-body)", display: "grid", gap: 14 }}>
                <p>
                  A key is a name nobody else can ever take from you — not us, not anyone. Most
                  people keep theirs in a small add-on for their browser, like nos2x, instead of
                  typing a password every time.
                </p>
                <p>You don&apos;t need one to be here. Your email seat works exactly as it does today.</p>
                <p>Linking your own key to this email seat is coming — not yet, but it&apos;s on its way.</p>
              </div>
              <div style={{ marginTop: 26 }}>
                <Link href="/me" className="kit-btn kit-btn-second kit-btn-sm">
                  back to your page
                </Link>
              </div>
            </Card>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
