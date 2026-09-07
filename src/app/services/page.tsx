import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CosmicSky from "@/components/CosmicSky";
import SubscribeForm from "@/components/SubscribeForm";
import { Services } from "@/components/sections";
import { TIERS } from "@/lib/entitlement";
import { TIER_PAGES } from "@/lib/tiers-content";
import { readConfig } from "@/lib/booking";
import { renderCartridgeId, cartridge } from "@/brand/cartridge";

/* eslint-disable @next/next/no-img-element */

// The shelf reads the live booking config — never bake it at build.
export const dynamic = "force-dynamic";

/**
 * /services — DARK-FIRST GALAXY (Admiral, 0018.05.15): the whole walk
 * lives in the night sky now — deep-space bands breathing with scroll-zoom,
 * real photography on the session cards, and light only where light means
 * something. Her page's copy, her cosmos, our rails.
 *
 * TASK-128 (0018.06.16 a₿, block 965,942): Love no longer offers the cuts —
 * the sections that were ONLY hair (the "CONSCIOUS CUTS & WAXING" moon hero,
 * "IS A SILENT HAIR SESSION FOR YOU?", the chair testimonials) are gone, and
 * the hair lines left the shared sections. What remains is what remains on
 * offer: the discovery call, the soul conversations, the memberships.
 */

/* S10 lane 3 (earthside finishing): keep-dark holds the cartridge's OWN
   night. With LOVE selected the celestial literals below emit verbatim
   (the byte-identical law — this helper collapses to its first argument);
   under EARTHSIDE the same bands and veils wear the warm charcoal of the
   cartridge's night twin instead. S29: reads the RENDER selection, so the
   bench override (renderCartridgeId) behaves like the cartridge it wears. */
const kd = (love: string, earth: string): string =>
  renderCartridgeId === "earthside" ? earth : love;

const TIER_CARDS = [
  { tier: "A" as const, img: cartridge.tierArt.A },
  { tier: "B" as const, img: cartridge.tierArt.B },
  { tier: "C" as const, img: cartridge.tierArt.C },
];

/** dark glass — the night-side sibling of the cream panel */
const darkGlass: React.CSSProperties = {
  background: "var(--glass-night)", backdropFilter: "blur(7px)",
  borderRadius: 28, border: "1px solid var(--glass-night-edge)",
};

