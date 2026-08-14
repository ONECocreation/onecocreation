import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import QuickView from "@/components/store/QuickView";
import StackedHero from "@/components/StackedHero";
import { listItems, stripPrivateMedia, type StoreItem } from "@/lib/store";
import { TIER_PAGES } from "@/lib/tiers-content";
import { cartridge } from "@/brand/cartridge";

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
  sessions: { bg: "linear-gradient(180deg,#141021 0%,#12202a 100%)" },
  meditations: {
    bg: `linear-gradient(180deg, rgba(14,10,28,.66), rgba(14,10,28,.78)), url(${cartridge.hero.nebula}) center / cover no-repeat`,
    dark: true,
  },
  memberships: { bg: "linear-gradient(180deg,var(--band-2) 0%,var(--band-8) 100%)" },
  wares: { bg: "linear-gradient(180deg,var(--band-5) 0%,var(--band-9) 100%)" },
};

function satsLabel(n: number): string {
  return `${n.toLocaleString("en-US")} sats`;
}

function fiatLabel(f: { amount: number; currency: string }): string {
  return `${(f.amount / 100).toFixed(2)} ${f.currency}`;
}

/** One entry per kind — the disconnect Pac flagged: every card now has one
    clear gold door, labeled by what actually happens next. A package door
    goes STRAIGHT to its own page (Admiral, 0018.05.15). */
function doorFor(item: StoreItem): { href: string; label: string } {
  // the journey (Admiral, 0018.05.15): store → quick view → DETAIL → cart/time
  if (item.kind === "service") return { href: `/store/${item.id}`, label: "The full story →" };
  if (item.kind === "package") {
    const page = TIER_PAGES.find((p) => p.tier === item.entitlementTier);
    return { href: page ? `/packages/${page.slug}` : "/packages", label: "See the package →" };
  }
  return { href: `/store/${item.id}`, label: item.kind === "digital" ? "Get it ⚡" : "View ⚡" };
}

/** ascending price — the tiers climb left to right (Admiral, 0018.05.15) */
function effectiveAmount(item: StoreItem): number {
  const p = item.sale ?? item.price;
  return p.sats ?? (p.fiat ? p.fiat.amount * 15 : Number.MAX_SAFE_INTEGER);
}

export default async function StorePage() {
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
              {group.items.map((item, idx) => {
                const effective = item.sale ?? item.price;
                const shot = item.media?.images[0] ?? item.images[0];
                const door = doorFor(item);
                return (
                  <div className="card reveal" key={item.id} style={{ transitionDelay: `${(idx % 3) * 0.12}s` }}>
                    {shot ? (
                      // product shots come from blob/dev-file URLs — plain img
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="thumb" src={shot} alt={item.title} />
                    ) : (
                      <div className="thumb" style={{ display: "grid", placeItems: "center", fontSize: "2.6rem",
                        background: "linear-gradient(135deg,#f3dce3,#cbbbea)" }}>
                        {group.icon}
                      </div>
                    )}
                    <div className="body">
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                        <h3 style={{ fontWeight: 400, fontSize: "1.12rem", margin: 0 }}>{item.title}</h3>
                        {item.status === "soldout" && (
                          <span style={{ fontSize: ".64rem", fontWeight: 700, textTransform: "uppercase",
                            letterSpacing: ".06em", color: "var(--rose)", whiteSpace: "nowrap" }}>sold out</span>
                        )}
                      </div>
                      <p className="clamp2" style={{ color: "var(--muted)", fontSize: ".88rem", margin: ".4em 0 .2em" }}>
                        {item.blurb}
                      </p>
                      {item.media?.deliverable && (
                        <p style={{ fontSize: ".72rem", color: "var(--lavender)", margin: "0 0 .2em" }}>
                          ✦ includes {item.media.deliverable.label}
                        </p>
                      )}
                      <div style={{ margin: "10px 0 14px" }}>
                        <span className="price" style={{ fontSize: "1.25rem" }}>
                          {effective.sats != null ? satsLabel(effective.sats) : effective.fiat ? fiatLabel(effective.fiat) : "—"}
                        </span>
                        {item.sale && (
                          <span style={{ marginLeft: 8, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase",
                            letterSpacing: ".06em", color: "var(--rose)" }}>on sale</span>
                        )}
                        {effective.sats != null && effective.fiat && (
                          <span style={{ marginLeft: 8, fontSize: ".78rem", color: "var(--muted)" }}>
                            ~{fiatLabel(effective.fiat)}
                          </span>
                        )}
                      </div>
                      {/* doors: centered at the card's foot (Admiral, 0018.05.15) */}
                      <div className="push" style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
                        <Link className="btn btn-gold btn-sm" href={door.href}>{door.label}</Link>
                        <QuickView
                          item={{
                            id: item.id,
                            title: item.title,
                            blurb: item.blurb,
                            priceLabel:
                              effective.sats != null
                                ? satsLabel(effective.sats)
                                : effective.fiat
                                  ? fiatLabel(effective.fiat)
                                  : "—",
                            img: shot ?? null,
                            icon: group.icon,
                            href: door.href,
                            doorLabel: door.label,
                            canBasket: item.kind !== "service" && item.kind !== "package" && item.status !== "soldout",
                            discoveryNudge: item.kind === "service" && item.id !== "discovery-call",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        );
      })}
      <SiteFooter />
    </main>
  );
}
