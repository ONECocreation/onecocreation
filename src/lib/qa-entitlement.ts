import { tierSatisfies, type Tier } from "./entitlement";
import { listOrders, SETTLED_FAMILY, type OrderState } from "./store";
import { QA_ITEM_ID } from "./reading-day";

/**
 * THE Q&A'S ONE ENTITLEMENT DECISION (TASK-475, block 968,624) — the
 * SHOW STOPPER this lane fixes: the $33.33 Q&A pass
 * (`q-a-meetup-with-love`) is catalog item kind "digital" with NO
 * `entitlementTier`/`entitlementDays` — buying it grants nothing on its
 * own. Before this lane, `ReadingDay.tsx` gated the Q&A row on
 * `tierSatisfies(tier, "C")` alone, and tier C (Evening Star) reads
 * "Coming soon" — so a Q&A buyer could NOT get in, on production, the day
 * before the live event.
 *
 * `qaEntitled` is true when EITHER holds:
 *   - the visitor's tier already satisfies "C" (Evening Star and up,
 *     `tierSatisfies` — the progressive ladder), OR
 *   - the visitor holds an order in `SETTLED_FAMILY` that is NOT refunded,
 *     with a line item `itemId === QA_ITEM_ID` — the pass itself, paid,
 *     money landed, never revoked.
 *
 * Fails CLOSED on any throw (a broken vault reads as "not entitled",
 * never a guessed-open door) — the same law `ReadingDay.tsx`'s own
 * `tierForSubject` catch already keeps for the tier half.
 */

/** Only the three fields the decision actually reads — narrower than
 *  `OrderRecord` on purpose, so the pure core (and its tests) never carry
 *  the full order shape (title, qty, pricing, PII…) just to prove a
 *  boolean. */
interface OrderLike {
  state: OrderState;
  entitlementSubject?: string;
  lineItems: { itemId: string }[];
}

/** The pure core — no KV, no fs — so tests exercise the actual decision
 *  logic against a handful of fabricated orders instead of a live vault
 *  round trip. */
export function qaEntitledFromOrders(tier: Tier | null, subject: string, orders: OrderLike[]): boolean {
  if (tierSatisfies(tier, "C")) return true;
  return orders.some(
    (o) =>
      o.entitlementSubject === subject &&
      o.state !== "refunded" &&
      SETTLED_FAMILY.includes(o.state) &&
      o.lineItems.some((li) => li.itemId === QA_ITEM_ID),
  );
}

/** The live decision: reads the order ledger only when the tier alone
 *  doesn't already settle it (the common case — most visitors are either
 *  Evening Star or have bought nothing). `tier` is the caller's own
 *  already-resolved `tierForSubject` result — this never re-derives it,
 *  so a caller that already paid for that lookup (ReadingDay.tsx,
 *  /api/qa-door) never pays for it twice. */
export async function qaEntitled(subject: string, tier: Tier | null): Promise<boolean> {
  if (tierSatisfies(tier, "C")) return true;
  try {
    const orders = await listOrders();
    return qaEntitledFromOrders(tier, subject, orders);
  } catch {
    return false;
  }
}
