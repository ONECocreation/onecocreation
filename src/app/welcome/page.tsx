import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CosmicSky from "@/components/CosmicSky";
import WelcomeFlow from "@/components/welcome/WelcomeFlow";

export const metadata: Metadata = {
  title: "Welcome home — One Cocreation",
  description: "What's yours now — your discovery call, the free circle, the store. The post-sign-in page, one short walk from the door.",
};

export const dynamic = "force-dynamic";

/**
 * /welcome — the post-sign-in "what's yours now" page (TASK-185 Phase B,
 * the Admiral's ruling 1, 0018.06.18 a₿): the URL keeps its place, linked
 * from the member menu. The two-breath walk (join / code / names) is
 * retired — the door sheet owns sign-up; a signed-out visitor is pointed
 * at /login, never asked the same email twice.
 */
export default function WelcomePage() {
  return (
    <main>
      <SiteHeader />
      <section className="keep-dark sky-veil" style={{ padding: 0, position: "relative", overflow: "hidden", minHeight: "78vh" }}>
        <CosmicSky />
        <div className="wrap reveal" style={{ position: "relative", zIndex: 2, padding: "64px 22px 80px" }}>
          <WelcomeFlow />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
