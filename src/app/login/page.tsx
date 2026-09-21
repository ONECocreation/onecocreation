import type { Metadata } from "next";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CosmicSky from "@/components/CosmicSky";
import PaletteVars from "@/components/PaletteVars";
import PopupHost from "@/components/PopupHost";
import DoorSheet from "@/components/door/DoorSheet";
import StackedHero from "@/components/StackedHero";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";

export const metadata: Metadata = {
  title: "Sign in — One Cocreation",
  description:
    "Sign in with your email or your key — no passwords, nothing stored. New here? The door turns to meet you.",
};

/* TASK-296 (0018.06.25 a₿ · block ~967,192): the page reads its Puck doc
   from KV now — the same force-dynamic line /about got under TASK-239. */
export const dynamic = "force-dynamic";

/* The front door dressed in the house sky (Admiral, 0018.05.15).
 * TASK-185 Phase B (ruled): the SAME door component the header's sheet
 * mounts, shown full-page for the deep-link cases (`?next=`, the reading
 * room's doors, the middleware's signed-out redirect) — one walk, two
 * mounts, they never disagree. LoginPanel is retired (ruling 2). */
export default async function LoginPage() {
  /* TASK-296 (0018.06.25 a₿) — PUCK first, mirroring /about (page.tsx:68-88)
     byte-for-byte: once the Puck rebuild is published (/style/login ->
     Publish), the live /login serves it. Until then, the hand-built page
     below is untouched. No route gates on this page. The deep-link cases
     ride the door itself (?next= is read client-side by DoorSheet), so the
     published branch serves the identical door — the LoginDoor block in
     the seed mounts this same component. */
  const puck = await getPuckPage("login");
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
        <section className="keep-dark sky-veil login-galaxy" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
          <CosmicSky />
          <div className="wrap center reveal" style={{ position: "relative", zIndex: 2, padding: "56px 22px 40px" }}>
            <StackedHero kicker="Members" lines={[{ t: "WELCOME" }, { t: "HOME", tone: "teal" }]} constellation />
          </div>
        </section>
        <section className="sky-glass" style={{ padding: "40px 0 70px" }}>
          <div className="wrap" style={{ maxWidth: 440 }}>
            <DoorSheet mount="page" />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
