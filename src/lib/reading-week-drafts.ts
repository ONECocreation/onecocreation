import { capRemaining, onceWithin, sendMail } from "@/lib/mail";
import { createLetter, getLetterOverride, letterHtml, saveLetterOverride } from "@/lib/letters";
import { offerNotifyTo } from "@/lib/pwyc-letters";
import { siteBase } from "@/lib/subscribers";
import { getSiteConfig } from "@/lib/site-config";
import { DEFAULT_READING_SCHEDULE, nextReading, type ReadingSchedule } from "@/lib/reading-schedule";
import { zonedDateParts } from "@/lib/booking-time";

/**
 * THE WEEKLY DRAFT (TASK-534, Wednesday half) - Love's "next reading" letter,
 * written for her every Tuesday and mailed to her as a DRAFT. Love reviews
 * every letter before it goes out (the Admiral, block 969,308).
 *
 * THE ONE LAW: nothing here ever reaches the list. This module imports no
 * queue and no list-send: its only mail is the review copy to the operator
 * recipient set (Love's notice address plus OPERATOR_EMAILS). The list send
 * stays the existing panel at /a/letters/<key> (typed headcount, optional
 * schedule, the drip queue), pressed by an operator.
 *
 * DERIVE-OR-DASH: the date and the clock come ONLY from the reading schedule
 * (`getSiteConfig().reading ?? DEFAULT_READING_SCHEDULE`, the same source the
 * countdown and the day-of letter read) through `nextReading`. A schedule
 * that is off means no draft, no mail, one log line. Nothing about the
 * Housewarming is promised: Love is rethinking that part, and the letter
 * names the reading's own time (the schedule's `time`) whether the
 * Housewarming switch is on or off.
 *
 * SEAM FOR THE RECAP HALF (held until T-532 merges `loadReplays`): the
 * after-reading draft joins `draftReadingLetters` below as a second guarded
 * step beside the weekly one, reusing `claimOnce`/`releaseOnce`, the
 * `sendReviewCopy` function and the `after-reading-` key prefix already
 * listed in reading-draft-keys.ts. Its stats slot
 * (`replay`) already exists and reads "held".
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** the draft is made for the next occurrence that starts MORE than 24 hours
 *  away (the day-of letter owns the last day) and within 8 days. */
const MIN_LEAD_MS = DAY_MS;
const MAX_LEAD_MS = 8 * DAY_MS;
const TUESDAY = 2;

const FRIENDLY_ZONE: Record<string, string> = { "America/Denver": "Mountain" };

/* ── the pure words ─────────────────────────────────────────────────────── */

function zoneLabel(atMs: number, tz: string): string {
  if (FRIENDLY_ZONE[tz]) return FRIENDLY_ZONE[tz];
  const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
    .formatToParts(new Date(atMs))
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? tz;
}

function clockWords(atMs: number, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: true, hour: "numeric", minute: "2-digit" }).formatToParts(
    new Date(atMs),
  );
  const at: Record<string, string> = {};
  for (const p of parts) at[p.type] = p.value;
  return `${at.hour}:${at.minute} ${(at.dayPeriod ?? "").toUpperCase()}`;
}

function dayWords(atMs: number, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric" }).format(new Date(atMs));
}

/** "Sunday, October 11 at 1:11 PM Mountain" - every word from the instant and
 *  the schedule's own zone, never typed. */
export function whenWords(startsAtMs: number, tz: string): string {
  return `${dayWords(startsAtMs, tz)} at ${clockWords(startsAtMs, tz)} ${zoneLabel(startsAtMs, tz)}`;
}

/** The reading's own calendar date in the schedule's zone (the key's date). */
export function readingDateKey(startsAtMs: number, tz: string): string {
  return zonedDateParts(new Date(startsAtMs), tz).date;
}

export function nextReadingKey(startsAtMs: number, tz: string): string {
  return `next-reading-${readingDateKey(startsAtMs, tz)}`;
}

