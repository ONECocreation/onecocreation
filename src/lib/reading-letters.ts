import { sendMail, capRemaining, onceWithin, brandShell, type OutgoingMail } from "@/lib/mail";
import { siteBase, unsubscribeUrl, isSubscribed, listSubscribersByTag, markReadingConfirmed } from "@/lib/subscribers";
import { getSiteConfig } from "@/lib/site-config";
import { READING_ROOM_PATH } from "@/lib/reading-room";
import { nextReading, DEFAULT_READING_SCHEDULE, type ReadingSchedule } from "@/lib/reading-schedule";
import { zonedDateParts } from "@/lib/booking-time";

/**
 * TASK-389 — the two reading emails: a confirmation on sign-up, and a
 * "don't forget" letter on the reading's own day. On the `lead-magnet.ts`
 * pattern (two pure builders + two send paths), built to ride the EXISTING
 * rail — no new cron, no new queue (decision A). Both letters wear
 * `brandShell` with literal-hex inline styles exactly as `lead-magnet.ts`
 * does; this lane writes zero CSS.
 *
 * AMENDMENT (Number One, after `walk-968036/ASTRA-REVIEW-T389.md`, block
 * 968,132 later) — R1-R7, superseding the original Build 3 in these ways:
 *  R1 — every send (day-of AND the backlog/confirmation sweep) is DIRECT,
 *       through `sendMail` — never `mail-queue.enqueue()`. A letter queued
 *       after the tick's own drain would not be picked up again until
 *       TOMORROW's single daily cron (`vercel.json`'s one line), and the
 *       queue has no expiry — so "enqueue" here means "call sendMail",
 *       despite `enqueueReadingDayOf`'s name (kept verbatim from the
 *       brief's own Build 3, which this amendment corrects in behavior,
 *       not in name). `capRemaining() > 0` is checked before EACH send
 *       (`sendMail` records usage but never enforces the cap itself) and
 *       `nowMs < startsAtMs` is re-evaluated at the moment of each send,
 *       not once at the top of a loop.
 *  R2 — `isSubscribed(email)` right before every send, all four call
 *       sites (day-of, confirmation × sign-up path and sweep) — the tag
 *       outcome and the list snapshot are not send-time truth.
 *  R3 — once-keys are PER RECIPIENT. Day-of:
 *       `reading-dayof:<startsAtMs>:<email>`, 7 days — a capacity stop
 *       leaves the unsent recipients' keys unset so a later tick still
 *       finds them. Confirmation: ONE shared claim,
 *       `reading-confirm:<email>`, 24h, used by BOTH the sign-up route and
 *       the backlog sweep, so the two can never double-send the same soul.
 *       `onceWithin` WRITES its claim before the work runs and fails OPEN
 *       on a KV error (`mail.ts:109-116`) — this is best-effort
 *       at-most-once, not a durable exactly-once guarantee; "never twice"
 *       holds only to that strength.
 *  R4 — the sign-up path checks `capRemaining()` BEFORE claiming — a spent
 *       meter leaves the record unstamped and un-claimed so the very next
 *       tick's sweep is the retry, never a second, parallel send path.
 *  R5 — one schedule policy: `getSiteConfig().reading ?? DEFAULT_READING_SCHEDULE`
 *       — absent config uses the default (which is `on: true`); only an
 *       explicit `on: false` silences the day-of letter.
 *  R6 — `READING_ROOM_PATH` is `string | null`. Null (no free room in the
 *       registry) links `/reading` (TASK-391, on main) instead, and says
 *       the room link follows — never a broken `${siteBase()}null`.
 *  R7 — the wall-clock (02:00 gate) and the clock-in-words are both built
 *       here with `Intl.DateTimeFormat` directly (`hour12: false` for the
 *       gate, an "24" hour folded to 0) — `booking-time.ts`'s own
 *       equivalent helper is private/unexported and booking-time.ts stays
 *       untouched (READ-ONLY this lane).
 */

/* ── words, never a live timer (impossible in email) ──────────────────── */

const esc = (url: string) => url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/** The only zone this site actually runs on today; anything else falls
 *  back to Intl's own short zone name (e.g. "MDT") rather than a guess. */
const FRIENDLY_ZONE: Record<string, string> = { "America/Denver": "Mountain" };

function zoneLabel(tz: string): string {
  if (FRIENDLY_ZONE[tz]) return FRIENDLY_ZONE[tz];
  const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? tz;
}

/** "1:11 PM" — the occurrence's own clock, computed once at send/build
 *  time from `startsAtMs`. Never a countdown; email cannot run one. */
function clockWords(startsAtMs: number, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: true,
    hour: "numeric",
    minute: "2-digit",
  }).formatToParts(new Date(startsAtMs));
  const at: Record<string, string> = {};
  for (const p of parts) at[p.type] = p.value;
  return `${at.hour}:${at.minute} ${(at.dayPeriod ?? "").toUpperCase()}`;
}

