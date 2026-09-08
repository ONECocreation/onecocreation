import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import NotOpenYet from "@/components/NotOpenYet";
import ShelfSection, { shelfGroups } from "@/components/store/ShelfSection";
import { getSiteConfig } from "@/lib/site-config";
import { listItems, stripPrivateMedia } from "@/lib/store";
import { liveAdapter, ensureSquareVault } from "@/lib/payments";

export const metadata: Metadata = {
  title: "Memberships — One Cocreation",
  description: "The packages — classroom doors, community circle, and Love's weekly rhythm. Paid in bitcoin, straight to the artist.",
};

export const dynamic = "force-dynamic";

/**
 * THE MEMBERSHIPS SHELF (TASK-176, 0018.06.18 a₿ · block 966098) — the
 * Store header's "Memberships" button lands HERE now: the whole shelf's
 * memberships section, filtered — the same StoreItemCard flip grid, the
 * section's own title and blurb, and a "see the whole shelf" link back to
 * /store. (The Heart Field page at /memberships keeps its own door — this
 * is the STORE's memberships shelf.) The gate mirrors /store's T-137
 * gate: store OFF → the shared NotOpenYet panel, never a dead page.
 */
export default async function StoreMembershipsPage() {
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
  const group = shelfGroups(items).find((g) => g.anchor === "memberships")!;

  return (
    <main>
      <SiteHeader />
      <ShelfSection group={group} rails={rails} wholeShelfLink padTop />
      <SiteFooter />
    </main>
  );
}
