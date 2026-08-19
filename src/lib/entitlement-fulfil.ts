import type { OrderRecord } from "./store";
import { getEntry } from "./registry";
import { getItem } from "./store";
import { grantTier, revokeTier, getEntitlement, linkMxid, isTier, normalizeNpub, type Tier } from "./entitlement";
import { inviteToTierRooms, removeFromTierRooms, matrixConfigured, isMxid, mxidForSubject, type RoomOutcome } from "./matrix";
import { emailForSubject } from "./member-tier";
import { TIERS } from "./entitlement";
import { enqueue } from "./mail-queue";
import { brandShell } from "./mail";
import { siteBase } from "./subscribers";

/** The doors close kindly, never silently. */
export async function sendRevokeLetter(to: string, tier: Tier, refunded: boolean): Promise<void> {
  const name = TIERS[tier].name;
  // S2: the gold CTA below stays literal — decorative gold awaits the taste-maker's ruling (gold law).
  await enqueue([{
    to,
    subject: `The door rests — ${name}`,
    html: brandShell(
      `<p>Your <b>${name}</b> membership has closed${refunded ? " with your refund" : ""}, and its rooms are resting.</p>
       <p>Everything you wrote in the community stays yours, and the field remembers you. Whenever
       you're ready to return, the door opens the moment you do:</p>
       <p style="text-align:center;margin:24px 0;">
         <a href="${siteBase()}/memberships" style="background:#b4862b;color:#fff;padding:12px 26px;border-radius:999px;text-decoration:none;">The memberships</a>
       </p>
       <p>With love, always. 🕊️</p>`,
    ),
  }]);
}

/**
 * The bridge between money and membership — the twin of booking-fulfil.ts.
 *
 * Both the webhook and the reconcile poll call this, which is what makes the
 * effect RE-DERIVABLE FROM ORDER STATE rather than dependent on catching one
 * event. It reads the order's CURRENT state and makes the membership match:
 * run it twice, late, or out of order and it converges on the same answer.
 *
 * Ordering matters on the way in and on the way out:
 *   settle  → grant the tier FIRST, then invite (a failed invite must not
 *             cost someone the membership they paid for)
 *   refund  → remove from the rooms FIRST, then revoke (revoking first would
 *             lose the tier we need to know WHICH rooms to clear)
 */

export interface FulfilResult {
  tier: Tier | null;
  granted: boolean;
  revoked: boolean;
  rooms: RoomOutcome[];
  /** why nothing happened, when nothing did — never a silent no-op */
  note?: string;
}

const NOTHING: FulfilResult = { tier: null, granted: false, revoked: false, rooms: [] };

/** The tier an order bought — carts carry many lines, so scan them ALL and
 *  grant the HIGHEST package tier present (tiers include everything below).
 *  `days` rides along when that winning line is a taster (weekly-one-week,
 *  observer-one-week, …) — `item.entitlementDays` on the catalog item — so
 *  the grant knows to close itself instead of standing open-ended. If two
 *  lines land on the same tier, a permanent line beats a taster line. */
async function bestPackageGrant(order: OrderRecord): Promise<{ tier: Tier; days?: number } | null> {
  const rank: Record<string, number> = { A: 1, B: 2, C: 3 };
  let best: { tier: Tier; days?: number } | null = null;
  for (const li of order.lineItems) {
    const item = await getItem(li.itemId);
    if (!item || item.kind !== "package" || !isTier(item.entitlementTier)) continue;
    const days = item.entitlementDays && item.entitlementDays > 0 ? item.entitlementDays : undefined;
    const r = rank[item.entitlementTier];
    if (!best || r > rank[best.tier]) best = { tier: item.entitlementTier, days };
    else if (r === rank[best.tier] && best.days != null && days == null) best.days = undefined;
  }
  return best;
}

/**
 * The gate's subject: the REGISTRY npub behind `handle@space`, captured on
 * the order at checkout. The webhook is server-to-server — the order is the
 * only identity source at grant time, which is exactly why checkout requires
 * a signed-in fren for packages.
 */
async function npubOfOrder(order: OrderRecord): Promise<string | null> {
  const subject = order.entitlementSubject;
  if (!subject) return null;
  // split on the LAST @ — an email member's subject is "pac@site.org@email"
  const at = subject.lastIndexOf("@");
  const handle = subject.slice(0, at);
  const space = subject.slice(at + 1);
  if (!handle || !space) return null;
  // email members have no registry seat — their grants key by the subject
  // string itself, the same identity that survives on their orders
  if (space === "email") return subject;
  const entry = await getEntry(handle, space);
  // the registry may hold bech32 — the grant store speaks canonical hex
  return normalizeNpub(entry?.npub);
}

export async function settleEntitlementFromOrder(order: OrderRecord): Promise<FulfilResult> {
  const grant = await bestPackageGrant(order);
  if (!grant) return { ...NOTHING, note: "not a package order" };
  const { tier } = grant;

  const npub = await npubOfOrder(order);
  if (!npub) {
    // Loud on purpose: money landed and we cannot say whose it is. This is
    // the "settled but ungranted" case the console's reconcile view exists for.
    return { ...NOTHING, tier, note: "no entitlement subject on the order — needs a manual grant" };
  }

  switch (order.state) {
    case "settled":
    case "fulfilled": {
      const expiresAtMs = grant.days ? Date.now() + grant.days * 86_400_000 : undefined;
      let rec = await grantTier(npub, tier, order.id, { expiresAtMs });
      if (!rec) return { ...NOTHING, tier, note: "grant refused" };

      // The matrix id is DERIVED now (run book C3, 0018.05.16) — the member's
      // account is born at their first /api/matrix/login with this exact id,
      // so inviting it before birth is fine: the invite waits at the door.
      if (!rec.mxid) {
        const derived = mxidForSubject(npub);
        rec = (await linkMxid(npub, derived)) ?? { ...rec, mxid: derived };
      }
      const mxid = rec.mxid;
      if (!matrixConfigured()) {
        return { tier: rec.tier, granted: true, revoked: false, rooms: [], note: "tier granted; matrix not configured" };
      }
      if (!mxid || !isMxid(mxid)) {
        return { tier: rec.tier, granted: true, revoked: false, rooms: [], note: `tier granted; "${mxid}" is not a matrix id` };
      }
      return { tier: rec.tier, granted: true, revoked: false, rooms: await inviteToTierRooms(mxid, rec.tier) };
    }

    case "refunded":
    case "disputed": {
      const held = await getEntitlement(npub);
      // rooms first — revoking would lose the tier that names them
      const rooms = held?.mxid && matrixConfigured() && isMxid(held.mxid)
        ? await removeFromTierRooms(held.mxid, { reason: order.state === "disputed" ? "payment disputed" : "refunded" })
        : [];
      await revokeTier(npub);
      // the kind close (Admiral, 0018.05.18): doors never shut silently
      try {
        const to = order.contact?.email ?? (order.entitlementSubject ? await emailForSubject(order.entitlementSubject) : null);
        if (to && held?.tier) await sendRevokeLetter(to, held.tier, order.state === "refunded");
      } catch { /* the revoke stands; the letter can be resent */ }
      return { tier: held?.tier ?? tier, granted: false, revoked: true, rooms };
    }

    // created / charge_created / processing / expired / underpaid / canceled:
    // nothing was ever granted, so there is nothing to undo.
    default:
      return { ...NOTHING, tier, note: `order is ${order.state}` };
  }
}
