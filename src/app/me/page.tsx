import type { Metadata } from "next";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CosmicSky from "@/components/CosmicSky";
import PaletteVars from "@/components/PaletteVars";
import PopupHost from "@/components/PopupHost";
import MeSwitch from "@/components/me/MeSwitch";
import StackedHero from "@/components/StackedHero";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";

export const metadata: Metadata = {
  title: "My field — One Cocreation",
  description:
    "Your name, your sessions, your profile card — a member's own room under the house sky.",
};

/* TASK-296 (0018.06.25 a₿ · block ~967,192): the page reads its Puck doc
   from KV now, so it carries the same force-dynamic line /about got under
   TASK-239 — without it `next build` would prerender a static snapshot and
   a published rebuild would never reach a real visitor until the next
   deploy. */
export const dynamic = "force-dynamic";

/**
 * /me — the member's own room. Session gated: the panel reads the
 * session client-side (honest "sign in first" when there is none), and
 * every API it touches checks the cookie server-side — the page is the
 * doorway, the routes are the locks. Dressed in the house sky
 * (Admiral, 0018.05.15) — same celestial grammar as /login and /welcome.
 */
export default async function MePage() {
  /* TASK-296 (0018.06.25 a₿) — PUCK first, mirroring /about (page.tsx:68-88)
     byte-for-byte: once Love publishes the Puck rebuild (/style/me ->
     Publish), the live /me serves it. Until then, the hand-built page
     below is untouched — nothing changes for visitors until she chooses
     it. No route gates on this page (no features.* switches read). The
     MeSwitch block in the seed renders this same widget — nothing
     session-shaped is ever stored in the doc. */
  const puck = await getPuckPage("me");
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

  return (
    <>
      <SiteHeader />
      <main>
        <section className="keep-dark sky-veil" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
          <CosmicSky />
          <div className="wrap center reveal" style={{ position: "relative", zIndex: 2, padding: "56px 22px 40px" }}>
            <StackedHero kicker="Members" lines={[{ t: "YOUR" }, { t: "FIELD", tone: "teal" }]} constellation />
            <p style={{ color: "var(--ink-body)", fontSize: ".92rem", margin: "16px auto 0", maxWidth: 460 }}>
              Your name, your sessions, your profile card — this room is yours.
            </p>
          </div>
        </section>
        <section className="sky-glass" style={{ padding: "36px 0 70px" }}>
          <div className="wrap" style={{ maxWidth: 720 }}>
            <MeSwitch />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
