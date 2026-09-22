/* eslint-disable @next/next/no-img-element -- reuses the existing headshot
   asset exactly as sections.tsx's About() does; not an optimizer candidate. */
import type { Metadata } from "next";
import { headers } from "next/headers";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PaletteVars from "@/components/PaletteVars";
import ReadingHeroCountdown from "@/components/ReadingHeroCountdown";
import { sessionsFromCookieHeader } from "@/lib/member-auth";
import { getSiteConfig } from "@/lib/site-config";
import { nextReading, DEFAULT_READING_SCHEDULE, type ReadingSchedule } from "@/lib/reading-schedule";
import { readingDoorHref } from "@/lib/reading-room";
import { cartridge } from "@/brand/cartridge";

/**
 * TASK-391 (block 968,088) — THE SATURDAY READING PAGE. One new public page
 * at `/reading`: Love's weekly live book reading, structured after the
 * Kajabi reference's SHAPE alone (§14.3.1 — never its words or images).
 * Every date/time word here is COMPUTED from the schedule source
 * (`reading-schedule.ts`) — never a literal weekday or clock time; Love
 * retypes the day at `/a/site/reading` and this page follows, no redeploy.
 *
 * Freshness (Astra fold 3, RULED): DYNAMIC, not cached — the exact
 * `force-dynamic` pattern `src/app/rooms/[slug]/page.tsx:22` already uses —
 * so `getSiteConfig()` runs fresh on every request and a saved schedule
 * change shows on the very next reload.
 *
 * Decision C (AMENDED): `feat/task-388-reading-sign-up-block` is unmerged
 * at cut time (zero commits ahead of main) — the page ships with the
 * reading-door CTA alone, no second door.
 */

export const metadata: Metadata = {
  title: "Read with Love — One Cocreation",
  description: "Join Love's weekly live book reading — the day, the countdown, and one door in.",
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
     token fails its own signature, home page.tsx's TASK-210 finding). */
  const session = sessionsFromCookieHeader((await headers()).get("cookie"))[0] ?? null;
  const signedIn = !!session;

  const config = await getSiteConfig();
  const schedule = config.reading ?? DEFAULT_READING_SCHEDULE;
  const { asOfMs, next } = deriveReading(schedule);

  const door = readingDoorHref(signedIn);
  const ctaLabel = signedIn ? "Enter the reading room" : "Sign in to join";
  const recurrenceLabel = next ? weekdayName(next.startsAtMs, schedule.tz) : null;

  const cta = door && (
    <div className="kit-btn-row kitx-actions">
      <a className="kit-btn kit-btn-main kit-btn-sm" href={door}>
        {ctaLabel}
      </a>
    </div>
  );

  return (
    <>
      <SiteHeader />
      <PaletteVars />
      <main className="center kitx-balanced">
        {/* HERO — title, the computed date line (or the honest off/soon
            words, decisions A/B), one CTA (item 2). */}
        <section className="wrap kitx-flow">
          <h1 className="kit-h1">Read with Love</h1>
          <ReadingHeroCountdown schedule={schedule} next={next} asOfMs={asOfMs} variant="hero" />
          {cta}
        </section>

        {/* PREMISE + the "Next reading." card (items 3/4) — Love's video
            explanation and the mobile graphic are NEW, believed assets not
            yet delivered; both slots render nothing at all (honest
            absence), never a placeholder box. */}
        <section className="wrap kitx-flow">
          <h2 className="kit-h2">Join me weekly</h2>
          <p className="kit-body">
            Join me weekly for a live book reading in my own room. Sign in and the room knows you. It will all be
            right here.
          </p>

          <div className="kit-card kit-card-body kitx-flow">
            <ReadingHeroCountdown schedule={schedule} next={next} asOfMs={asOfMs} variant="card" />
            {recurrenceLabel && (
              <p className="kit-body">{`Every ${recurrenceLabel}, live in Love’s room — free for every member.`}</p>
            )}
            {door && (
              <div className="room-card-doors">
                <div className="kit-btn-row kitx-actions">
                  <a className="kit-btn kit-btn-main kit-btn-sm" href={door}>
                    {ctaLabel}
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* WHAT YOU WILL EXPERIENCE (item 5) — the recurrence item is
            DERIVED from the schedule's own weekday (never the mock's own
            hard-coded recurrence phrasing); derive-or-dash when off (no
            next occurrence to name a weekday from). The other three are
            the mock's own words, unchanged. */}
        <section className="wrap kitx-flow">
          <h2 className="kit-h2">What you will experience</h2>
          <ul className="feat">
            <li>A live book reading</li>
            {recurrenceLabel && <li>{`Every ${recurrenceLabel}`}</li>}
            <li>Live in Love’s room</li>
            <li>Free for every member</li>
          </ul>
          {cta}
        </section>

        {/* THE HOST (item 6) — existing site imagery only (the same square
            headshot About()'s own story section already uses), never the
            Kajabi page's. */}
        <section className="wrap kitx-flow">
          <div className="kitx-mark">
            <img src={cartridge.portraits.headshot} alt="Love — founder of One Cocreation" width={88} height={88} />
          </div>
          <div className="kit-stack">
            <h2 className="kit-h2">Love</h2>
            <p className="kit-body">Founder of One Cocreation</p>
            <p className="kit-body">Join me weekly for a live book reading in my own room.</p>
          </div>
        </section>
      </main>
      {/* FOOTER (item 7) — the real SiteFooter, exactly as home mounts it
          (src/app/page.tsx:65/:88); never a page-local reimplementation. */}
      <SiteFooter />
    </>
  );
}
