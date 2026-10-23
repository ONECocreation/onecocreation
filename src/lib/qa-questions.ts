import { promises as fs } from "fs";
import path from "path";
import { randomBytes, createHash } from "crypto";
import { sendMail, brandShell, pill, capRemaining } from "./mail";
import { reviewRecipients } from "./reading-week-drafts";
import { DEFAULT_TZ, zonedDateParts } from "./booking-time";

/**
 * THE Q&A QUESTIONS STORE (TASK-603 phase 2, K182 — his Desk answer on card
 * 971566: "Build it (Studio menu)"). One month-keyed doc per Q&A month —
 * `qa:questions:<yyyy-mm>` in the vault (prod), `data/qa-questions/<yyyy-mm>.json`
 * on the dev file driver — the house dual-driver single-doc idiom
 * (room-pins.ts), MINUS the public-blob fallback: an asker's email is PII,
 * so the store speaks KV or the local file, never a public blob (the same
 * private-driver mandate store.ts's orders carry). No vault in prod reads
 * as honestly NOT configured — the box refuses in plain words, it never
 * falls back to public storage.
 *
 * AUTO-ARCHIVE (his round-3 drawing): a month doc keeps every row it ever
 * received. The operator list reads THIS month's rows plus the still-OPEN
 * rows of every earlier month (carried over, naming their month); an
 * answered row simply stops carrying — the archive is the month doc itself,
 * nothing moves and nothing is deleted.
 *
 * The month key comes from the house clock (booking-time's DEFAULT_TZ,
 * America/Denver), never from the client's device. Month NAMES for display
 * are derived from the key at render, never typed.
 *
 * Concurrency: read-modify-write on the month doc, the same honesty
 * room-pins carries — questions arrive one soul at a time; a settle-grade
 * lock (catalog-lock) is not what this rail is for.
 */

export interface QaQuestion {
  /** `<yyyymm>-<rand>` — the month prefix is how a write finds its doc. */
  id: string;
  words: string;
  who: string;
  email: string | null;
  atMs: number;
  answeredAtMs: number | null;
  /** the reply that was mailed, when one was — the record of what she sent */
  answer: string | null;
}

interface MonthDoc {
  rows: QaQuestion[];
}

interface IndexDoc {
  months: string[];
}

const KV_PREFIX = "qa:questions:";
const INDEX_KV = "qa:questions:index";
const dataDir = () => path.join(process.cwd(), "data", "qa-questions");
const monthFile = (month: string) => path.join(dataDir(), `${month}.json`);
const indexFile = () => path.join(dataDir(), "index.json");