/** Love's voice, her sign-off, no em dash, no Housewarming promise. */
export function nextReadingLetter(startsAtMs: number, tz: string): { subject: string; body: string } {
  const when = whenWords(startsAtMs, tz);
  return {
    subject: `The next reading: ${when}`,
    body: [
      "Hello, beautiful soul.",
      `The next reading is ${when}. Come and read with me, free.`,
      "!cta: Join the reading | /reading",
      "Missed one? Every recorded reading is kept for our members in the Replays.",
      "[Watch the replays](/replays)",
      "With love,\nLove · ONE Cocreation",
    ].join("\n\n"),
  };
}

/** The Tuesday rule as a pure decision: the schedule's own zone says it is
 *  Tuesday (or `force`, the operator poke), a reading is published, still
 *  upcoming, more than 24 hours and at most 8 days away. Returns the
 *  occurrence or null (skip, say nothing). */
export function draftableReading(
  schedule: ReadingSchedule,
  nowMs: number,
  force = false,
): { startsAtMs: number; tz: string } | null {
  const next = nextReading(schedule, nowMs);
  if (!next || next.phase !== "upcoming") return null;
  if (!force && zonedDateParts(new Date(nowMs), schedule.tz).weekday !== TUESDAY) return null;
  const lead = next.startsAtMs - nowMs;
  if (lead <= MIN_LEAD_MS || lead > MAX_LEAD_MS) return null;
  return { startsAtMs: next.startsAtMs, tz: schedule.tz };
}

/* ── who gets the review copy ───────────────────────────────────────────── */

const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

/** Love's notice address plus the OPERATOR_EMAILS allowlist: lowercased,
 *  trimmed, deduped, and only well-formed single addresses (a header-injection
 *  or list-typo can never become a recipient). Never a subscriber. */
export function reviewRecipients(
  operatorEmailsEnv: string | undefined = process.env.OPERATOR_EMAILS,
  notify: string = offerNotifyTo(),
): string[] {
  const all = [notify, ...(operatorEmailsEnv ?? "").split(",")].map((e) => e.trim().toLowerCase()).filter(Boolean);
  return [...new Set(all)].filter((e) => EMAIL_RE.test(e));
}

const escAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The review copy's HTML: the letter exactly as it would render, with a
 *  note above it that it was prepared automatically and nothing has gone to
 *  the list, and a plain link to open it. Literal hex and inline style are
 *  the mail shell's own idiom (inboxes do not resolve var()). */
export function reviewCopyHtml(key: string, body: string): string {
  const openUrl = `${siteBase()}/a/letters/${escAttr(key)}`;
  const note =
    `<div style="max-width:552px;margin:0 auto;padding:14px 24px;background:#2b2733;color:#E9E2F2;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;border-bottom:1px solid rgba(139,118,196,.34);">` +
    `<b>This letter was prepared automatically for Love&#39;s review. Nothing has gone to the list.</b></div>`;
  const link =
    `<div style="max-width:552px;margin:0 auto;padding:18px 24px;background:#2b2733;color:#E9E2F2;font-family:Arial,Helvetica,sans-serif;font-size:14px;text-align:center;">` +
    `<a href="${openUrl}" style="color:#E7B2C3;">Open it to edit and send</a></div>`;
  const html = letterHtml(body, { webUrl: openUrl });
  const withNote = /<body[^>]*>/.test(html) ? html.replace(/<body[^>]*>/, (m) => `${m}\n${note}`) : note + html;
  return withNote.includes("</body>") ? withNote.replace("</body>", `${link}</body>`) : withNote + link;
}

/* ── the once-key (a KV marker, SET NX before the letter is made) ────────── */

