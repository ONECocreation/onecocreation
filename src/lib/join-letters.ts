import { sendMail, capRemaining, onceWithin, type OutgoingMail } from "@/lib/mail";
import {
  isSubscribed,
  isOptedOut,
  listSubscribersByTag,
  siteBase,
  unsubscribeUrl,
  READING_SEAT_TAG,
  type SubscriberRecord,
} from "@/lib/subscribers";
import { getSiteConfig } from "@/lib/site-config";
import { nextReading, DEFAULT_READING_SCHEDULE, type ReadingSchedule } from "@/lib/reading-schedule";
import { listBookings } from "@/lib/booking-orders";
import { dueOccurrenceNow } from "@/lib/reading-letters";
import { letterFor } from "@/lib/pwyc-letters";

/**
 * TASK-519 (K131, from the Love/Shawnah call) — THE JOIN LETTERS. Before
 * every live session each seat holder gets ONE letter — the ONE link,
 * the start time in the reader's own zone when known, and the three
 * plain lines (open on computer or phone, press Allow for the camera
 * and the microphone, if it says no refresh once) — plus a second short
 * letter once the session has started. Two seeded letters,
 * `join-reminder` and `join-start`, composed through `letterFor` with
 * the {{session}}/{{when}}/{{link}} slots (decision 1: seeded letters
 * with placeholder slots, never a composed letter — composed letters
 * cannot carry placeholders, the slots route says so in words).
 *
 * The discipline is the reading-letters R1-R5 shape, deliberately:
 *  - DIRECT sends through `sendMail("news", …)`, never the queue (R1 —
 *    on the Vercel-only cadence a queued letter can wait a day).
 *  - The ruled send order capacity → subscribed → claim → send (R2/R4):
 *    `isSubscribed` immediately before every send, `capRemaining()`
 *    before the claim so a spent meter leaves the once-key unburned and
 *    the very next tick is the retry.
 *  - Per-recipient once-keys via `onceWithin` (R3 — best-effort
 *    at-most-once, fails OPEN on a KV error):
 *      join-reminder:reading:<startsAtMs>:<email>   (7 days)
 *      join-start:reading:<startsAtMs>:<email>      (7 days)
 *      join-reminder:booking:<bookingId>            (7 days, one soul)
 *      join-start:booking:<bookingId>               (7 days, one soul)
 *  - The reading's reminder gate IS `dueOccurrenceNow` — the day-of
 *    gate's ONE shared due-check (R5's schedule policy included), never
 *    a second policy. The start letter is due while
 *    `nowMs - startsAtMs` is in [0, 45min), read off `nextReading`'s
 *    window phase; a start letter that misses its window is NOT sent
 *    late ("the room is open" at 20 minutes past is help, at 5 hours
 *    is noise — decision 5).
 *  - Bookings: confirmed only, `customer.email` and `meetingUrl`
 *    present only (never a link-less letter), the reminder due while
 *    `startUtc - nowMs` is in (0, 24h].
 *
 * THE CADENCE HONESTY (decision 5, stated plainly): with only the three
 * Vercel crons live (15:00, 08:05, 09:05 UTC) the start letter will
 * usually NOT land inside its 45-minute window and will simply not
 * send; it becomes real where the VPS 10-minute tick (or an operator's
 * send-now habit) is real. No letter words and no room row ever promise
 * a minute.
 *
 * The weekly member meetup DOES NOT EXIST IN CODE (no schedule, no
 * room, no audience) — when it gains one, a third due-check plugs in
 * here, not a new module (the brief's seam).
 */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const escUrl = (url: string) => url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

const ONCE_WINDOW_MS = 7 * 24 * 3600_000; // R3
const REMINDER_WINDOW_MS = 24 * 3600_000; // a booking's reminder: the 24 hours before
const START_WINDOW_MS = 45 * 60_000; // both kinds: the start letter's honest window

/* ── the clock words, in the reader's own zone ─────────────────────────── */

