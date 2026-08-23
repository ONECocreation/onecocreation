import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import StackedHero from "@/components/StackedHero";
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
 * lives in the night sky now — the moon hero, deep-space bands breathing
 * with scroll-zoom, real photography on the session cards, and light only
 * where light means something. Her page's copy, her cosmos, our rails.
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

const lightGlass: React.CSSProperties = {
  background: "var(--glass)", backdropFilter: "blur(7px)",
  borderRadius: 28, border: "1px solid var(--glass-edge)",
};

export default async function ServicesPage() {
  const anyRetreat = ((await readConfig()).retreats ?? []).some((r) => r.status === "live");
  return (
    <>
      <SiteHeader />
      <main style={{ background: "var(--ground)" }}>
        {/* ══ 1 · the moon hero — her scene, breathing ══ */}
        <section className="keep-dark" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
          <div className="kenburns" aria-hidden style={{
            backgroundImage: `url(${cartridge.hero.moon})`,
            backgroundSize: "cover", backgroundPosition: "center 30%",
          }} />
          <div aria-hidden style={{ position: "absolute", inset: 0,
            /* S2 (0018.05.25 a₿): band literals stay literal — keep-dark holds
               the night; var(--band-*) would repaint dawn light-on-light.
               S10 lane 3: kd() swaps in the cartridge's own night (see above) */
            background: kd(
              "linear-gradient(180deg, rgba(20,18,40,.28) 0%, rgba(26,20,40,.12) 45%, #1a1428 98%)",
              "linear-gradient(180deg, rgba(58,42,26,.24) 0%, rgba(46,36,24,.1) 45%, #241C14 98%)") }} />
          <CosmicSky />
          <div style={{ position: "relative", zIndex: 2 }}>
            <div className="wrap reveal" style={{ padding: "56px 22px 96px" }}>
              <img src={cartridge.hero.heavenEarth} alt="Where Heaven and Earth Meet"
                style={{ width: "min(480px, 88%)", margin: "0 auto 34px", display: "block",
                  /* the white glow was mixed for Love's void — under EARTHSIDE
                     the same script wears a warm ember glow */
                  filter: kd(
                    "drop-shadow(0 1px 10px rgba(255,255,255,.9)) drop-shadow(0 0 26px rgba(255,255,255,.6))",
                    "drop-shadow(0 2px 10px rgba(90,60,30,.5)) drop-shadow(0 0 22px rgba(199,123,74,.4))") }} />
              <div style={{ display: "grid", gap: 30, alignItems: "center",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", maxWidth: 900, margin: "0 auto" }}>
                <img src={cartridge.hero.loveSidelook} alt="Love"
                  style={{ width: "100%", maxWidth: 360, margin: "0 auto", borderRadius: 26,
                    boxShadow: "0 30px 70px -20px rgba(5,3,16,.8)", border: "1px solid rgba(255,255,255,.5)" }} />
                <div className="center" style={{ ...lightGlass, padding: "30px 24px" }}>
                  <img src={cartridge.logo.consciouscuts} alt="" aria-hidden
                    style={{ width: 150, margin: "0 auto 12px", display: "block" }} />
                  <StackedHero
                    lines={[{ t: "CONSCIOUS" }, { t: "CUTS", tone: "teal" }, { t: "&", tone: "amp" }, { t: "WAXING", tone: "sub" }]}
                  >
                    <div style={{ fontFamily: "var(--disp)", fontWeight: 800, letterSpacing: ".32em",
                      fontSize: "1.3rem", color: "var(--ink-strong)", margin: "16px 0 2px" }}>WELCOME</div>
                    <div className="constellation" aria-hidden style={{ margin: "2px 0 0" }}>{cartridge.constellation}</div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
                      <Link className="btn btn-shimmer" href="/welcome">Create an account</Link>
                      <a className="btn btn-teal" href="#silent">Is a silent session for you?</a>
                    </div>
                  </StackedHero>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ 2 · WELCOME TO The Way of the Heart — night lavender ══ */}
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

        {/* ══ 3 · IS A SILENT HAIR SESSION FOR YOU? — the nebula, zooming with scroll ══ */}
        <section id="silent" className="keep-dark" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
          <div className="scrollzoom" aria-hidden style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${cartridge.hero.nebula})`,
            backgroundSize: "cover", backgroundPosition: "center",
          }} />
          <div aria-hidden style={{ position: "absolute", inset: 0,
            background: kd(
              "linear-gradient(180deg, rgba(14,10,28,.6), rgba(26,20,40,.78))",
              "linear-gradient(180deg, rgba(30,23,15,.58), rgba(46,36,24,.78))") }} />
          <div className="wrap reveal" style={{ position: "relative", zIndex: 2, padding: "72px 22px", display: "grid", gap: 34, alignItems: "center",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", maxWidth: 940, margin: "0 auto" }}>
            <div className="center">
              <h2 className="stack-hero">
                <span className="sh-ink" style={{ color: "var(--ink-strong)" }}>IS A SILENT</span>
                <span className="sh-teal" style={{ color: "var(--teal-bright)" }}>HAIR SESSION</span>
                <span className="sh-sub" style={{ color: "var(--gold-2)" }}>FOR YOU?</span>
              </h2>
            </div>
            <div style={{ color: "var(--ink-body)", fontSize: ".97rem", lineHeight: 1.8 }}>
              <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, color: "var(--gold-2)", fontSize: "1.3rem", margin: "0 0 .4em" }}>
                Hair and Waxing
              </h3>
              <p style={{ margin: "0 0 1em" }}>
                A heart to heart connection, through presence. Here we explore the look you desire, and
                collab — it&apos;s more than hair. But have no fear, you get to choose: a{" "}
                <b>regular hair service, or MORE</b>.
              </p>
              <p style={{ margin: 0 }}>
                Often through hair we are maintaining, cleaning up, creating anew — one way we
                unconsciously work with energy. Aware that we are both human and soul, this is a space
                of intentional presence and connection beyond the physical service of hair and waxing.
              </p>
              <div style={{ marginTop: 22 }}>
                <Link className="btn btn-sm" href="/book">Book a session ⚡</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ══ 4 · BECOME A FREE MEMBER — night waters ══ */}
        <section className="keep-dark" style={{ padding: "70px 0", background: kd("linear-gradient(180deg,#1a1428 0%,#12202a 60%,#161726 100%)", "linear-gradient(180deg,#241C14 0%,#232B25 60%,#262019 100%)") }}>{/* S2: band literals pinned — keep-dark holds the night */}
          <div className="wrap">
            <div className="center reveal" style={{ marginBottom: 26 }}>
              <h2 className="stack-hero">
                <span className="sh-ink" style={{ color: "var(--ink-strong)" }}>BECOME A</span>
                <span className="sh-teal" style={{ color: "var(--teal-bright)" }}>FREE MEMBER</span>
              </h2>
              <div className="constellation" aria-hidden style={{ color: "var(--ink-strong)" }}>{cartridge.constellation}</div>
            </div>
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

        {/* ══ 5 · HOW IT WORKS — embers in the dark ══ */}
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
              {[
                { n: "1", t: "Sign up — the doors open", w: "Your free membership brings the booking calendar and one month of The Weekly Intuitive." },
                { n: "2", t: "Your Discovery Call", w: "15–20 minutes — or just book the appointment. Great with photos: send perspective looks, and styles come back matched to your face shape, hair type, and maintenance level." },
                { n: "3", t: "Your services", w: "Tell me what you're looking for — waxing needs, and the Question behind whether a Silent Hair Session is for you and what it can unlock within you." },
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

        {/* ══ 6 · the sessions shelf — galaxy cards (its own night sky) ══ */}
        <Services />

        {/* ══ 7 · real voices — moonlit rose ══ */}
        <section className="keep-dark" style={{ padding: "70px 0", background: kd("linear-gradient(180deg,#1a1428 0%,#241722 60%,#1a1428 100%)", "linear-gradient(180deg,#241C14 0%,#2C2118 60%,#241C14 100%)") }}>{/* S2: band literals pinned — keep-dark holds the night */}
          <div className="wrap">
            <div className="center reveal" style={{ marginBottom: 26 }}>
              <p className="kicker" style={{ color: "var(--rose)" }}>Real Voices from the Chair</p>
            </div>
            <div style={{ display: "grid", gap: 20, maxWidth: 900, margin: "0 auto",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))" }}>
              <blockquote className="reveal" style={{ ...darkGlass, padding: "26px 24px", margin: 0, fontSize: ".93rem", color: "var(--ink-body)", lineHeight: 1.75 }}>
                <p style={{ marginTop: 0 }}>
                  &ldquo;I went with the conscious cut… At one point I started leaving my body and Love
                  really attuned to what was happening with me. She stopped cutting, put her hands so
                  gently on my shoulders and guided both of us back to our breath. <b style={{ color: "var(--ink-strong)" }}>It&apos;s more than
                  getting your hair cut.</b> I walked out of her studio not only looking fabulous, but
                  feeling fabulous.&rdquo;
                </p>
                <p style={{ margin: 0, color: "var(--rose)", fontFamily: "var(--serif)", fontSize: "1.05rem" }}>— Jennifer</p>
              </blockquote>
              <blockquote className="reveal" style={{ ...darkGlass, padding: "26px 24px", margin: 0, fontSize: ".93rem", color: "var(--ink-body)", lineHeight: 1.75, transitionDelay: ".12s" }}>
                <p style={{ marginTop: 0 }}>
                  &ldquo;I&apos;ve had my hair done by Love for two years now and have had only the best
                  experience. She has a wonderful sense of style and vision… I always walk away with the
                  calm meditative presence she provides in her space, feeling <b style={{ color: "var(--ink-strong)" }}>renewed and
                  refreshed</b>. I trust her 100 percent.&rdquo;
                </p>
                <p style={{ margin: 0, color: "var(--rose)", fontFamily: "var(--serif)", fontSize: "1.05rem" }}>— Mike</p>
              </blockquote>
            </div>
          </div>
        </section>

        {/* ══ 8 · Monthly Paid Memberships — light cards on the night ══ */}
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

        {/* ══ 9 · BE IN THE KNOW — under the meteors, zooming with scroll ══ */}
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
            <p style={{ color: "var(--ink-body)", fontSize: ".86rem", margin: "0 0 18px" }}>
              A once-a-week note: Spontaneous Lives, monthly events, where the hair &amp; waxing studio
              travels next, and weekly inspirations — a way to tune in and tune up, expand your wings,
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
