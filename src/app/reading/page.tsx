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
import ReadingStageDeck from "@/components/reading/ReadingStageDeck";
import { ReadingPartProvider } from "@/components/reading/ReadingPartContext";
import ReadingSignInBox from "@/components/rooms/ReadingSignInBox";
import ReadingDay from "@/components/reading/ReadingDay";
import { sessionsFromCookieHeader } from "@/lib/member-auth";
import { getSiteConfig } from "@/lib/site-config";
import { nextReading, DEFAULT_READING_SCHEDULE, type ReadingSchedule } from "@/lib/reading-schedule";
import { HOUSEWARMING_TIME, ENCORE_TIME, QA_TIME, sameDayAt, clockWords } from "@/lib/reading-day";
import { encoreFloorDoor, qaDoor } from "@/lib/reading-day-doors";
import { getStage1State } from "@/lib/stage1";
import { getStage2State } from "@/lib/stage2";
import { getQaState, IDLE as QA_IDLE } from "@/lib/qa-door";
import { getHousewarmingState, IDLE as HOUSEWARMING_IDLE } from "@/lib/housewarming-door";
import { STAGE2_FLOOR_NAME, STAGE2_MIN_TIER } from "@/lib/stage2-access";
import { tierForSubject } from "@/lib/member-tier";
import { tierSatisfies, type Tier } from "@/lib/entitlement";
import { defaultReadingPart, parseReadingPart, type PartDoorInfo, type ReadingPart } from "@/lib/reading-parts";

/**
 * TASK-391 (block 968,088) + TASK-438 (block 968,222; HOLD LIFTED block
 * 968,269) — THE READING PAGE, now the STAGE itself. `/reading` opens on
 * the approved round-3 sky band (the house living sky + the home hero's
 * own drifting nebula, one shared rule): the derived kicker, "Read with
 * Love", the blocks countdown, and ReadingStage — phase-only SSR (the
 * phase from `getStage1State()`, never a room, never a host URL). The
 * three old room CTAs are RETIRED — there is no second door anywhere on
 * this page.
 *
 * TASK-471 (block 968,624) — Stage 1 is TWO-WAY now and mounts IN PLACE
 * (ReadingStage's own two-way embed, `JitsiRoom`) when published and the
 * visitor is signed in; the page's own `session` read (below) is threaded
 * through as `signedIn` so the island knows without a client-side guess.
 *
 * TASK-471 / S8 (block 968,624, VERDICT-968624.md's Saturday reality list)
 * — the top-of-page countdown targets the day's FIRST part, the
 * Housewarming at 12:12 (`HOUSEWARMING_TIME`, reading-day.ts — the same
 * constant the agenda brick's Row 1 already reads), never
 * `schedule.time` (the Reading's own, admin-editable clock — Row 2's own
 * time, ReadingDayBody.tsx, untouched). This is a deliberate DECOUPLING,
 * not a workaround for Love's mis-typed schedule save: no matter what
 * clock reading `schedule.time` itself holds, the hero countdown always
 * counts to 12:12 on the reading's own day, because that is the first
 * thing that happens.
 * `deriveReading`'s own `housewarmingNext` reuses `nextReading()`'s pure
 * walk against a schedule-shaped object with the SAME weekday/tz/
 * durationMin/on, only `time` swapped — never a second date-math
 * implementation.
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
 *
 * TASK-473 (block 968,624, the Admiral's flow ruling) — "for the end user
 * they will stay on /reading ... users can have a button that shows the
 * next room is open." The whole page now sits inside ONE
 * `ReadingPartProvider` (client selection state, shared by the stage band
 * and the agenda brick below it — the one client boundary a server page
 * needs for this). `ReadingStageDeck` replaces the bare `ReadingStage`
 * mount: it shows whichever of the four parts is selected, defaulting
 * (server-computed, once, at first paint) to the part whose door is open
 * — the latest opened — else the next part by time (`defaultReadingPart`,
 * reading-parts.ts). Parts 3 and 4 get their own small screens
 * (`ReadingStagePart3`/`4`) fed the same server-derived entitlement/price
 * data the agenda rows already use (`encoreFloorDoor()`/`qaDoor()` —
 * called again here, not threaded through ReadingDay.tsx, so that
 * component's own tested shape stays untouched).
 *
 * TASK-481 (block 968,624+, the Admiral's ruling: "was there going to be
 * 4 rooms … we spoke about one line per meeting time") — Part 1 (the
 * Housewarming, 12:12) gets its OWN door and its own small screen now
 * (`ReadingStagePart1`, free — no entitlement data to fetch), read via
 * `getHousewarmingState()` the same fail-closed way `qaState` above
 * already is. Part 2 (the Reading) keeps Stage 1's door alone.
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
function deriveReading(schedule: ReadingSchedule): {
  asOfMs: number;
  next: { startsAtMs: number; endsAtMs: number; phase: "upcoming" | "window" } | null;
  /** S8 (block 968,624) — the hero countdown's OWN target: the
   *  Housewarming (12:12), never `schedule.time`. See the module docblock. */
  housewarmingNext: { startsAtMs: number; endsAtMs: number; phase: "upcoming" | "window" } | null;
} {
  const asOfMs = Date.now();
  const next = schedule.on ? nextReading(schedule, asOfMs) : null;
  const housewarmingNext = schedule.on ? nextReading({ ...schedule, time: HOUSEWARMING_TIME }, asOfMs) : null;
  return { asOfMs, next, housewarmingNext };
}