/** R7: minutes past local midnight in `tz`, for the "is it past 02:00
 *  there yet" gate — `booking-time.ts`'s own `zonedWallMinutes` does the
 *  identical Intl walk but is not exported (and that file is READ-ONLY
 *  this lane), so this is that same small, well-established technique
 *  written fresh, not a divergent re-derivation of the zone law. */
function zonedWallClockMinutes(instantMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(instantMs));
  const at: Record<string, string> = {};
  for (const p of parts) at[p.type] = p.value;
  return (Number(at.hour) % 24) * 60 + Number(at.minute);
}

/* ── the Stage door (R6: READING_ROOM_PATH may be null) ───────────────── */

function readingPill(href: string, words: string): string {
  return `<p style="margin:22px 0;"><a href="${esc(href)}" style="background:#b4862b;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;">${words}</a></p>`;
}

/** The Stage link both letters share, the same way `lead-magnet.ts:81`
 *  builds it (`siteBase() + READING_ROOM_PATH`). R6: no free room in the
 *  registry means `READING_ROOM_PATH` is `null` — the letter links the
 *  public `/reading` page (TASK-391, on main) instead of building a
 *  broken `${siteBase()}null` href, and says so honestly rather than
 *  pretending the Stage door is ready. */
function stageDoorHtml(words: string): string {
  if (READING_ROOM_PATH) {
    return readingPill(`${siteBase()}${READING_ROOM_PATH}`, words);
  }
  return `${readingPill(`${siteBase()}/reading`, "See the reading")}
       <p>The Stage room link is still on its way — the room link follows as soon as it's set.</p>`;
}

/* ── the two pure builders ──────────────────────────────────────────── */

/** Sent once, on sign-up (`outcome === "joined"` only — decision B). */
export function readingConfirmationLetter(email: string): OutgoingMail {
  const unsub = unsubscribeUrl(email);
  return {
    to: email,
    subject: "You're on the list for the reading",
    html: brandShell(
      `<p>Welcome, beautiful soul — you're on the list for the reading.</p>
       ${stageDoorHtml("Open the Stage")}
       <p>With love,<br/>One Cocreation</p>`,
      { unsubscribeUrl: unsub },
    ),
    unsubscribeUrl: unsub,
  };
}

/** Sent on the reading's own day, never before 02:00 local and never once
 *  the reading has begun. The words are built fresh from `startsAtMs` +
 *  `tz` — no literal weekday anywhere in this file (the schedule source
 *  decides the day; grep-lintable). */
export function readingDayOfLetter(email: string, startsAtMs: number, tz: string): OutgoingMail {
  const unsub = unsubscribeUrl(email);
  return {
    to: email,
    subject: "Don't forget — the reading is today",
    html: brandShell(
      `<p>Just a gentle note: the reading is today at ${clockWords(startsAtMs, tz)} ${zoneLabel(tz)}.</p>
       ${stageDoorHtml("Join the reading")}
       <p>With love,<br/>One Cocreation</p>`,
      { unsubscribeUrl: unsub },
    ),
    unsubscribeUrl: unsub,
  };
}

/* ── the two send paths (R1: direct sendMail, never a post-drain enqueue) ── */

const CONFIRM_ONCE_WINDOW_MS = 24 * 3600_000; // R3
const DAYOF_ONCE_WINDOW_MS = 7 * 24 * 3600_000; // R3
const EARLIEST_WALL_MINUTES = 2 * 60; // 02:00, in the schedule's own zone

export type ReadingConfirmationResult = "sent" | "skippedCap" | "skippedClaimed" | "skippedUnsubscribed";

/**
 * The confirmation's ONE send path — called by BOTH the subscribe route
 * (immediate, on `outcome === "joined"`) and the backlog sweep below
 * (decision E), so the two share R3's single per-recipient claim and can
 * never double-send the same soul. Order, RULED: capacity → subscribed? →
 * claim → send → stamp — R4's own words ("the sign-up confirmation checks
 * capRemaining() first"), mirrored here for the sweep's own call so both
 * paths agree. Capacity is checked BEFORE the claim so a spent meter never
 * burns the 24h claim window — the record stays unstamped and unclaimed,
 * so the very next tick's sweep is the retry. `isSubscribed` still sits
 * immediately before the claim+send pair (R2) so an opt-out landing
 * between the list snapshot and the send is honored either way.
 */
export async function sendReadingConfirmation(email: string): Promise<ReadingConfirmationResult> {
  if (!((await capRemaining()) > 0)) return "skippedCap"; // R4: capacity checked FIRST
  if (!(await isSubscribed(email))) return "skippedUnsubscribed";
  if (!(await onceWithin(`reading-confirm:${email}`, CONFIRM_ONCE_WINDOW_MS))) return "skippedClaimed";
  await sendMail("news", readingConfirmationLetter(email));
  await markReadingConfirmed(email);
  return "sent";
}

