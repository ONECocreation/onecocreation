import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import NotOpenYet from "@/components/NotOpenYet";
import ShelfSection, { shelfGroups } from "@/components/store/ShelfSection";
import { getSiteConfig } from "@/lib/site-config";
import { listItems, stripPrivateMedia } from "@/lib/store";
import { liveAdapter, ensureSquareVault } from "@/lib/payments";

export const metadata: Metadata = {
  title: "Meditations & Journeys — One Cocreation",
  description: "Recorded affirmations and journeys from One Cocreation — the free gift first, the paid shelf after, straight to the artist.",
};

export const dynamic = "force-dynamic";

/**
 * THE MEDITATIONS SHELF (TASK-176, 0018.06.18 a₿ · block 966098) — the
 * Store header's "Meditations" button lands HERE now, not on the free
 * gift's page: the whole shelf's meditations section, filtered. The free
 * meditation is the first card (ShelfSection's withFreeCard — the gift
 * itself, never a catalog item, no checkout); the paid ones follow in the
 * same StoreItemCard flip grid, and a "see the whole shelf" link leads
 * back to /store. The gate mirrors /store's T-137 gate: store OFF → the
 * shared NotOpenYet panel, never a dead page.
 */
export default async function StoreMeditationsPage() {
  const switches = await getSiteConfig();
  if (!switches.features.store) {
    return (
      <main>
        <SiteHeader />
        <NotOpenYet
          title="The store isn't open yet"
          body="Love's shelf is still being set up — sessions, meditations, memberships and wares are coming. Check back soon."
        />
        <SiteFooter />
      </main>
    );
  }
  // T-157 seam (Number One): the shelf judges the rails the same way the item page does — warm, then judge
  await ensureSquareVault();
  const rails = { btc: liveAdapter() !== null, card: liveAdapter("square") !== null };

  // THE LEAK RULE (store.ts): public serialization strips deliverable.blobPath
  const items = (await listItems()).map(stripPrivateMedia);
  const group = shelfGroups(items).find((g) => g.anchor === "meditations")!;

  return (
    <main>
      <SiteHeader />
      <ShelfSection group={group} rails={rails} withFreeCard wholeShelfLink padTop />
      <SiteFooter />
    </main>
  );
}
