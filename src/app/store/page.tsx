import type { Metadata } from "next";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ShelfSection, { shelfGroups, hasFreeMeditation } from "@/components/store/ShelfSection";
import StackedHero from "@/components/StackedHero";
import NotOpenYet from "@/components/NotOpenYet";
import PaletteVars from "@/components/PaletteVars";
import PopupHost from "@/components/PopupHost";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";
import { listItems, stripPrivateMedia } from "@/lib/store";
import { getSiteConfig } from "@/lib/site-config";
import { liveAdapter, ensureSquareVault } from "@/lib/payments";

export const metadata: Metadata = {
  title: "Store — One Cocreation",
  description: "Sessions, meditations, memberships, and wares from One Cocreation — paid in bitcoin, straight to the artist.",
};

export const dynamic = "force-dynamic";

/**
 * The public store, faceclifted (Admiral, 0018.05.28): the site's own card
 * language instead of wireframe boxes, real categories with anchor pills,
 * clamped words, and ONE consistent entry per kind — sessions book a time,
 * everything else opens its page. No more mundane wall of text.
 *
 * TASK-176 (0018.06.18 a₿): the section grid, the group/band/door tables
 * and the price sort live in components/store/ShelfSection.tsx now, shared
 * with the new filtered routes /store/meditations and /store/memberships —
 * and the FREE MEDITATION rides the meditations section as its first card
 * (a card on the shelf, not a catalog item; hidden when the gift itself is
 * absent — derive-or-dash).
 */

export default async function StorePage() {
  // TASK-137 (0018.06.17 a₿): the store switch reaches the /store route
  // itself — OFF means a quiet "not open yet" panel, never a dead page or
  // a wall of buy buttons nobody can actually check out from. (OFF-state
  // panel only — T-148's card rewiring below is untouched. Panel pattern
  // ported from the home lane's stalled attempt, worktree task-137.)
  const switches = await getSiteConfig();
  // T-157 seam (Number One): the shelf judges the rails the same way the item page does — warm, then judge
  await ensureSquareVault();
  const rails = { btc: liveAdapter() !== null, card: liveAdapter("square") !== null };
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
  /* TASK-159 (0018.06.17 a₿ · block 966,055) — PUCK P4 first read, mirroring
     /about and T-153's /memberships byte-for-byte: once Love publishes the
     Puck rebuild (/studio/store -> Publish to live), the live /store serves
     it. Until then, the hand-built shelf below is untouched — nothing
     changes for visitors until she chooses it. Sits AFTER the T-137 switch
     gate above — the order is (1) switch gate, (2) this Puck-first read,
     (3) the hand-built fallback (the T-160 lane contract). */
  const puck = await getPuckPage("store");
  if (puck) {
    return (
      <>
        <SiteHeader />
        <PaletteVars />
        <main><Render config={config} data={puck as Data} /></main>
        <SiteFooter />
        {/* STUDIO P2: popup host rides both branches of this page */}
        <PopupHost />
      </>
    );
  }
  /* ── end TASK-159 Puck-first branch; hand-built fallback below ── */

  // THE LEAK RULE (store.ts): public serialization strips deliverable.blobPath
  const items = (await listItems()).map(stripPrivateMedia);
  /* TASK-176: the free meditation holds its section open even when no paid
     meditation is on the shelf yet — the gift IS a card there now */
  const free = hasFreeMeditation();
  const groups = shelfGroups(items)
    .filter((g) => g.items.length > 0 || (g.anchor === "meditations" && free));

  return (
    <main>
      <SiteHeader />
      {/* breathing room around the header (Admiral, 0018.05.15) */}
      <section style={{ padding: "96px 0 34px" }}>
        <div className="wrap center reveal">
          <StackedHero kicker="Where Heaven and Earth Meet" lines={[{ t: "THE" }, { t: "STORE", tone: "teal" }]} />
          <p className="lead" style={{ marginBottom: 0 }}>
            Everything Love makes — sessions, meditations, memberships, and wares.
            Paid in bitcoin, straight to the artist.
          </p>
          {groups.length > 1 && (
            <nav className="cat-pills" aria-label="store categories">
              {groups.map((g) => (
                <a key={g.anchor} href={`#${g.anchor}`}>{g.icon} {g.pill}</a>
              ))}
            </nav>
          )}

        </div>
      </section>

      {groups.length === 0 && (
        <section><div className="wrap center"><p className="lead">Nothing in the store yet — come back soon ✨</p></div></section>
      )}

      {groups.map((group) => (
        <ShelfSection
          key={group.anchor}
          group={group}
          rails={rails}
          withFreeCard={group.anchor === "meditations"}
        />
      ))}
      <SiteFooter />
    </main>
  );
}
