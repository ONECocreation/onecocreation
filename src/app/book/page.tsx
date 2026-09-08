import type { Metadata } from "next";
import Link from "next/link";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CosmicSky from "@/components/CosmicSky";
import ServiceCard from "@/components/ServiceCard";
import NotOpenYet from "@/components/NotOpenYet";
import PaletteVars from "@/components/PaletteVars";
import PopupHost from "@/components/PopupHost";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";
import { listServices } from "@/lib/booking";
import { listItems } from "@/lib/store";
import { getSiteConfig } from "@/lib/site-config";
import { cartridge } from "@/brand/cartridge";

export const metadata: Metadata = {
  title: "Sessions — book a time",
  description: "Pick a session, choose a real open time — you're held.",
};

export const dynamic = "force-dynamic";

/** real photography per session — the same faces as the services shelf */
const IMG: [RegExp, string][] = [
  [/discovery/i, cartridge.hero.loveSidelook],
  [/soul/i, cartridge.hero.moon],
  [/women|female/i, cartridge.portraits.cuts.women],
  [/men|male/i, cartridge.portraits.cuts.men],
  [/wax/i, cartridge.portraits.cuts.wax],
];
const imgFor = (id: string) => IMG.find(([re]) => re.test(id))?.[1] ?? cartridge.hero.nebula;

/**
 * /book — the SESSIONS page (the nav's SESSIONS door opens here). The same
 * living 2×2 the services shelf wears (Admiral, 0018.05.15): photo cards on
 * the night, one rose door.
 *
 * TASK-152 (0018.06.17 a₿, block 966,019 — Love's meeting): "the home page
 * is correct — /sessions has the incorrect font and coloring"; "make the
 * /session page dark"; "move background dark on top, add galaxy pinkish to
 * the bottom behind the discovery call and soul conversation". The page now
 * holds the night in BOTH themes (keep-dark on hero + shelf, the /services
 * precedent), every word rides the house heading/body classes (no
 * page-local font-family, no page-local hex), and the Book doors wear the
 * popup's rose (.btn-rose, the T-121 pair already proved ≥4.5:1).
 */
export default async function BookIndexPage() {
  /* ── TASK-160 GATE (0018.06.17 a₿ · block 966,055) — the route itself
     follows the `sessions` switch now, not just the nav: sessions OFF (Love's
     streamlined default) means a direct /book URL renders the shared
     NotOpenYet quiet panel (T-137) inside the site chrome, never the shelf.
     This branch stays FIRST — the T-159 lane's Puck-first read lands right
     after it (order: 1 gate → 2 Puck → 3 hand-built). ── */
  const switches = await getSiteConfig();
  if (!switches.features.sessions) {
    return (
      <main>
        <SiteHeader />
        <NotOpenYet
          title="Booking isn't open yet"
          body="Love's session calendar is still being set up — check back soon, or write in from the contact page."
        />
        <SiteFooter />
      </main>
    );
  }
  /* ── end TASK-160 GATE ── */
  /* TASK-159 (0018.06.17 a₿ · block 966,055) — PUCK P4 first read, mirroring
     /about and T-153's /memberships byte-for-byte: once Love publishes the
     Puck rebuild (/studio/book -> Publish to live), the live /book serves
     it. Until then, the hand-built page below is untouched — nothing
     changes for visitors until she chooses it.
     ── LANE CONTRACT (T-160): the feature-switch gate (NotOpenYet)
     early-returns ABOVE this branch — the order is (1) switch gate,
     (2) this Puck-first read, (3) the hand-built fallback. ── */
  const puck = await getPuckPage("book");
  if (puck) {
    return (
      <>
        <SiteHeader />
        <PaletteVars />
        <main><Render config={config} data={puck as Data} /></main>
        <SiteFooter />
        {/* STUDIO P2: popup host rides both branches of this page */}
        <PopupHost />
      </>
    );
  }
  /* ── end TASK-159 Puck-first branch; hand-built fallback below ── */

  const services = await listServices();
  const shelfIds = new Set((await listItems()).map((i) => i.id));

  return (
    <main>
      <SiteHeader />
      {/* ══ the hero — night sky settling into the page; the veil holds the
          top DARK (Love: "move background dark on top") — house.css
          .book-hero-veil, the T-155 .login-galaxy precedent ══ */}
      <section className="keep-dark sky-veil book-hero-veil" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
        <CosmicSky />
        <div className="wrap center reveal" style={{ position: "relative", zIndex: 2, padding: "64px 22px 56px" }}>
          <p className="kicker">One-on-One with Love</p>
          <h1 className="stack-hero">
            <span className="sh-ink">BOOK</span>
            <span className="sh-teal">A SESSION</span>
          </h1>
          <div className="constellation" aria-hidden style={{ color: "var(--ink-strong)" }}>{cartridge.constellation}</div>
          {/* the house lede (.lead, the home shelf's own class) — the accent
              rides --gold-2, which since T-121's pink pass IS the light rose:
              one family with the rose Book doors below */}
          <p className="lead" style={{ fontSize: "1.05rem", maxWidth: 460, margin: "18px auto 0" }}>
            Pick a session, choose a real open time — <b style={{ color: "var(--gold-2)" }}>you&apos;re held.</b>
          </p>
        </div>
      </section>

      {/* ══ the sessions — the living 2×2, on its own night with the galaxy
          pinkish rising behind the cards (Love's note; .book-shelf-veil) ══ */}
      <section className="keep-dark book-shelf-veil" style={{ padding: "56px 0 70px" }}>
        <div className="wrap" style={{ maxWidth: 880 }}>
          {services.length === 0 ? (
            <p className="center" style={{ color: "var(--ink-body)" }}>No sessions open yet — check back soon ✨</p>
          ) : (
            <div className="grid grid-2">
              {services.map((s, i) => (
                <ServiceCard
                  key={s.id}
                  delay={(i % 2) * 0.12}
                  svc={{
                    id: s.id,
                    title: s.title,
                    blurb: s.blurb ?? "",
                    durationMin: s.durationMin,
                    usd: s.price.fiat ? Math.round(s.price.fiat.amount / 100) : undefined,
                    sats: s.price.sats,
                    pwyc: s.pricingMode === "pwyc",
                    inStore: shelfIds.has(s.id),
                    img: imgFor(s.id),
                  }}
                />
              ))}
            </div>
          )}
          {/* ink-body, not muted: the shelf veil's rose wash runs strongest
              right here at the bottom — muted measured 3.5:1 on it, ink-body
              holds 7.2:1 (contrast law ≥ 4.5:1) */}
          <p className="center reveal" style={{ marginTop: 34, fontSize: ".88rem", color: "var(--ink-body)" }}>
            not sure where to begin?{" "}
            <Link href="/book/discovery-call" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>
              the discovery call — credited toward your first session
            </Link>{" "}
            is the gentlest door 🕊️
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
