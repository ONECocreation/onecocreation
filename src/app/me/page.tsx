import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CosmicSky from "@/components/CosmicSky";
import MeSwitch from "@/components/me/MeSwitch";
import { cartridge } from "@/brand/cartridge";

export const metadata: Metadata = {
  title: "My field — One Cocreation",
  description:
    "Your name, your sessions, your profile card — a member's own room under the house sky.",
};

/**
 * /me — the member's own room. Session gated: the panel reads the
 * session client-side (honest "sign in first" when there is none), and
 * every API it touches checks the cookie server-side — the page is the
 * doorway, the routes are the locks. Dressed in the house sky
 * (Admiral, 0018.05.15) — same celestial grammar as /login and /welcome.
 */
export default function MePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="keep-dark sky-veil" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
          <CosmicSky />
          <div className="wrap center reveal" style={{ position: "relative", zIndex: 2, padding: "56px 22px 40px" }}>
            <p className="kicker" style={{ color: "var(--rose)" }}>Members</p>
            <h1 className="stack-hero">
              <span className="sh-ink" style={{ color: "var(--ink-strong)" }}>YOUR</span>
              <span className="sh-teal" style={{ color: "var(--teal-bright)" }}>FIELD</span>
            </h1>
            <div className="constellation" aria-hidden style={{ color: "var(--ink-strong)" }}>{cartridge.constellation}</div>
            <p style={{ color: "var(--ink-body)", fontSize: ".92rem", margin: "16px auto 0", maxWidth: 460 }}>
              Your name, your sessions, your profile card — this room is yours.
            </p>
          </div>
        </section>
        <section className="sky-night" style={{ padding: "36px 0 70px" }}>
          <div className="wrap" style={{ maxWidth: 720 }}>
            <MeSwitch />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
