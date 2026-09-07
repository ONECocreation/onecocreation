import { createHmac } from "node:crypto";

/**
 * The subscriber list — a first-class record, not a signup blob (flow 4's
 * doctrine: know who is on what list). Lives in the private vault beside
 * orders; the same honesty rule applies — no vault, no silent pretend-joins.
 *
 * Unsubscribe is a signed link, not a login: HMAC(email, SEAT_SECRET) means
 * the link in the mail is proof enough, one click, no account needed.
 */

export interface SubscriberRecord {
  email: string;
  joinedAtMs: number;
  /** where they came in: footer, meditation, member (auto opt-in doctrine) */
  source: string;
  /** doctrine: paying members are opted in by default, off switch in profile */
  optedOut?: boolean;
  npub?: string;
}

const INDEX = "mail:subscribers";
const recKey = (email: string) => `mail:sub:${email.toLowerCase()}`;

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

export function subscribersConfigured(): boolean {
  return restEnv() !== null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) throw new Error("subscriber vault not configured");
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`subscriber vault: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

export async function addSubscriber(
  email: string,
  source: string,
  npub?: string,
): Promise<{ added: boolean; already: boolean }> {
  const rec: SubscriberRecord = { email: email.toLowerCase(), joinedAtMs: Date.now(), source, npub };
  const existing = await kv(["GET", recKey(email)]);
  if (existing) {
    // re-join clears a prior opt-out — they asked again, honor it
    const prior = JSON.parse(existing as string) as SubscriberRecord;
    if (prior.optedOut) {
      prior.optedOut = false;
      await kv(["SET", recKey(email), JSON.stringify(prior)]);
      return { added: true, already: false };
    }
    return { added: false, already: true };
  }
  await kv(["SET", recKey(email), JSON.stringify(rec)]);
  await kv(["SADD", INDEX, rec.email]);
  return { added: true, already: false };
}

export async function removeSubscriber(email: string): Promise<void> {
  const existing = await kv(["GET", recKey(email)]);
  if (!existing) return;
  const rec = JSON.parse(existing as string) as SubscriberRecord;
  rec.optedOut = true; // keep the record — "who was on what list" includes who left
  await kv(["SET", recKey(email), JSON.stringify(rec)]);
  await kv(["SREM", INDEX, email.toLowerCase()]);
}

/* TASK-131 (0018.06.16 a₿): segments are READ FROM THE RECORDS — no
 * per-source index to backfill or drift; the record's `source` is the one
 * source of truth and opted-out souls are already out of the index. */
async function readRecords(emails: string[]): Promise<SubscriberRecord[]> {
  const out: SubscriberRecord[] = [];
  for (const email of emails) {
    const raw = (await kv(["GET", recKey(email)])) as string | null;
    if (!raw) continue;
    try {
      out.push(JSON.parse(raw) as SubscriberRecord);
    } catch {
      /* a corrupt record is skipped, never guessed */
    }
  }
  return out;
}

export async function listSubscribers(filter: { source?: string } = {}): Promise<string[]> {
  const emails = ((await kv(["SMEMBERS", INDEX])) as string[]) ?? [];
  if (!filter.source) return emails;
  return (await readRecords(emails)).filter((r) => r.source === filter.source).map((r) => r.email);
}

/** Every door with live souls behind it, with counts — DERIVED from the
 *  records, never a hardcoded list. The send panel renders this verbatim. */
export async function subscriberSegments(): Promise<{ source: string; count: number }[]> {
  const emails = ((await kv(["SMEMBERS", INDEX])) as string[]) ?? [];
  const bySource = new Map<string, number>();
  for (const rec of await readRecords(emails)) {
    bySource.set(rec.source, (bySource.get(rec.source) ?? 0) + 1);
  }
  return [...bySource.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
}

/** Send-time truth (the mail-queue's `subscribed` guard): a soul who left
 *  while the letter waited in the queue never receives it. */
export async function isSubscribed(email: string): Promise<boolean> {
  const raw = (await kv(["GET", recKey(email)])) as string | null;
  if (!raw) return false;
  return !(JSON.parse(raw as string) as SubscriberRecord).optedOut;
}

export async function subscriberCount(): Promise<number> {
  return Number((await kv(["SCARD", INDEX])) ?? 0);
}

/* ── the signed unsubscribe link ─────────────────────────────────────────── */

export function unsubscribeToken(email: string): string {
  const secret = process.env.SEAT_SECRET || "";
  return createHmac("sha256", secret).update(email.toLowerCase()).digest("hex").slice(0, 32);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  return !!token && unsubscribeToken(email) === token;
}

export function siteBase(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;
  return "http://localhost:3000";
}

export function unsubscribeUrl(email: string): string {
  const e = encodeURIComponent(email.toLowerCase());
  return `${siteBase()}/api/unsubscribe?e=${e}&t=${unsubscribeToken(email)}`;
}
