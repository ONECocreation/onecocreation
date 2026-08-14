import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CosmicSky from "@/components/CosmicSky";
import LoginPanel from "@/components/LoginPanel";
import { cartridge } from "@/brand/cartridge";

export const metadata: Metadata = {
  title: "Sign in — One Cocreation",
  description:
    "Sign in with your key or your email — no passwords, nothing stored. New here? The welcome path is open.",
};

/* The front door dressed in the house sky (Admiral, 0018.05.15) — the mgmt
 * wireframe robe retired; same celestial hero grammar as /welcome and the
 * commons. */
export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="keep-dark sky-veil" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
          <CosmicSky />
          <div className="wrap center reveal" style={{ position: "relative", zIndex: 2, padding: "56px 22px 40px" }}>
            <p className="kicker" style={{ color: "var(--rose)" }}>Members</p>
            <h1 className="stack-hero">
              <span className="sh-ink" style={{ color: "var(--ink-strong)" }}>WELCOME</span>
              <span className="sh-teal" style={{ color: "var(--teal-bright)" }}>HOME</span>
            </h1>
            <div className="constellation" aria-hidden style={{ color: "var(--ink-strong)" }}>{cartridge.constellation}</div>
          </div>
        </section>
        <section className="sky-night" style={{ padding: "40px 0 70px" }}>
          <div className="wrap" style={{ maxWidth: 560 }}>
            <LoginPanel />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
