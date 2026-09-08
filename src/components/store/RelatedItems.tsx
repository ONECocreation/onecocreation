import Link from "next/link";
import StoreItemCard, { type PriceRails } from "@/components/store/StoreItemCard";
import { TIER_PAGES } from "@/lib/tiers-content";
import type { StoreItem } from "@/lib/store";

/**
 * TASK-177 (0018.06.18 a₿) — the ShinePages product template's "Related
 * products" row (docs/shinepages-recon/product-editor/04): up to three LIVE
 * items of the SAME KIND as the one being viewed, as StoreItemCards. The
 * hidden-item law from packages rides along: a hidden item NEVER renders
 * anywhere public, related included — relatedItems() filters status live,
 * which excludes both hidden and soldout (the shelf's own listItems()
 * already drops hidden; this pins the law at the component too). The item
 * itself is never its own relative.
 */

/** the related set, pure for tests/item-page.test.ts — derive-or-dash:
 *  no relatives, no row (the page renders nothing, never an empty shelf) */
export function relatedItems(
  all: StoreItem[],
  current: StoreItem,
  limit = 3,
): StoreItem[] {
  return all
    .filter((i) => i.id !== current.id && i.status === "live" && i.kind === current.kind)
    .slice(0, limit);
}

/** the shelf's kind → placeholder face (store/page.tsx's GROUPS icons) */
const ICON: Record<StoreItem["kind"], string> = {
  digital: "🌙",
  package: "⭐",
  self: "🎁",
  fourthwall: "🎁",
  service: "✂️",
  retreat: "🕊️",
};

/** the card's one door, mirrored from the shelf's doorFor (store/page.tsx):
 *  a package goes STRAIGHT to its package page (the Admiral's law), every
 *  other kind opens its own full view */
function doorFor(item: StoreItem): string {
  if (item.kind === "package") {
    const page = TIER_PAGES.find((p) => p.tier === item.entitlementTier);
    return page ? `/packages/${page.slug}` : "/packages";
  }
  return `/store/${item.id}`;
}

export default function RelatedItems({
  items,
  current,
  rails,
}: {
  /** the public catalog (already hidden-free and leak-stripped by the page) */
  items: StoreItem[];
  current: StoreItem;
  /** the live rails the page judged (T-157) — the cards' price lines follow them */
  rails?: PriceRails;
}) {
  const related = relatedItems(items, current);
  if (related.length === 0) return null;
  return (
    <section className="keep-dark item-veil" style={{ padding: "12px 0 60px" }}>
      <div className="wrap">
        <h2 className="sec-h" style={{ fontSize: "1.5rem", marginBottom: 22 }}>
          Related
        </h2>
        <div className={`grid ${related.length >= 3 ? "grid-3" : "grid-2"}`}>
          {related.map((item, idx) => (
            <StoreItemCard
              key={item.id}
              item={item}
              rails={rails}
              icon={ICON[item.kind]}
              href={doorFor(item)}
              delay={(idx % 3) * 0.12}
            />
          ))}
        </div>
        <p style={{ margin: "18px 0 0", fontSize: ".85rem" }}>
          <Link href="/store" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>
            ← back to the whole store
          </Link>
        </p>
      </div>
    </section>
  );
}
