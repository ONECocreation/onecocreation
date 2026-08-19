import crypto from "crypto";
import { decidePwyc, getOrder, attachCharge, type OrderRecord } from "./store";
import { btcpayRefundLink } from "./payments";
import { enqueue } from "./mail-queue";
import { brandShell, pill } from "./mail";
import { getLetterOverride, bodyToHtml, LETTER_DEFAULTS, type LetterKey } from "./letters";
import { siteBase } from "./subscribers";

/**
 * OFFER-BY-EMAIL (Love's ask, Admiral 0018.05.23): a give-what-you-can offer
 * under list price used to wait quietly for Love to open the desk. Now the
 * offer WRITES to her — who, what, offered vs listed — with two one-tap
 * doors that ride the same decidePwyc machinery the desk uses. The doors are
 * HMAC-signed one-time tokens (SEAT_SECRET, 7 days, single-use via a vault
 * marker), so the letter is a key, not a password.
 *
 * This module is the ONE place the decision letters are composed — the /a
 * desk and the email doors both pour from this jug, and the words prefer the
 * Letters-room overrides ('offer-love-notify', 'pwyc-accept', 'pwyc-decline').
 */

export type OfferAction = "accept" | "decline";

/** Where the offer letters knock — Love's own door. */
export function offerNotifyTo(): string {
  return process.env.OFFER_NOTIFY_EMAIL?.trim() || "love@onecocreation.com";
}

const OFFER_TTL_MS = 7 * 24 * 60 * 60 * 1000; // seven days, then the desk

function secret(): string {
  const s = process.env.SEAT_SECRET?.trim();
  if (!s) throw new Error("SEAT_SECRET not configured");
  return s;
}

