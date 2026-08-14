import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  Hero, About, Packages, Services, Classes, Affirmations, Donations, FreeMeditation, Contact,
} from "@/components/sections";

/* Adornments paused until Love's photos land — /jewelry stays reachable, unlisted. */

// The sessions shelf reads the live booking config — never bake it at build.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <About />
        <Packages />
        <Classes />
        <Affirmations />
        {/* ConsciousCuts goes LAST among the offering sections (Love's
            meeting, 0018.05.11) — after the packages and the affirmations */}
        <Services />
        <Donations />
        <FreeMeditation />
        <Contact />
      </main>
      <SiteFooter />
    </>
  );
}
