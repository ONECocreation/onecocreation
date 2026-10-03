import type { Tier } from "./entitlement";
import { getItem, isPurchasable } from "./store";
import { TIER_PAGES } from "./tiers-content";

/**
 * T-556: is this membership open to join? ONE signal decides it: the
 * membership's own store item. Open means the item exists and
 * isPurchasable() is true (live and not "Coming soon"). Anything else is
 * closed: coming soon, hidden, sold out, missing, or a catalog read that
 * throws. Fail closed, so a closed membership can never be paid for through
 * the member API just because the Monthly memberships switch is ON.
 */
export async function tierOpenForJoin(tier: Tier): Promise<boolean> {
  const page = TIER_PAGES.find((p) => p.tier === tier);
  if (!page) return false;
  const item = await getItem(page.slug).catch(() => null);
  return item != null && isPurchasable(item);
}
