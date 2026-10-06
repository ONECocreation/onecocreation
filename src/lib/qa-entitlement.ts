import { tierSatisfies, type Tier } from "./entitlement";
import { listOrdersForSubject, type OrderState } from "./store";
import { QA_ITEM_ID } from "./reading-day";
import { doorDay } from "./door-lifecycle";
import { readQaPassUsedDays, stampQaPassUsed, type QaPassUsedDays } from "./qa-pass-used";

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
 *   - the visitor holds an order whose state is `settled` OR `fulfilled`
 *     — NOT `SETTLED_FAMILY` minus refunded — with a line item
 *     `itemId === QA_ITEM_ID`. The adversarial review (block 968,624)
 *     caught that `disputed` belongs on the SAME side as `refunded` here:
 *     `entitlement-fulfil.ts` already treats a disputed order like a
 *     refunded one (it revokes the tier and removes the member from
 *     rooms), so a disputed Q&A order must not open this door either —
 *     unresolved money is not the same as landed money.
 *
 * TASK-561 (block 970,086, the Admiral: "the qa pass 33.33 is a one time
 * deal for that one session.") — the pass no longer opens every later Q&A
 * forever. A pass opens ONE Q&A day: the first day its buyer is actually
 * let into a published Q&A with it (`/api/qa-door` stamps that day with
 * `markQaPassUsed`, write-once). Until then it WAITS (buy Monday, use
 * Saturday; a skipped week still waits); from the next day on it is
 * spent. "Day" is the door's own (`door-lifecycle.ts` `doorDay`, the
 * America/Denver calendar date `doorExpired` already closes on), never a
 * second zone. Each pass ORDER carries at most one used day; a buyer
 * with two unspent passes spends one per day, oldest first (by
 * `settledAtMs ?? createdAtMs`). Tier C never spends a pass. Orders
 * bought before this shipped have no record, so they read as UNUSED and
 * are good for one more Q&A day. `qaEntitled` itself never writes.
 *
 * Fails CLOSED on any throw (a broken vault reads as "not entitled",
 * never a guessed-open door) — the same law `ReadingDay.tsx`'s own
 * `tierForSubject` catch already keeps for the tier half.
 */

/** The only two order states that actually entitle — money landed and
 *  never reversed. Deliberately narrower than `store.ts`'s
 *  `SETTLED_FAMILY` (which also includes `refunded` and `disputed`, both
 *  of which `entitlement-fulfil.ts` treats as a closed door elsewhere). */
const QA_GRANTING_STATES: OrderState[] = ["settled", "fulfilled"];

/** What the pure core needs of one order — narrower than `OrderRecord` on
 *  purpose, so the pure core (and its tests) never carry the full order
 *  shape (title, qty, pricing, PII…) just to prove a decision. */
interface OrderLike {
  id: string;
  state: OrderState;
  entitlementSubject?: string;
  lineItems: { itemId: string }[];
  createdAtMs: number;
  settledAtMs?: number;
}

/** THE ANSWER: whether the visitor is let in, and how. `via` is "tier"
 *  (Evening Star and up, spends nothing), "pass" (`orderId` is the order
 *  that would be spent now), or null (not entitled). `firstUse` is true
 *  only for a pass with no used day yet — the one case the door route
 *  stamps. */
export interface QaAccess {
  entitled: boolean;
  via: "tier" | "pass" | null;
  orderId: string | null;
  firstUse: boolean;
}

const NO_ACCESS: QaAccess = { entitled: false, via: null, orderId: null, firstUse: false };

/** The granting pass orders of THIS subject, oldest first — the one
 *  filter both the pure core and the live read share, so the live read
 *  only ever looks up used days for orders that could matter. */
export function qaPassOrders<T extends OrderLike>(subject: string, orders: T[]): T[] {
  return orders
    .filter(
      (o) =>
        o.entitlementSubject === subject &&
        QA_GRANTING_STATES.includes(o.state) &&
        o.lineItems.some((li) => li.itemId === QA_ITEM_ID),
    )
    .sort((a, b) => (a.settledAtMs ?? a.createdAtMs) - (b.settledAtMs ?? b.createdAtMs) || (a.id < b.id ? -1 : 1));
}

/** The pure core — no KV, no fs — so tests exercise the actual decision
 *  against fabricated orders, a map of order id -> used day, and today's
 *  day string (`doorDay`'s shape). Tier C is entitled and spends nothing.
 *  Otherwise: the pass already used TODAY wins (the buyer's own day, any
 *  device, any poll), else the oldest UNUSED pass; a pass used on any
 *  other day is spent. `usedDays`/`today` default to "no record" so a
 *  caller with no use data reads every pass as unused. */
export function qaAccessFromOrders(
  tier: Tier | null,
  subject: string,
  orders: OrderLike[],
  usedDays: QaPassUsedDays = {},
  today = "",
): QaAccess {
  if (tierSatisfies(tier, "C")) return { entitled: true, via: "tier", orderId: null, firstUse: false };
  const passes = qaPassOrders(subject, orders);
  const usedToday = passes.find((o) => today !== "" && usedDays[o.id] === today);
  if (usedToday) return { entitled: true, via: "pass", orderId: usedToday.id, firstUse: false };
  const unused = passes.find((o) => !usedDays[o.id]);
  if (unused) return { entitled: true, via: "pass", orderId: unused.id, firstUse: true };
  return NO_ACCESS;
}

/** Boolean view of the same core (kept for its existing callers/tests). */
export function qaEntitledFromOrders(
  tier: Tier | null,
  subject: string,
  orders: OrderLike[],
  usedDays: QaPassUsedDays = {},
  today = "",
): boolean {
  return qaAccessFromOrders(tier, subject, orders, usedDays, today).entitled;
}

/** The live decision with its reason, for the door route: reads only THIS
 *  visitor's own orders (TASK-476's per-subject index) when the tier alone
 *  doesn't already settle it, then the used day of just their pass orders.
 *  Tier C costs zero reads. Fails CLOSED (`NO_ACCESS`) on any throw. NEVER
 *  writes. `nowMs` defaults to the server clock, never a request's. */
export async function qaAccess(subject: string, tier: Tier | null, nowMs: number = Date.now()): Promise<QaAccess> {
  if (tierSatisfies(tier, "C")) return { entitled: true, via: "tier", orderId: null, firstUse: false };
  try {
    const orders = await listOrdersForSubject(subject);
    const passes = qaPassOrders(subject, orders);
    if (passes.length === 0) return NO_ACCESS;
    const usedDays = await readQaPassUsedDays(passes.map((o) => o.id));
    return qaAccessFromOrders(tier, subject, orders, usedDays, doorDay(nowMs));
  } catch {
    return NO_ACCESS;
  }
}

/** The live decision `ReadingDay.tsx` calls — exact signature kept. `tier`
 *  is the caller's own already-resolved `tierForSubject` result, never
 *  re-derived here. Fails CLOSED on any throw; never writes. */
export async function qaEntitled(subject: string, tier: Tier | null): Promise<boolean> {
  return (await qaAccess(subject, tier)).entitled;
}

/** Spends a pass: stamps TODAY's door day on the order, write-once (a
 *  second call never moves the first day). THROWS on a vault failure; the
 *  door route catches it on purpose. */
export async function markQaPassUsed(orderId: string, nowMs: number = Date.now()): Promise<string> {
  return stampQaPassUsed(orderId, doorDay(nowMs));
}