async function kv(cmd: unknown[]): Promise<unknown> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null; // dev: the file driver
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`qa questions: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

const vaultOn = () => !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function readMonth(month: string): Promise<MonthDoc> {
  if (vaultOn()) {
    const raw = (await kv(["GET", KV_PREFIX + month])) as string | null;
    return raw ? (JSON.parse(raw) as MonthDoc) : { rows: [] };
  }
  try {
    return JSON.parse(await fs.readFile(monthFile(month), "utf8")) as MonthDoc;
  } catch {
    return { rows: [] };
  }
}

async function writeMonth(month: string, doc: MonthDoc): Promise<void> {
  const json = JSON.stringify(doc, null, 2);
  if (vaultOn()) {
    await kv(["SET", KV_PREFIX + month, json]);
    return;
  }
  await fs.mkdir(dataDir(), { recursive: true });
  const tmp = monthFile(month) + ".tmp";
  await fs.writeFile(tmp, json, "utf8");
  await fs.rename(tmp, monthFile(month));
}

async function readIndex(): Promise<IndexDoc> {
  if (vaultOn()) {
    const raw = (await kv(["GET", INDEX_KV])) as string | null;
    return raw ? (JSON.parse(raw) as IndexDoc) : { months: [] };
  }
  try {
    return JSON.parse(await fs.readFile(indexFile(), "utf8")) as IndexDoc;
  } catch {
    return { months: [] };
  }
}

async function writeIndex(doc: IndexDoc): Promise<void> {
  const json = JSON.stringify(doc, null, 2);
  if (vaultOn()) {
    await kv(["SET", INDEX_KV, json]);
    return;
  }
  await fs.mkdir(dataDir(), { recursive: true });
  const tmp = indexFile() + ".tmp";
  await fs.writeFile(tmp, json, "utf8");
  await fs.rename(tmp, indexFile());
}

/** The month key of a moment, on the house clock. */
export function qaMonthKey(atMs: number = Date.now()): string {
  return zonedDateParts(new Date(atMs), DEFAULT_TZ).date.slice(0, 7);
}

/** A question lands: this month's doc, plus the month index on first use. */
export async function addQuestion(input: { words: string; who: string; email: string | null }): Promise<QaQuestion> {
  const month = qaMonthKey();
  const row: QaQuestion = {
    id: `${month.replace("-", "")}-${randomBytes(6).toString("hex")}`,
    words: input.words,
    who: input.who,
    email: input.email,
    atMs: Date.now(),
    answeredAtMs: null,
    answer: null,
  };
  const doc = await readMonth(month);
  doc.rows.push(row);
  await writeMonth(month, doc);
  const index = await readIndex();
  if (!index.months.includes(month)) {
    index.months.push(month);
    index.months.sort();
    await writeIndex(index);
  }
  return row;
}

export interface ListedQuestion extends QaQuestion {
  /** its month key — a carried row names its own month from this, never typed */
  monthKey: string;
  carried: boolean;
}

/** The operator list: this month whole, earlier months' OPEN rows carried
 *  to the top (oldest first), everything else resting in its month doc. */
export async function listQuestions(): Promise<{ thisMonthKey: string; rows: ListedQuestion[] }> {
  const thisMonthKey = qaMonthKey();
  const index = await readIndex();
  const carried: ListedQuestion[] = [];
  let thisMonth: ListedQuestion[] = [];
  for (const month of index.months) {
    const doc = await readMonth(month);
    if (month === thisMonthKey) {
      thisMonth = doc.rows.map((r) => ({ ...r, monthKey: month, carried: false }));
    } else if (month < thisMonthKey) {
      for (const r of doc.rows) {
        if (r.answeredAtMs === null) carried.push({ ...r, monthKey: month, carried: true });
      }
    }
  }
  const byArrival = (a: ListedQuestion, b: ListedQuestion) => a.atMs - b.atMs;
  return { thisMonthKey, rows: [...carried.sort(byArrival), ...thisMonth.sort(byArrival)] };
}

/** Locate a row by its id (the month prefix names the doc). */
async function withRow<T>(id: string, fn: (row: QaQuestion, doc: MonthDoc, month: string) => Promise<T>): Promise<T | null> {
  const m = id.match(/^(\d{4})(\d{2})-/);
  if (!m) return null;
  const month = `${m[1]}-${m[2]}`;
  const doc = await readMonth(month);
  const row = doc.rows.find((r) => r.id === id);
  if (!row) return null;
  return fn(row, doc, month);
}

/** Tick a row answered with no reply mailed (the asker left no email). */
export async function markAnswered(id: string): Promise<QaQuestion | null> {
  return withRow(id, async (row, doc, month) => {
    row.answeredAtMs = Date.now();
    await writeMonth(month, doc);
    return row;
  });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escQuot = (s: string) => `&#8220;${esc(s)}&#8221;`;

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://onecocreation.com").replace(/\/$/, "");
}

/**
 * THE NOTICE TO LOVE (the brief's RULED section, block 971,255): one letter
 * per question to the review-recipient set, through sendMail with
 * capRemaining() checked first, the question quoted, TWO ways to answer —
 * "Reply through the site" (the Questions room pill) and, when the asker
 * left an email, "Reply by email" (a mailto with the question quoted;
 * pill()'s abs() would mangle a mailto:, so the email door is a plain rose
 * link — the round-2 review copy's own idiom). No-email askers get the
 * site door alone.
 */
