import type { Metadata } from "next";
import Link from "next/link";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CosmicSky from "@/components/CosmicSky";
import StackedHero from "@/components/StackedHero";
import Editable from "@/components/Editable";
import { TIERS } from "@/lib/entitlement";
import { cartridge } from "@/brand/cartridge";
import { getAllCopyOverrides } from "@/lib/copy";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";
import PaletteVars from "@/components/PaletteVars";
import PopupHost from "@/components/PopupHost";

/* eslint-disable @next/next/no-img-element */

export const metadata: Metadata = {
  title: "My Story — Love · One Cocreation",
  description: "Smiles, Love — the solo adventurer's story, the Claires, and the Bridge where Heaven and Earth meet.",
};

/**
 * /about — HER About page brought home whole (Love designed the original;
 * the Admiral's ask, 0018.05.15): the full story in her exact words, her
 * faces, the lands she travels, the video, the Weekly Intuitive story, and
 * the New Era of Love close. The homepage keeps the short version and
 * doors here.
 */

const glass: React.CSSProperties = {
  background: "var(--glass)", backdropFilter: "blur(7px)",
  borderRadius: 28, border: "1px solid var(--glass-edge)",
};

const story: React.CSSProperties = { color: "var(--ink-body)", fontSize: ".98rem", lineHeight: 1.85 };

/* Love's Pen (P1): every id an operator can retype on this page — loaded
   server-side so a saved edit is in the very first paint for every
   visitor, no client fetch, no flash. Price/sats, images, the video embed,
   and button labels stay code (dynamic or navigation, not prose). */
const EDITABLE_IDS = [
  "about.kicker1", "about.h1.line1", "about.h1.line2",
  "about.p1", "about.p2", "about.q1", "about.p3", "about.p4", "about.q2",
  "about.p5", "about.p6", "about.p7",
  "about.p8", "about.q3", "about.p9",
  "about.q4", "about.p10", "about.q5", "about.p11", "about.p12",
  "about.kicker2", "about.h2.line1", "about.h2.line2", "about.p13", "about.p14", "about.p15",
  "about.kicker3", "about.h3.line1", "about.h3.line2", "about.p16", "about.p17", "about.p18",
] as const;

