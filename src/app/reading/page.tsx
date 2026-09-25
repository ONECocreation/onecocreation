/* eslint-disable @next/next/no-img-element -- the host portrait is an
   existing house asset, exactly as sections.tsx's About() uses its own;
   not an optimizer candidate. */
import type { Metadata } from "next";
import { headers } from "next/headers";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PaletteVars from "@/components/PaletteVars";
import CosmicSky from "@/components/CosmicSky";
import ReadingHeroCountdown from "@/components/ReadingHeroCountdown";
import ReadingStage from "@/components/reading/ReadingStage";
import ReadingSignInBox from "@/components/rooms/ReadingSignInBox";
import ReadingDay from "@/components/reading/ReadingDay";
import { sessionsFromCookieHeader } from "@/lib/member-auth";
import { getSiteConfig } from "@/lib/site-config";
import { nextReading, DEFAULT_READING_SCHEDULE, type ReadingSchedule } from "@/lib/reading-schedule";
import { getStage1State } from "@/lib/stage1";
import { deriveWeekPass } from "@/lib/week-pass";
import { STAGE2_FLOOR_NAME, STAGE2_MIN_TIER } from "@/lib/stage2-access";
import { tierForSubject } from "@/lib/member-tier";
import { tierSatisfies } from "@/lib/entitlement";

/**
 * TASK-391 (block 968,088) + TASK-438 (block 968,222; HOLD LIFTED block
 * 968,269) — THE READING PAGE, now the STAGE itself. `/reading` opens on
 * the approved round-3 sky band (the house living sky + the home hero's
 * own drifting nebula, one shared rule): the derived kicker, "Read with
 * Love", the blocks countdown, and ReadingStage — Stage 1 as a one-way
 * house Jitsi room, phase-only SSR (the phase from `getStage1State()`,
 * never a room, never a host URL). The three old room CTAs are RETIRED —
 * there is no second door anywhere on this page.
 *
 * Under the band: the public "Stay in the know" sign-up (M4 — the
 * letters, never a door), "What you will experience" as M3's three lines
 * (the weekday DERIVED, the pass price from the live store item), and the
 * host with her real portrait. Every date/time word is still COMPUTED
 * from the schedule source — never a literal weekday or clock time.
 *
 * Freshness (Astra fold 3, RULED): DYNAMIC, not cached — the exact
 * `force-dynamic` pattern `src/app/rooms/[slug]/page.tsx:22` already
 * uses — so `getSiteConfig()` and `getStage1State()` run fresh on every
 * request and a saved schedule change (or a Publish) shows on the very
 * next reload.
 */

export const metadata: Metadata = {
  title: "Read with Love — One Cocreation",
  description: "Join Love's weekly live book reading — the day, the countdown, and the stage itself.",
};

export const dynamic = "force-dynamic";

const WEEKDAY_LABEL: Intl.DateTimeFormatOptions = { weekday: "long" };

function weekdayName(instantMs: number, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...WEEKDAY_LABEL }).format(new Date(instantMs));
}

/* Kept out of ReadingPage's own body so the purity rule never meets
 * Date.now() (rooms/[slug]/page.tsx's own computeReading idiom,
 * :32-46 — "kept out of RoomPage's own body so the purity rule never
 * meets Date.now()"). One clock read feeds both `next` and the value
 * ReadingHeroCountdown's first paint buckets against. */
function deriveReading(
  schedule: ReadingSchedule,
): { asOfMs: number; next: { startsAtMs: number; endsAtMs: number; phase: "upcoming" | "window" } | null } {
  const asOfMs = Date.now();
  const next = schedule.on ? nextReading(schedule, asOfMs) : null;
  return { asOfMs, next };
}

