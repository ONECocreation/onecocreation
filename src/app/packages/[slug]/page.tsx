import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ScrollTop from "@/components/ScrollTop";
import AddTierButton from "@/components/store/AddTierButton";
import AddonActions from "@/components/store/AddonActions";
import SubscribeForm from "@/components/SubscribeForm";
import { TIERS } from "@/lib/entitlement";
import { TIER_PAGES, TIER_ADDONS, tierPageBySlug, type TierPage } from "@/lib/tiers-content";
import { getSiteConfig, type SiteConfig } from "@/lib/site-config";
import { getItem } from "@/lib/store";
import { liveAdapter, ensureSquareVault } from "@/lib/payments";
import { dollars, priceWords, satsWords, defaultPreferOf, type MoneyPrefer } from "@/lib/money-words";
import { preferFromCookieHeader } from "@/lib/money-preference";
import { cookies } from "next/headers";

/** Admiral, 0018.06.17 a₿: nothing is offered or recommended whose store item is not live — a hidden
 *  item is off everywhere, not just off the shelf. */
async function itemLive(id: string | undefined): Promise<boolean> {
  if (!id) return false;
  const item = await getItem(id).catch(() => null);
  return item?.status === "live";
}

/* eslint-disable @next/next/no-img-element */

/**
 * One tier, one page — TWO COLUMNS, modeled on Love's live layout (the
 * Admiral's compare shot): her words on the left; the image card with the
 * stacked YES pills on the right; the single-offering add-ons strip below.
 * Words from tiers-content.ts, money from entitlement.ts — one source each.
 *
 * TASK-138 (0018.06.17 a₿): the live-buy YES button gives way to the same
 * waitlist door the home cards use, source/tag intact, while the rails are
 * off — `features.store` is the switch already wired for this (the same
 * one NavMenu.tsx reads to hide the whole Store surface; Love's streamlined
 * default keeps it off). Flip it back on and the buy button returns — no
 * further code change, per the brief.
 */
export function tierRailsOn(switches: Pick<SiteConfig, "features">): boolean {
  return switches.features.store;
}

/** The banner's exact words when `?joined=1` lands after a waitlist join. */
export function tierJoinedBanner(page: Pick<TierPage, "tier">): string {
  return `You're on the list for ${TIERS[page.tier].name}.`;
}

/** Which door the image card shows — pure, so the switch-gating is pinned
 *  without rendering the whole page (SiteHeader/NavMenu ride hooks that
 *  need a real app-router context). Rails ON always wins, even with a
 *  stale `?joined=1` left over from before the switch flipped. */
export type TierOfferMode = "buy" | "banner" | "waitlist";
export function tierOfferMode(switches: Pick<SiteConfig, "features">, joined: boolean): TierOfferMode {
  if (tierRailsOn(switches)) return "buy";
  return joined ? "banner" : "waitlist";
}

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

