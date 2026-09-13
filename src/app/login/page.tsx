import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CosmicSky from "@/components/CosmicSky";
import DoorSheet from "@/components/door/DoorSheet";
import StackedHero from "@/components/StackedHero";

export const metadata: Metadata = {
  title: "Sign in — One Cocreation",
  description:
    "Sign in with your email or your key — no passwords, nothing stored. New here? The door turns to meet you.",
};

/* The front door dressed in the house sky (Admiral, 0018.05.15).
 * TASK-185 Phase B (ruled): the SAME door component the header's sheet
 * mounts, shown full-page for the deep-link cases (`?next=`, the reading
 * room's doors, the middleware's signed-out redirect) — one walk, two
 * mounts, they never disagree. LoginPanel is retired (ruling 2). */
export default function LoginPage() {
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
        <section className="sky-night" style={{ padding: "40px 0 70px" }}>
          <div className="wrap" style={{ maxWidth: 440 }}>
            <DoorSheet mount="page" />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
