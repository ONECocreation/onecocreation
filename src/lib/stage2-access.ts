import { TIERS, type Tier } from "./entitlement";
import { roomGate } from "./room-access";
import { TIER_PAGES } from "./tiers-content";
import { getItem } from "./store";
import { dollars } from "./money-words";

/**
 * STAGE 2'S ONE ACCESS DECISION (TASK-439, block 968,218).
 *
 * Ruling 1, the Admiral verbatim: "any paid package so that puts it in to
 * the weekly intuitive since that is a base item and gets added to all." —
 * Stage 2's minimum is tier A, and B and C satisfy it (the progressive
 * ladder). `STAGE2_MIN_TIER` below is the ONLY place that minimum is
 * written: the route decides through `decideStage2`, which reuses
 * `room-access.ts`'s `roomGate` — the same helper the Stage's video slot
 * and the room chat already follow — never a re-implementation.
 *
 * SERVER-ONLY: `stage2PackageDoor` reads entitlement.ts (the vault) and,
 * for the Amendment-1 week offer, the store catalog. The member door
 * (`Stage2Door.tsx`, a client component) never imports this file — the
 * route sends the decision and these few strings down the wire instead.
 */

/** Stage 2's minimum tier (ruling 1) — written here and nowhere else. */
export const STAGE2_MIN_TIER: Tier = "A";

/** Where the door sends this visitor: nothing, the sign-in door, the
 *  package door, or the room itself. */
export type Stage2Decision = "hidden" | "signin" | "package" | "open";

/** The ONE decision: published gates everything first (a prepared room is
 *  invisible to every visitor), then roomGate says the rest. */
export function decideStage2(
  published: boolean,
  visitor: { signedIn: boolean; tier: Tier | null },
): Stage2Decision {
  if (!published) return "hidden";
  return roomGate(STAGE2_MIN_TIER, visitor);
}

/** What the package door shows: the package's own name and page, plus
 *  (Amendment 1, block 968,222) the one-week pass when it's on the shelf. */
export interface Stage2PackageDoor {
  name: string;
  href: string;
  /** the "Try one week" offer — present only when the tier page's
   *  `oneTime.itemId` is a LIVE store item with a fiat price (the store's
   *  own number, sale-aware, never tiers-content's `usd`); null on any
   *  miss or throw — the offer is optional, the door never fails for it. */
  week: { itemId: string; price: string } | null;
}

export async function stage2PackageDoor(): Promise<Stage2PackageDoor> {
  const name = TIERS[STAGE2_MIN_TIER].name;
  const page = TIER_PAGES.find((p) => p.tier === STAGE2_MIN_TIER);
  /* derive-or-dash: no tier page -> the memberships shelf, never a 404 */
  const href = page ? `/packages/${page.slug}` : "/memberships";

  let week: Stage2PackageDoor["week"] = null;
  try {
    const itemId = page?.oneTime?.itemId;
    const item = itemId ? await getItem(itemId) : null;
    /* status only — never `kind`: the grant is the store's truth, and the
       Admiral's data step (/a/store) makes the pass a package */
    if (itemId && item?.status === "live") {
      const eff = item.sale ?? item.price;
      if (eff.fiat) week = { itemId, price: dollars(eff.fiat.amount, eff.fiat.currency) };
    }
  } catch {
    week = null;
  }
  return { name, href, week };
}