export default async function TierPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = tierPageBySlug(slug);
  if (!page) notFound();
  const t = TIERS[page.tier];
  const upgrade = page.upgradeSlug ? tierPageBySlug(page.upgradeSlug) : undefined;
  const switches = await getSiteConfig();
  /* TASK-147 (0018.06.17 a₿): the add-on strip's doors need the rail TRUTH —
     warm the square vault (cold instance) and judge both rails ONCE here,
     then hand the truth down as props (AddonActions is a client component). */
  await ensureSquareVault();
  const rails = { btcpayLive: liveAdapter() !== null, squareLive: liveAdapter("square") !== null };
  /* TASK-186 (0018.06.18 a₿) — the tier's money words ride THE ONE DISPLAY
     LAW: the visitor's `oc-money` word (the checkout toggle writes the
     cookie, so first paint already speaks their language), the rail-judged
     default otherwise (fiat when the card rail is live). NEVER the
     approximation mark — the sats number is Love's own angel number, not a conversion; a dark rail's
     denomination stays silent (T-157's law rides here too). */
  const moneyRails = { btc: rails.btcpayLive, card: rails.squareLive };
  const prefer: MoneyPrefer =
    preferFromCookieHeader((await cookies()).toString()) ?? defaultPreferOf(moneyRails);
  const tierWords = priceWords(
    { sats: t.priceSats, fiat: { amount: t.priceUsd * 100, currency: "USD" } },
    moneyRails,
    prefer,
  );
  /* the cadence follows what the primary actually IS (a dark rail can hand
     the lead to the other denomination, whatever the preference said) */
  const fiatPrimary = moneyRails.card && (prefer === "fiat" || !moneyRails.btc);
  const joined = sp?.joined === "1";
  const [mainLive, oneTimeLive, upgradeLive, related, addons] = await Promise.all([
    itemLive(page.slug),
    itemLive(page.oneTime?.itemId),
    itemLive(upgrade?.slug),
    Promise.all(TIER_PAGES.filter((p) => p.slug !== page.slug).map(async (p) => ((await itemLive(p.slug)) ? p : null))),
    Promise.all(TIER_ADDONS.map(async (a) => {
      const item = await getItem(a.itemId).catch(() => null);
      if (item?.status !== "live") return null;
      const eff = item.sale ?? item.price;
      return {
        ...a,
        doors: {
          ...rails,
          satsLabel: eff.sats != null ? `${eff.sats.toLocaleString("en-US")} sats` : null,
          fiatLabel: eff.fiat ? dollars(eff.fiat.amount, eff.fiat.currency) : null,
        },
      };
    })),
  ]);
  const relatedLive = related.filter((p): p is TierPage => p !== null);
  const addonsLive = addons.filter((a): a is NonNullable<(typeof addons)[number]> => a !== null);
  // a hidden membership item cannot be bought — the page falls back to the waitlist door
  const mode = tierOfferMode(switches, joined) === "buy" && !mainLive ? "waitlist" : tierOfferMode(switches, joined);

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
              {/* TASK-186 — preferred denomination first (the big .price
                  line), the other as the "or …" echo, only when both exist
                  and both rails are live; a single denomination shows alone;
                  never the approximation mark — the sats number is Love's own */}
              <div className="price">
                {tierWords.primary}
                {tierWords.primary !== "—" && <small>{fiatPrimary ? "/mo" : " / month"}</small>}
              </div>
              {tierWords.secondary && (
                <div className="sats">
                  {fiatPrimary ? `or ⚡ ${satsWords(t.priceSats)} / month` : `${tierWords.secondary} / month`}
                </div>
              )}
              {page.oneTime && (
                <div style={{ color: "var(--muted)", fontSize: ".92rem" }}>
                  or ${page.oneTime.usd} — {page.oneTime.label}
                </div>
              )}
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
                {mode === "buy" ? (
                  <AddTierButton itemId={page.slug} label={`${t.name} — YES! $${t.priceUsd}`} />
                ) : mode === "banner" ? (
                  <p style={{ color: "var(--rose)", fontWeight: 600, textAlign: "center", margin: 0 }}>
                    {tierJoinedBanner(page)}
                  </p>
                ) : (
                  <SubscribeForm
                    source={`waitlist-${page.tier.toLowerCase()}`}
                    label="I'm interested"
                    note="Add me to the pre-list — pre-order coming soon."
                    next={`/packages/${page.slug}`}
                  />
                )}
                {/* T-138 follow-through (Number One): the one-time purchase gives way with the rails, same as the monthly YES */}
                {mode !== "waitlist" && oneTimeLive && page.oneTime &&
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
                {upgrade && upgradeLive && (
                  <Link className="btn btn-ghost" style={{ textAlign: "center" }} href={`/packages/${upgrade.slug}`}>
                    {TIERS[upgrade.tier].name} — Upgrade
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* related packages as living cards, not bare pills — her
              weekly-intuitive page's "relevant items" gesture (0018.05.15) */}
          {relatedLive.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <p className="kicker center">Also in the Field</p>
            <div className="grid grid-2" style={{ maxWidth: 700, margin: "0 auto" }}>
              {relatedLive.map((p, i) => {
                const rt = TIERS[p.tier];
                const img = { A: "/images/weekly-intuitive.webp", B: "/images/observer.webp", C: "/images/evening-star.webp" }[p.tier];
                {/* TASK-186 — the related cards read the same ONE law */}
                const rw = priceWords(
                  { sats: rt.priceSats, fiat: { amount: rt.priceUsd * 100, currency: "USD" } },
                  moneyRails,
                  prefer,
                );
                return (
                  <Link key={p.slug} href={`/packages/${p.slug}`} className="card reveal"
                    style={{ textDecoration: "none", transitionDelay: `${i * 0.12}s` }}>
                    <img className="thumb" src={img} alt={rt.name} />
                    <div className="body" style={{ alignItems: "center", textAlign: "center" }}>
                      <h3 style={{ fontWeight: 400, fontSize: "1.1rem", margin: 0 }}>{rt.name}</h3>
                      <div className="price" style={{ fontSize: "1.2rem" }}>
                        {rw.primary}
                        {rw.primary !== "—" && (
                          <small>{moneyRails.card && (prefer === "fiat" || !moneyRails.btc) ? "/mo" : " / month"}</small>
                        )}
                        {rw.secondary && (
                          <span style={{ display: "block", fontSize: ".72rem", fontWeight: 400, color: "var(--muted)" }}>
                            {rw.secondary} / month
                          </span>
                        )}
                      </div>
                      <span className="btn btn-sm push" style={{ marginTop: 10 }}>YES!</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
          )}
        </div>

        {/* the add-ons strip — Love's single offerings, below the fold — only the items that are live */}
        {addonsLive.length > 0 && (
        <section style={{ background: "rgba(243,220,227,.35)", padding: "44px 0 56px" }}>
          <div className="wrap" style={{ maxWidth: 1020 }}>
            <h2 className="center sec-h" style={{ fontSize: "1.5rem" }}>
              Or Purchase Single Affirmation Offerings
            </h2>
            <div className="grid grid-3" style={{ marginTop: 26 }}>
              {addonsLive.map((a) => (
                <div key={a.name} className="card">
                  <img className="thumb" src={a.img} alt={a.name} />
                  <div className="body" style={{ alignItems: "center", textAlign: "center" }}>
                    <h3 className="card-title" style={{ fontWeight: 400, fontSize: "1.05rem" }}>{a.name}</h3>
                    <p className="card-sub" style={{ color: "var(--muted)", fontSize: ".85rem" }}>{a.sub}</p>
                    {/* the doors, honest about the rails (TASK-147): bitcoin /
                        card / both / "not open yet — ask Love", never silent */}
                    <AddonActions itemId={a.itemId} doors={a.doors} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
