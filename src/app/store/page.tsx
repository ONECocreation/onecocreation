import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import StoreItemCard from "@/components/store/StoreItemCard";
import StackedHero from "@/components/StackedHero";
import NotOpenYet from "@/components/NotOpenYet";
import { listItems, stripPrivateMedia, type StoreItem } from "@/lib/store";
import { TIER_PAGES } from "@/lib/tiers-content";
import { cartridge } from "@/brand/cartridge";
import { getSiteConfig } from "@/lib/site-config";

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
 */

/* ConsciousCuts goes LAST (Love's meeting, 0018.05.11) — the "sessions"
   group sits at the end of the shelf now; the others keep their order. */
const GROUPS: {
  anchor: string;
  title: string;
  pill: string;
  blurb: string;
  kinds: StoreItem["kind"][];
  icon: string;
}[] = [
  {
    anchor: "meditations",
    title: "Meditations & Journeys",
    pill: "Meditations",
    blurb: "Recorded affirmations and journeys — yours the moment payment settles.",
    kinds: ["digital"],
    icon: "🌙",
  },
  {
    anchor: "memberships",
    title: "Memberships",
    pill: "Memberships",
    blurb: "The packages — classroom doors, community circle, and Love's weekly rhythm.",
    kinds: ["package"],
    icon: "⭐",
  },
  {
    anchor: "wares",
    title: "Wares from the Studio",
    pill: "Wares",
    blurb: "Made or chosen by hand, shipped with love.",
    kinds: ["self", "fourthwall"],
    icon: "🎁",
  },
  {
    anchor: "sessions",
    title: "ConsciousCuts & Soul Sessions",
    pill: "Sessions",
    blurb: "One-on-one time on Love's real calendar — pick a session, choose an open time, you're held.",
    kinds: ["service"],
    icon: "✂️",
  },
];

/** the cosmic walk — each shelf carries its own tone (0018.05.15) */
const BANDS: Record<string, { bg: string; dark?: boolean }> = {
  sessions: { bg: "linear-gradient(180deg,var(--ground) 0%,var(--band-4) 100%)" },
  meditations: {
    bg: `linear-gradient(180deg, rgba(14,10,28,.66), rgba(14,10,28,.78)), url(${cartridge.hero.nebula}) center / cover no-repeat`,
    dark: true,
  },
  memberships: { bg: "linear-gradient(180deg,var(--band-2) 0%,var(--band-8) 100%)" },
  wares: { bg: "linear-gradient(180deg,var(--band-5) 0%,var(--band-9) 100%)" },
};

/** The card's one door: the item's OWN page (Admiral, 0018.05.15 — a
    package door goes STRAIGHT to its package page; TASK-148: the buy/basket
    doors live there, the shelf card carries only this full-view door). */
function doorFor(item: StoreItem): string {
  if (item.kind === "package") {
    const page = TIER_PAGES.find((p) => p.tier === item.entitlementTier);
    return page ? `/packages/${page.slug}` : "/packages";
  }
  return `/store/${item.id}`;
}

/** ascending price — the tiers climb left to right (Admiral, 0018.05.15) */
function effectiveAmount(item: StoreItem): number {
  const p = item.sale ?? item.price;
  return p.sats ?? (p.fiat ? p.fiat.amount * 15 : Number.MAX_SAFE_INTEGER);
}

export default async function StorePage() {
  // TASK-137 (0018.06.17 a₿): the store switch reaches the /store route
  // itself — OFF means a quiet "not open yet" panel, never a dead page or
  // a wall of buy buttons nobody can actually check out from. (OFF-state
  // panel only — T-148's card rewiring below is untouched. Panel pattern
  // ported from the home lane's stalled attempt, worktree task-137.)
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
  // THE LEAK RULE (store.ts): public serialization strips deliverable.blobPath
  const items = (await listItems()).map(stripPrivateMedia);
  const groups = GROUPS.map((g) => ({
    ...g,
    items: items.filter((i) => g.kinds.includes(i.kind)).sort((a, b) => effectiveAmount(a) - effectiveAmount(b)),
  })).filter((g) => g.items.length > 0);

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

      {items.length === 0 && (
        <section><div className="wrap center"><p className="lead">Nothing in the store yet — come back soon ✨</p></div></section>
      )}

      {groups.map((group) => {
        const band = BANDS[group.anchor];
        return (
        <section key={group.anchor} id={group.anchor}
          style={{ padding: "52px 0", background: band?.bg }}>
          <div className="wrap">
            <div className="center reveal" style={{ marginBottom: 26 }}>
              <h2 className="sec-h" style={{ fontSize: "1.7rem", color: band?.dark ? "var(--ink-strong)" : undefined }}>
                {group.icon} {group.title}
              </h2>
              <p style={{ color: band?.dark ? "var(--muted)" : "var(--muted)", maxWidth: 560, margin: "6px auto 0", fontSize: ".95rem" }}>
                {group.blurb}
              </p>
            </div>
            <div className={`grid ${group.items.length >= 3 ? "grid-3" : "grid-2"}`}>
              {group.items.map((item, idx) => (
                /* TASK-148 (0018.06.17 a₿): every shelf card turns over on the
                   ONE house flip mechanism — the QuickView peek Sheet (whose
                   position:fixed the card's backdrop-filter trapped inside the
                   grid cell) is retired; buy/basket doors live on the full
                   view page now, the card carries only the full-view door */
                <StoreItemCard
                  key={item.id}
                  item={item}
                  icon={group.icon}
                  href={doorFor(item)}
                  delay={(idx % 3) * 0.12}
                />
              ))}
            </div>
          </div>
        </section>
        );
      })}
      <SiteFooter />
    </main>
  );
}