export type ReadingDayOfResult = "sent" | "skippedCap" | "skippedLate" | "skippedClaimed" | "skippedUnsubscribed";

/**
 * The day-of's ONE send path, one recipient at a time. `Date.now() >=
 * startsAtMs` is re-checked HERE — at the moment of THIS send (R1), a
 * fresh reading every call, not the `nowMs` the sweep started with — so a
 * reading that begins partway through a long recipient list stops sending
 * immediately rather than mailing a late "don't forget" to the tail of
 * the list.
 */
export async function sendReadingDayOf(email: string, startsAtMs: number, tz: string): Promise<ReadingDayOfResult> {
  if (Date.now() >= startsAtMs) return "skippedLate";
  if (!((await capRemaining()) > 0)) return "skippedCap";
  if (!(await isSubscribed(email))) return "skippedUnsubscribed";
  if (!(await onceWithin(`reading-dayof:${startsAtMs}:${email}`, DAYOF_ONCE_WINDOW_MS))) return "skippedClaimed";
  await sendMail("news", readingDayOfLetter(email, startsAtMs, tz));
  return "sent";
}

/* ── the tick's added call ─────────────────────────────────────────────── */

export interface ReadingTickStats {
  dayOfSent: number;
  confirmSent: number;
  skippedCap: number;
  skippedLate: number;
}

/** Decision E: every `reading`-tagged record with no `readingConfirmedAt`
 *  mark gets the confirmation once, then the stamp — souls who joined
 *  between PR #41's deploy and this lane's landing are owed the letter
 *  they never got. Schedule-independent; runs every tick regardless of
 *  today's reading day. A single failed send (SMTP, a spent meter) is
 *  logged and skipped — never lets one soul's failure stop the rest. */
async function sweepReadingConfirmations(stats: ReadingTickStats): Promise<void> {
  const records = await listSubscribersByTag("reading");
  for (const rec of records) {
    if (rec.readingConfirmedAt) continue; // the durable dedup — decision E's mark
    try {
      const result = await sendReadingConfirmation(rec.email);
      if (result === "sent") stats.confirmSent++;
      else if (result === "skippedCap") stats.skippedCap++;
    } catch (err) {
      console.error("reading-letters: backlog confirmation failed:", rec.email, err);
    }
  }
}

/** The day-of half — schedule-dependent (R5: `getSiteConfig().reading ??
 *  DEFAULT_READING_SCHEDULE`; an explicit `on: false` is the only thing
 *  that silences it). No-ops quietly when today isn't a reading day, or
 *  it's before 02:00 local, or the reading has already begun. */
async function sendDayOfIfDue(nowMs: number, stats: ReadingTickStats): Promise<void> {
  const { reading } = await getSiteConfig();
  const schedule: ReadingSchedule = reading ?? DEFAULT_READING_SCHEDULE;
  const occurrence = nextReading(schedule, nowMs);
  if (!occurrence) return; // on:false, or an invalid schedule — no day-of letter (R5)
  if (nowMs >= occurrence.startsAtMs) return; // never after the reading has begun

  const { date: occDate } = zonedDateParts(new Date(occurrence.startsAtMs), schedule.tz);
  const { date: todayDate } = zonedDateParts(new Date(nowMs), schedule.tz);
  if (occDate !== todayDate) return; // the occurrence doesn't start today, in the schedule's own zone
  if (zonedWallClockMinutes(nowMs, schedule.tz) < EARLIEST_WALL_MINUTES) return; // before 02:00 local

  const records = await listSubscribersByTag("reading");
  for (const rec of records) {
    try {
      const result = await sendReadingDayOf(rec.email, occurrence.startsAtMs, schedule.tz);
      if (result === "sent") stats.dayOfSent++;
      else if (result === "skippedCap") stats.skippedCap++;
      else if (result === "skippedLate") stats.skippedLate++;
    } catch (err) {
      console.error("reading-letters: day-of send failed:", rec.email, err);
    }
  }
}

/**
 * The tick's one added call (Build 3, amended R1-R7). Direct sends only —
 * never `mail-queue.enqueue()` (R1: a letter queued after the drain would
 * ride TOMORROW's single daily cron, and the queue has no expiry) — so
 * this needs no drain of its own; it runs after the existing one. Never
 * throws into the tick's response: each half is independently guarded, so
 * a failure in one never silences the other.
 */
export async function enqueueReadingDayOf(nowMs: number): Promise<ReadingTickStats> {
  const stats: ReadingTickStats = { dayOfSent: 0, confirmSent: 0, skippedCap: 0, skippedLate: 0 };
  try {
    await sweepReadingConfirmations(stats);
  } catch (err) {
    console.error("reading-letters: confirmation sweep failed:", err);
  }
  try {
    await sendDayOfIfDue(nowMs, stats);
  } catch (err) {
    console.error("reading-letters: day-of send failed:", err);
  }
  return stats;
}
