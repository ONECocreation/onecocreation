import { capRemaining, onceWithin, sendMail } from "@/lib/mail";
import { composedLetterKeys, createLetter, getLetterOverride, letterHtml, saveLetterOverride } from "@/lib/letters";
import { offerNotifyTo } from "@/lib/pwyc-letters";
import { siteBase } from "@/lib/subscribers";
import { getSiteConfig } from "@/lib/site-config";
import { DEFAULT_READING_SCHEDULE, nextReading, type ReadingSchedule } from "@/lib/reading-schedule";
import { zonedDateParts } from "@/lib/booking-time";
import { createHash } from "crypto";
import { loadReplays } from "@/lib/replays-source";
import type { AboutVideo } from "@/lib/about-content";

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
 * THE RECAP HALF (TASK-538): `draftReplayLetter` is a second guarded step in
 * `draftReadingLetters`, beside the weekly one. It reuses `claimOnce` /
 * `releaseOnce`, `sendReviewCopy` and the `after-reading-` prefix in
 * reading-draft-keys.ts. Trigger: a replay id the site has not seen. The
 * FIRST run only records the current ids (nothing drafts), the seen-set is
 * written only AFTER the draft exists, only ever grows, and a fail-closed
 * loader (empty, null, throw) never resets it and never drafts.
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
/** the recap half (T-538): "baselined" = first run, ids recorded, no draft */
export type ReplayDraftOutcome = NextReadingDraftOutcome | "baselined";

export interface DraftStats {
  nextReading: NextReadingDraftOutcome;
  replay: ReplayDraftOutcome;
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

/* ── the recap draft (T-538) ────────────────────────────────────────────── */

const SEEN_KEY = "letters:replays-seen";
const MAX_TITLES = 3;
const TITLE_CAP = 100;

/** Titles come from YouTube or Love's own rows and are UNTRUSTED text placed
 *  inside a markdown-ish body that goes to the whole list. Strip control and
 *  line-break characters, the link/emphasis characters `[ ] ( ) * _`, and any
 *  leading `!` (a directive), collapse spaces, cap at 100. BEFORE composing. */
export function replayTitle(raw: unknown): string {
  const t = String(raw ?? "")
    .replace(/[\r\n\t\u2028\u2029]/g, " ")
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[\[\]()*_]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[!\s]+/, "");
  return t.slice(0, TITLE_CAP).trim();
}

/** Love's voice and sign-off, no em dash. One title names it; several say so. */
export function afterReadingLetter(rawTitles: unknown[]): { subject: string; body: string } {
  const titles = rawTitles.map(replayTitle).filter(Boolean);
  const subject =
    rawTitles.length > 1 ? "New replays are here" : titles[0] ? `The replay is here: ${titles[0]}` : "The replay is here";
  return {
    subject,
    body: [
      "Hello, beautiful soul.",
      "The latest reading is now kept in the Replays, to play again whenever you like.",
      ...(titles.length ? [titles.slice(0, MAX_TITLES).join("\n")] : []),
      "!cta: Watch the replay | /replays",
      "A free membership is all it takes to watch: your email and a six-digit code.",
      "With love,\nLove · ONE Cocreation",
    ].join("\n\n"),
  };
}

export type ReplayDraftResult = { outcome: ReplayDraftOutcome; key?: string; subject?: string; body?: string };

