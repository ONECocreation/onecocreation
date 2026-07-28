import type { OrderRecord } from "./store";
import { getEntry } from "./registry";
import { getItem } from "./store";
import { grantTier, revokeTier, getEntitlement, isTier, type Tier } from "./entitlement";
import { inviteToTierRooms, removeFromTierRooms, matrixConfigured, isMxid, type RoomOutcome } from "./matrix";

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

/** The tier an order bought, from the item it names. */
async function tierOfOrder(order: OrderRecord): Promise<Tier | null> {
  const itemId = order.lineItems[0]?.itemId;
  if (!itemId) return null;
  const item = await getItem(itemId);
  if (!item || item.kind !== "package") return null;
  return isTier(item.entitlementTier) ? item.entitlementTier : null;
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
  const [handle, space] = subject.split("@");
  if (!handle || !space) return null;
  const entry = await getEntry(handle, space);
  return entry?.npub ?? null;
}

export async function settleEntitlementFromOrder(order: OrderRecord): Promise<FulfilResult> {
  const tier = await tierOfOrder(order);
  if (!tier) return { ...NOTHING, note: "not a package order" };

  const npub = await npubOfOrder(order);
  if (!npub) {
    // Loud on purpose: money landed and we cannot say whose it is. This is
    // the "settled but ungranted" case the console's reconcile view exists for.
    return { ...NOTHING, tier, note: "no entitlement subject on the order — needs a manual grant" };
  }

  switch (order.state) {
    case "settled":
    case "fulfilled": {
      const rec = await grantTier(npub, tier, order.id);
      if (!rec) return { ...NOTHING, tier, note: "grant refused" };

      // The invite needs a matrix id. Until the member links or is
      // provisioned one, the tier still stands and the rooms wait.
      if (!rec.mxid) {
        return {
          tier: rec.tier,
          granted: true,
          revoked: false,
          rooms: [],
          note: "tier granted; no matrix id linked yet, so no invites sent",
        };
      }
      if (!matrixConfigured()) {
        return { tier: rec.tier, granted: true, revoked: false, rooms: [], note: "tier granted; matrix not configured" };
      }
      if (!isMxid(rec.mxid)) {
        return { tier: rec.tier, granted: true, revoked: false, rooms: [], note: `tier granted; "${rec.mxid}" is not a matrix id` };
      }
      return { tier: rec.tier, granted: true, revoked: false, rooms: await inviteToTierRooms(rec.mxid, rec.tier) };
    }

    case "refunded":
    case "disputed": {
      const held = await getEntitlement(npub);
      // rooms first — revoking would lose the tier that names them
      const rooms = held?.mxid && matrixConfigured() && isMxid(held.mxid)
        ? await removeFromTierRooms(held.mxid, { reason: order.state === "disputed" ? "payment disputed" : "refunded" })
        : [];
      await revokeTier(npub);
      return { tier: held?.tier ?? tier, granted: false, revoked: true, rooms };
    }

    // created / charge_created / processing / expired / underpaid / canceled:
    // nothing was ever granted, so there is nothing to undo.
    default:
      return { ...NOTHING, tier, note: `order is ${order.state}` };
  }
}
