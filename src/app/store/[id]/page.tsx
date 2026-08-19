import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import BuyPanel from "@/components/store/BuyPanel";
import ImageLightbox from "@/components/store/ImageLightbox";
import { getItem, stripPrivateMedia } from "@/lib/store";
import { liveAdapter } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = await getItem(id);
  return { title: item ? `${item.title} — One Cocreation store` : "Store — One Cocreation" };
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await getItem(id);
  if (!raw || raw.status === "hidden") notFound();
  // THE LEAK RULE (store.ts): the item feeds a client component's props —
  // strip the deliverable's private blobPath before anything serializes
  const item = stripPrivateMedia(raw);

  const effective = item.sale ?? item.price;
  const shots = item.media?.images.length ? item.media.images : item.images;

  return (
    <main>
      <SiteHeader />
      <section>
        <div className="wrap center" style={{ maxWidth: 680 }}>
          <p className="kicker">
            <Link href="/store" style={{ color: "inherit" }}>← The Store</Link>
          </p>
          <h1 className="sec-h">{item.title}</h1>
          <div className="reveal">
            {/* product shots come from blob/dev-file URLs — the lightbox
                opens them full and luminous on tap */}
            <ImageLightbox images={shots} title={item.title} />
          </div>
          <p className="reveal" style={{ margin: "16px auto 0", whiteSpace: "pre-line", fontSize: ".95rem",
            color: "var(--ink-body)", maxWidth: 560, transitionDelay: ".1s" }}>{item.blurb}</p>
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
          <p className="price" style={{ fontSize: "1.5rem", margin: "16px 0 0" }}>
            {effective.sats != null
              ? `${effective.sats.toLocaleString("en-US")} sats`
              : effective.fiat
                ? `${(effective.fiat.amount / 100).toFixed(2)} ${effective.fiat.currency}`
                : ""}
            {item.sale && (
              <span style={{ marginLeft: 10, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".06em", color: "var(--rose)" }}>on sale</span>
            )}
          </p>
          {/* the journey's next door (Admiral, 0018.05.15): a session's detail
              page leads to its TIME — and the unsure get the dove */}
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
            <BuyPanel item={item} railLive={liveAdapter() !== null} />
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