/** The only zone this site actually runs on today; anything else falls
 *  back to Intl's own short zone name (e.g. "EDT") rather than a guess —
 *  the reading-letters zoneLabel idiom, written fresh here (its pair is
 *  module-private and reading-letters.ts's only edit this lane is the
 *  one-word export on `dueOccurrenceNow`). */
const FRIENDLY_ZONE: Record<string, string> = { "America/Denver": "Mountain" };

function zoneLabel(atMs: number, tz: string): string {
  if (FRIENDLY_ZONE[tz]) return FRIENDLY_ZONE[tz];
  const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
    .formatToParts(new Date(atMs))
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? tz;
}

/** "Wednesday, September 23 at 1:11 PM Mountain" — the occurrence's own
 *  instant read in the RECIPIENT's zone (her `tz` when the sign-up
 *  captured one, Love's zone named otherwise), with the zone ALWAYS
 *  named in words: the K131 fallback law. Never a countdown, never a
 *  promised send minute; email cannot run either. */
function whenWords(startsAtMs: number, tz: string): string {
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(startsAtMs));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: true,
    hour: "numeric",
    minute: "2-digit",
  }).formatToParts(new Date(startsAtMs));
  const at: Record<string, string> = {};
  for (const p of parts) at[p.type] = p.value;
  return `${date} at ${at.hour}:${at.minute} ${(at.dayPeriod ?? "").toUpperCase()} ${zoneLabel(startsAtMs, tz)}`;
}

/* ── the slot assembly (per session kind, per soul) ────────────────────── */

export interface JoinSessionParts {
  /** which session — "the reading", or the booking's own service title */
  session: string;
  startsAtMs: number;
  /** the zone the words render in: the reader's own when known, Love's
   *  (named in words) otherwise */
  tz: string;
  /** the ONE link — /reading for the reading (R6), the booking's own
   *  meetingUrl for a booked session */
  link: string;
  /** the pill's words */
  linkWords: string;
}

function joinSlots(parts: JoinSessionParts, started: boolean): Record<string, string> {
  return {
    session: `<p style="margin:0 0 1.15em;line-height:1.75;">The session: <b>${esc(parts.session)}</b>.</p>`,
    when: `<p style="margin:0 0 1.15em;line-height:1.75;">${started ? "It opened" : "It begins"} <b>${whenWords(parts.startsAtMs, parts.tz)}</b>.</p>`,
    link: `<p style="margin:22px 0;"><a href="${escUrl(parts.link)}" style="background:#b4862b;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;">${esc(parts.linkWords)}</a></p>`,
  };
}

/* ── the two pure builders ─────────────────────────────────────────────── */

/** The reminder — the reading's own day under the shared due-gate, or
 *  inside the 24 hours before a booked session. Composed through
 *  `letterFor`: Love's override first, the built-in words the floor, a
 *  slot she edits out appended back so no door and no time can be lost. */
export async function joinReminderLetter(email: string, parts: JoinSessionParts): Promise<OutgoingMail> {
  const { subject, html } = await letterFor("join-reminder", joinSlots(parts, false));
  const unsub = unsubscribeUrl(email);
  return { to: email, subject, html, unsubscribeUrl: unsub };
}

/** The start letter — due only inside the 45-minute window after the
 *  start, so "the room is open" is always true when it lands. */
export async function joinStartLetter(email: string, parts: JoinSessionParts): Promise<OutgoingMail> {
  const { subject, html } = await letterFor("join-start", joinSlots(parts, true));
  const unsub = unsubscribeUrl(email);
  return { to: email, subject, html, unsubscribeUrl: unsub };
}

/* ── the two send paths (the ruled order: capacity, subscribed, claim, send) ── */

/** TASK-537: who may be mailed. "list" (default, the reading half) needs a
 *  live subscriber record; "not-opted-out" (the booking half) needs only
 *  the absence of an opt-out. */
export type JoinConsent = "list" | "not-opted-out";

async function consented(email: string, consent: JoinConsent): Promise<boolean> {
  return consent === "not-opted-out" ? !(await isOptedOut(email)) : isSubscribed(email);
}

export type JoinSendResult = "sent" | "skippedCap" | "skippedLate" | "skippedClaimed" | "skippedUnsubscribed";

