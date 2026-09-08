import crypto from "crypto";
import { getItem, kv, type OrderRecord } from "./store";
import { getLetterOverride, LETTER_DEFAULTS, bodyToHtml } from "./letters";
import { sendMail, brandShell } from "./mail";
import { siteBase } from "./subscribers";
import { priceWords, defaultPreferOf, type MoneyPrefer, type PriceLike } from "./money-words";
import { liveAdapter } from "./payments";

/**
 * TASK-173 (0018.06.17 a₿ · block 966094) — the order receipt + the download
 * door, one home.
 *
 * Two halves:
 *
 * 1. THE RECEIPT LETTER (`order-receipt` in letters.ts, Love's words
 *    override-able in /a/letters, audience one-soul). Sent ONCE when an order
 *    settles — the call lives in store.ts's recordChargeEvent, the one settle
 *    point the BTCPay AND Square webhooks share, so both rails pour from this
 *    same jug. Idempotent on the order id: a KV marker
 *    `order:<id>:receipt-sent` (SET NX) — a retried webhook, a reconcile
 *    re-flip, a raced double settle all no-op after the first send. Booking
 *    orders are skipped: their confirmation letter already rides
 *    mail-booking. From the site's sending address — the same `bookings`
 *    persona the sign-in codes use. The letter carries what was bought and,
 *    for a digital item, THE DOWNLOAD DOOR — the signed receipt-page link,
 *    never the file URL itself (THE LEAK RULE).
 *
 * 2. THE KEY (unlock without a second ceremony): a per-order signed token,
 *    HMAC over the order id + the buyer's email with the house secret
 *    (SEAT_SECRET — the same one the sessions ride), 90-day expiry (never
 *    shorter than the 30-day session it opens). Deterministic, so the Square
 *    return URL at checkout and the receipt letter at settle carry the SAME
 *    key. The email never travels in the token — it is re-derived from the
 *    order at verify time (and survives the PII purge via the
 *    entitlementSubject, which is never purged). Guard: the key only ever
 *    unlocks that ONE order's email session; log nothing but the order id.
 */

/** ~90 days: comfortably past the 30-day session it opens (spec floor: 30). */
export const ORDER_KEY_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function secret(): string | null {
  return process.env.SEAT_SECRET?.trim() || null;
}

function hmac(payload: string): string {
  return crypto.createHmac("sha256", secret()!).update(payload).digest("hex");
}

/** The buyer's email, from the record — contact first (pre-purge), then the
 *  entitlement subject (`soul@host.tld@email`), which the PII purge keeps. */
export function buyerEmailOf(order: OrderRecord): string | null {
  const c = order.contact?.email?.trim().toLowerCase();
  if (c) return c;
  const s = order.entitlementSubject ?? "";
  if (s.endsWith("@email")) {
    const email = s.slice(0, -"@email".length).toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email;
  }
  return null;
}

/** Mint the key for (order id, email) — the shape the checkout route uses
 *  before the order settles and the letter uses at settle; one deterministic
 *  answer per (order, email, expiry window). Null when the house secret is
 *  dark (sign-ins would be too) — the door degrades, never lies. */
export function mintOrderKeyFor(orderId: string, email: string, nowMs = Date.now()): string | null {
  if (!secret()) return null;
  const exp = nowMs + ORDER_KEY_TTL_MS;
  return `${exp}.${hmac(`${orderId}|${email}|${exp}`)}`;
}

export function mintOrderKey(order: OrderRecord, nowMs = Date.now()): string | null {
  const email = buyerEmailOf(order);
  return email ? mintOrderKeyFor(order.id, email, nowMs) : null;
}

/** Verify a presented key against the order's OWN derived email. Answers the
 *  email it unlocks so the caller never re-derives it — the key opens that
 *  one order's email session and nothing else. */
export function verifyOrderKey(order: OrderRecord, key: string): { ok: true; email: string } | { ok: false } {
  const email = buyerEmailOf(order);
  if (!email || !secret()) return { ok: false };
  const m = key.match(/^(\d+)\.([a-f0-9]{64})$/);
  if (!m) return { ok: false };
  const exp = Number(m[1]);
  if (!Number.isFinite(exp) || Date.now() > exp) return { ok: false };
  const expected = hmac(`${order.id}|${email}|${exp}`);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(m[2]), Buffer.from(expected))) return { ok: false };
  } catch {
    return { ok: false };
  }
  return { ok: true, email };
}

/** The receipt-page door the letter and the return URL carry. */
export function orderDoorUrl(order: OrderRecord, base: string): string {
  const key = mintOrderKey(order);
  return `${base}/store/order/${order.id}${key ? `?key=${key}` : ""}`;
}

const receiptMarker = (orderId: string) => `order:${orderId}:receipt-sent`;

export type ReceiptResult = { sent: true } | { sent: false; reason: string };