export default async function ServicesPage() {
  const anyRetreat = ((await readConfig()).retreats ?? []).some((r) => r.status === "live");
  return (
    <>
      <SiteHeader />
      <main style={{ background: "var(--ground)" }}>
        {/* ══ 1 · WELCOME TO The Way of the Heart — night lavender ══ */}
        <section className="keep-dark" style={{ padding: "64px 0", background: kd("linear-gradient(180deg,#1a1428 0%,#241a33 100%)", "linear-gradient(180deg,#241C14 0%,#2E2418 100%)") }}>{/* S2: band literals pinned — keep-dark holds the night, var(--band-*) repaints at dawn; S10 lane 3: kd() carries the cartridge's own night */}
          <div className="wrap center reveal" style={{ maxWidth: 640 }}>
            <p className="kicker" style={{ color: "var(--rose)" }}>Welcome To</p>
            <h2 className="sec-h" style={{ marginBottom: ".4em", color: "var(--ink-strong)" }}>The Way of the Heart</h2>
            <p style={{ fontFamily: "var(--font-body-app)", fontSize: "1.1rem", color: "var(--ink-body)" }}>
              Mindfulness in action. Sessions where you don&apos;t have to keep up conversation.
              You get to choose… <b style={{ color: "var(--gold-2)" }}>To BE Silent or Not to be Silent — that is the Question.</b>
            </p>
            <p style={{ color: "var(--muted)", fontSize: ".95rem" }}>
              We find out what your needs are — sometimes photos get us in the right direction.
              You get to sit back and enjoy the magic. Every session closes with an{" "}
              <b style={{ color: "var(--rose)" }}>affirmations card</b> chosen for you — a message
              sent from The Universe to take with you into your day.
            </p>
          </div>
        </section>

        {/* ══ 2 · BECOME A FREE MEMBER — night waters ══ */}
        <section className="keep-dark" style={{ padding: "70px 0", background: kd("linear-gradient(180deg,#1a1428 0%,#12202a 60%,#161726 100%)", "linear-gradient(180deg,#241C14 0%,#232B25 60%,#262019 100%)") }}>{/* S2: band literals pinned — keep-dark holds the night */}
          <div className="wrap">
            <div className="center reveal" style={{ marginBottom: 26 }}>
              <h2 className="stack-hero">
                <span className="sh-ink" style={{ color: "var(--ink-strong)" }}>BECOME A</span>
                <span className="sh-teal" style={{ color: "var(--teal-bright)" }}>FREE MEMBER</span>
              </h2>
              <div className="constellation" aria-hidden style={{ color: "var(--ink-strong)" }}>{cartridge.constellation}</div>
            </div>
            {/* TASK-128: these portraits are decorative (alt="") — the OFFER is
                gone; the imagery swap is a design lane, flagged in the report. */}
            <div className="reveal" style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 30 }}>
              {["lady", "men", "lady3", "men2"].map((n, i) => (
                <img key={n} src={`/images/consciouscuts/${n}.webp`} alt=""
                  style={{ width: 132, height: 132, objectFit: "cover", borderRadius: "50%",
                    border: "3px solid rgba(143,208,216,.5)", boxShadow: "0 18px 40px -14px rgba(35,99,110,.7)",
                    transform: `translateY(${i % 2 ? 14 : 0}px)` }} />
              ))}
            </div>
            <div className="reveal" style={{ display: "grid", gap: 14, maxWidth: 760, margin: "0 auto",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))" }}>
              {[
                { icon: "🕊️", words: "A Discovery Call — credited toward your service" },
                { icon: "🗓️", words: "Access to the booking calendar" },
                { icon: "⭐", words: "One month free of The Weekly Intuitive" },
              ].map((b) => (
                <div key={b.words} className="center" style={{ ...darkGlass, padding: "20px 18px" }}>
                  <div style={{ fontSize: "1.7rem" }}>{b.icon}</div>
                  <p style={{ margin: "8px 0 0", fontSize: ".92rem", color: "var(--ink-body)" }}>{b.words}</p>
                </div>
              ))}
            </div>
            <div className="center reveal" style={{ marginTop: 26 }}>
              <Link className="btn" href="/welcome">Create your membership ✨</Link>
            </div>
          </div>
        </section>

        {/* ══ 3 · HOW IT WORKS — embers in the dark ══ */}
        <section className="keep-dark" style={{ padding: "70px 0", background: kd("linear-gradient(180deg,#161726 0%,#241c15 60%,#1a1428 100%)", "linear-gradient(180deg,#262019 0%,#2E2418 60%,#241C14 100%)") }}>{/* S2: band literals pinned — keep-dark holds the night */}
          <div className="wrap">
            <div className="center reveal" style={{ marginBottom: 10 }}>
              <h2 className="stack-hero">
                <span className="sh-ink" style={{ color: "var(--ink-strong)" }}>HOW IT</span>
                <span className="sh-teal" style={{ color: "var(--teal-bright)" }}>WORKS</span>
              </h2>
              <p style={{ fontFamily: "var(--disp)", fontWeight: 700, letterSpacing: ".14em", fontSize: ".85rem",
                color: "var(--gold-2)", margin: "14px 0 0", textTransform: "uppercase" }}>
                Here&apos;s where the adventure begins!
              </p>
            </div>
            <div className="reveal" style={{ display: "grid", gap: 20, maxWidth: 900, margin: "26px auto 0",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(250px, 100%), 1fr))" }}>
              {/* TASK-128: the hair-specific lines (face shape / hair type /
                  waxing needs / the Silent Hair Session question) left with the
                  service; the funnel itself is the sessions', and stays. */}
              {[
                { n: "1", t: "Sign up — the doors open", w: "Your free membership brings the booking calendar and one month of The Weekly Intuitive." },
                { n: "2", t: "Your Discovery Call", w: "15–20 minutes — or just book the appointment." },
                { n: "3", t: "Your services", w: "Tell me what you're looking for — and what the session can unlock within you." },
              ].map((s) => (
                <div key={s.n} style={{ ...darkGlass, padding: "22px 20px" }}>
                  <div style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: "1.8rem", color: "var(--teal-bright)" }}>{s.n}</div>
                  <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.1rem", margin: "6px 0 6px", color: "var(--ink-strong)" }}>{s.t}</h3>
                  <p style={{ margin: 0, fontSize: ".88rem", color: "var(--muted)" }}>{s.w}</p>
                </div>
              ))}
            </div>
            <p className="center reveal" style={{ margin: "24px auto 0", maxWidth: 560, fontSize: ".92rem", color: "var(--gold-2)" }}>
              🎁 $55 — as your session is booked, checkout hands you a <b>CODE taking $55 off</b> the
              total of your session (your Discovery Call, kept).
            </p>
            <div className="center reveal" style={{ marginTop: 18 }}>
              <Link className="btn btn-shimmer" href="/welcome">Get started today</Link>
            </div>
          </div>
        </section>

        {/* ══ 4 · the sessions shelf — galaxy cards (its own night sky) ══ */}
        <Services />

        {/* ══ 5 · Monthly Paid Memberships — light cards on the night ══ */}
        <section className="keep-dark" style={{ padding: "70px 0", background: kd("linear-gradient(180deg,#1a1428 0%,#141a2b 100%)", "linear-gradient(180deg,#241C14 0%,#27211A 100%)") }}>{/* S2: band literals pinned — keep-dark holds the night */}
          <div className="wrap">
            <div className="center reveal" style={{ marginBottom: 26 }}>
              <h2 className="stack-hero">
                <span className="sh-ink" style={{ color: "var(--ink-strong)" }}>MONTHLY PAID</span>
                <span className="sh-teal" style={{ color: "var(--teal-bright)" }}>MEMBERSHIPS</span>
              </h2>
            </div>
            <div className="grid grid-3">
              {TIER_CARDS.map((c, i) => {
                const t = TIERS[c.tier];
                const page = TIER_PAGES.find((p) => p.tier === c.tier);
                return (
                  <div className="card reveal shine-hover" key={c.tier} style={{ transitionDelay: `${i * 0.14}s` }}>
                    <img className="thumb" src={c.img} alt={t.name} />
                    <div className="body" style={{ alignItems: "center", textAlign: "center" }}>
                      <h3 style={{ fontWeight: 400, fontSize: "1.2rem", margin: 0 }}>{t.name}</h3>
                      <div className="price">${t.priceUsd}<small>/mo</small></div>
                      <div className="sats">⚡ ≈ {t.priceSats.toLocaleString()} sats / month</div>
                      <div className="push" style={{ display: "flex", justifyContent: "center", width: "100%", marginTop: 14 }}>
                        <Link className="btn" href={`/packages/${page?.slug}`}>YES!</Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══ 6 · BE IN THE KNOW — under the meteors, zooming with scroll ══ */}
        <section className="keep-dark" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
          <div className="scrollzoom" aria-hidden style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${cartridge.hero.meteors})`,
            backgroundSize: "cover", backgroundPosition: "center 20%",
          }} />
          <div aria-hidden style={{ position: "absolute", inset: 0,
            background: kd(
              "linear-gradient(180deg, rgba(16,12,30,.55), rgba(16,12,30,.74))",
              "linear-gradient(180deg, rgba(28,21,14,.55), rgba(28,21,14,.74))") }} />
          <div className="aurora" aria-hidden><i /><i /><i /></div>
          <CosmicSky />
          <div className="wrap center reveal" style={{ position: "relative", zIndex: 2, padding: "76px 22px", maxWidth: 620 }}>
            <h2 className="stack-hero">
              <span className="sh-ink" style={{ color: "var(--ink-strong)" }}>BE IN</span>
              <span className="sh-teal" style={{ color: "var(--teal-bright)" }}>THE KNOW</span>
            </h2>
            <p style={{ color: "var(--ink-body)", fontSize: ".97rem", margin: "18px 0 4px" }}>
              Sign up and receive a free recording — <b style={{ color: "var(--gold-2)" }}>Unzip Into The New You!</b>
            </p>
            {/* TASK-128: the "where the hair & waxing studio travels next" line
                left with the service. The subscribe SOURCE id stays as a
                reference — it keys existing subscriber records. */}
            <p style={{ color: "var(--ink-body)", fontSize: ".86rem", margin: "0 0 18px" }}>
              A once-a-week note: Spontaneous Lives, monthly events, and weekly
              inspirations — a way to tune in and tune up, expand your wings,
              and live life with intention. To Connect, Feel Alive — as the New Human you Are.
            </p>
            <div style={{ ...darkGlass, padding: "20px 20px", maxWidth: 460, margin: "0 auto" }}>
              <SubscribeForm source="consciouscuts" />
            </div>
          </div>
        </section>

        {/* ══ more doors ══ */}
        <section style={{ padding: "40px 0 60px", background: "var(--ground)" }}>
          <div className="wrap center reveal">
            <p className="kicker" style={{ color: "var(--rose)" }}>More Doors</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              {anyRetreat && <Link className="btn btn-sm" href="/retreats">Retreats 🏜️</Link>}
              <Link className="btn btn-ghost btn-sm" href="/packages">Memberships</Link>
              <Link className="btn btn-ghost btn-sm" href="/store">The Store</Link>
              <Link className="btn btn-ghost btn-sm" href="/meditation">Free Meditation 🎁</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
