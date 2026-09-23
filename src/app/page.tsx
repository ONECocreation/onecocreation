import { headers } from "next/headers";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import { sessionsFromCookieHeader } from "@/lib/member-auth";
import { tierForSubject } from "@/lib/member-tier";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PopupHost from "@/components/PopupHost";
import PaletteVars from "@/components/PaletteVars";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";
import { getSiteConfig } from "@/lib/site-config";
import { DEFAULT_READING_SCHEDULE } from "@/lib/reading-schedule";
import { applyHomeSwitchesToPuck } from "@/lib/puck-seeds";
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
     undefined. This ONE read is shared by BOTH branches below (TASK-293). */
  const active = sessionsFromCookieHeader((await headers()).get("cookie"))[0] ?? null;
  const session = active
    ? { handle: active.handle, space: active.space, tier: await tierForSubject(`${active.handle}@${active.space}`) }
    : null;

  /* TASK-437 (block 968,221 a₿ — the Admiral: "send them to the /reading")
     — the hero door's words come from the LIVE reading schedule, the
     /reading page's own idiom (reading/page.tsx): the saved schedule when
     one is stored, the standing default otherwise. Read fresh per request
     beside the session read; threaded to <Hero> on BOTH branches below. */
  const reading = (await getSiteConfig()).reading ?? DEFAULT_READING_SCHEDULE;

  /* TASK-293 (0018.06.25 a₿ · block 967,144) — PUCK P4, mirroring
     /about-/retreats-/packages byte-for-byte: once the Admiral publishes
     the Puck rebuild (/style/home -> Publish to live), the live / serves
     it. Until then, today's hand-built sections below are untouched —
     nothing changes for visitors until he chooses it.

     The hero keeps rendering from CODE on both branches — <Hero
     session={session} reading={reading}/> carries the signed-in visitor
     (T-210) and the live reading schedule (T-437) — per-request state no
     static Puck doc can hold; puck-seeds.ts's homeContent carries no Hero
     block for exactly this reason. The memberships/classes-community/
     affirmations/services bands follow the SAME site-config switches their
     sections.tsx twins read — applyHomeSwitchesToPuck resolves them fresh
     every request, never fossilised into the stored doc (puck-seeds.ts). */
  const puck = await getPuckPage("home");
  if (puck) {
    const switches = await getSiteConfig();
    const data = applyHomeSwitchesToPuck(puck as Data, switches.features);
    return (
      <>
        <SiteHeader />
        <PaletteVars />
        <main>
          <Hero session={session} reading={reading} />
          <Render config={config} data={data} />
        </main>
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
        <Hero session={session} reading={reading} />
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
