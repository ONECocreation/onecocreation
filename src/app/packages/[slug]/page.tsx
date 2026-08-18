import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ScrollTop from "@/components/ScrollTop";
import AddTierButton from "@/components/store/AddTierButton";
import AddonActions from "@/components/store/AddonActions";
import { TIERS } from "@/lib/entitlement";
import { TIER_PAGES, TIER_ADDONS, tierPageBySlug } from "@/lib/tiers-content";

/* eslint-disable @next/next/no-img-element */

/**
 * One tier, one page — TWO COLUMNS, modeled on Love's live layout (the
 * Admiral's compare shot): her words on the left; the image card with the
 * stacked YES pills on the right; the single-offering add-ons strip below.
 * Words from tiers-content.ts, money from entitlement.ts — one source each.
 */

export function generateStaticParams() {
  return TIER_PAGES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = tierPageBySlug(slug);
  const name = page ? TIERS[page.tier].name : "Memberships";
  return { title: `${name} — One Cocreation` };
}

export default async function TierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = tierPageBySlug(slug);
  if (!page) notFound();
  const t = TIERS[page.tier];
  const upgrade = page.upgradeSlug ? tierPageBySlug(page.upgradeSlug) : undefined;

  return (
    <>
      <ScrollTop />
      <SiteHeader />
      <main>
        <div className="wrap" style={{ maxWidth: 1020, padding: "56px 22px 40px" }}>
          <p className="kicker">
            <Link href="/memberships" style={{ color: "inherit" }}>Memberships</Link>
          </p>
          <h1 className="sec-h">{t.name}</h1>

          <div
            style={{
              display: "grid",
              gap: 40,
              gridTemplateColumns: "minmax(0,1.1fr) minmax(0,.9fr)",
              alignItems: "start",
              marginTop: 26,
            }}
            className="tier-cols"
          >
            {/* words on the left — Love's own */}
            <div>
              <h2 style={{ fontFamily: "var(--font-h2)", fontWeight: 400, fontSize: "1.5rem" }}>{page.heading}</h2>
              <div className="price">${t.priceUsd}<small>/mo</small></div>
              {page.oneTime && (
                <div style={{ color: "var(--muted)", fontSize: ".92rem" }}>
                  or ${page.oneTime.usd} — {page.oneTime.label}
                </div>
              )}
              <div className="sats">⚡ ≈ {t.priceSats.toLocaleString()} sats / month</div>
              <p style={{ fontWeight: 600, color: "var(--ink-strong)", marginTop: 14 }}>{page.cadence}</p>
              {page.paragraphs.map((p) => (
                <p key={p.slice(0, 24)} style={{ color: "var(--ink-body)", margin: "14px 0" }}>{p}</p>
              ))}
              <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.12rem", marginTop: 24 }}>
                New in {t.name}
              </h3>
              <ul className="feat">
                {page.feats.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {page.included?.map((inc) => (
                <div key={inc.title}>
                  <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.12rem", marginTop: 22 }}>
                    {inc.title}
                  </h3>
                  <ul className="feat">
                    {inc.items.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* the image card + stacked YES pills on the right */}
            <div className="card" style={{ padding: 18 }}>
              <img src={page.img} alt={t.name} style={{ borderRadius: 16, width: "100%" }} />
              {page.caption && (
                <p style={{ textAlign: "center", color: "var(--muted)", fontSize: ".85rem", margin: "12px 4px 4px" }}>
                  {page.caption}
                </p>
              )}
              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                <AddTierButton itemId={page.slug} label={`${t.name} — YES! $${t.priceUsd}`} />
                {page.oneTime &&
                  (page.oneTime.itemId ? (
                    <AddTierButton
                      ghost
                      itemId={page.oneTime.itemId}
                      label={`YES! $${page.oneTime.usd} — ${page.oneTime.label}`}
                    />
                  ) : (
                    <Link className="btn btn-ghost" style={{ textAlign: "center" }} href="/support">
                      YES! ${page.oneTime.usd} — {page.oneTime.label}
                    </Link>
                  ))}
                {upgrade && (
                  <Link className="btn btn-ghost" style={{ textAlign: "center" }} href={`/packages/${upgrade.slug}`}>
                    {TIERS[upgrade.tier].name} — Upgrade
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* related packages as living cards, not bare pills — her
              weekly-intuitive page's "relevant items" gesture (0018.05.15) */}
          <div style={{ marginTop: 48 }}>
            <p className="kicker center">Also in the Field</p>
            <div className="grid grid-2" style={{ maxWidth: 700, margin: "0 auto" }}>
              {TIER_PAGES.filter((p) => p.slug !== page.slug).map((p, i) => {
                const rt = TIERS[p.tier];
                const img = { A: "/images/weekly-intuitive.webp", B: "/images/observer.webp", C: "/images/evening-star.webp" }[p.tier];
                return (
                  <Link key={p.slug} href={`/packages/${p.slug}`} className="card reveal"
                    style={{ textDecoration: "none", transitionDelay: `${i * 0.12}s` }}>
                    <img className="thumb" src={img} alt={rt.name} />
                    <div className="body" style={{ alignItems: "center", textAlign: "center" }}>
                      <h3 style={{ fontWeight: 400, fontSize: "1.1rem", margin: 0 }}>{rt.name}</h3>
                      <div className="price" style={{ fontSize: "1.2rem" }}>${rt.priceUsd}<small>/mo</small></div>
                      <span className="btn btn-sm push" style={{ marginTop: 10 }}>YES!</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* the add-ons strip — Love's single offerings, below the fold */}
        <section style={{ background: "rgba(243,220,227,.35)", padding: "44px 0 56px" }}>
          <div className="wrap" style={{ maxWidth: 1020 }}>
            <h2 className="center sec-h" style={{ fontSize: "1.5rem" }}>
              Or Purchase Single Affirmation Offerings
            </h2>
            <div className="grid grid-3" style={{ marginTop: 26 }}>
              {TIER_ADDONS.map((a) => (
                <div key={a.name} className="card">
                  <img className="thumb" src={a.img} alt={a.name} />
                  <div className="body" style={{ alignItems: "center", textAlign: "center" }}>
                    <h3 className="card-title" style={{ fontWeight: 400, fontSize: "1.05rem" }}>{a.name}</h3>
                    <p className="card-sub" style={{ color: "var(--muted)", fontSize: ".85rem" }}>{a.sub}</p>
                    {/* three doors (Admiral 0018.05.17): info · basket · buy */}
                    <AddonActions itemId={a.itemId} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