/** TASK-489: the top-of-page countdown's end instant (the Housewarming,
 *  12:12), or null while the PREVIOUS reading day's program is still
 *  running (12:12 through the Q&A, DAY_PROGRAM_MS). Without this, a reload
 *  after 12:12 would count down to next week above the Book Talk and Q&A.
 *  Weekly schedule, so the previous day is one week back (plain arithmetic;
 *  a DST hour either side changes nothing at this length). */
const WEEK_MS = 7 * 24 * 3600_000;
const DAY_PROGRAM_MS = 5 * 3600_000;
function topCountdownUntilMs(housewarmingNext: { startsAtMs: number; phase: "upcoming" | "window" } | null, asOfMs: number): number | null {
  if (!housewarmingNext || housewarmingNext.phase !== "upcoming") return null;
  const previousStartMs = housewarmingNext.startsAtMs - WEEK_MS;
  if (asOfMs < previousStartMs + DAY_PROGRAM_MS) return null;
  return housewarmingNext.startsAtMs;
}

export default async function ReadingPage({
  searchParams,
}: {
  /* TASK-480 — the ONE deep link every reading-part pill (the member
     calendar's own, `readingPartHref`) points at: `/reading?part=N#stage`.
     `parseReadingPart` validates it (1-4 only, else `null`) before it
     ever overrides the door-based default computed below. */
  searchParams: Promise<{ part?: string }>;
}) {
  const requestedPart = parseReadingPart((await searchParams).part);

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
  const { asOfMs, next, housewarmingNext } = deriveReading(schedule);
  /* K122 item 7 — the occurrence AFTER next: the island's ended words
     name the next reading, never the one that just ended (a visitor who
     loaded before or during the window holds TODAY'S occurrence in next) */
  const following = next ? nextReading(schedule, next.endsAtMs) : null;
  const stage1State = await getStage1State();
  const stage1Phase = stage1State.phase;

  const recurrenceLabel = next ? weekdayName(next.startsAtMs, schedule.tz) : null;

  /* TASK-466 (block 968,561, ruling 1) — the ended card's "Watch part two"
     link needs to know whether THIS visitor already clears the book
     talk's own floor, so someone below it sees the lock + the floor's
     name instead of a bare door. Computed the exact way
     `/api/stage2/route.ts`'s GET does (`tierForSubject` then
     `tierSatisfies` against `STAGE2_MIN_TIER`, the one place that floor
     is written) — never re-implemented, and it fails CLOSED: any throw
     reads locked. */
  const floorName = STAGE2_FLOOR_NAME; // TASK-465: the floor name comes from stage2-access.ts only
  let tier: Tier | null = null;
  if (session) {
    try {
      tier = await tierForSubject(`${session.handle}@${session.space}`);
    } catch {
      tier = null; // fail closed — a throw is never read as an open door
    }
  }
  const encoreEntitled = tierSatisfies(tier, STAGE2_MIN_TIER);
  const playgroundLock = { locked: !encoreEntitled, floorName };

  /* TASK-473 (block 968,624) — Part 3's own price/door data, the SAME
     derivation ReadingDay.tsx already calls (never re-derived; called
     again here rather than threaded through that file so its own tested
     prop shape stays untouched). Part 4's `qaOffer` too — its own gate
     (owned or not) now comes from `/api/qa-door`'s wire, client-side
     (ReadingStageDoor), never a server tier read on this page. */
  const [encoreFloor, qaOffer] = await Promise.all([encoreFloorDoor(), qaDoor()]);

  /* TASK-473 — the default selection: "the part whose door is open (the
     latest opened), else the next part by time" (ACTIONS.md item 2).
     Stage 2's and the Q&A door's own state are read directly (server
     functions, never the public routes) so `openedAtMs` is a real
     timestamp, not a guess. */
  const encoreStartsAtMs = next ? sameDayAt(next.startsAtMs, schedule.tz, ENCORE_TIME) : null;
  const qaStartsAtMs = next ? sameDayAt(next.startsAtMs, schedule.tz, QA_TIME) : null;
  const housewarmingStartsAtMs = next ? sameDayAt(next.startsAtMs, schedule.tz, HOUSEWARMING_TIME) : null;
  let defaultPart: ReadingPart = 1;
  if (next && encoreStartsAtMs !== null && qaStartsAtMs !== null && housewarmingStartsAtMs !== null) {
    const stage2State = await getStage2State();
    /* fix round (block 968,624) — fails CLOSED on a throw: a broken vault
       reads as the Q&A door's own IDLE (closed), never a guessed-open
       door. getQaState() already fails closed internally (the same
       createDoorLifecycle law stage1/stage2 keep); this catch is
       belt-and-braces against a future regression, the same defensive
       shape the stage1 route keeps around a call built never to throw. */
    let qaState = QA_IDLE;
    try {
      qaState = await getQaState();
    } catch {
      qaState = QA_IDLE;
    }
    /* TASK-481 (block 968,624+): Part 1's open truth is the Housewarming's
       OWN door now, never Stage 1's `phase` (Part 2's own truth alone) —
       the exact fail-closed idiom `qaState` above already keeps.
       `getHousewarmingState()` already fails closed internally (the same
       `createDoorLifecycle` law every door keeps); this catch is
       belt-and-braces against a future regression. */
    let housewarmingState = HOUSEWARMING_IDLE;
    try {
      housewarmingState = await getHousewarmingState();
    } catch {
      housewarmingState = HOUSEWARMING_IDLE;
    }
    const doors: PartDoorInfo[] = [
      { part: 1, title: "The Housewarming", startsAtMs: housewarmingStartsAtMs, open: housewarmingState.phase === "published", openedAtMs: housewarmingState.publishedAtMs },
      { part: 2, title: "The Reading", startsAtMs: next.startsAtMs, open: stage1Phase === "published", openedAtMs: stage1State.publishedAtMs },
      { part: 3, title: "The Book Talk", startsAtMs: encoreStartsAtMs, open: stage2State.phase === "published", openedAtMs: stage2State.publishedAtMs },
      { part: 4, title: "The Q&A", startsAtMs: qaStartsAtMs, open: qaState.phase === "published", openedAtMs: qaState.publishedAtMs },
    ];
    defaultPart = defaultReadingPart(doors, asOfMs);
  }
  /* TASK-480 — an explicit `?part=` always wins over the door-based
     default above: a visitor who followed a deep link (the member
     calendar's own pills) asked for THAT part, not whichever one the
     doors would otherwise pick. */
  if (requestedPart !== null) defaultPart = requestedPart;

  return (
    <>
      <SiteHeader />
      <PaletteVars />
      {/* TASK-473 (block 968,624) — ONE selection, shared by the stage band
          and the agenda below it; the ONE client boundary this server page
          needs. Default computed above, once, at first paint. */}
      <ReadingPartProvider defaultPart={defaultPart}>
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
                  goes live. TASK-473: the deck shows whichever of the four
                  parts is selected — "the video changes to the correct
                  one" (the Admiral's own words). */}
              <ReadingStageDeck
                stage1={{
                  initialPhase: stage1Phase,
                  signedIn: !!session,
                  next,
                  following,
                  scheduleTz: schedule.tz,
                  jitsiDomain: config.meeting.jitsiDomain,
                  /* S8 (block 968,624): the Housewarming's own schedule
                     variant — same weekday/tz/durationMin/on, `time`
                     swapped to HOUSEWARMING_TIME — never the raw
                     `schedule`/`next` (those still drive Row 2,
                     ReadingDayBody.tsx, and the ended card's date words,
                     unchanged). */
                  countdown: (
                    <ReadingHeroCountdown
                      schedule={{ ...schedule, time: HOUSEWARMING_TIME }}
                      next={housewarmingNext}
                      asOfMs={asOfMs}
                      variant="blocks"
                    />
                  ),
                  countdownWhen: (
                    <ReadingHeroCountdown
                      schedule={{ ...schedule, time: HOUSEWARMING_TIME }}
                      next={housewarmingNext}
                      asOfMs={asOfMs}
                      variant="blocks"
                      whenOnly
                    />
                  ),
                  playgroundLock,
                  /* fix round (block 968,624, the Admiral's Chrome walk) —
                     the stage chip's own label, the SAME string Row 1/2's
                     own bold title reads (ReadingDayBody.tsx) — never a
                     second literal. Null only when the schedule is off. */
                  housewarmingLabel: housewarmingStartsAtMs !== null ? `${clockWords(housewarmingStartsAtMs, schedule.tz)} · The Housewarming` : null,
                  readingLabel: next !== null ? `${clockWords(next.startsAtMs, schedule.tz)} · The Reading` : null,
                }}
                part1={{
                  jitsiDomain: config.meeting.jitsiDomain,
                  whenWords: housewarmingStartsAtMs !== null ? clockWords(housewarmingStartsAtMs, schedule.tz) : null,
                }}
                part3={{
                  jitsiDomain: config.meeting.jitsiDomain,
                  encoreFloor,
                  whenWords: encoreStartsAtMs !== null ? clockWords(encoreStartsAtMs, schedule.tz) : null,
                }}
                part4={{
                  jitsiDomain: config.meeting.jitsiDomain,
                  qaOffer,
                  whenWords: qaStartsAtMs !== null ? clockWords(qaStartsAtMs, schedule.tz) : null,
                }                /* TASK-489 (reading day): the countdown back at the top of
                   the page on every screen, until the Housewarming (12:12). */
                countdownUntilMs={topCountdownUntilMs(housewarmingNext, asOfMs)}
                asOfMs={asOfMs}
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
              the four rows lives in its own files, never here. */}
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
                {/* T-454: the real floor, in the book talk's own words —
                    "any membership" read true to a free Heart Field member who
                    then met the paid gate (this page stays free of the paywall's
                    logic, so the name rides as words). TASK-465 (block
                    968,561): the floor name is DERIVED off Stage 2's own
                    floor (stage2-access.ts's STAGE2_FLOOR_NAME — a plain
                    name read, no entitlement lookup imported here directly,
                    keeping this page's own house law clean) — the Admiral
                    raised the floor to Observer, so a literal "Weekly
                    Intuitive" would now be wrong. */}
                {/* TASK-471/472 (block 968,624): the one-week-pass clause is
                    retired — that was stage2-access.ts's shared membership
                    taster (its own derivation lives in week-pass.ts), never
                    offered on /reading any more (reading-day-doors.ts's own
                    docblock). The book talk row below names its own pass
                    instead. TASK-473 (block 968,624): "the Playground" word
                    is retired from this line too — no "Encore"/"Playground"
                    survives anywhere in /reading's visible copy. */}
                <li>{`Join the discussion after: a live group video call with Love, with every membership from ${STAGE2_FLOOR_NAME} up`}</li>
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
      </ReadingPartProvider>
      {/* FOOTER — the real SiteFooter, exactly as home mounts it
          (src/app/page.tsx:65/:88); never a page-local reimplementation. */}
      <SiteFooter />
    </>
  );
}