/** The reminder's ONE send path, one soul at a time. `Date.now()` is
 *  re-checked against the start HERE — at the moment of THIS send (R1),
 *  not the `nowMs` the sweep started with — so a session that begins
 *  partway through a long recipient list stops the reminders instead of
 *  mailing a late "it is coming" to the tail. Capacity is checked
 *  BEFORE the claim (R4): a spent meter never burns the once-key, so
 *  the very next tick's sweep is the retry. */
export async function sendJoinReminder(
  email: string,
  onceKey: string,
  parts: JoinSessionParts,
  consent: JoinConsent = "list",
): Promise<JoinSendResult> {
  if (Date.now() >= parts.startsAtMs) return "skippedLate";
  if (!((await capRemaining()) > 0)) return "skippedCap";
  if (!(await consented(email, consent))) return "skippedUnsubscribed";
  if (!(await onceWithin(onceKey, ONCE_WINDOW_MS))) return "skippedClaimed";
  await sendMail("news", await joinReminderLetter(email, parts));
  return "sent";
}

/** The start letter's ONE send path. The same ruled order, plus the
 *  window re-checked at send time: a start letter that would land past
 *  its 45 minutes is not sent late. */
export async function sendJoinStart(
  email: string,
  onceKey: string,
  parts: JoinSessionParts,
  consent: JoinConsent = "list",
): Promise<JoinSendResult> {
  if (Date.now() - parts.startsAtMs >= START_WINDOW_MS) return "skippedLate";
  if (!((await capRemaining()) > 0)) return "skippedCap";
  if (!(await consented(email, consent))) return "skippedUnsubscribed";
  if (!(await onceWithin(onceKey, ONCE_WINDOW_MS))) return "skippedClaimed";
  await sendMail("news", await joinStartLetter(email, parts));
  return "sent";
}

/* ── the sweeps ────────────────────────────────────────────────────────── */

export interface JoinTickStats {
  reminderSent: number;
  startSent: number;
  skippedCap: number;
  skippedLate: number;
  skippedClaimed: number;
  skippedUnsubscribed: number;
}

function tally(stats: JoinTickStats, kind: "reminder" | "start", result: JoinSendResult): void {
  if (result === "sent") {
    if (kind === "reminder") stats.reminderSent++;
    else stats.startSent++;
  } else if (result === "skippedCap") stats.skippedCap++;
  else if (result === "skippedLate") stats.skippedLate++;
  else if (result === "skippedClaimed") stats.skippedClaimed++;
  else stats.skippedUnsubscribed++;
}

/** The audience: the `reading` list UNION the settle-time `reading-seat`
 *  tag (decision 3 — the pass buyers who used to vanish), deduped by
 *  email. Every send still passes `isSubscribed` at send time (R2); the
 *  list snapshot is never send-time truth. */
async function joinAudience(): Promise<SubscriberRecord[]> {
  const [reading, seat] = await Promise.all([
    listSubscribersByTag("reading"),
    listSubscribersByTag(READING_SEAT_TAG),
  ]);
  const byEmail = new Map<string, SubscriberRecord>();
  for (const rec of [...reading, ...seat]) byEmail.set(rec.email.toLowerCase(), rec);
  return [...byEmail.values()];
}

/** The reading half. The reminder rides `dueOccurrenceNow` verbatim —
 * the SAME due-check the day-of letter uses (the reading's own day in
 * the schedule's OWN zone, past 02:00 local, before the start; R5's one
 * schedule policy, so `on: false` silences this half too). The start
 * letter reads `nextReading`'s window phase: the occurrence in progress
 * whose start is less than 45 minutes ago. The link is ALWAYS the
 * public /reading page (R6: every reading-day door lives there); the
 * time renders in each soul's own zone when the sign-up captured one. */