/** TASK-186 (0018.06.18 a₿) — the letter's amount reads through THE ONE
 *  DISPLAY LAW (priceWords), server side: the member's saved money word
 *  (the profile's additive moneyPrefer field) wins, else the rail-judged
 *  default — fiat when the card rail is live. The snapshot is the one
 *  currency that was actually CHARGED — history, not an offer — so both
 *  rails read live here and a single-denomination price shows alone,
 *  whichever way the preference leans. */
async function receiptAmountWords(order: OrderRecord): Promise<string> {
  const email = buyerEmailOf(order);
  let memberPrefer: MoneyPrefer | null = null;
  if (email) {
    try {
      const raw = (await kv(["GET", `member:profile:${email}`])) as { result?: string | null };
      const p = raw?.result ? (JSON.parse(raw.result) as { moneyPrefer?: unknown }) : null;
      memberPrefer = p?.moneyPrefer === "fiat" || p?.moneyPrefer === "sats" ? p.moneyPrefer : null;
    } catch {
      /* a profile the vault can't reach never holds the letter back */
    }
  }
  const prefer =
    memberPrefer ?? defaultPreferOf({ btc: liveAdapter() !== null, card: liveAdapter("square") !== null });
  const price: PriceLike =
    order.priceSnapshot.currency === "SATS"
      ? { sats: order.priceSnapshot.amount }
      : { fiat: { amount: order.priceSnapshot.amount, currency: order.priceSnapshot.currency } };
  return priceWords(price, { btc: true, card: true }, prefer).primary;
}

/** The letter itself — subject + rendered html for a settled order. Pure
 *  (no marker, no send): the words + slots, the signed door when a line
 *  truly carries a digital deliverable. Exported so the letter can be
 *  rendered for review without mailing anyone. */
export async function buildReceiptLetter(order: OrderRecord): Promise<{ subject: string; html: string }> {
  const amountWords = await receiptAmountWords(order);
  const items = order.lineItems
    .map((l) => `• ${l.title}${l.qty > 1 ? ` × ${l.qty}` : ""}${l.size ? ` (size ${l.size})` : ""}`)
    .join("\n");
  const lines = `${items}\n\nAs paid: ${amountWords}`;

  /* the download door — only when a line's catalog record truly carries a
     digital deliverable; the signed receipt-page link, NEVER the file URL */
  let door: string | null = null;
  for (const li of order.lineItems) {
    const item = await getItem(li.itemId);
    if (item?.media?.deliverable) {
      const key = mintOrderKey(order);
      if (key) {
        door = `Your download door — signed for you alone, no sign-in needed:\n[Open your download](${siteBase()}/store/order/${order.id}?key=${key})`;
      }
      break;
    }
  }

  const tpl = (await getLetterOverride("order-receipt")) ?? LETTER_DEFAULTS["order-receipt"];
  const subject = tpl?.subject ?? "Your order — received with love";
  let body = tpl?.body ?? `Thank you — your order is settled.\n\n{{lines}}\n\n{{door}}`;
  /* the offer-letters doctrine: a slot Love edits out is appended at the
     end — nothing load-bearing (what was bought, the door) can be lost */
  const hadLines = body.includes("{{lines}}");
  const hadDoor = body.includes("{{door}}");
  body = body.replace("{{lines}}", lines).replace("{{door}}", door ?? "");
  if (!hadLines) body += `\n\n${lines}`;
  if (door && !hadDoor) body += `\n\n${door}`;
  body = body.replace(/\n{3,}/g, "\n\n").trim();

  return { subject, html: brandShell(bodyToHtml(body)) };
}

/**
 * Send the receipt letter ONCE per settled order. Never throws at its caller
 * beyond vault/send failures it can't honor — a mail-rail hiccup must not
 * cost the money path its state flip (the caller catches).
 */
export async function sendOrderReceipt(order: OrderRecord): Promise<ReceiptResult> {
  if (!["settled", "fulfilled"].includes(order.state)) {
    return { sent: false, reason: `order is ${order.state}` };
  }
  /* booking orders already mail their own confirmation (mail-booking.ts) —
     the store receipt would be a second letter for the same moment */
  if (order.bookingId || order.lineItems.some((l) => l.bookingId)) {
    return { sent: false, reason: "a booking order — its own letter rides" };
  }
  const email = buyerEmailOf(order);
  if (!email) return { sent: false, reason: "no buyer email on the order" };

  /* the idempotency marker: SET NX answers "OK" exactly once. No vault
     (the dev file driver) → no marker is possible; send and say so. */
  const marked = await kv(["SET", receiptMarker(order.id), "1", "NX"]);
  if (marked !== null && marked.result !== "OK") {
    return { sent: false, reason: "receipt already sent" };
  }

  const { subject, html } = await buildReceiptLetter(order);
  await sendMail("bookings", { to: email, subject, html });
  return { sent: true };
}
