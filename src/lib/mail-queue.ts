import { sendMail, capRemaining } from "./mail";
import { unsubscribeUrl, isSubscribed } from "./subscribers";

/**
 * The drip queue (the Admiral's ask): blasts never fire at once. Publish
 * enqueues; a sender tick drains up to the hour's remaining cap; the console
 * meter reads these same numbers and tells the truth.
 *
 * The queue is a vault list of ready-to-send letters. Personalization
 * (the unsubscribe link) happens at SEND time so a queued letter is inert
 * data, not a live credential.
 */

const QUEUE = "mail:queue";
const MAX_ATTEMPTS = 3;

export interface QueuedMail {
  to: string;
  subject: string;
  html: string;
  attempts?: number;
  /** epoch ms — the letter waits in the queue until this moment (drip
   *  sequences: the day-two welcome, not a same-second double-send) */
  notBefore?: number;
  /** send-time condition — a cart-hold reminder only goes out while the
   *  hold still lives in that basket (checked out / lapsed = silently
   *  dropped, never a ghost letter). "subscribed" (TASK-131): a list letter
   *  only goes out while the soul is still on the list — an unsubscribe
   *  that lands while the letter waits in the queue kills that copy. */
  guard?: { kind: "cart-hold"; cartId: string; holdId: string } | { kind: "subscribed" };
  /** T-484 (walk item S7): every item from ONE list-send panel click
   *  carries the SAME sendId — this tick's own record of what actually
   *  happened against it (see the send-record block below). Absent for a
   *  test copy and for every other queue user (the cart/day-two drips) —
   *  those never touch `letters:send:*` at all. */
  sendId?: string;
}

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) throw new Error("mail queue: vault not configured");
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`mail queue: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

export async function enqueue(items: QueuedMail[]): Promise<number> {
  if (items.length === 0) return 0;
  await kv(["LPUSH", QUEUE, ...items.map((i) => JSON.stringify(i))]);
  return items.length;
}

export async function queueDepth(): Promise<number> {
  return Number((await kv(["LLEN", QUEUE])) ?? 0);
}

/* ── T-484 (walk item S7): the real sent state ────────────────────────────
 * One KV hash per list send, `letters:send:<sendId>` — queued (fixed at
 * publish time), sent/dropped (this tick, and every later one, bump them
 * live), the letter's key, its segment, when it goes out, and when it was
 * queued. 14-day TTL (SEND_TTL_SECONDS): a send's own history matters for
 * a couple of weeks, never forever. A second small key per LETTER,
 * `letters:sends:<key>`, holds the last few sendIds (newest first) so the
 * panel can list "the last few sends for this letter" after a reload
 * without scanning the whole vault. Every helper here fails CLOSED — a
 * KV hiccup recording the tally must never take down the send itself
 * (`enqueue` above already ran) or the tick that is draining it. */

const SEND_TTL_SECONDS = 14 * 24 * 3600;
const RECENT_SENDS_KEPT = 8;

const sendRecordKey = (sendId: string) => `letters:send:${sendId}`;
const sendsForLetterKey = (key: string) => `letters:sends:${key}`;

export interface SendRecord {
  key: string;
  segment: string;
  /** "next tick" or an ISO instant — exactly the send route's own `scheduledFor`. */
  scheduledFor: string;
  createdAtMs: number;
  queued: number;
  sent: number;
  dropped: number;
  /** Love pressed Cancel: every copy not yet mailed is dropped at the next tick. */
  cancelled: boolean;
}

/** REST KV hands a hash back as a flat `[field, value, field, value, …]`
 *  array (booking-orders.ts's own note: a different client shape returns
 *  a plain object) — this reads either. */
function parseHash(raw: unknown): Record<string, string> {
  if (Array.isArray(raw)) {
    const out: Record<string, string> = {};
    for (let i = 0; i + 1 < raw.length; i += 2) out[String(raw[i])] = String(raw[i + 1]);
    return out;
  }
  if (raw && typeof raw === "object") return raw as Record<string, string>;
  return {};
}

/** Written ONCE, right after `enqueue()` succeeds for a real list send
 *  (never a test copy). A failure here must never undo the send that
 *  already queued — the panel simply has no progress line to poll for
 *  this one send, same as any other best-effort read. */
export async function initSendRecord(
  sendId: string,
  info: { key: string; queued: number; segment: string; scheduledFor: string },
): Promise<void> {
  try {
    const k = sendRecordKey(sendId);
    await kv([
      "HSET", k,
      "key", info.key,
      "segment", info.segment,
      "scheduledFor", info.scheduledFor,
      "queued", String(info.queued),
      "sent", "0",
      "dropped", "0",
      "createdAtMs", String(Date.now()),
    ]);
    await kv(["EXPIRE", k, String(SEND_TTL_SECONDS)]);
  } catch {
    /* the send itself already queued — a record failure is not a send failure */
  }
}

/** The one letter → recent-sendIds list, newest first, trimmed to the
 *  last `RECENT_SENDS_KEPT` — the panel's "after a reload" list reads
 *  this, then looks up each id's own hash. */
export async function recordSendForLetter(key: string, sendId: string): Promise<void> {
  try {
    const k = sendsForLetterKey(key);
    await kv(["LPUSH", k, sendId]);
    await kv(["LTRIM", k, "0", String(RECENT_SENDS_KEPT - 1)]);
    await kv(["EXPIRE", k, String(SEND_TTL_SECONDS)]);
  } catch {
    /* the history list is a nicety — never the send itself */
  }
}

/** One send's current tally — `null` when the vault has no record (an
 *  unknown/expired sendId), never a thrown error into the route. */
export async function getSendRecord(sendId: string): Promise<SendRecord | null> {
  try {
    const h = parseHash(await kv(["HGETALL", sendRecordKey(sendId)]));
    if (!("queued" in h)) return null;
    return {
      key: h.key ?? "",
      segment: h.segment ?? "all",
      scheduledFor: h.scheduledFor ?? "next tick",
      createdAtMs: Number(h.createdAtMs ?? 0),
      queued: Number(h.queued ?? 0),
      sent: Number(h.sent ?? 0),
      dropped: Number(h.dropped ?? 0),
      cancelled: h.cancelled === "1",
    };
  } catch {
    return null;
  }
}

/* ── Cancel and Change time (the Admiral's ask, block 975,433) ─────────────
 * A queued copy is inert data in a shared list, so neither press edits the
 * queue itself (a tick may hold that copy between RPOP and LPUSH). Both
 * write to the send's OWN record instead, and `tick()` reads that record
 * before it mails any copy carrying the sendId: `cancelled` drops the copy,
 * `atMs` replaces the copy's own `notBefore`. */

/** Cancel and Change time are offered only while nothing has gone out. */
export function sendIsChangeable(rec: Pick<SendRecord, "sent" | "dropped" | "cancelled">): boolean {
  return !rec.cancelled && rec.sent + rec.dropped === 0;
}

type SendChange = { ok: true; record: SendRecord } | { ok: false; reason: string };

export async function cancelSend(sendId: string): Promise<SendChange> {
  const rec = await getSendRecord(sendId);
  if (!rec) return { ok: false, reason: "That send is no longer on record." };
  if (!sendIsChangeable(rec)) return { ok: false, reason: rec.cancelled ? "That send is already cancelled." : "That send has started going out, so it can no longer be cancelled." };
  await kv(["HSET", sendRecordKey(sendId), "cancelled", "1"]);
  return { ok: true, record: { ...rec, cancelled: true } };
}

export async function rescheduleSend(sendId: string, atMs: number): Promise<SendChange> {
  const rec = await getSendRecord(sendId);
  if (!rec) return { ok: false, reason: "That send is no longer on record." };
  if (!sendIsChangeable(rec)) return { ok: false, reason: rec.cancelled ? "That send is cancelled." : "That send has started going out, so its time can no longer change." };
  const scheduledFor = new Date(atMs).toISOString();
  await kv(["HSET", sendRecordKey(sendId), "scheduledFor", scheduledFor, "atMs", String(atMs)]);
  return { ok: true, record: { ...rec, scheduledFor } };
}

/** The addresses still waiting in the queue for one send (Cancel and Change
 *  time use it to keep each member's own /letters mailbox honest). */
export async function queuedRecipients(sendId: string): Promise<string[]> {
  try {
    const raw = ((await kv(["LRANGE", QUEUE, "0", "-1"])) as string[] | null) ?? [];
    const out: string[] = [];
    for (const r of raw) {
      try {
        const item = JSON.parse(r) as QueuedMail;
        if (item.sendId === sendId) out.push(item.to);
      } catch { /* a corrupt entry is tick()'s to drop */ }
    }
    return out;
  } catch {
    return [];
  }
}

/** What `tick()` needs from a send's record: null = no record (send as queued). */
async function readSendControl(sendId: string): Promise<{ cancelled: boolean; atMs?: number } | null> {
  try {
    const h = parseHash(await kv(["HGETALL", sendRecordKey(sendId)]));
    if (!("queued" in h)) return null;
    const atMs = h.atMs ? Number(h.atMs) : undefined;
    return { cancelled: h.cancelled === "1", atMs: Number.isFinite(atMs) ? atMs : undefined };
  } catch {
    return null;
  }
}

/** The last few sends for one letter, newest first, each with its own
 *  tally — an id whose hash has already expired (past the 14-day TTL) is
 *  simply left out, never a gap the caller has to explain. */
export async function recentSendsForLetter(
  key: string,
  limit = 5,
): Promise<Array<SendRecord & { sendId: string }>> {
  try {
    const ids = ((await kv(["LRANGE", sendsForLetterKey(key), "0", String(limit - 1)])) as string[] | null) ?? [];
    const out: Array<SendRecord & { sendId: string }> = [];
    for (const sendId of ids) {
      const rec = await getSendRecord(sendId);
      if (rec) out.push({ ...rec, sendId });
    }
    return out;
  } catch {
    return [];
  }
}

/** `tick()`'s own call, once per queued item that just resolved (sent OR
 *  dropped, never for a requeue — that copy hasn't resolved yet). A silent
 *  no-op when the item carries no sendId (a test copy, the cart/day-two
 *  drips) or the bump itself fails — the tally is best-effort, the send
 *  it describes already happened either way. */
async function bumpSendOutcome(sendId: string | undefined, field: "sent" | "dropped"): Promise<void> {
  if (!sendId) return;
  try {
    const k = sendRecordKey(sendId);
    await kv(["HINCRBY", k, field, "1"]);
    await kv(["EXPIRE", k, String(SEND_TTL_SECONDS)]);
  } catch {
    /* best-effort — the delivery itself already happened either way */
  }
}

export interface TickResult {
  sent: number;
  failed: number;
  requeued: number;
  remainingInQueue: number;
  capLeftThisHour: number;
}

/** Drain up to the hour's remaining cap. Safe to call from cron, from a
 *  console button, or opportunistically — the meter is the throttle. */
export async function tick(): Promise<TickResult> {
  let sent = 0;
  let failed = 0;
  let requeued = 0;

  let budget = await capRemaining();
  // Inspect each queued letter at most once per tick — otherwise a queue of
  // all not-yet-ripe letters would spin forever between RPOP and LPUSH.
  let inspected = 0;
  const controls = new Map<string, { cancelled: boolean; atMs?: number } | null>();
  const initialDepth = await queueDepth();
  while (budget > 0 && inspected < initialDepth) {
    const raw = (await kv(["RPOP", QUEUE])) as string | null;
    if (!raw) break;
    inspected++;
    let item: QueuedMail;
    try {
      item = JSON.parse(raw) as QueuedMail;
    } catch {
      failed++;
      continue; // a corrupt entry dies quietly rather than jamming the line
    }
    // Cancel and Change time live on the send's own record, read once per tick
    let control: { cancelled: boolean; atMs?: number } | null = null;
    if (item.sendId) {
      if (!controls.has(item.sendId)) controls.set(item.sendId, await readSendControl(item.sendId));
      control = controls.get(item.sendId) ?? null;
    }
    if (control?.cancelled) {
      await bumpSendOutcome(item.sendId, "dropped"); // Love cancelled this send — the copy never goes out
      continue;
    }
    const due = control?.atMs ?? item.notBefore;
    if (due && due > Date.now()) {
      await kv(["LPUSH", QUEUE, raw]); // not ripe — back of the line, next tick
      continue;
    }
    if (item.guard?.kind === "cart-hold") {
      const hold = item.guard;
      const { getCart } = await import("./cart");
      const cart = await getCart(hold.cartId);
      const line = cart.lines.find((l) => l.slot?.holdId === hold.holdId);
      if (!line || (line.slot?.holdUntilMs ?? 0) <= Date.now()) {
        await bumpSendOutcome(item.sendId, "dropped"); // moment passed — drop in silence
        continue;
      }
    }
    if (item.guard?.kind === "subscribed" && !(await isSubscribed(item.to))) {
      await bumpSendOutcome(item.sendId, "dropped"); // left the list while the letter waited — drop in silence
      continue;
    }
    try {
      const unsub = unsubscribeUrl(item.to);
      await sendMail("news", { to: item.to, subject: item.subject, html: item.html, unsubscribeUrl: unsub });
      sent++;
      budget--;
      await bumpSendOutcome(item.sendId, "sent");
    } catch (err) {
      const attempts = (item.attempts ?? 0) + 1;
      if (attempts < MAX_ATTEMPTS) {
        await kv(["LPUSH", QUEUE, JSON.stringify({ ...item, attempts })]);
        requeued++;
      } else {
        failed++;
        await bumpSendOutcome(item.sendId, "dropped");
        console.error(`mail queue: dropped after ${MAX_ATTEMPTS} attempts →`, item.to, err);
      }
      // an SMTP refusal often means the relay is unhappy — stop the tick,
      // let the next one try with a cooler head
      break;
    }
  }

  return {
    sent,
    failed,
    requeued,
    remainingInQueue: await queueDepth(),
    capLeftThisHour: await capRemaining(),
  };
}