export async function draftReplayLetter(
  nowMs: number,
  config: { replays?: AboutVideo[]; reading?: ReadingSchedule },
): Promise<ReplayDraftResult> {
  let videos: unknown;
  try {
    videos = await loadReplays(config, { allowFetch: true });
  } catch (err) {
    console.error("reading-week-drafts: replay loader failed:", err);
    return { outcome: "error" };
  }
  /* fail closed: nothing (or something that is not a list) is "no news",
     never "everything is gone" */
  if (!Array.isArray(videos)) return { outcome: "skipped" };
  const list = (videos as AboutVideo[]).filter((v) => v && typeof v.id === "string" && v.id);
  if (list.length === 0) return { outcome: "skipped" };

  let seenIds: string[] | null;
  try {
    const raw = (await kv(["GET", SEEN_KEY])) as string | null;
    if (raw === null || raw === undefined) seenIds = null;
    else {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.some((x) => typeof x !== "string")) throw new Error("the seen-set is not a list of ids");
      seenIds = parsed as string[];
    }
  } catch (err) {
    console.error("reading-week-drafts: the seen-set is unreadable; no recap this tick:", err);
    return { outcome: "error" };
  }
  const writeSeen = async (ids: string[]): Promise<boolean> => {
    try {
      await kv(["SET", SEEN_KEY, JSON.stringify([...new Set(ids)])]);
      return true;
    } catch (err) {
      console.error("reading-week-drafts: could not write the seen-set:", err);
      return false;
    }
  };
  const allIds = list.map((v) => v.id);

  /* the baseline trap: day one records what already exists and drafts nothing */
  if (seenIds === null) return { outcome: (await writeSeen(allIds)) ? "baselined" : "error" };

  const known = new Set(seenIds);
  const fresh = list.filter((v, i) => !known.has(v.id) && allIds.indexOf(v.id) === i);
  if (fresh.length === 0) return { outcome: "skipped" };
  const union = [...seenIds, ...allIds];

  const tz = (config.reading ?? DEFAULT_READING_SCHEDULE).tz;
  const date = zonedDateParts(new Date(nowMs), tz).date;
  const onceId = createHash("sha256").update(fresh.map((v) => v.id).sort().join(",")).digest("hex").slice(0, 24);
  const claim = await claimOnce("after-reading", onceId);
  if (claim === "down") {
    console.error("reading-week-drafts: the vault is unreachable; no recap draft this tick");
    return { outcome: "error" };
  }
  if (claim === "taken") {
    /* a draft for exactly these ids exists (the seen-set write failed after
       it): catch the seen-set up, make nothing new */
    await writeSeen(union);
    return { outcome: "already" };
  }

  const words = afterReadingLetter(fresh.map((v) => v.title));
  let key = "";
  try {
    const prefix = `after-reading-${date}-`;
    const taken = (await composedLetterKeys()).filter((k) => k.startsWith(prefix)).length;
    key = `${prefix}${taken + 1}`;
    try {
      await createLetter({ key, title: words.subject, audience: "list" });
    } catch (err) {
      if (!(err instanceof Error && err.message.includes("already exists"))) throw err;
    }
    const have = await getLetterOverride(key);
    if (!have?.body) await saveLetterOverride(key, { subject: words.subject, body: words.body, audience: "members" });
  } catch (err) {
    await releaseOnce("after-reading", onceId);
    console.error("reading-week-drafts: could not make the recap draft:", err);
    return { outcome: "error", key };
  }
  /* the seen-set moves only now that the draft exists; if this write fails
     the once-key above stops a duplicate and the next tick catches up */
  await writeSeen(union);
  return { outcome: "drafted", key, ...words };
}

/** The tick's one call. Never throws; makes drafts and mails review copies,
 *  and nothing else. */
export async function draftReadingLetters(nowMs: number, opts: { force?: boolean } = {}): Promise<DraftStats> {
  const stats: DraftStats = { nextReading: "skipped", replay: "skipped", reviewSent: 0 };
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
  /* the recap half: its own guard, so it can neither change the weekly
     outcome nor fail the tick */
  try {
    const rr = await draftReplayLetter(nowMs, await getSiteConfig());
    stats.replay = rr.outcome;
    if ((rr.outcome === "drafted") && rr.key && rr.body) stats.reviewSent += await sendReviewCopy(rr.key, rr.subject ?? "", rr.body);
  } catch (err) {
    stats.replay = "error";
    console.error("reading-week-drafts: recap draft failed:", err);
  }
  return stats;
}
