import { getItem } from "./store";
import { dollars } from "./money-words";
import { STAGE2_MIN_TIER } from "./stage2-access";
import { TIER_PAGES } from "./tiers-content";

/**
 * TASK-449 (block 968,364) — the ONE week-pass derivation (decision D:
 * extracted, never copied). Both /reading and /reading/playground need the
 * live pass price; this is its single home, moved verbatim out of
 * reading/page.tsx.
 *
 * TASK-465 (block 968,561): the pass follows Stage 2's OWN floor
 * (`STAGE2_MIN_TIER`) instead of a hardcoded tier-A item id — the Admiral
 * raised the Playground's floor to Observer, so the one-week offer must be
 * OBSERVER's own item (`observer-one-week`), never Weekly Intuitive's
 * (`weekly-one-week`). Derive-or-dash: no floor tier page → null, never a
 * guessed item id.
 */

/** The one-week pass, derived-or-dashed from the LIVE store item at Stage
 *  2's OWN floor tier — its OWN title and effective fiat price (sale when
 *  one rides), never a page-local number or a hardcoded item id. A shelf
 *  read failure, or a missing floor tier page, dashes the pass (the page
 *  never 500s on a courtesy). */
export async function deriveWeekPass(): Promise<{ name: string; price: string } | null> {
  try {
    const itemId = TIER_PAGES.find((p) => p.tier === STAGE2_MIN_TIER)?.oneTime?.itemId;
    if (!itemId) return null;
    const item = await getItem(itemId);
    const eff = item?.sale ?? item?.price;
    if (item?.status !== "live" || !eff?.fiat) return null;
    return { name: item.title, price: dollars(eff.fiat.amount, eff.fiat.currency) };
  } catch {
    return null;
  }
}