async function sweepReading(nowMs: number, stats: JoinTickStats): Promise<void> {
  const reminderDue = await dueOccurrenceNow(nowMs);

  const { reading } = await getSiteConfig();
  const schedule: ReadingSchedule = reading ?? DEFAULT_READING_SCHEDULE;
  const occurrence = nextReading(schedule, nowMs);
  const startDue =
    occurrence && occurrence.phase === "window" && nowMs - occurrence.startsAtMs < START_WINDOW_MS
      ? { startsAtMs: occurrence.startsAtMs, tz: schedule.tz }
      : null;

  if (!reminderDue && !startDue) return;

  for (const rec of await joinAudience()) {
    try {
      if (reminderDue) {
        const parts: JoinSessionParts = {
          session: "the reading",
          startsAtMs: reminderDue.startsAtMs,
          tz: rec.tz ?? reminderDue.tz,
          link: `${siteBase()}/reading`,
          linkWords: "Open the reading page",
        };
        tally(stats, "reminder", await sendJoinReminder(rec.email, `join-reminder:reading:${reminderDue.startsAtMs}:${rec.email.toLowerCase()}`, parts));
      }
      if (startDue) {
        const parts: JoinSessionParts = {
          session: "the reading",
          startsAtMs: startDue.startsAtMs,
          tz: rec.tz ?? startDue.tz,
          link: `${siteBase()}/reading`,
          linkWords: "Open the reading page",
        };
        tally(stats, "start", await sendJoinStart(rec.email, `join-start:reading:${startDue.startsAtMs}:${rec.email.toLowerCase()}`, parts));
      }
    } catch (err) {
      console.error("join-letters: reading send failed:", rec.email, err);
    }
  }
}

/** The booking half. Confirmed bookings only, the booking's OWN
 *  `customer.email` only (the address the confirmation already mails
 *  the same link to — no new exposure), and never without a
 *  `meetingUrl` (never a link-less letter). The link is the booking's
 *  own meetingUrl as resolved at settle (the site's own /meet door for
 *  the jitsi and vdo rails); the time renders in `visitorTz` when the
 *  browser gave one at purchase, else `artistTz` named. */
async function sweepBookings(nowMs: number, stats: JoinTickStats): Promise<void> {
  for (const booking of await listBookings()) {
    if (booking.state !== "confirmed") continue;
    const email = booking.customer.email?.trim();
    if (!email || !booking.meetingUrl) continue;
    const startsAtMs = Date.parse(booking.startUtc);
    if (!Number.isFinite(startsAtMs)) continue;

    const parts: JoinSessionParts = {
      session: booking.serviceTitle,
      startsAtMs,
      tz: booking.visitorTz ?? booking.artistTz,
      link: booking.meetingUrl,
      linkWords: "Open your session room",
    };
    try {
      if (startsAtMs - nowMs > 0 && startsAtMs - nowMs <= REMINDER_WINDOW_MS) {
        tally(stats, "reminder", await sendJoinReminder(email, `join-reminder:booking:${booking.id}`, parts, "not-opted-out"));
      } else if (nowMs - startsAtMs >= 0 && nowMs - startsAtMs < START_WINDOW_MS) {
        tally(stats, "start", await sendJoinStart(email, `join-start:booking:${booking.id}`, parts, "not-opted-out"));
      }
    } catch (err) {
      console.error("join-letters: booking send failed:", booking.id, err);
    }
  }
}

/**
 * The tick's one added call (Build 6), a sibling of
 * `enqueueReadingDayOf`: direct sends only, never the queue, so it
 * needs no drain of its own. Never throws into the tick's response —
 * each half is independently guarded, so a failure in one never
 * silences the other (the enqueueReadingDayOf shape).
 */
export async function enqueueJoinLetters(nowMs: number): Promise<JoinTickStats> {
  const stats: JoinTickStats = {
    reminderSent: 0,
    startSent: 0,
    skippedCap: 0,
    skippedLate: 0,
    skippedClaimed: 0,
    skippedUnsubscribed: 0,
  };
  try {
    await sweepReading(nowMs, stats);
  } catch (err) {
    console.error("join-letters: reading sweep failed:", err);
  }
  try {
    await sweepBookings(nowMs, stats);
  } catch (err) {
    console.error("join-letters: booking sweep failed:", err);
  }
  return stats;
}
