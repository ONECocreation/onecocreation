import { cookies } from "next/headers";
import { sessionsFromCookieHeader } from "@/lib/fren-auth";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PopupHost from "@/components/PopupHost";
import {
  Hero, About, Packages, Services, Classes, Affirmations, Donations, FreeMeditation, Contact,
} from "@/components/sections";

/* Adornments paused until Love's photos land — /jewelry stays reachable, unlisted. */

// The sessions shelf reads the live booking config — never bake it at build.
export const dynamic = "force-dynamic";

export default function Home() {
  const cookieStore = cookies();
  const sessions = sessionsFromCookieHeader(cookieStore.toString());
  const session = sessions.length ? { handle: sessions[0].handle, space: sessions[0].space } : null;
  return (
    <>
      <SiteHeader />
      <main>
        <Hero session={session} />
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
      {/* STUDIO P2: the popup registry's host — a no-op unless a live popup
          lists this route */}
      <PopupHost />
    </>
  );
}
