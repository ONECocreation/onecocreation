import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import BuyPanel from "@/components/store/BuyPanel";
import ImageLightbox from "@/components/store/ImageLightbox";
import RelatedItems from "@/components/store/RelatedItems";
import { getItem, listItems, stripPrivateMedia, type StoreItem } from "@/lib/store";
import { liveAdapter, ensureSquareVault } from "@/lib/payments";
import { getSiteConfig } from "@/lib/site-config";
import { dollars } from "@/lib/money-words";

export const dynamic = "force-dynamic";

/**
 * TASK-157 (0018.06.17 a₿, cut from the T-147 review): the price line
 * follows THE SWITCHES (T-129) — the same rail truth BuyPanel's
 * buyDoorLabel() judges by (railLive/squareLive off liveAdapter()), now
 * judging the price LINE instead of the button. Bitcoin off → dollars
 * lead (dash if card's off too). Both live → sats first, the dollar echo
 * second. Only bitcoin → sats alone, no fiat echo, even when the item
 * carries a fiat price — that rail isn't open. Neither live → a dash
 * (derive-or-dash). The shelf card carries the identical rule as its own
 * copy (StoreItemCard.tsx's priceLine) — a "use client" module's exports
 * can't be called from this server component (RSC boundary — confirmed by
 * `next dev`, not merely assumed), so the two are hand-kept in lockstep;
 * tests/price-line.test.ts pins both, word for word.
 */
export function priceLine(
  item: StoreItem,
  rails: { btc: boolean; card: boolean },
): { primary: string; secondary: string | null } {
  const effective = item.sale ?? item.price;
  const sats = rails.btc && effective.sats != null
    ? `${effective.sats.toLocaleString("en-US")} sats`
    : null;
  const fiat = rails.card && effective.fiat != null
    ? dollars(effective.fiat.amount, effective.fiat.currency)
    : null;
  if (sats) return { primary: sats, secondary: fiat };
  if (fiat) return { primary: fiat, secondary: null };
  return { primary: "—", secondary: null };
}

/**
 * TASK-177 (0018.06.18 a₿) — the STRUCK regular price of the ShinePages
 * template (recon 03: "$20.00 $25.00̶"): when a sale stands, the regular
 * price shows struck through beside the sale words — the SAME rail-judged
 * rule as priceLine, judged on the item as if no sale stood. No sale →
 * null, nothing renders (derive-or-dash).
 */
export function struckLine(
  item: StoreItem,
  rails: { btc: boolean; card: boolean },
): string | null {
  return item.sale ? priceLine({ ...item, sale: undefined }, rails).primary : null;
}

/** the breadcrumb's third crumb — the shelf section this kind lives in,
 *  mirrored from store/page.tsx's GROUPS (hand-kept; derive-or-dash: a kind
 *  with no shelf section — retreat — gets no third crumb, never an invented one) */
