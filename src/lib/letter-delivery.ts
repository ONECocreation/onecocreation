import { createHash, randomUUID } from "crypto";
import { capRemaining, sendMail, brandShell } from "./mail";
import { getLetterOverride, isLetterKey } from "./letters";
import { getSendRecord, recentSendsForLetter, type SendRecord } from "./mail-queue";
import { offerNotifyTo } from "./pwyc-letters";
import { siteBase, validEmail } from "./subscribers";
import { deliveryNotice, type DeliverySummary } from "./letter-delivery-copy";

/** Existing REST vault and SMTP only. No subscriber send or queue-drain calls here. */
export async function deliveryKv(cmd: unknown[]): Promise<unknown> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("delivery vault unavailable");
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(cmd), cache: "no-store" });
  if (!res.ok) throw new Error(`delivery vault ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error("delivery vault command failed");
  return data.result;
}
const INTENTS = "letters:schedule-intents";
const NOTICES = "letters:delivery-notices";
const HEARTBEAT = "mail:last-completed-tick";
export interface ScheduleIntent { id: string; at: string }
export async function getScheduleIntent(key: string): Promise<ScheduleIntent | null> {
  const raw = await deliveryKv(["HGET", INTENTS, key]);
  return raw ? JSON.parse(String(raw)) : null;
}
export async function saveScheduleIntent(key: string, at: string | null): Promise<ScheduleIntent | null> {
  if (!at) { await deliveryKv(["HDEL", INTENTS, key]); return null; }
  const prev = await getScheduleIntent(key);
  if (prev?.at === at) return prev;
  const intent = { id: randomUUID(), at };
  await deliveryKv(["HSET", INTENTS, key, JSON.stringify(intent)]);
  return intent;
}
export function summarizeDelivery(sends: SendRecord[], now = Date.now()): DeliverySummary {
  // An unfinished older send must not disappear behind a newer completed send.
  const s = sends.find((s) => !s.cancelled && s.sent + s.dropped < s.queued) ?? sends[0];
  if (!s) return { state: "draft" };
  const base = { sent: s.sent, queued: s.queued, dropped: s.dropped };
  if (s.cancelled) return { ...base, state: "cancelled" };
  if (s.sent + s.dropped >= s.queued) return { ...base, state: "sent" };
  if (s.sent + s.dropped === 0 && Date.parse(s.scheduledFor) > now) return { ...base, state: "scheduled", at: s.scheduledFor };
  return { ...base, state: "sending" };
}
export async function letterDeliverySummary(key: string): Promise<DeliverySummary> {
  try { return summarizeDelivery(await recentSendsForLetter(key, 8, true)); }
  catch { return { state: "unknown" }; }
}

interface Notice { sendId: string; subject: string }
/** A durable work item, retried by later ticks if SMTP or the cap holds it. */
export async function watchDelivery(sendId: string, subject: string): Promise<void> {
  await deliveryKv(["HSET", NOTICES, sendId, JSON.stringify({ sendId, subject })]);
}
function hashEntries(raw: unknown): [string, string][] {
  if (Array.isArray(raw)) { const out: [string, string][] = []; for (let i = 0; i < raw.length; i += 2) out.push([String(raw[i]), String(raw[i + 1])]); return out; }
  return Object.entries((raw ?? {}) as Record<string, string>);
}
function recipients(missed: boolean): string[] {
  return [...new Set([offerNotifyTo(), ...(missed ? (process.env.OPERATOR_EMAILS ?? "").split(",") : [])].map((s) => s.trim().toLowerCase()).filter(validEmail))];
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Per-recipient claim, permanent success marker; failures release for next tick.
 * SMTP acceptance followed by a process crash is inherently ambiguous, not exactly-once delivery. */
async function notifyOnce(id: string, missed: boolean, notice: { subject: string; body: string }): Promise<boolean> {
  const toList = recipients(missed);
  if (!toList.length) return false;
  for (const to of toList) {
    const k = `letters:notice:${createHash("sha256").update(`${id}:${to}`).digest("hex")}`;
    if (await deliveryKv(["GET", `${k}:sent`])) continue;
    if (await capRemaining() <= 0) return false;
    const claim = randomUUID();
    if (await deliveryKv(["SET", k, claim, "NX", "EX", "120"]) !== "OK") return false;
    try {
      // A second worker could have completed between our read and claim.
      if (!(await deliveryKv(["GET", `${k}:sent`]))) {
        await sendMail("news", { to, subject: notice.subject, html: brandShell(notice.body.split("\n\n").map((p) => `<p>${esc(p)}</p>`).join("")) });
        await deliveryKv(["SET", `${k}:sent`, "1"]);
      }
    } finally {
      await deliveryKv(["EVAL", "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0", 1, k, claim]);
    }
  }
  return true;
}
export async function processDeliveryNotices(now = Date.now()): Promise<void> {
  for (const [id, raw] of hashEntries(await deliveryKv(["HGETALL", NOTICES]))) {
    try {
      const item = JSON.parse(raw) as Notice;
      const s = await getSendRecord(item.sendId, true);
      if (!s) continue; // unknown is never sent or cancelled
      if (s.cancelled) { await deliveryKv(["HDEL", NOTICES, id]); continue; }
      const p = { subject: item.subject, at: s.scheduledFor, queued: s.queued, sent: s.sent, dropped: s.dropped, url: `${siteBase()}/a/letters/${encodeURIComponent(s.key)}` };
      if (s.scheduledFor !== "next tick" && !(await notifyOnce(`scheduled:${id}:${s.scheduledFor}`, false, deliveryNotice("scheduled", p)))) continue;
      if (s.sent + s.dropped >= s.queued && await notifyOnce(`sent:${id}`, false, deliveryNotice("sent", p))) await deliveryKv(["HDEL", NOTICES, id]);
    } catch { console.error("letter delivery notice deferred"); }
  }
  for (const [key, raw] of hashEntries(await deliveryKv(["HGETALL", INTENTS]))) {
    try {
      const intent = JSON.parse(raw) as ScheduleIntent;
      if (!Number.isFinite(Date.parse(intent.at)) || Date.parse(intent.at) > now) continue;
      if (!(await isLetterKey(key))) { await deliveryKv(["HDEL", INTENTS, key]); continue; }
      // STRICT read: an outage or dangling history ID can never become a missed note.
      if ((await recentSendsForLetter(key, 8, true)).length) continue;
      const tpl = await getLetterOverride(key);
      if (!tpl) continue;
      const p = { subject: tpl.subject, at: intent.at, queued: 0, sent: 0, dropped: 0, url: `${siteBase()}/a/letters/${encodeURIComponent(key)}` };
      await notifyOnce(`missed:${key}:${intent.id}`, true, deliveryNotice("missed", p));
    } catch { console.error("letter missed-moment check deferred"); }
  }
}
export async function recordMailTick(atMs: number): Promise<void> { await deliveryKv(["SET", HEARTBEAT, String(atMs)]); }
export async function lastMailTick(): Promise<number | null> {
  const raw = await deliveryKv(["GET", HEARTBEAT]);
  const n = Number(raw); return n > 0 && Number.isFinite(n) ? n : null;
}
