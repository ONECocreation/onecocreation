import { headers } from "next/headers";
import { sessionsFromCookieHeader } from "@/lib/member-auth";
import { tierForSubject } from "@/lib/member-tier";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PopupHost from "@/components/PopupHost";
import {
  Hero, About, Packages, Services, Classes, Affirmations, Donations, FreeMeditation, Contact,
} from "@/components/sections";

/* Adornments paused until Love's photos land — /jewelry stays reachable, unlisted. */

// The sessions shelf reads the live booking config — never bake it at build.
export const dynamic = "force-dynamic";

export default async function Home() {
  /* TASK-210 (0018.06.23 a₿): the home page KNOWS who is signed in — the
     ONE session read the rooms' Stage makes: fren-auth's parser over the
     RAW cookie header (headers() is async since Next 15). Not cookies():
     its store URL-encodes values on the way out, and an email member's
     handle carries an "@" — the encoded token fails its own signature and
     every email member reads as a guest (found on the shot bench). The
     soul's package comes from the same vault truth; both ride to the hero
     as plain props. A signed-out visitor is null (a known guest), never
     undefined. */
  const active = sessionsFromCookieHeader((await headers()).get("cookie"))[0] ?? null;
  const session = active
    ? { handle: active.handle, space: active.space, tier: await tierForSubject(`${active.handle}@${active.space}`) }
    : null;
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
