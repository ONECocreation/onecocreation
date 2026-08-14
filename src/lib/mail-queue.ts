import { sendMail, capRemaining } from "./mail";
import { unsubscribeUrl } from "./subscribers";

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
   *  dropped, never a ghost letter) */
  guard?: { kind: "cart-hold"; cartId: string; holdId: string };
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
    if (item.notBefore && item.notBefore > Date.now()) {
      await kv(["LPUSH", QUEUE, raw]); // not ripe — back of the line, next tick
      continue;
    }
    if (item.guard?.kind === "cart-hold") {
      const { getCart } = await import("./cart");
      const cart = await getCart(item.guard.cartId);
      const line = cart.lines.find((l) => l.slot?.holdId === item.guard?.holdId);
      if (!line || (line.slot?.holdUntilMs ?? 0) <= Date.now()) continue; // moment passed — drop in silence
    }
    try {
      const unsub = unsubscribeUrl(item.to);
      await sendMail("news", { to: item.to, subject: item.subject, html: item.html, unsubscribeUrl: unsub });
      sent++;
      budget--;
    } catch (err) {
      const attempts = (item.attempts ?? 0) + 1;
      if (attempts < MAX_ATTEMPTS) {
        await kv(["LPUSH", QUEUE, JSON.stringify({ ...item, attempts })]);
        requeued++;
      } else {
        failed++;
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
