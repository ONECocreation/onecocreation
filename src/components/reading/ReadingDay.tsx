import { headers } from "next/headers";
import { sessionsFromCookieHeader } from "@/lib/member-auth";
import { tierForSubject } from "@/lib/member-tier";
import { tierSatisfies, type Tier } from "@/lib/entitlement";
import { getSiteConfig } from "@/lib/site-config";
import { nextReading, DEFAULT_READING_SCHEDULE, type ReadingSchedule } from "@/lib/reading-schedule";
import { STAGE2_MIN_TIER } from "@/lib/stage2-access";
import { HOUSEWARMING_TIME, ENCORE_TIME, QA_TIME, sameDayAt } from "@/lib/reading-day";
import { encoreFloorDoor, qaDoor } from "@/lib/reading-day-doors";
import { qaEntitled } from "@/lib/qa-entitlement";
import ReadingDayBody from "./ReadingDayBody";

/**
 * THE READING DAY BRICK'S SERVER WRAPPER (TASK-467, block 968,561) — the
 * ONLY thing `/reading` mounts for this lane (one import, one bare
 * `<ReadingDay />`, no props — see `src/app/reading/page.tsx`). Reads the
 * session the exact idiom the page itself already does
 * (`sessionsFromCookieHeader((await headers()).get("cookie"))[0]`,
 * `/reading/page.tsx`), and resolves it to a paid-package standing the
 * exact idiom `/api/stage2`'s own GET does (`tierForSubject`,
 * `\`${session.handle}@${session.space}\``) — the ONE gate every tier
 * check on this site funnels through (`member-tier.ts`'s own docblock).
 *
 * FAILS CLOSED: a thrown membership check reads as no standing at all —
 * both the Encore and the Q&A row lock, never open on a guess (mirrors
 * `/api/stage2`'s own 503-on-throw ruling, just without a status code to
 * carry here — a display card has no response to refuse).
 *
 * No date published (`schedule.on` false, or nothing next) is an honest
 * absence for THIS card — it renders nothing, the same "off renders
 * nothing" law `ReadingHeroCountdown`'s `blocks` variant already keeps
 * (K122 item 13's exception is the letters box alone; this brick needs a
 * day to hang its three times on).
 */

/* Kept out of ReadingDay's own body so the purity rule never meets
 * Date.now() (the exact reading/page.tsx idiom, `deriveReading` there). */
function deriveNext(schedule: ReadingSchedule) {
  return schedule.on ? nextReading(schedule, Date.now()) : null;
}

export default async function ReadingDay() {
  const session = sessionsFromCookieHeader((await headers()).get("cookie"))[0] ?? null;

  const config = await getSiteConfig();
  const schedule = config.reading ?? DEFAULT_READING_SCHEDULE;
  const next = deriveNext(schedule);
  if (!next) return null;

  const subject = session ? `${session.handle}@${session.space}` : null;
  let tier: Tier | null = null;
  if (subject) {
    try {
      tier = await tierForSubject(subject);
    } catch {
      tier = null; // fail closed — a throw is never read as an open door
    }
  }

  const [encoreFloor, qaOffer] = await Promise.all([encoreFloorDoor(), qaDoor()]);
  /* TASK-475 (block 968,624, the show stopper): the Q&A pass carries no
     entitlementTier/entitlementDays on its own — tier C alone (Evening
     Star, "Coming soon") locked out every buyer. qaEntitled adds the
     settled, non-refunded Q&A order as a second, equal way in. A
     signed-out visitor has no subject to check an order against — no
     order lookup even runs, same as tierSatisfies(null, "C") before. */
  const hasQaAccess = subject ? await qaEntitled(subject, tier) : false;

  return (
    <ReadingDayBody
      tz={schedule.tz}
      housewarmingStartsAtMs={sameDayAt(next.startsAtMs, schedule.tz, HOUSEWARMING_TIME)}
      readingStartsAtMs={next.startsAtMs}
      encoreStartsAtMs={sameDayAt(next.startsAtMs, schedule.tz, ENCORE_TIME)}
      qaStartsAtMs={sameDayAt(next.startsAtMs, schedule.tz, QA_TIME)}
      signedIn={!!session}
      encoreEntitled={tierSatisfies(tier, STAGE2_MIN_TIER)}
      encoreFloor={encoreFloor}
      qaEntitled={hasQaAccess}
      qaOffer={qaOffer}
    />
  );
}
