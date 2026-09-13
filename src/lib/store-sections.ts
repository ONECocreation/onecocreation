import type { StoreItem } from "@/lib/store";
import { TIER_PAGES } from "@/lib/tiers-content";

/**
 * TASK-189 (0018.06.18 a₿, cut from the T-177/T-184 reviews) — THE ONE
 * KIND→SECTION MAP. Before this it lived three times, hand-kept in
 * lockstep: the shelf's SHELF_GROUPS (ShelfSection.tsx), the item page's
 * SECTION_BY_KIND (store/[id]/page.tsx), and RelatedItems' doorFor
 * (RelatedItems.tsx). One drift between the three and a kind's breadcrumb
 * could point somewhere its shelf card didn't, or a related card's door
 * could disagree with the shelf's. Now all three read this file — same
 * anchor, title, pill, blurb, icon, and door, everywhere a kind is placed.
 *
 * ConsciousCuts goes LAST (Love's meeting, 0018.05.11) — the "sessions"
 * section sits at the end of the shelf order; the others keep theirs.
 * A kind absent from every section here (today: "retreat") gets no
 * breadcrumb crumb and no shelf home — derive-or-dash, never an invented
 * section.
 */

export interface StoreSection {
  anchor: string;
  title: string;
  pill: string;
  blurb: string;
  kinds: StoreItem["kind"][];
  icon: string;
}

export const STORE_SECTIONS: StoreSection[] = [
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

/** derived, once — a kind belongs to at most one section */
const SECTION_BY_KIND = new Map<StoreItem["kind"], StoreSection>();
for (const section of STORE_SECTIONS) {
  for (const kind of section.kinds) SECTION_BY_KIND.set(kind, section);
}

/** the one lookup the item page's breadcrumb and any other kind→section
 *  reader shares — undefined for a kind with no shelf home (derive-or-dash) */
export function sectionForKind(kind: StoreItem["kind"]): StoreSection | undefined {
  return SECTION_BY_KIND.get(kind);
}

/** The card's one door: the item's OWN page — a package goes STRAIGHT to
 *  its package page (the Admiral, 0018.05.15: a package door goes straight
 *  to its package page; TASK-148: the buy/basket doors live there, the
 *  card carries only the full-view door), every other kind opens its own
 *  full view. The shelf, the item page's Related row, and any future
 *  card-grid share this one function — a door decided twice is a door
 *  that can disagree with itself. */
export function doorForItem(item: Pick<StoreItem, "kind" | "id" | "entitlementTier">): string {
  if (item.kind === "package") {
    const page = TIER_PAGES.find((p) => p.tier === item.entitlementTier);
    return page ? `/packages/${page.slug}` : "/packages";
  }
  return `/store/${item.id}`;
}

/**
 * TASK-215 (0018.06.23 a₿, Love's call #35) — bundles: "hair together, soul
 * conversations together". A bundle is items sharing one `bundle` word,
 * clustered together on the shelf under a shared heading — each item keeps
 * its OWN price and its OWN door (T-198 holds the money rail: this is a
 * shelf grouping only, never a shared cart or a combined price). Order
 * preserves each bundle's first appearance among the given items; an item
 * with no bundle word is left out (the caller renders it standalone).
 */
export function groupItemsByBundle<T extends { bundle?: string }>(
  items: T[],
): { bundle: string; items: T[] }[] {
  const order: string[] = [];
  const byBundle = new Map<string, T[]>();
  for (const item of items) {
    const b = item.bundle?.trim();
    if (!b) continue;
    if (!byBundle.has(b)) {
      byBundle.set(b, []);
      order.push(b);
    }
    byBundle.get(b)!.push(item);
  }
  return order.map((bundle) => ({ bundle, items: byBundle.get(bundle)! }));
}
