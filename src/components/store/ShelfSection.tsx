import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import StoreItemCard, { type PriceRails } from "@/components/store/StoreItemCard";
import FreeMeditationCard from "@/components/store/FreeMeditationCard";
import type { StoreItem } from "@/lib/store";
import { STORE_SECTIONS, doorForItem, groupItemsByBundle, type StoreSection } from "@/lib/store-sections";
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

/** TASK-189: the shelf's own shape is now the ONE map's shape — kept as a
 *  named export (`ShelfGroup`) since this module is the shelf's public
 *  surface other files import from. */
export type ShelfGroup = StoreSection;

/* TASK-189 (0018.06.18 a₿): SHELF_GROUPS now just names the one map
 * (src/lib/store-sections.ts) — the shelf, the item page's breadcrumb, and
 * RelatedItems' door all read the same list instead of hand-keeping three
 * copies in lockstep. ConsciousCuts stays LAST (Love's meeting,
 * 0018.05.11) — that order lives in the map itself now. */
export const SHELF_GROUPS: ShelfGroup[] = STORE_SECTIONS;

/** the cosmic walk — each shelf carries its own tone (0018.05.15). TASK-396
 *  (block 968,132): meditations no longer composes its own dark scrim
 *  string — it names its photo, and the scrim (night AND dawn) lives in
 *  cartridge.css's .shelf-photo-scrim pair (the lion's own recipe), so
 *  light mode gets a real dawn veil instead of losing the picture (B15). */
export const SHELF_BANDS: Record<string, { bg?: string; photo?: string; dark?: boolean }> = {
  sessions: { bg: "linear-gradient(180deg,var(--ground) 0%,var(--band-4) 100%)" },
  meditations: {
    photo: cartridge.hero.nebula,
    dark: true,
  },
  memberships: { bg: "linear-gradient(180deg,var(--band-2) 0%,var(--band-8) 100%)" },
  wares: { bg: "linear-gradient(180deg,var(--band-5) 0%,var(--band-9) 100%)" },
};

/** The card's one door — TASK-189: now the ONE doorForItem (store-sections.ts),
 *  the same function RelatedItems' door reads. Kept as a named export
 *  (`shelfDoorFor`) since this module is the shelf's public surface. */
export const shelfDoorFor = doorForItem;

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
      className={band?.photo ? "shelf-photo-scrim" : undefined}
      style={{
        padding: padTop ? "148px 0 52px" : "52px 0", background: band?.bg,
        "--shelf-photo": band?.photo ? `url(${band.photo})` : undefined,
      } as React.CSSProperties}>
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
            {(() => {
              /* TASK-215 (0018.06.23 a₿, Love's call #35) — a bundle clusters
                 its items under ONE shared heading, spanning the whole grid
                 row; each item still carries its own price and its own door
                 (no shared cart, never a new money rail — T-198 holds). The
                 bundle's own items keep the shelf's price order; a bundle is
                 rendered once, at the position of its first item. */
              const bundles = groupItemsByBundle(group.items);
              const rendered = new Set<string>();
              let cardIdx = 0;
              return group.items.map((item) => {
                const b = item.bundle?.trim();
                if (b) {
                  if (rendered.has(b)) return null;
                  rendered.add(b);
                  const cluster = bundles.find((g) => g.bundle === b)!;
                  return (
                    <div key={`bundle-${b}`} className="reveal"
                      style={{
                        gridColumn: "1 / -1", background: "var(--glass)",
                        border: "1px solid var(--glass-edge)", borderRadius: 24, padding: "22px 20px",
                      }}>
                      <p style={{ margin: "0 0 16px", textAlign: "center", fontSize: ".8rem", fontWeight: 700,
                        letterSpacing: ".04em", color: band?.dark ? "var(--ink-strong)" : "var(--ink-body)" }}>
                        🎁 the {b} bundle — {cluster.items.length} together
                      </p>
                      <div className="grid grid-3">
                        {cluster.items.map((it) => (
                          /* TASK-148 (0018.06.17 a₿): every shelf card turns over on the
                             ONE house flip mechanism — buy/basket doors live on the full
                             view page now, the card carries only the full-view door */
                          <StoreItemCard
                            key={it.id}
                            item={it}
                            rails={rails}
                            icon={group.icon}
                            href={shelfDoorFor(it)}
                            delay={(cardIdx++ % 3) * 0.12}
                          />
                        ))}
                      </div>
                    </div>
                  );
                }
                cardIdx++;
                return (
                  <StoreItemCard
                    key={item.id}
                    item={item}
                    rails={rails}
                    icon={group.icon}
                    href={shelfDoorFor(item)}
                    delay={(cardIdx % 3) * 0.12}
                  />
                );
              });
            })()}
          </div>
        )}
      </div>
    </section>
  );
}
