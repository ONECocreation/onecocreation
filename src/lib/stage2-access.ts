import { TIERS, type Tier } from "./entitlement";
import { roomGate } from "./room-access";
import { TIER_PAGES } from "./tiers-content";
import { getItem } from "./store";
import { dollars } from "./money-words";

/**
 * STAGE 2'S ONE ACCESS DECISION (TASK-439, block 968,218; RAISED to
 * Observer by TASK-465, block 968,561; LOWERED back to Weekly Intuitive by
 * TASK-471, block 968,624, for Saturday).
 *
 * TASK-465 ruling (the Admiral, block 968,561, verbatim): "the playground
 * is for members of the observer or better package. users can be
 * presented with an upgrade option." This REVERSED ruling 1 of block
 * 968,218 ("any paid package so that puts it in to the weekly intuitive
 * since that is a base item and gets added to all" — the old floor was
 * tier A).
 *
 * TASK-471 ruling (the Admiral, block 968,624, the Saturday-night minimal
 * fix): "the 2:22 book talk is an $11 ONE-TIME pass, not Observer" —
 * overruling TASK-465's Observer floor for THIS ROOM (Stage 2 / the
 * Playground / the book talk are the one physical room every one of these
 * consumers gates). Owning the $11 one-time pass (`weekly-one-week`,
 * `TIER_PAGES`'s tier-A `oneTime` item) grants tier A, so the floor moves
 * back to A — any higher standing tier still admits (the progressive
 * ladder, `tierSatisfies`). No other room's floor changes: the Q&A room
 * still gates on tier C, untouched.
 *
 * `STAGE2_MIN_TIER` below is still the ONLY place the minimum is written:
 * the route decides through `decideStage2`, which reuses `room-access.ts`'s
 * `roomGate` — the same helper the Stage's video slot and the room chat
 * already follow — never a re-implementation.
 *
 * SERVER-ONLY: `stage2PackageDoor` reads entitlement.ts (the vault) and,
 * for the Amendment-1 week offer, the store catalog. The member door
 * (`Stage2Door.tsx`, a client component) never imports this file — the
 * route sends the decision and these few strings down the wire instead.
 */

/** Stage 2's minimum tier (TASK-465, block 968,561; TASK-471, block
 *  968,624) — written here and nowhere else. Was "A" (Weekly Intuitive)
 *  under TASK-439's ruling 1, block 968,218; TASK-465 raised the floor to
 *  Observer; TASK-471 (Saturday's minimal fix, the $11 one-time pass)
 *  moved it back to A, for this room only. */
export const STAGE2_MIN_TIER: Tier = "A";

/** The floor's own display name (`TIERS[STAGE2_MIN_TIER].name`) — a plain
 *  read, no entitlement check. Lets a page name the floor without
 *  importing entitlement.ts's `TIERS` directly, which matters for
 *  `/reading/page.tsx`: it carries its own house law ("no tier or payment
 *  logic anywhere on this page", `tests/reading-page.test.ts`) that this
 *  constant's name deliberately keeps clean of the literal token `TIERS`. */
export const STAGE2_FLOOR_NAME: string = TIERS[STAGE2_MIN_TIER].name;

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
