import { getItem } from "./store";
import { dollars } from "./money-words";

/**
 * TASK-449 (block 968,364) — the ONE week-pass derivation (decision D:
 * extracted, never copied). Both /reading and /reading/playground need the
 * live pass price; this is its single home, moved verbatim out of
 * reading/page.tsx.
 */

/** The one-week pass, derived-or-dashed from the LIVE store item — its
 *  OWN title and effective fiat price (sale when one rides), never a
 *  page-local number. A shelf read failure dashes the pass (the page
 *  never 500s on a courtesy). */
export async function deriveWeekPass(): Promise<{ name: string; price: string } | null> {
  try {
    const item = await getItem("weekly-one-week");
    const eff = item?.sale ?? item?.price;
    if (item?.status !== "live" || !eff?.fiat) return null;
    return { name: item.title, price: dollars(eff.fiat.amount, eff.fiat.currency) };
  } catch {
    return null;
  }
}
