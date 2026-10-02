import { getPlanMap, listSquarePlans, type PlanListing } from "./subscriptions";
import { offerLineFromPhases } from "./subscription-ui";

/**
 * T-541b: the promo sentence for each open variant, read from what Square
 * itself lists for the mapped plan variation (so the words can never drift
 * from the price that will be charged). Cached for five minutes per
 * instance so the public config route cannot be used to hammer Square.
 */
let cache: { at: number; value: Record<string, Partial<Record<string, string>>> } | null = null;
const TTL_MS = 5 * 60 * 1000;

export function offersFrom(map: { tiers: Record<string, Partial<Record<string, string>> | undefined>; open: string[] }, plans: PlanListing[]): Record<string, Partial<Record<string, string>>> {
  const byId = new Map(plans.flatMap((p) => p.variations.map((v) => [v.id, v] as const)));
  const out: Record<string, Partial<Record<string, string>>> = {};
  for (const [tier, row] of Object.entries(map.tiers)) {
    for (const [variant, id] of Object.entries(row ?? {})) {
      if (variant === "standard" || !id || !map.open.includes(variant)) continue;
      const v = byId.get(id);
      const line = v ? offerLineFromPhases(v.phases) : null;
      if (line) (out[tier] ??= {})[variant] = line;
    }
  }
  return out;
}

export async function openOffers(): Promise<Record<string, Partial<Record<string, string>>>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const map = await getPlanMap();
  if (map.open.every((v) => v === "standard")) { cache = { at: Date.now(), value: {} }; return {}; }
  try {
    const value = offersFrom(map, await listSquarePlans());
    cache = { at: Date.now(), value };
    return value;
  } catch {
    return {}; // no words, no promo: the regular price still works
  }
}
