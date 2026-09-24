/* eslint-disable @next/next/no-img-element -- the host portrait is an
   existing house asset, exactly as reading/page.tsx mounts it */
import type { Metadata } from "next";
import { headers } from "next/headers";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PaletteVars from "@/components/PaletteVars";
import CosmicSky from "@/components/CosmicSky";
import PlaygroundIsland from "@/components/reading/playground/PlaygroundIsland";
import { Stage2Rows } from "@/components/reading/Stage2Details";
import { sessionsFromCookieHeader } from "@/lib/member-auth";
import { tierForSubject } from "@/lib/member-tier";
import { getSiteConfig } from "@/lib/site-config";
import { nextReading, DEFAULT_READING_SCHEDULE, type ReadingSchedule } from "@/lib/reading-schedule";
import { getStage2State } from "@/lib/stage2";
import { STAGE2_MIN_TIER, type Stage2Decision } from "@/lib/stage2-access";
import { TIERS, tierSatisfies, type Tier } from "@/lib/entitlement";
import { TIER_PAGES } from "@/lib/tiers-content";
import { deriveWeekPass } from "@/lib/week-pass";

/**
 * TASK-449 (block 968,364; AMENDMENT 1 block 968,366 — "the Playground",
 * Love's own name for the two-way stage) — /reading/playground: Stage 2's
 * own address. The page mirrors /reading's shell (the approved sky band,
 * kicker/h1/kit-when per the design of record's toEncorePage, the host
 * row back to the reading); the island in the stage slot renders the
 * ENTITLEMENT RAIL's wire (`/api/stage2` + stage2-access.ts) and nothing
 * else — the server decides, the page never shows a room name or a raw
 * call link to a viewer the rail refuses.
 *
 * The band's words (pickup fix round, block 968,393) live in the ISLAND
 * (PlaygroundIsland.playgroundBand) so they move with the wire — a band
 * read once here contradicted the stage after a publish or unpublish
 * (K122 item 6a's ruling on /reading). This page hands over only the
 * ingredients: the server's own first-paint read of the rail
 * (`initialDecision`), the closed band's derived next-reading line, and
 * the visitor's package name when their tier clears the door (the same
 * tierForSubject/tierSatisfies composition rooms/[slug]/page.tsx:91
 * already rides, never a re-implementation). The prices stand under every
 * gate state — the Stage2Details rows, server-composed (reading/page.tsx's
 * own idiom) and handed to the island as a node.
 *
 * Freshness: DYNAMIC, not cached — the exact force-dynamic pattern
 * reading/page.tsx uses, so a Publish shows on the very next reload and
 * the island's 20 s poll covers the stay.
 */

export const metadata: Metadata = {
  title: "The Playground with Love · ONE Cocreation",
  description: "Join Love's live video call right after the reading — the Playground, with every membership or a one-week pass.",
};

export const dynamic = "force-dynamic";

const DAY_LABEL: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" };
const CLOCK_LABEL: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

function dayLabel(ms: number, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...DAY_LABEL }).format(new Date(ms));
}
function clockAt(ms: number, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...CLOCK_LABEL }).format(new Date(ms));
}
function zoneLabel(ms: number, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date(ms));
  return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
}

/* Kept out of PlaygroundPage's own body so the purity rule never meets
 * Date.now() (reading/page.tsx's own deriveReading idiom). */
function deriveNext(schedule: ReadingSchedule) {
  return schedule.on ? nextReading(schedule, Date.now()) : null;
}