const ONCE_TTL_S = 90 * 24 * 3600;
const REVIEW_ONCE_MS = 14 * DAY_MS;

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) throw new Error("no vault");
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`reading-week-drafts: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

const onceKey = (kind: string, id: string) => `letters:draft-once:${kind}:${id}`;

/** "own" = this call owns the draft; "taken" = already made. Fails CLOSED
 *  ("down") on any KV trouble: no vault, no draft; the next tick retries. */
async function claimOnce(kind: string, id: string): Promise<"own" | "taken" | "down"> {
  try {
    return (await kv(["SET", onceKey(kind, id), "1", "NX", "EX", String(ONCE_TTL_S)])) === "OK" ? "own" : "taken";
  } catch {
    return "down";
  }
}

async function releaseOnce(kind: string, id: string): Promise<void> {
  try {
    await kv(["DEL", onceKey(kind, id)]);
  } catch {
    /* the marker expires by itself; a stuck one only delays a retry */
  }
}

/* ── the review copy ────────────────────────────────────────────────────── */

/** Direct `sendMail("news", ...)` (R1 of reading-letters.ts: a queued copy
 *  would wait for the next tick), capacity checked before EACH send, one
 *  claim per recipient per letter. Returns how many went out. A failed send
 *  is logged and skipped; the draft stays in the room either way. */
export async function sendReviewCopy(key: string, subject: string, body: string): Promise<number> {
  const to = reviewRecipients();
  if (to.length === 0) {
    console.error("reading-week-drafts: no valid review recipients; the draft is in the room");
    return 0;
  }
  const html = reviewCopyHtml(key, body);
  let sent = 0;
  for (const email of to) {
    try {
      if ((await capRemaining()) <= 0) break;
      if (!(await onceWithin(`review:${key}:${email}`, REVIEW_ONCE_MS))) continue;
      await sendMail("news", { to: email, subject: `Draft for your review: ${subject}`, html });
      sent++;
    } catch (err) {
      console.error("reading-week-drafts: review copy failed:", err);
    }
  }
  return sent;
}

/* ── the weekly draft ───────────────────────────────────────────────────── */

export type NextReadingDraftOutcome = "drafted" | "already" | "skipped" | "error";

export interface DraftStats {
  nextReading: NextReadingDraftOutcome;
  /** the recap half, held until T-532 merges */
  replay: "held";
  reviewSent: number;
  key?: string;
}

export async function draftNextReadingLetter(
  nowMs: number,
  opts: { force?: boolean } = {},
): Promise<{ outcome: NextReadingDraftOutcome; key?: string; subject?: string; body?: string }> {
  const schedule = (await getSiteConfig()).reading ?? DEFAULT_READING_SCHEDULE;
  const due = draftableReading(schedule, nowMs, opts.force === true);
  if (!due) return { outcome: "skipped" };
  const key = nextReadingKey(due.startsAtMs, due.tz);
  const id = readingDateKey(due.startsAtMs, due.tz);
  const claim = await claimOnce("next-reading", id);
  if (claim === "down") {
    console.error("reading-week-drafts: the vault is unreachable; no draft this tick");
    return { outcome: "error", key };
  }
  if (claim === "taken") {
    const existing = await getLetterOverride(key);
    return existing?.body ? { outcome: "already", key, subject: existing.subject, body: existing.body } : { outcome: "already", key };
  }
  const words = nextReadingLetter(due.startsAtMs, due.tz);
  try {
    try {
      await createLetter({ key, title: words.subject, audience: "list" });
    } catch (err) {
      /* the second guard: the letter exists (a crash between the two writes
         left it empty, or a hand made it). Never overwrite words; only fill
         an empty body. */
      if (!(err instanceof Error && err.message.includes("already exists"))) throw err;
    }
    const have = await getLetterOverride(key);
    if (have?.body) return { outcome: "already", key, subject: have.subject, body: have.body };
    await saveLetterOverride(key, { subject: words.subject, body: words.body, audience: "members" });
  } catch (err) {
    await releaseOnce("next-reading", id);
    console.error("reading-week-drafts: could not make the draft:", err);
    return { outcome: "error", key };
  }
  return { outcome: "drafted", key, ...words };
}

/** The tick's one call. Never throws; makes drafts and mails review copies,
 *  and nothing else. */
export async function draftReadingLetters(nowMs: number, opts: { force?: boolean } = {}): Promise<DraftStats> {
  const stats: DraftStats = { nextReading: "skipped", replay: "held", reviewSent: 0 };
  try {
    const r = await draftNextReadingLetter(nowMs, opts);
    stats.nextReading = r.outcome;
    if (r.key) stats.key = r.key;
    if ((r.outcome === "drafted" || r.outcome === "already") && r.key) {
      const saved = r.body ? { subject: r.subject ?? "", body: r.body } : await getLetterOverride(r.key);
      if (saved?.body) stats.reviewSent += await sendReviewCopy(r.key, saved.subject, saved.body);
    }
  } catch (err) {
    stats.nextReading = "error";
    console.error("reading-week-drafts: weekly draft failed:", err);
  }
  return stats;
}