const SECTION_BY_KIND: Partial<Record<StoreItem["kind"], { anchor: string; pill: string }>> = {
  digital: { anchor: "meditations", pill: "Meditations" },
  package: { anchor: "memberships", pill: "Memberships" },
  self: { anchor: "wares", pill: "Wares" },
  fourthwall: { anchor: "wares", pill: "Wares" },
  service: { anchor: "sessions", pill: "Sessions" },
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = await getItem(id);
  // hidden is hidden everywhere public (TASK-120) — the tab title and share
  // card are renders too, so a hidden item's title never rides the metadata
  return { title: item && item.status !== "hidden" ? `${item.title} — One Cocreation store` : "Store — One Cocreation" };
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await getItem(id);
  if (!raw || raw.status === "hidden") notFound();
  // THE LEAK RULE (store.ts): the item feeds a client component's props —
  // strip the deliverable's private blobPath before anything serializes
  const item = stripPrivateMedia(raw);

  /* TASK-147 (0018.06.17 a₿) — WARM BEFORE YOU JUDGE. On a cold instance
     siteSwitchesSync() serves the DEFAULTS (btcpay:true — see site-config.ts's
     cold-instance note) and the square vault cache is empty, so the bitcoin
     door could render against Love's OFF switch while the card door vanished
     per serverless instance (Love's meeting: "we tried bitcoin and square",
     "cash payment doesn't show up"). Await both truths, THEN judge the rails. */
  const switches = await getSiteConfig();
  await ensureSquareVault();

  // TASK-157: same rail truth BuyPanel judges by, a few lines down.
  const rails = { btc: liveAdapter() !== null, card: liveAdapter("square") !== null };
  const { primary: priceWords, secondary: priceEcho } = priceLine(item, rails);
  const struckWords = struckLine(item, rails);
  const shots = item.media?.images.length ? item.media.images : item.images;
  const section = SECTION_BY_KIND[item.kind];

  /* TASK-177 (0018.06.18 a₿) — the ShinePages product layout Love chose
     (recon 03/04): TWO columns at ≥900px (.product-cols, house.css) — the
     picture left, the buy column right (breadcrumb, title, price with the
     sale struck, the buy door, the item's words under it) — one column on
     the phone, picture first. The night ground holds in both themes
     (keep-dark + .item-veil, the T-152/T-155 page-scoped veil precedent).
     "Related" below: up to three live items of the same kind. */
  /* T-187 seam: with the Memberships switch OFF a package never rides another item's
     Related row — its door would open onto NotOpenYet */
  const catalog = (await listItems()).map(stripPrivateMedia)
    .filter((i) => switches.features.memberships !== false || i.kind !== "package");

  return (
    <main>
      <SiteHeader />
      <section className="keep-dark item-veil" style={{ padding: "104px 0 56px" }}>
        <div className="wrap">
          <div className="product-cols">
            {/* LEFT — the picture, full and luminous on tap */}
            <div className="reveal">
              <ImageLightbox images={shots} title={item.title} />
            </div>

            {/* RIGHT — the buy column */}
            <div>
              <nav aria-label="breadcrumb" className="kicker" style={{ margin: 0 }}>
                <Link href="/" style={{ color: "inherit" }}>Home</Link>
                <span style={{ margin: "0 8px", opacity: 0.6 }}>/</span>
                <Link href="/store" style={{ color: "inherit" }}>Store</Link>
                {section && (
                  <>
                    <span style={{ margin: "0 8px", opacity: 0.6 }}>/</span>
                    <Link href={`/store#${section.anchor}`} style={{ color: "inherit" }}>{section.pill}</Link>
                  </>
                )}
              </nav>
              <h1 className="sec-h" style={{ margin: "10px 0 0" }}>{item.title}</h1>
              <p className="price" style={{ fontSize: "1.5rem", margin: "12px 0 0" }}>
                {struckWords && (
                  <s style={{ marginRight: 10, fontSize: ".72em", fontWeight: 400, color: "var(--muted)" }}>
                    {struckWords}
                  </s>
                )}
                {priceWords}
                {priceEcho && (
                  <span style={{ marginLeft: 8, fontSize: ".78rem", fontWeight: 400, color: "var(--muted)" }}>
                    {priceEcho}
                  </span>
                )}
                {item.sale && (
                  <span style={{ marginLeft: 10, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: ".06em", color: "var(--rose)" }}>on sale</span>
                )}
              </p>
              {/* the journey's next door (Admiral, 0018.05.15): a session's
                  detail page leads to its TIME — and the unsure get the dove */}
              {item.kind === "service" && (
                <div className="reveal" style={{ margin: "18px 0 0", transitionDelay: ".14s" }}>
                  <Link className="btn" href={`/book/${item.id}`}>Book a time ⚡</Link>
                  {item.id !== "discovery-call" && (
                    <p style={{ margin: "12px 0 0" }}>
                      <Link href="/book/discovery-call" className="btn-quiet" style={{ padding: "0 14px", whiteSpace: "normal", textTransform: "none", letterSpacing: 0, fontSize: ".82rem", display: "inline-block", maxWidth: "100%", lineHeight: 1.5 }}>
                        <span style={{ fontSize: "2rem", verticalAlign: "-6px", marginRight: 8 }}>🕊️</span>not sure? set up a discovery call — credited toward your first session
                      </Link>
                    </p>
                  )}
                </div>
              )}
              <div className="reveal" style={{ transitionDelay: ".18s" }}>
                <BuyPanel item={item} railLive={liveAdapter() !== null} squareLive={liveAdapter("square") !== null} />
              </div>
              {/* the item's words, under the buy door (the template's order) */}
              <p className="reveal" style={{ margin: "20px 0 0", whiteSpace: "pre-line", fontSize: ".95rem",
                color: "var(--ink-body)", transitionDelay: ".1s" }}>{item.blurb}</p>
              {item.media?.deliverable && (
                <p style={{ margin: "10px 0 0", fontSize: ".82rem", color: "var(--info)" }}>
                  ✦ includes {item.media.deliverable.label} ({item.media.deliverable.kind} download) —
                  delivered after purchase, from your receipt page
                </p>
              )}
              {item.media?.preview && (
                <p style={{ margin: "10px 0 0", fontSize: ".85rem" }}>
                  <a href={item.media.preview} style={{ color: "var(--gold-deep)", textDecoration: "underline" }}
                    target="_blank" rel="noopener noreferrer">hear / see a preview</a>
                </p>
              )}
              {item.sku && <p style={{ margin: "10px 0 0", fontSize: ".76rem", color: "var(--muted)" }}>item № {item.sku}</p>}
            </div>
          </div>
        </div>
      </section>
      <RelatedItems items={catalog} current={item} rails={rails} />
      <SiteFooter />
    </main>
  );
}
