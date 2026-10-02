import { getItem, kv, type OrderRecord } from "./store";
import { getSiteConfig } from "./site-config";
import { getBooking } from "./booking-orders";
import { TIERS, TIER_TERM_DAYS, isTier, packageDays, type Tier } from "./entitlement";
import { buyerEmailOf } from "./order-receipt";
import { offerNotifyTo, letterFor } from "./pwyc-letters";
import { sendMail } from "./mail";

/**
 * TASK-518 (block 969,339 · ruling of record K131) — LOVE KNOWS WHO BOUGHT.
 * Every settled purchase (membership, pass, package, booking, store order,
 * gift) sends Love ONE short letter at her notice address (offerNotifyTo(),
 * the same door the offer letters knock at): who bought (the email as
 * given, plus the name when the order or its booking truly carries one),
 * what (line titles with qty, gift lines naming their recipient), which
 * tier or pass and until when ("for N days" from the catalog, never an
 * absolute date this module computes — the grant's clock is the settle's
 * own Date.now() and a letter-computed date could drift by a webhook's
 * delay), the amount as charged (priceSnapshot verbatim, the ledger's
 * answer — never the buyer-facing preference words), and one write-back
 * button (a mailto to the buyer, when the order carries an email).
 *
 * The shape copies the receipt's, decision 5:
 *  - DIRECT send through sendMail("bookings", …), never the mail queue —
 *    the tick drains three times a day on Vercel cron and the faster VPS
 *    tick is unverified; Love's ask is to know when someone purchased.
 *  - ONCE per order: SET NX on `order:<id>:love-notified` BEFORE the send
 *    (order-receipt.ts's marker idiom). A retried webhook, a reconcile
 *    re-flip, a raced double settle all no-op after the first send. The
 *    accepted trade (the receipt's own): a mail-rail hiccup after the
 *    marker stands means that order's letter is never retried.
 *  - CALLER-SIDE CONTRACT: the caller wraps this in try/catch (the
 *    recordChargeEvent settled-flip block and the three code-settle
 *    routes do) — a mail hiccup must never cost the money path its
 *    state flip.
 *
 * The /a switch (decision 2): `features.purchaseLoveNotify`, default ON,
 * checked BEFORE the marker is claimed — a flip OFF then ON never burns
 * an order's one send. Fail-to-the-floor (the receipt's posture): a
 * config-read hiccup SENDS; the OFF state requires a real saved false.
 *
 * NEVER in the letter: card details (the order record holds none — both
 * rails are hosted pages), chargeIds, refund links, the shipping address
 * (the name yes when given, the address no), the buyer's money
 * preference. The words are Love's own via the Letters-room override key
 * `purchase-love-notify`; the five {{slots}} are the machine-built facts,
 * and a slot she edits out is appended at the end (letterFor's doctrine)
 * so no fact can be lost.
 */

export type PurchaseLoveNotifyResult = { sent: true } | { sent: false; reason: string };

const markerKey = (orderId: string) => `order:${orderId}:love-notified`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const P = 'style="margin:0 0 1.15em;line-height:1.75;"';

/** The charged snapshot, verbatim — "2,100 sats" / "33.33 USD" (decision 4). */
function amountWords(amount: number, currency: string): string {
  return currency === "SATS" ? `${amount.toLocaleString("en-US")} sats` : `${amount} ${currency}`;
}

/** The @tag behind a handle subject ("fren@onecocreation" → "@fren");
 *  email subjects resolve through buyerEmailOf instead. */
function tagOf(order: OrderRecord): string | null {
  const s = order.entitlementSubject;
  if (!s || s.endsWith("@email")) return null;
  const at = s.lastIndexOf("@");
  return at > 0 ? `@${s.slice(0, at)}` : null;
}

/** The buyer's name when the record truly carries one: the shipping name
 *  on a physical order, else the linked booking's customer name. Never an
 *  invented word. */
async function buyerNameOf(order: OrderRecord): Promise<string | null> {
  const shipping = order.shipping?.name?.trim();
  if (shipping) return shipping;
  const bookingId = order.bookingId ?? order.lineItems.find((l) => l.bookingId)?.bookingId;
  if (!bookingId) return null;
  try {
    const booking = await getBooking(bookingId);
    return booking?.customer?.name?.trim() || null;
  } catch {
    /* a booking the vault can't reach never holds the letter back */
    return null;
  }
}

async function whoSlot(order: OrderRecord): Promise<string> {
  const email = buyerEmailOf(order);
  const name = await buyerNameOf(order);
  const whom = name && email ? `${name} (${email})` : name ?? email ?? tagOf(order) ?? "an anonymous soul";
  return `<p ${P}>From <b>${esc(whom)}</b> · order ${order.id.slice(0, 8)}</p>`;
}

function linesSlot(order: OrderRecord): string {
  const items = order.lineItems
    .map((l) => {
      let w = `<li><b>${esc(l.title)}</b>`;
      if (l.qty > 1) w += ` × ${l.qty}`;
      if (l.size) w += ` (size ${esc(l.size)})`;
      if (l.giftTo) w += ` · a gift for <b>${esc(l.giftTo)}</b>`;
      return `${w}</li>`;
    })
    .join("");
  return `<ul style="margin:0 0 1.15em;padding-left:22px;line-height:1.75;">${items}</ul>`;
}

