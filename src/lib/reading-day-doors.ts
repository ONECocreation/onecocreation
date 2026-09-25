import { TIERS, type Tier } from "./entitlement";
import { TIER_PAGES } from "./tiers-content";
import { getItem } from "./store";
import { dollars } from "./money-words";
import { STAGE2_MIN_TIER, stage2PackageDoor } from "./stage2-access";
import { QA_ITEM_ID } from "./reading-day";

/**
 * THE READING DAY BRICK'S SERVER-ONLY DERIVATIONS (TASK-467, block
 * 968,561) — every name/price/itemId the Encore and Q&A rows show comes
 * from here, never a literal in `ReadingDay.tsx` or `ReadingDayBody.tsx`.
 * Same shape as `stage2-access.ts`'s own `stage2PackageDoor`: read
 * `entitlement.ts` (content only, never the vault) and the live store
 * catalog, sale-aware (`item.sale ?? item.price`), fail-closed to a null
 * price on any miss or throw — the row simply omits its price line
 * rather than guess or show a dash (this lane's own house law: no "—" in
 * any rendered state).
 */

/** What the Encore's locked row shows/does: the floor package's own name,
 *  its package page, the store item id "Unlock with {name}" adds to the
 *  basket, and that item's live monthly price (or null — omit the line). */
export interface EncoreFloorDoor {
  tier: Tier;
  name: string;
  itemId: string;
  href: string;
  price: string | null;
}

export async function encoreFloorDoor(): Promise<EncoreFloorDoor> {
  const tier = STAGE2_MIN_TIER;
  const page = TIER_PAGES.find((p) => p.tier === tier);
  /* the door's own name/href come from the one function every other paid
     Stage 2 surface already reads (stage2PackageDoor) — never re-derived */
  const door = await stage2PackageDoor();
  const itemId = page ? page.slug : tier;

  let price: string | null = null;
  try {
    const item = await getItem(itemId);
    const eff = item?.sale ?? item?.price;
    if (item?.status === "live" && eff?.fiat) price = dollars(eff.fiat.amount, eff.fiat.currency);
  } catch {
    price = null;
  }
  return { tier, name: door.name, itemId, href: door.href, price };
}

/** What the Q&A's locked row shows/does. `passLive` names which item
 *  "Unlock the Q&A" actually adds: the pass itself when it's live, else
 *  the Evening Star package (the Admiral's own fallback ruling) —
 *  `itemId` always names the winner. `eveningStar` carries its own name/
 *  price/door for the "or it comes with Evening Star" quiet line, which
 *  rides ALONGSIDE a live pass and IS the row's only offer when the pass
 *  isn't live. */
export interface QaDoor {
  itemId: string;
  passLive: boolean;
  price: string | null;
  eveningStar: { name: string; price: string | null; href: string };
}

export async function qaDoor(): Promise<QaDoor> {
  const csPage = TIER_PAGES.find((p) => p.tier === "C")!;
  let eveningStarPrice: string | null = null;
  try {
    const item = await getItem(csPage.slug);
    const eff = item?.sale ?? item?.price;
    if (item?.status === "live" && eff?.fiat) eveningStarPrice = dollars(eff.fiat.amount, eff.fiat.currency);
  } catch {
    eveningStarPrice = null;
  }
  const eveningStar = { name: TIERS.C.name, price: eveningStarPrice, href: `/packages/${csPage.slug}` };

  try {
    const item = await getItem(QA_ITEM_ID);
    const eff = item?.sale ?? item?.price;
    if (item?.status === "live" && eff?.fiat) {
      return { itemId: QA_ITEM_ID, passLive: true, price: dollars(eff.fiat.amount, eff.fiat.currency), eveningStar };
    }
  } catch {
    /* fall through to the Evening Star fallback below */
  }
  /* the pass isn't live — "Unlock the Q&A" adds Evening Star itself now */
  return { itemId: csPage.slug, passLive: false, price: eveningStarPrice, eveningStar };
}