export default async function PlaygroundPage() {
  /* the same raw-cookie session read every public page with a signed-in
     variant already does (reading/page.tsx's own comment, TASK-210) */
  const session = sessionsFromCookieHeader((await headers()).get("cookie"))[0] ?? null;

  const config = await getSiteConfig();
  const schedule = config.reading ?? DEFAULT_READING_SCHEDULE;
  const next = deriveNext(schedule);
  const published = (await getStage2State()).phase === "published";
  const weekPass = await deriveWeekPass();

  /* the band's per-visitor line — the rail's own helpers, fail-quiet to
     the plainer band on any membership-check blip (the display never
     500s; the island's door stays the rail's strict reader). Read even
     while closed: the island's band may flip to open under a seated
     visitor without a reload. */
  let visitorTier: Tier | null = null;
  if (session) {
    try {
      visitorTier = await tierForSubject(`${session.handle}@${session.space}`);
    } catch {
      visitorTier = null;
    }
  }
  const entitled = visitorTier !== null && tierSatisfies(visitorTier, STAGE2_MIN_TIER);

  /* derive-or-dash: no tier-B page → the memberships shelf, never a 404
     (stage2-access.ts:56-57's idiom); the NAME rides TIERS — no literal
     slug, name or price is ever written here */
  const observerPage = TIER_PAGES.find((p) => p.tier === "B");
  const observerHref = observerPage ? `/packages/${observerPage.slug}` : "/memberships";
  const observerName = TIERS.B.name;

  /* the band's first paint — the server's read of the same rail (words
     only: the island's body stays fail-closed until the wire answers) */
  const initialDecision: Stage2Decision = !published ? "hidden" : entitled ? "open" : session ? "package" : "signin";
  /* the closed band names the next reading, DERIVED (never a literal
     weekday or clock time — reading/page.tsx's law); every gap inside
     clock-plus-zone a U+00A0 so the clock never splits */
  const nbsp = (s: string) => s.replace(/\s/g, " ");
  const closedWhen = next
    ? `${dayLabel(next.startsAtMs, schedule.tz)} · ${nbsp(`${clockAt(next.startsAtMs, schedule.tz)} ${zoneLabel(next.startsAtMs, schedule.tz)}`)}`
    : null;
  const tierName = entitled && visitorTier ? TIERS[visitorTier].name : null;

  return (
    <>
      <SiteHeader />
      <PaletteVars />
      <main className="center kitx-balanced">
        {/* THE PLAYGROUND BAND — /reading's own shell: the house living
            sky + nebula, the rail-derived kicker, the when-lines, and the
            island in the stage slot. */}
        <section className="keep-dark sky-veil sky-stage sky-nebula" id="stage">
          <CosmicSky />
          <div className="wrap kitx-flow">
            {/* the kicker, h1 and when-lines ride inside the island now */}
            <PlaygroundIsland
              jitsiDomain={config.meeting.jitsiDomain}
              observerHref={observerHref}
              observerName={observerName}
              stage2Rows={<Stage2Rows weekPass={weekPass} />}
              initialDecision={initialDecision}
              closedWhen={closedWhen}
              tierName={tierName}
            />
          </div>
        </section>

        {/* WHAT HAPPENS IN THE PLAYGROUND — the design of record's three
            lines (compose()'s toEncorePage, AMENDMENT 1's words). */}
        <section className="kitx-section kitx-section-first">
          <div className="wrap kitx-flow">
            <h2 className="kit-h2">What happens in the Playground</h2>
            <ul className="kit-list">
              <li>A live video call with Love, right after the reading</li>
              <li>Camera and mic: come up and talk with her</li>
              <li>With every membership, from Weekly Intuitive up, or a one-week pass</li>
            </ul>
          </div>
        </section>

        {/* THE HOST — her real portrait and words, with the one button
            back to the reading (compose()'s host row). */}
        <section className="kitx-section">
          <div className="wrap">
            <div className="kitx-host">
              <div className="kitx-photo">
                <img src="/images/love-sidelook.webp" alt="Love" width={519} height={676} />
              </div>
              <div className="kit-stack">
                <h2 className="kit-h2">Love</h2>
                <p className="kit-text-quiet">Founder of One Cocreation</p>
                <p className="kit-body">Join me weekly for a live book reading in my own room.</p>
                <div className="kit-btn-row">
                  <a className="kit-btn kit-btn-main kit-btn-sm" href="/reading">
                    Back to the reading
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