function hmac(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

/** `<orderId>.<action>.<exp>.<sig>` — order ids are 24 hex chars, dot-free. */
export function makeOfferToken(orderId: string, action: OfferAction): string {
  const exp = Date.now() + OFFER_TTL_MS;
  return `${orderId}.${action}.${exp}.${hmac(`offer|${orderId}|${action}|${exp}`)}`;
}

export function verifyOfferToken(token: string | null | undefined): { orderId: string; action: OfferAction } | null {
  if (!token) return null;
  const [orderId, action, exp, sig] = token.split(".");
  if (!orderId || !exp || !sig) return null;
  if (action !== "accept" && action !== "decline") return null;
  if (Date.now() > Number(exp)) return null;
  const expected = hmac(`offer|${orderId}|${action}|${exp}`);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return { orderId, action };
}

/* ── the single-use marker (vault) — a second click meets "already decided" ── */

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) return null;
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`offer marker: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

const markerKey = (orderId: string) => `oc:offer:decided:${orderId}`;

export interface OfferDecisionMarker {
  decision: OfferAction;
  atMs: number;
  via: "desk" | "email";
}

export async function offerDecision(orderId: string): Promise<OfferDecisionMarker | null> {
  try {
    const raw = (await kv(["GET", markerKey(orderId)])) as string | null;
    return raw ? (JSON.parse(raw) as OfferDecisionMarker) : null;
  } catch {
    return null;
  }
}

async function markDecided(orderId: string, decision: OfferAction, via: "desk" | "email"): Promise<void> {
  try {
    await kv(["SET", markerKey(orderId), JSON.stringify({ decision, atMs: Date.now(), via } satisfies OfferDecisionMarker)]);
  } catch {
    /* the order's own events remain the ledger of record */
  }
}

/* ── letter assembly: overrides first, built-in words as the floor ── */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Slots ({{lines}}, {{doors}}, …) let Love move the machine-built parts
 *  around in her own words; a slot she doesn't place is appended at the end
 *  so the load-bearing pieces can never be edited away. */
async function letterFor(
  key: LetterKey,
  slots: Record<string, string>,
): Promise<{ subject: string; html: string }> {
  const tpl = (await getLetterOverride(key)) ?? LETTER_DEFAULTS[key];
  if (!tpl) throw new Error(`no words for letter ${key}`);
  let body = tpl.body;
  const placed = new Set<string>();
  for (const k of Object.keys(slots)) {
    const ph = `{{${k}}}`;
    if (body.includes(ph)) {
      body = body.split(ph).join(`\u0000${k}\u0000`);
      placed.add(k);
    }
  }
  let html = bodyToHtml(body);
  for (const k of placed) {
    // a slot standing alone becomes its own block (valid html); inline stays inline
    html = html
      .split(`<p style="margin:0 0 1.15em;line-height:1.75;">\u0000${k}\u0000</p>`)
      .join(slots[k]);
    html = html.split(`\u0000${k}\u0000`).join(slots[k]);
  }
  const appended = Object.keys(slots)
    .filter((k) => !placed.has(k))
    .map((k) => slots[k])
    .join("\n");
  return { subject: tpl.subject, html: html + appended };
}

/** Where the decision letter goes — the receipt email, or the email door. */
export function orderEmail(order: OrderRecord): string | null {
  if (order.contact?.email) return order.contact.email;
  const s = order.entitlementSubject;
  return s?.endsWith("@email") ? s.slice(0, -"@email".length) : null;
}

export function offeredLines(order: OrderRecord) {
  return order.lineItems.filter(
    (l) => l.offerSats != null && l.listSats != null && l.offerSats < l.listSats,
  );
}

function linesHtml(order: OrderRecord): string {
  const items = offeredLines(order)
    .map((l) => `<li><b>${esc(l.title)}</b> — offered ${l.offerSats!.toLocaleString()} sats (listed ${l.listSats!.toLocaleString()})</li>`)
    .join("");
  return `<ul style="margin:0 0 1.15em;padding-left:22px;line-height:1.75;">${items}</ul>`;
}

/** Buyer-side lines wear softer words — "your N sats". */
function buyerLinesHtml(order: OrderRecord): string {
  const items = offeredLines(order)
    .map((l) => `<li><b>${esc(l.title)}</b> — your ${l.offerSats!.toLocaleString()} sats (listed ${l.listSats!.toLocaleString()})</li>`)
    .join("");
  return `<ul style="margin:0 0 1.15em;padding-left:22px;line-height:1.75;">${items}</ul>`;
}

/* ── TASK 1a: the offer letter to Love — born with the order at checkout ── */

export async function sendOfferNotify(order: OrderRecord): Promise<void> {
  const offered = offeredLines(order);
  if (offered.length === 0) return;
  const who = order.contact?.email ?? order.entitlementSubject ?? "an anonymous soul";
  const gap = offered.reduce((n, l) => n + (l.listSats! - l.offerSats!), 0);
  const base = siteBase();
  const acceptUrl = `${base}/api/offer-action?token=${makeOfferToken(order.id, "accept")}`;
  const declineUrl = `${base}/api/offer-action?token=${makeOfferToken(order.id, "decline")}`;

  const slots = {
    who: `<p style="margin:0 0 1.15em;line-height:1.75;">From <b>${esc(who)}</b> · order ${order.id.slice(0, 8)}</p>`,
    // S2: stays literal — inboxes don't resolve var() (integrator ruling 0018.05.25 a₿).
    lines:
      linesHtml(order) +
      `<p style="margin:0 0 1.15em;line-height:1.75;color:#6b6478;">The gap: <b>${gap.toLocaleString()} sats</b> — accepted, the Pay-It-Forward jar may carry it.</p>`,
    doors: `<div style="margin:6px 0 18px;">${pill(acceptUrl, "💛 Accept with love", "lg")}&nbsp;&nbsp;${pill(declineUrl, "🕊️ Decline, with care", "lg")}</div>`,
  };

  const { subject, html } = await letterFor("offer-love-notify", slots);
  await enqueue([{ to: offerNotifyTo(), subject, html: brandShell(html) }]);
}

/* ── TASK 1b: the decision — ONE machinery for the desk and the email doors ── */

export interface OfferDecisionResult {
  order: OrderRecord;
  refundLink: string | null;
}

/**
 * Calls decidePwyc, mints the refund link on a paid decline, sends the kind
 * buyer letter (overrides preferred), and drops the single-use marker.
 * Returns null when no offer is pending (already decided, or no such order).
 */
export async function decideOfferWithLetters(
  orderId: string,
  decision: OfferAction,
  via: "desk" | "email",
): Promise<OfferDecisionResult | null> {
  const accept = decision === "accept";
  const order = await decidePwyc(orderId, decision);
  if (!order) return null;

  // DECLINE on a settled order: mint the pull-payment refund so the letter
  // carries a real claim link. Unpaid/expired = nothing to refund.
  let refundLink: string | null = null;
  if (!accept && ["settled", "fulfilled"].includes(order.state)) {
    const lastCharge = order.chargeIds[order.chargeIds.length - 1];
    if (lastCharge) {
      refundLink = await btcpayRefundLink(lastCharge);
      if (refundLink) {
        await attachCharge(order.id, `refund:${refundLink}`);
      }
    }
  }

  // the decision letter — kind either way, never silent
  const to = orderEmail(order);
  if (to) {
    const slots: Record<string, string> = { lines: buyerLinesHtml(order) };
    if (!accept) {
      // S2: refund-door gold stays literal — inboxes don't resolve var()
      // (integrator ruling 0018.05.25 a₿); money surface, gold law intact.
      slots.refund = refundLink
        ? `<p style="text-align:center;margin:24px 0;"><a href="${refundLink}" style="background:#b4862b;color:#fff;padding:12px 26px;border-radius:999px;text-decoration:none;">Claim your sats back</a></p>
           <p style="margin:0 0 1.15em;line-height:1.75;">The link lets you take them over lightning or on-chain — your pick.</p>`
        : `<p style="margin:0 0 1.15em;line-height:1.75;">Reply to this letter with a lightning address or invoice and they'll be on their way.</p>`;
    }
    try {
      const { subject, html } = await letterFor(accept ? "pwyc-accept" : "pwyc-decline", slots);
      await enqueue([{ to, subject, html: brandShell(html) }]);
    } catch {
      /* the ledger already holds the decision; the letter can be resent */
    }
  }

  await markDecided(order.id, decision, via);
  return { order, refundLink };
}

/** For the confirmation page — a peek at the order without deciding. */
export { getOrder };
