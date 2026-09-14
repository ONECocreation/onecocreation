import type { SiteConfig } from "@/lib/site-config";

/**
 * TASK-229 (0018.06.23 a₿) — lifted out of `src/app/packages/[slug]/page.tsx`
 * (TASK-138, 0018.06.17 a₿) so `Packages()`'s home cards can read the SAME
 * switch the tier page reads without importing a route module (`page.tsx`
 * carries `next/headers`' `cookies()` and other app-router-only wiring a
 * plain component has no business pulling in). The tier page re-exports
 * both names from here so every existing import of
 * `@/app/packages/[slug]/page` keeps working unchanged.
 *
 * `features.store` is the same switch NavMenu.tsx reads to hide the whole
 * Store surface; Love's streamlined default keeps it off, so both the tier
 * page's buy button and the home card's "See the package" link wait behind
 * it — flip it on and both return with no further code change.
 */
export function tierRailsOn(switches: Pick<SiteConfig, "features">): boolean {
  return switches.features.store;
}

/** Which door the tier page's image card shows — pure, so the switch-gating
 *  is pinned without rendering the whole page (SiteHeader/NavMenu ride
 *  hooks that need a real app-router context). Rails ON always wins, even
 *  with a stale `?joined=1` left over from before the switch flipped. */
export type TierOfferMode = "buy" | "banner" | "waitlist";
export function tierOfferMode(switches: Pick<SiteConfig, "features">, joined: boolean): TierOfferMode {
  if (tierRailsOn(switches)) return "buy";
  return joined ? "banner" : "waitlist";
}
