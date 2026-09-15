import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PaletteVars from "@/components/PaletteVars";
import PopupHost from "@/components/PopupHost";
import NotOpenYet from "@/components/NotOpenYet";
import { Packages } from "@/components/sections";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";
import { getSiteConfig } from "@/lib/site-config";
import { tierRailsOn } from "@/lib/tier-offer";
import { TIERS } from "@/lib/entitlement";
import { TIER_PAGES } from "@/lib/tiers-content";
import { applyPackagesToPuck, type PackagesShelf } from "@/lib/puck-blocks/packages-grid";

/* T-229 follow-through (0018.06.23 a₿): this page reads the site switches from KV;
   without this Next bakes it at build time and a switch Love flips never lands
   until the next deploy (the same line / and /store already carry). */
export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  /* ── TASK-187 GATE, route-level (TASK-232, 0018.06.25 a₿ · block 967,125) —
     the memberships switch lived INSIDE Packages() (sections.tsx) until this
     lane; a naive Puck branch would have bypassed it. The gate moves to the
     route, T-187 idiom byte-for-byte (memberships/page.tsx): OFF (still
     Love's own call — default ON) renders the shared NotOpenYet quiet panel
     inside the site chrome, whatever the designer holds. This branch stays
     FIRST — order: 1 gate → 2 Puck → 3 hand-built (the T-159/T-160 lane
     contract, pinned in tests/route-gates.test.ts). The fallback's in-
     component check stays as the home section's own guard — sections.tsx is
     not this lane's to edit. ── */
  const switches = await getSiteConfig();
  if (!switches.features.memberships) {
    return (
      <>
        <SiteHeader />
        <main>
          <NotOpenYet
            title="Memberships aren't open yet"
            body="Love's memberships are still being prepared — come back soon."
          />
        </main>
        <SiteFooter />
      </>
    );
  }
  /* ── end TASK-187 GATE ── */
  // PUCK P4 (TASK-232), mirroring /about-/retreats byte-for-byte: once Love
  // publishes the Puck rebuild (/style/packages -> Publish to live), the live
  // /packages serves it. Until then, the hand-built Packages() below is
  // untouched — nothing changes for visitors until she chooses it.
  const puck = await getPuckPage("packages");
  if (puck) {
    /* the grid reads LIVE on the designer branch too — names and prices from
       TIERS × TIER_PAGES, the doors from the store switch (tierRailsOn) —
       resolved here on the server and injected into the PackagesGrid block's
       props at render time (applyPackagesToPuck; never written back to the
       store, so a published snapshot can't fossilise a price) */
    const shelf: PackagesShelf = {
      railsOn: tierRailsOn(switches),
      tiers: TIER_PAGES.map((p) => ({
        tier: p.tier,
        slug: p.slug,
        name: TIERS[p.tier].name,
        priceUsd: TIERS[p.tier].priceUsd,
        priceSats: TIERS[p.tier].priceSats,
      })),
    };
    return (
      <>
        <SiteHeader />
        <PaletteVars />
        <main><Render config={config} data={applyPackagesToPuck(puck as Data, shelf)} /></main>
        <SiteFooter />
        {/* STUDIO P2: the popup host rides the designer branch (the fallback
            never had one — byte-identical law — so it is not added there) */}
        <PopupHost />
      </>
    );
  }

  return (<><SiteHeader /><main><Packages /></main><SiteFooter /></>);
}
