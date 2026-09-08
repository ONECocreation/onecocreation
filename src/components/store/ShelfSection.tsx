import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import StoreItemCard, { type PriceRails } from "@/components/store/StoreItemCard";
import FreeMeditationCard from "@/components/store/FreeMeditationCard";
import type { StoreItem } from "@/lib/store";
import { TIER_PAGES } from "@/lib/tiers-content";
import { cartridge } from "@/brand/cartridge";

/**
 * THE SHELF SECTION (TASK-176, 0018.06.18 a₿ · block 966098) — one shelf
 * section (title, blurb, the StoreItemCard flip grid) extracted from
 * /store's page so the new filtered routes /store/meditations and
 * /store/memberships render the exact same section the whole shelf does.
 * The group/band/door/sort tables moved here from store/page.tsx unchanged
 * in spirit — one definition, three readers.
 *
 * The FREE MEDITATION rides the meditations section as its first card when
 * the gift exists on the site (hasFreeMeditation below — derive-or-dash:
 * the audio file itself is the truth; no gift on disk, no card, never a
 * placeholder). It is not a catalog item and never touches checkout.
 */

export interface ShelfGroup {
  anchor: string;
  title: string;
  pill: string;
  blurb: string;
  kinds: StoreItem["kind"][];
  icon: string;
}

/* ConsciousCuts goes LAST (Love's meeting, 0018.05.11) — the "sessions"
   group sits at the end of the shelf now; the others keep their order. */
export const SHELF_GROUPS: ShelfGroup[] = [
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
export const SHELF_BANDS: Record<string, { bg: string; dark?: boolean }> = {
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
export function shelfDoorFor(item: StoreItem): string {
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

export interface ShelfGroupWithItems extends ShelfGroup {
  items: StoreItem[];
}

/** Every group with its items filtered and price-sorted — visibility (an
    empty group drops off /store; the filtered routes keep their own) is
    the caller's call, so the free card can hold the meditations section
    open even when no paid meditation is on the shelf yet. */
export function shelfGroups(items: StoreItem[]): ShelfGroupWithItems[] {
  return SHELF_GROUPS.map((g) => ({
    ...g,
    items: items.filter((i) => g.kinds.includes(i.kind)).sort((a, b) => effectiveAmount(a) - effectiveAmount(b)),
  }));
}

/** The gift's own truth (derive-or-dash): the lead-magnet audio the whole
    site promises ("Unzip Into the New You" — lead-magnet.ts, the
    /meditation page, the welcome letters). No file, no card. */
export function hasFreeMeditation(): boolean {
  return fs.existsSync(path.join(process.cwd(), "public", "audio", "unzip-into-the-new-you.mp3"));
}

export default function ShelfSection({
  group,
  rails,
  withFreeCard = false,
  wholeShelfLink = false,
  padTop = false,
}: {
  group: ShelfGroupWithItems;
  /** the live rails (T-157): the shelf judges them server-side and passes them down */
  rails: PriceRails;
  /** meditations only: the free gift rides first (TASK-176) */
  withFreeCard?: boolean;
  /** the filtered routes (/store/meditations, /store/memberships) carry the way back */
  wholeShelfLink?: boolean;
  /** the filtered routes render the section straight under the sticky header */
  padTop?: boolean;
}) {
  const band = SHELF_BANDS[group.anchor];
  const free = withFreeCard && hasFreeMeditation();
  const count = group.items.length + (free ? 1 : 0);
  return (
    <section id={group.anchor}
      style={{ padding: padTop ? "148px 0 52px" : "52px 0", background: band?.bg }}>
      <div className="wrap">
        <div className="center reveal" style={{ marginBottom: 26 }}>
          <h2 className="sec-h" style={{ fontSize: "1.7rem", color: band?.dark ? "var(--ink-strong)" : undefined }}>
            {group.icon} {group.title}
          </h2>
          <p style={{ color: "var(--muted)", maxWidth: 560, margin: "6px auto 0", fontSize: ".95rem" }}>
            {group.blurb}
          </p>
          {wholeShelfLink && (
            <p style={{ margin: "14px 0 0" }}>
              <Link className="btn btn-ghost btn-sm" href="/store">see the whole shelf →</Link>
            </p>
          )}
        </div>
        {count === 0 ? (
          <p className="center" style={{ color: "var(--muted)" }}>Nothing on this shelf yet — come back soon ✨</p>
        ) : (
          <div className={`grid ${count >= 3 ? "grid-3" : "grid-2"}`}>
            {/* TASK-176: the free meditation is a card here — FIRST in the
                row, the same house flip, its doors go to /meditation (the
                gift's own page), never to a checkout */}
            {free && <FreeMeditationCard />}
            {group.items.map((item, idx) => (
              /* TASK-148 (0018.06.17 a₿): every shelf card turns over on the
                 ONE house flip mechanism — buy/basket doors live on the full
                 view page now, the card carries only the full-view door */
              <StoreItemCard
                key={item.id}
                item={item}
                rails={rails}
                icon={group.icon}
                href={shelfDoorFor(item)}
                delay={(idx % 3) * 0.12}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