/** The tier or pass and until when — the same facts bestPackageGrant
 *  derives (that scan is private to entitlement-fulfil.ts, READ-ONLY):
 *  all lines, the highest package tier wins, a permanent line beats a
 *  taster on a tie. "for N days" rides the catalog's entitlementDays. */
async function tierSlot(order: OrderRecord): Promise<string> {
  const rank: Record<Tier, number> = { A: 1, B: 2, C: 3 };
  let best: { tier: Tier; days?: number } | null = null;
  for (const li of order.lineItems) {
    const it = await getItem(li.itemId);
    if (!it || it.kind !== "package" || !isTier(it.entitlementTier)) continue;
    const days = packageDays(it);
    if (!best || rank[it.entitlementTier] > rank[best.tier]) best = { tier: it.entitlementTier, days };
    else if (rank[it.entitlementTier] === rank[best.tier] && best.days != null && days > best.days) best.days = days;
  }
  if (!best) return `<p ${P}>No membership or pass rides this order.</p>`;
  const name = esc(TIERS[best.tier].name);
  return best.days === TIER_TERM_DAYS
    ? `<p ${P}>The membership: <b>${name}</b> · for ${best.days} days.</p>`
    : `<p ${P}>The pass: <b>${name}</b> · for ${best.days} days.</p>`;
}

function amountSlot(order: OrderRecord): string {
  const snap = order.priceSnapshot;
  /* every order carries a snapshot by construction (both checkouts build it
     before any rail is touched); a future rail that leaves it blank reads
     "no amount recorded", never a guessed number (decision 4) */
  if (!snap || typeof snap.amount !== "number") {
    return `<p ${P}>No amount recorded.</p>`;
  }
  let w = `Charged: <b>${esc(amountWords(snap.amount, snap.currency))}</b>`;
  if (order.discount) {
    w += `<br>Code <b>${esc(order.discount.code)}</b> brought it to ${esc(amountWords(snap.amount, snap.currency))}; the full price was ${esc(amountWords(order.discount.originalAmount, snap.currency))}.`;
  }
  return `<p ${P}>${w}</p>`;
}

/** The write-back door (decision 3): a mailto: can never ride the markdown
 *  (bodyToHtml refuses it, T-227) or pill() (its abs() would prefix the
 *  site origin) — the plain inline <a>, the pwyc refund-door idiom. The
 *  email is the order's own, strict-shaped before it enters an href: a
 *  CR/LF or a non-email kills the button, never the letter (the header-
 *  injection line). No email at all → a plain line naming the tag. */
function writebackSlot(order: OrderRecord): string {
  const email = buyerEmailOf(order);
  const safe = email && !/[\r\n]/.test(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  if (!safe) {
    const tag = tagOf(order);
    return `<p ${P}>No email rides this order${tag ? ` · the tag is <b>${esc(tag)}</b>` : ""}.</p>`;
  }
  const subject = encodeURIComponent(`Re: your One Cocreation order ${order.id.slice(0, 8)}`);
  return `<p style="text-align:center;margin:24px 0;"><a href="mailto:${safe}?subject=${subject}" style="background:#b4862b;color:#fff;padding:12px 26px;border-radius:999px;text-decoration:none;">Write back to them</a></p>`;
}

/** The letter itself — subject + rendered html for a settled order. Pure
 *  (no switch check, no marker, no send): the words + slots. Exported so
 *  the preview-equals-sent pin can pour from the same composer. */
export async function buildPurchaseLoveNotify(order: OrderRecord): Promise<{ subject: string; html: string }> {
  const slots = {
    who: await whoSlot(order),
    lines: linesSlot(order),
    tier: await tierSlot(order),
    amount: amountSlot(order),
    writeback: writebackSlot(order),
  };
  return letterFor("purchase-love-notify", slots);
}

/**
 * Send Love her purchase letter ONCE per settled order. Never throws at
 * its caller beyond vault/send failures it can't honor — the caller
 * catches, so a mail-rail hiccup never costs the money path its flip.
 */
export async function sendPurchaseLoveNotify(order: OrderRecord): Promise<PurchaseLoveNotifyResult> {
  if (!["settled", "fulfilled"].includes(order.state)) {
    return { sent: false, reason: `order is ${order.state}` };
  }
  /* the switch, checked BEFORE the marker (decision 2): a flip OFF then ON
     never burns an order's one send. Fail-to-the-floor: a config-read
     hiccup SENDS — OFF requires a real saved false, never a guessed one. */
  let on = true;
  try {
    on = (await getSiteConfig()).features.purchaseLoveNotify !== false;
  } catch {
    on = true;
  }
  if (!on) return { sent: false, reason: "the switch is off" };

  /* the once-only marker: SET NX answers "OK" exactly once. No vault (the
     dev file driver) → no marker is possible; send and say so (the
     receipt's own answer to the same edge). */
  const marked = await kv(["SET", markerKey(order.id), "1", "NX"]);
  if (marked !== null && marked.result !== "OK") {
    return { sent: false, reason: "already notified" };
  }

  const { subject, html } = await buildPurchaseLoveNotify(order);
  await sendMail("bookings", { to: offerNotifyTo(), subject, html });
  return { sent: true };
}