export default async function ReadingPage() {
  /* The same raw-cookie session read every public page with a signed-in
     variant already does (rooms/[slug]/page.tsx:82, home page.tsx:34) —
     never cookies() (it URL-encodes an email handle's own "@" and the
     token fails its own signature, home page.tsx's TASK-210 finding).
     The page itself renders no signed-in BRANCH of its own — the islands
     read their own session client-side — but the read stays: the
     response is honestly per-visitor, the house idiom every public page
     keeps. TASK-466 (block 968,561) is the one exception: `session` now
     also feeds the ended card's Playground-entitlement read below. */
  const session = sessionsFromCookieHeader((await headers()).get("cookie"))[0] ?? null;

  const config = await getSiteConfig();
  const schedule = config.reading ?? DEFAULT_READING_SCHEDULE;
  const { asOfMs, next } = deriveReading(schedule);
  /* K122 item 7 — the occurrence AFTER next: the island's ended words
     name the next reading, never the one that just ended (a visitor who
     loaded before or during the window holds TODAY'S occurrence in next) */
  const following = next ? nextReading(schedule, next.endsAtMs) : null;
  const stage1Phase = (await getStage1State()).phase;
  const weekPass = await deriveWeekPass();

  const recurrenceLabel = next ? weekdayName(next.startsAtMs, schedule.tz) : null;

  /* TASK-466 (block 968,561, ruling 1) — the ended card's "Watch part two
     in the Playground" link needs to know whether THIS visitor already
     clears the Playground's own floor, so someone below it sees the lock
     + the floor's name instead of a bare door. Computed the exact way
     `/api/stage2/route.ts`'s GET does (`tierForSubject` then
     `tierSatisfies` against `STAGE2_MIN_TIER`, the one place that floor
     is written) — never re-implemented, and it fails CLOSED: any throw
     reads locked. This is display only; the link always goes to
     /reading/playground, which re-decides for real (the same "words, not
     a gate" idiom the Playground page's own band already keeps). */
  const floorName = STAGE2_FLOOR_NAME; // TASK-465: the floor name comes from stage2-access.ts only
  let playgroundLocked = true;
  if (session) {
    try {
      const tier = await tierForSubject(`${session.handle}@${session.space}`);
      playgroundLocked = !tierSatisfies(tier, STAGE2_MIN_TIER);
    } catch {
      playgroundLocked = true;
    }
  }
  const playgroundLock = { locked: playgroundLocked, floorName };

  return (
    <>
      <SiteHeader />
      <PaletteVars />
      <main className="center kitx-balanced">
        {/* THE STAGE BAND — the approved round-3 look: the house living
            sky + the home hero's own nebula (one shared kit rule), the
            derived kicker, the blocks countdown, and the stage itself. */}
        <section className="keep-dark sky-veil sky-stage sky-nebula" id="stage">
          <CosmicSky />
          <div className="wrap kitx-flow">
            <p className="kicker">{recurrenceLabel ? `Live every ${recurrenceLabel} · free` : "Readings with Love · free"}</p>
            <h1 className="kit-h1">Read with Love</h1>
            {/* the countdown rides INSIDE the island now (K122 item 6a —
                the server-composed-nodes idiom): only the island knows the
                phase, so only it can stop the counting when the stage
                goes live */}
            <ReadingStage
              initialPhase={stage1Phase}
              next={next}
              following={following}
              scheduleTz={schedule.tz}
              jitsiDomain={config.meeting.jitsiDomain}
              countdown={<ReadingHeroCountdown schedule={schedule} next={next} asOfMs={asOfMs} variant="blocks" />}
              countdownWhen={<ReadingHeroCountdown schedule={schedule} next={next} asOfMs={asOfMs} variant="blocks" whenOnly />}
              playgroundLock={playgroundLock}
            />
          </div>
        </section>

        {/* SIGN ME UP · KEEP ME POSTED (TASK-468, block 968,561) — one box,
            never gated on schedule.on/next (K122 item 13's law carries
            over: the one door that works without a date); email + code,
            never a navigation away from /reading. */}
        <section className="kitx-section kitx-section-first">
          <div className="wrap">
            <ReadingSignInBox />
          </div>
        </section>

        {/* THE DAY'S AGENDA (TASK-467, block 968,561) — Love's own words on
            the call: "put this whole room brick right in the other on the
            weekly reading page … with three buttons of the times." One
            bare mount, no props: ReadingDay reads the session, the
            schedule and the live store on its own — every decision behind
            the three rows lives in its own files, never here. */}
        <section className="kitx-section">
          <div className="wrap">
            <ReadingDay />
          </div>
        </section>

        {/* WHAT YOU WILL EXPERIENCE — M3's three lines: the weekday
            DERIVED (never the mock's literal), the clock living once at
            the top, the pass price from the live store item. */}
        <section className="kitx-section">
          <div className="wrap kitx-flow">
            <h2 className="kit-h2">What you will experience</h2>
            <ul className="kit-list">
              <li>{recurrenceLabel ? `Every ${recurrenceLabel}, a live reading from Love's book` : "A live reading from Love's book"}</li>
              <li>Free to watch from anywhere. Nothing to install</li>
              {/* T-454: the real floor, in the Playground page's own words —
                  "any membership" read true to a free Heart Field member who
                  then met the paid gate (this page stays free of the paywall's
                  logic, so the name rides as words, as the Playground's list does).
                  TASK-465 (block 968,561): the floor name is DERIVED off
                  Stage 2's own floor (stage2-access.ts's STAGE2_FLOOR_NAME —
                  a plain name read, no entitlement lookup imported here
                  directly, keeping this page's own house law clean) — the
                  Admiral raised the floor to Observer, so a literal
                  "Weekly Intuitive" would now be wrong. */}
              <li>{`Join the discussion after: the Playground, a live group video call with Love, with every membership from ${STAGE2_FLOOR_NAME} up${weekPass ? `, or a ${weekPass.price} one-week pass` : ""}`}</li>
            </ul>
          </div>
        </section>

        {/* THE HOST — the real portrait beside her words, and the one
            bottom button back UP to the stage (Stage 1, never Stage 2). */}
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
                  <a className="kit-btn kit-btn-main kit-btn-sm" href="#stage">
                    Back to the reading
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      {/* FOOTER — the real SiteFooter, exactly as home mounts it
          (src/app/page.tsx:65/:88); never a page-local reimplementation. */}
      <SiteFooter />
    </>
  );
}