export default async function AboutPage() {
  // P4: once Love publishes the Puck rebuild (/studio/about -> Publish), the
  // live /about serves it. Until then, the original hand-built page below is
  // untouched -- so nothing changes for visitors until she chooses it.
  const puck = await getPuckPage("about");
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

  const t = TIERS.A;
  const ov = await getAllCopyOverrides(EDITABLE_IDS as unknown as string[]);
  return (
    <>
      <SiteHeader />
      <main>
        {/* ══ 1 · Smiles Love — the faces, under a living dawn ══ */}
        <section className="keep-dark sky-veil" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
          <CosmicSky />
          <div className="wrap center reveal" style={{ position: "relative", zIndex: 2, padding: "64px 22px 70px" }}>
            <Editable id="about.kicker1" as="p" className="kicker" style={{ color: "var(--rose)" }} override={ov["about.kicker1"]}>
              Smiles, Love
            </Editable>
            <h1 className="stack-hero">
              <Editable id="about.h1.line1" as="span" className="sh-ink" style={{ color: "var(--ink-strong)" }} override={ov["about.h1.line1"]}>MY</Editable>
              <Editable id="about.h1.line2" as="span" className="sh-teal" style={{ color: "var(--teal-bright)" }} override={ov["about.h1.line2"]}>STORY</Editable>
            </h1>
            <div className="constellation" aria-hidden style={{ color: "var(--ink-strong)" }}>{cartridge.constellation}</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap", marginTop: 34 }}>
              {["love-1", "love-2", "love-3"].map((n, i) => (
                <img key={n} src={`/images/about/${n}.webp`} alt="Love"
                  style={{ width: 190, height: 240, objectFit: "cover", borderRadius: 22,
                    border: "1px solid rgba(255,255,255,.55)", boxShadow: "0 26px 60px -20px rgba(10,8,30,.6)",
                    transform: `rotate(${(i - 1) * 4}deg) translateY(${i === 1 ? -10 : 6}px)` }} />
              ))}
            </div>
          </div>
        </section>

        {/* ══ 2 · the hero's journey — her words, whole ══ */}
        <section className="keep-dark sky-glass" style={{ padding: "64px 0" }}>
          <div className="wrap reveal" style={{ maxWidth: 640 }}>
            <Editable id="about.p1" as="p" style={story} override={ov["about.p1"]}>
              I have been a solo adventurer for a while now. Like most, on the hero&apos;s journey.
              A call put out. A readiness to answer that call… but well? How many of you have heard
              that same call, but your companion&apos;s <b>Procrastination, Uncertainty, Imposter and
              Fear</b> wanted to take over the itinerary.
            </Editable>
            <Editable id="about.p2" as="p" style={story} override={ov["about.p2"]}>
              Maybe like me, you never felt like you belonged here. I didn&apos;t understand the
              unkindness I saw in this world and I played small — wanting to be seen but not noticed.
              I people-pleased to avoid confrontation. I was an introvert and proud to <i>not</i> be a
              part of anything. Why? Because that meant that I wasn&apos;t the one being rejected.
              That WAS me.
            </Editable>
            <Editable id="about.q1" as="p" className="pull-quote reveal" override={ov["about.q1"]}>
              None of us are here to shrink, but to standout. Not here to separate, but gather
              together — to be unapologetically US!
            </Editable>
            <Editable id="about.p3" as="p" style={story} override={ov["about.p3"]}>
              There is a time where the hero must face many challenges. A necessary part of the quest,
              often done alone — a time when the hero must reach deep, deep inside, and through
              processes and experiences finds the courage, the knowing, the heart, that was always
              there.
            </Editable>
            <Editable id="about.p4" as="p" style={story} override={ov["about.p4"]}>
              But is it really a lonesome journey we are on? Or do we tell ourselves it has to be that
              way, because <i>&ldquo;up until now&rdquo;</i> that&apos;s all experience has shown us?
            </Editable>
            <Editable id="about.q2" as="p" className="pull-quote reveal" style={{ color: "var(--ink-strong)" }} override={ov["about.q2"]}>
              We are never actually alone — but always guided along the path.
            </Editable>
          </div>
        </section>

        {/* ══ 3 · the Claires — deep space interlude ══ */}
        <section style={{ padding: 0 }}>
          <div style={{
            backgroundImage: `linear-gradient(180deg, rgba(14,10,28,.68), rgba(14,10,28,.78)), url(${cartridge.hero.nebula})`,
            backgroundSize: "cover", backgroundPosition: "center", position: "relative",
          }}>
            <CosmicSky shooting={false} />
            <div className="wrap reveal" style={{ position: "relative", zIndex: 2, padding: "70px 22px", maxWidth: 640 }}>
              <Editable id="about.p5" as="p" style={{ ...story, color: "var(--ink-body)" }} override={ov["about.p5"]}>
                I have been Tuning in, tuning up — through Pranic Healing, Quantum Physics, Vibration,
                and the cells and systems of the body worked with on energetic levels. Attracted first
                to the <b style={{ color: "var(--teal-bright)" }}>Science of Energy</b>, that then melded with
                Spiritual Energetics.
              </Editable>
              <Editable id="about.p6" as="p" style={{ ...story, color: "var(--ink-body)" }} override={ov["about.p6"]}>
                Now, with the help of friends along the way, I&apos;ve been brought to the awareness
                that the knowingness I have had for years is actually one of my{" "}
                <b style={{ color: "var(--gold-2)" }}>Claires</b>! And now IAM.
              </Editable>
              <Editable id="about.p7" as="p" style={{ ...story, fontFamily: "var(--font-body-app)", fontSize: "1.15rem", color: "var(--ink-strong)" }} override={ov["about.p7"]}>
                IAM trusting the Senses I never knew were a gift — and assisting others to trust
                theirs. To hear, to tune into the body and tune up the body, to receive the light that
                is coming into this planet with more grace and ease.
              </Editable>
            </div>
          </div>
        </section>

        {/* ══ 4 · the traveler — her lands, floating ══ */}
        <section className="sky-glass" style={{ padding: "64px 0" }}>
          <div className="wrap">
            <div className="reveal" style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 30 }}>
              {["scene-1", "scene-2", "scene-3", "scene-4"].map((n, i) => (
                <img key={n} src={`/images/about/${n}.webp`} alt=""
                  style={{ width: 200, height: 140, objectFit: "cover", borderRadius: 16,
                    boxShadow: "0 20px 46px -20px rgba(35,60,80,.45)",
                    transform: `translateY(${i % 2 ? 12 : 0}px)` }} />
              ))}
            </div>
            <div className="reveal center" style={{ maxWidth: 620, margin: "0 auto" }}>
              <Editable id="about.p8" as="p" style={story} override={ov["about.p8"]}>
                IAM a lover of nature, hiking, paddling, adventuring, creating wire creations and
                conscious connections. Mostly a traveler of the lands of America — with recent
                international travel of Egypt and England — I have been between{" "}
                <b>Colorado, Sedona, and Mt&nbsp;Shasta</b>. I consciously connect with the land and
                the waters.
              </Editable>
              <Editable id="about.q3" as="p" className="pull-quote reveal" style={{ color: "var(--teal-bright)" }} override={ov["about.q3"]}>
                Where I go, IAM Home.
              </Editable>
              <Editable id="about.p9" as="p" style={story} override={ov["about.p9"]}>
                I offer Silent Hair Sessions in my mobile studio as I travel — heart-connective
                awareness. I prepare and create the space for One&apos;s epiphanies to arise and make
                themselves known.
              </Editable>
            </div>
          </div>
        </section>

        {/* ══ 5 · the Bridge — her welcome, large ══ */}
        <section className="sky-warm" style={{ padding: "70px 0" }}>
          <div className="wrap center reveal" style={{ maxWidth: 680 }}>
            <img src={cartridge.hero.heavenEarth} alt="Where Heaven and Earth Meet"
              style={{ width: "min(580px, 96%)", margin: "0 auto 26px", display: "block" }} />
            <Editable id="about.q4" as="p" style={{ fontFamily: "var(--serif)", fontSize: "1.35rem", color: "var(--rose)", lineHeight: 1.6, margin: 0 }} override={ov["about.q4"]}>
              &ldquo;To those drawn by the energy of the soul — Welcome Home to you. You Are the
              Bridge, Where Heaven and Earth Meet.&rdquo;
            </Editable>
            <Editable id="about.p10" as="p" style={{ ...story, marginTop: 22 }} override={ov["about.p10"]}>
              The ability to stretch and expand against all odds — all the while yearning for Home.
              All the while always possessing the choice, the power, to go home. To BE home. For home
              is not a destination:
            </Editable>
            <Editable id="about.q5" as="p" className="pull-quote reveal" override={ov["about.q5"]}>
              Home IS where the Heart IS.
            </Editable>
            <Editable id="about.p11" as="p" style={story} override={ov["about.p11"]}>
              In presence. In Now. It is within the Heartmind Coherence that the You and the Divine
              as One bring all to balanced form. A Cocreation where Heaven meets Earth — whether
              it&apos;s Heaven on earth, or a paradise in the making.
            </Editable>
            <Editable id="about.p12" as="p" style={{ ...story, fontFamily: "var(--font-body-app)", fontSize: "1.1rem", color: "var(--ink-strong)" }} override={ov["about.p12"]}>
              This is what you came for. To be this Bridge for the New Earth. You are the Anointed,
              the Chosen, the One that is Answering the Call.
            </Editable>
          </div>
        </section>

        {/* ══ 6 · the Weekly Intuitive story + her video ══ */}
        <section className="sky-warm" style={{ padding: "70px 0" }}>
          <div className="wrap">
            <div className="center reveal" style={{ marginBottom: 26 }}>
              <Editable id="about.kicker2" as="p" className="kicker" override={ov["about.kicker2"]}>Join Us — In This Grand Adventure!</Editable>
              <h2 className="stack-hero">
                <Editable id="about.h2.line1" as="span" className="sh-ink" override={ov["about.h2.line1"]}>THE WEEKLY</Editable>
                <Editable id="about.h2.line2" as="span" className="sh-teal" override={ov["about.h2.line2"]}>INTUITIVE</Editable>
              </h2>
            </div>
            <div className="reveal" style={{ display: "grid", gap: 26, alignItems: "start", maxWidth: 960, margin: "0 auto",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))" }}>
              <div style={{ ...glass, padding: "24px 22px", fontSize: ".93rem", color: "var(--ink-body)", lineHeight: 1.8 }}>
                <Editable id="about.p13" as="p" style={{ marginTop: 0 }} override={ov["about.p13"]}>
                  — For years, when I couldn&apos;t sleep through the night, I knew that was the body
                  speaking to me: things were out of balance. I had been trying to change another, or
                  change the outside circumstances, to bring peace. That&apos;s when I knew…
                </Editable>
                <Editable id="about.p14" as="p" override={ov["about.p14"]}>
                  …the only way for me to be happy again was to work with my body. To hear. To pay
                  attention to my emotions, my reactions, my beliefs — and ask, <i>is there another
                  way?</i> <b>I became the Observer of my inner world, and my outer world transformed
                  before my eyes.</b>
                </Editable>
                <Editable id="about.p15" as="p" style={{ marginBottom: 0 }} override={ov["about.p15"]}>
                  — Fast forward to today… IAM bringing you back to the way of the heart. Group
                  conversations, connecting to the intelligence of earth, the intelligence of the
                  body, and the Divine You Are. Channeled messages through breath, through heart,
                  through community. You have all the answers — I prepare the energetic space.
                </Editable>
              </div>
              <div>
                {/* her most-loved short — "What Breath in discomfort?" (top of
                    the channel by views, 0018.05.15) — breath, exactly the work */}
                <div style={{ position: "relative", width: "min(300px, 88%)", aspectRatio: "9/16",
                  margin: "0 auto", borderRadius: 22, overflow: "hidden",
                  boxShadow: "0 26px 60px -24px rgba(35,26,60,.55)" }}>
                  <iframe
                    src="https://www.youtube-nocookie.com/embed/2LrWVQDnLd0"
                    title="Love — What Breath in discomfort?"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="center" style={{ marginTop: 18 }}>
                  <p style={{ fontSize: ".85rem", color: "var(--muted)", margin: "0 0 10px" }}>
                    ${t.priceUsd}/mo · ⚡ ≈ {t.priceSats.toLocaleString()} sats — readings, breath,
                    toning, light language, a held field
                  </p>
                  <Link className="btn" href="/packages/weekly-intuitive">YES!</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ 7 · the New Era of Love — the close, under meteors ══ */}
        <section style={{ padding: 0 }}>
          <div style={{
            backgroundImage: `linear-gradient(180deg, rgba(16,12,30,.6), rgba(16,12,30,.72)), url(${cartridge.hero.meteors})`,
            backgroundSize: "cover", backgroundPosition: "center 24%", position: "relative",
          }}>
            <CosmicSky />
            <div className="wrap center reveal" style={{ position: "relative", zIndex: 2, padding: "76px 22px", maxWidth: 640 }}>
              <Editable id="about.kicker3" as="p" className="kicker" style={{ color: "var(--rose)" }} override={ov["about.kicker3"]}>The Value</Editable>
              <h2 className="stack-hero">
                <Editable id="about.h3.line1" as="span" className="sh-ink" style={{ color: "var(--ink-strong)" }} override={ov["about.h3.line1"]}>A NEW ERA</Editable>
                <Editable id="about.h3.line2" as="span" className="sh-teal" style={{ color: "var(--teal-bright)" }} override={ov["about.h3.line2"]}>OF LOVE</Editable>
              </h2>
              <Editable id="about.p16" as="p" style={{ color: "var(--ink-body)", fontSize: ".95rem", lineHeight: 1.8, margin: "20px 0 0" }} override={ov["about.p16"]}>
                That love comes from inside of us — seeking love and validation from within you. We
                are moving out of the polarity of the Mind-Masculine dissonance, of controlling, and
                into a balance of the Divine Masculine and Feminine. The mind comes along —{" "}
                <b style={{ color: "var(--gold-2)" }}>letting the Heart lead the way.</b>
              </Editable>
              <Editable id="about.p17" as="p" style={{ color: "var(--ink-body)", fontSize: ".92rem", lineHeight: 1.8 }} override={ov["about.p17"]}>
                We can BE the Now and create a more collaborative future for us and all — as IAM, WE
                ARE. The shifts are already here: a breaking down and a synchronistic leveling up,
                occurring now with Gaia. <b>The New Earth and the New Human, as Onecocreation.</b>
              </Editable>
              <Editable id="about.p18" as="p" style={{ fontFamily: "var(--serif)", color: "var(--ink-strong)", fontSize: "1.2rem", margin: "26px 0 16px" }} override={ov["about.p18"]}>
                Ready to get started?
              </Editable>
              <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                <Link className="btn" href="/welcome">Create your account ✨</Link>
                <Link className="btn btn-teal" href="/services">ConsciousCuts &amp; Waxing ✂️</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <PopupHost />
    </>
  );
}