export function noticeHtml(q: { words: string; who: string; email: string | null }): string {
  const fromLine = q.email
    ? `<p>from <b>${esc(q.who)}</b> (${esc(q.email)})</p>`
    : `<p>from <b>${esc(q.who)}</b> · no email was left</p>`;
  const parts = [
    `<p>Hello Love,</p>`,
    `<p>A new question arrived for this month&#39;s Intuitive Q&amp;A.</p>`,
    `<p style="margin:12px 0;padding:12px 16px;border-left:3px solid #E7B2C3;background:#141021;border-radius:0 10px 10px 0;">${escQuot(q.words)}</p>`,
    fromLine,
  ];
  if (q.email) {
    const mailto =
      `mailto:${q.email}` +
      `?subject=${encodeURIComponent("Re: your Intuitive Q&A question")}` +
      `&body=${encodeURIComponent(`You asked:\n\n"${q.words}"\n\n`)}`;
    parts.push(
      `<p>There are two ways to answer:</p>`,
      `<p style="text-align:center;margin:18px 0 4px;">${pill(`${siteUrl()}/a/letters/questions`, "Reply through the site", "lg")}</p>`,
      `<p style="text-align:center;font-size:13px;color:#9a8fae;margin:0 0 18px;">opens the question on your stage controls, in a window for writing your reply</p>`,
      `<p style="text-align:center;margin:0 0 4px;"><a href="${mailto}" style="color:#E7B2C3;">Reply by email</a></p>`,
      `<p style="text-align:center;font-size:13px;color:#9a8fae;margin:0;">answers from your own mailbox, with the question quoted. When the asker left no email, this way is simply not offered and the question waits on your stage controls.</p>`,
    );
  } else {
    parts.push(
      `<p>Answer it on your stage controls:</p>`,
      `<p style="text-align:center;margin:18px 0 4px;">${pill(`${siteUrl()}/a/letters/questions`, "Reply through the site", "lg")}</p>`,
      `<p style="text-align:center;font-size:13px;color:#9a8fae;margin:0 0 18px;">opens the question in a window for reading; with no email left, "Mark answered" is the door</p>`,
    );
  }
  return brandShell(parts.join("\n"));
}

/**
 * Mail Love the notice. The question is already stored before this runs —
 * a dark rail must never lose her question, so a send failure is logged,
 * not thrown (mail.ts's own doctrine: the settle never dies here).
 */
export async function sendNotice(q: QaQuestion): Promise<void> {
  try {
    const to = reviewRecipients();
    if (to.length === 0) return;
    if ((await capRemaining()) < to.length) {
      console.error("qa notice held: the hour's mail cap is spent - the question is stored, the notice waits");
      return;
    }
    for (const addr of to) {
      await sendMail("news", {
        to: addr,
        subject: "A new Intuitive Q&A question",
        html: noticeHtml(q),
      });
    }
  } catch (err) {
    console.error("qa notice send failed (the question is stored):", err);
  }
}

/**
 * Love's reply to the asker (the admin route's "reply" action): the site
 * mails her words with the question quoted, THEN the row ticks answered.
 * A failed send throws to the route, the row stays open — she reads the
 * honest reason and nothing pretends to have gone.
 */
export async function replyToQuestion(id: string, reply: string): Promise<QaQuestion | null | "no-email"> {
  const found = await withRow(id, async (row) => row);
  if (!found) return null;
  if (!found.email) return "no-email";
  const html = brandShell(
    [
      `<p>Hello ${esc(found.who)},</p>`,
      `<p>You asked for this month&#39;s Intuitive Q&amp;A:</p>`,
      `<p style="margin:12px 0;padding:12px 16px;border-left:3px solid #E7B2C3;background:#141021;border-radius:0 10px 10px 0;">${escQuot(found.words)}</p>`,
      ...reply
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => `<p>${esc(l)}</p>`),
      `<p>With love,<br/>One Cocreation</p>`,
    ].join("\n"),
  );
  await sendMail("news", { to: found.email, subject: "Re: your Intuitive Q&A question", html });
  return withRow(id, async (row, doc, month) => {
    row.answeredAtMs = Date.now();
    row.answer = reply;
    await writeMonth(month, doc);
    return row;
  });
}

/* ── the box's meter (the sign-in box's idiom, TASK-185 K7) ───────────────
 * countSend/sendVerdict mirror code-door-limit.ts: INCR + EXPIRE over a
 * ten-minute window, keyed by the email given or the calling IP when none;
 * a bot cannot turn Love's mailer (the notice) against her inbox. No vault
 * (dev) reads as "allow", the same fail-open the mail module's onceWithin
 * carries. */

export const QA_SEND_WINDOW_S = 600;
export const QA_MAX_SENDS = 10;

export function qaSendVerdict(sends: number): "allow" | "hold" {
  return sends <= QA_MAX_SENDS ? "allow" : "hold";
}

export const QA_DOOR_HELD = "too many questions in a few minutes - give it a little while and send again";

/** The meter key: the email when given, else a hash of the caller's IP. */
export async function countQuestionSend(email: string | null, ip: string | null): Promise<number> {
  if (!vaultOn()) return 0; // dev: the door stays open
  const keyPart = email
    ? `e:${email.toLowerCase()}`
    : `ip:${createHash("sha256").update(ip ?? "unknown").digest("hex").slice(0, 16)}`;
  const key = `qa:questions:sends:${keyPart}`;
  const sends = Number((await kv(["INCR", key])) ?? 1);
  await kv(["EXPIRE", key, String(QA_SEND_WINDOW_S)]);
  return sends;
}
