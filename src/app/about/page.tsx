import type { Metadata } from "next";
import Link from "next/link";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CosmicSky from "@/components/CosmicSky";
import { TIERS } from "@/lib/entitlement";
import { cartridge } from "@/brand/cartridge";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";
import {
  ABOUT_BRIDGE_LINE,
  ABOUT_JOIN_LINES,
  ABOUT_PINK_DOOR,
  ABOUT_VIDEOS,
  ABOUT_VIDEOS_EMPTY,
} from "@/lib/about-content";
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

const story: React.CSSProperties = { color: "var(--ink-body)", fontSize: ".98rem", lineHeight: 1.85 };

/* TASK-154 (0018.06.17 a₿ · block 966,019) — Love's About pass: the copy
   contract (join-us heading, the pink door pair, the Bridge line, the
   video playlist) is single-sourced in @/lib/about-content so this page,
   the Puck seed and the test pins never drift. */

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
  return (
    <>
      <SiteHeader />
      <main>
        {/* ══ 1 · Smiles Love — the faces, under a living dawn ══ */}
        {/* TASK-154 item 1: the home hero's own darker galaxy ground
            (.about-story-sky, house.css) with TWINKLING stars only — the
            shooting stars leave (CosmicSky shooting={false}). */}
        <section className="keep-dark about-story-sky" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
          <CosmicSky shooting={false} />
          <div className="wrap center reveal" style={{ position: "relative", zIndex: 2, padding: "64px 22px 70px" }}>
            <p className="kicker" style={{ color: "var(--rose)" }}>
              Smiles, Love
            </p>
            <h1 className="stack-hero">
              <span className="sh-ink" style={{ color: "var(--ink-strong)" }}>MY</span>
              <span className="sh-teal" style={{ color: "var(--teal-bright)" }}>STORY</span>
            </h1>
            <div className="constellation" aria-hidden style={{ color: "var(--ink-strong)" }}>{cartridge.constellation}</div>
            {/* TASK-154 item 2: her pictures LEVEL, not fanned — framed
                like the session cards: full square, the faint purple
                rounded thin bar around the outside (.about-faces,
                house.css). The middle slot keeps today's picture until
                Love's new one lands (see SUMMARY ## Seams). */}
            <div className="about-faces" style={{ display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap", marginTop: 34 }}>
              {["love-1", "love-2", "love-3"].map((n) => (
                <img key={n} src={`/images/about/${n}.webp`} alt="Love" />
              ))}
            </div>
          </div>
        </section>

        {/* ══ 2 · the hero's journey — her words, whole ══ */}
        <section className="keep-dark sky-glass" style={{ padding: "64px 0" }}>
          <div className="wrap reveal" style={{ maxWidth: 640 }}>
            <p style={story}>
              I have been a solo adventurer for a while now. Like most, on the hero&apos;s journey.
              A call put out. A readiness to answer that call… but well? How many of you have heard
              that same call, but your companion&apos;s <b>Procrastination, Uncertainty, Imposter and
              Fear</b> wanted to take over the itinerary.
            </p>
            {/* the one saved pen override (about.p2) baked in as ruled: the
                live plain-text store had dropped the italic on "not", so the
                baked words carry no <i> — what visitors saw is what stays */}
            <p style={story}>
              Maybe like me, you never felt like you belonged here. I didn&apos;t understand the
              unkindness I saw in this world and I played small — wanting to be seen but not noticed.
              I people-pleased to avoid confrontation. I was an introvert and proud to not be a
              part of anything. Why? Because that meant that I wasn&apos;t the one being rejected.
              That WAS me.
            </p>
            <p className="pull-quote reveal">
              None of us are here to shrink, but to standout. Not here to separate, but gather
              together — to be unapologetically US!
            </p>
            <p style={story}>
              There is a time where the hero must face many challenges. A necessary part of the quest,
              often done alone — a time when the hero must reach deep, deep inside, and through
              processes and experiences finds the courage, the knowing, the heart, that was always
              there.
            </p>
            <p style={story}>
              But is it really a lonesome journey we are on? Or do we tell ourselves it has to be that
              way, because <i>&ldquo;up until now&rdquo;</i> that&apos;s all experience has shown us?
            </p>
            <p className="pull-quote reveal" style={{ color: "var(--ink-strong)" }}>
              We are never actually alone — but always guided along the path.
            </p>
          </div>
        </section>

        {/* ══ 3 · the Claires — deep space interlude ══ */}
        <section className="keep-dark" style={{ padding: 0 }}>
          <div style={{
            backgroundImage: `linear-gradient(180deg, rgba(14,10,28,.68), rgba(14,10,28,.78)), url(${cartridge.hero.nebula})`,
            backgroundSize: "cover", backgroundPosition: "center", position: "relative",
          }}>
            <CosmicSky shooting={false} />
            <div className="wrap reveal" style={{ position: "relative", zIndex: 2, padding: "70px 22px", maxWidth: 640 }}>
              <p style={{ ...story, color: "var(--ink-body)" }}>
                I have been Tuning in, tuning up — through Pranic Healing, Quantum Physics, Vibration,
                and the cells and systems of the body worked with on energetic levels. Attracted first
                to the <b style={{ color: "var(--teal-bright)" }}>Science of Energy</b>, that then melded with
                Spiritual Energetics.
              </p>
              <p style={{ ...story, color: "var(--ink-body)" }}>
                Now, with the help of friends along the way, I&apos;ve been brought to the awareness
                that the knowingness I have had for years is actually one of my{" "}
                <b style={{ color: "var(--gold-2)" }}>Claires</b>! And now IAM.
              </p>
              <p style={{ ...story, fontFamily: "var(--font-body-app)", fontSize: "1.15rem", color: "var(--ink-strong)" }}>
                IAM trusting the Senses I never knew were a gift — and assisting others to trust
                theirs. To hear, to tune into the body and tune up the body, to receive the light that
                is coming into this planet with more grace and ease.
              </p>
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
              <p style={story}>
                IAM a lover of nature, hiking, paddling, adventuring, creating wire creations and
                conscious connections. Mostly a traveler of the lands of America — with recent
                international travel of Egypt and England — I have been between{" "}
                <b>Colorado, Sedona, and Mt&nbsp;Shasta</b>. I consciously connect with the land and
                the waters.
              </p>
              <p className="pull-quote reveal" style={{ color: "var(--teal-bright)" }}>
                Where I go, IAM Home.
              </p>
              {/* TASK-128 (0018.06.16 a₿): the Silent Hair Sessions paragraph left
                  with the service itself — the traveler story keeps the rest. */}
            </div>
          </div>
        </section>

        {/* ══ 5 · the Bridge — her welcome, large ══ */}
        <section className="sky-warm" style={{ padding: "70px 0" }}>
          <div className="wrap center reveal" style={{ maxWidth: 680 }}>
            {/* TASK-154 item 3: a white 1px outline around the script
                graphic (.about-script, house.css). Item 6: the line below
                wears the pull-quote's own face (var(--serif)) and drops
                the period. */}
            <img className="about-script" src={cartridge.hero.heavenEarth} alt="Where Heaven and Earth Meet"
              style={{ width: "min(580px, 96%)", margin: "0 auto 26px", display: "block" }} />
            <p style={{ fontFamily: "var(--serif)", fontSize: "1.35rem", color: "var(--rose)", lineHeight: 1.6, margin: 0 }}>
              {ABOUT_BRIDGE_LINE}
            </p>
            <p style={{ ...story, marginTop: 22 }}>
              The ability to stretch and expand against all odds — all the while yearning for Home.
              All the while always possessing the choice, the power, to go home. To BE home. For home
              is not a destination:
            </p>
            <p className="pull-quote reveal">
              Home IS where the Heart IS.
            </p>
            <p style={story}>
              In presence. In Now. It is within the Heartmind Coherence that the You and the Divine
              as One bring all to balanced form. A Cocreation where Heaven meets Earth — whether
              it&apos;s Heaven on earth, or a paradise in the making.
            </p>
            <p style={{ ...story, fontFamily: "var(--font-body-app)", fontSize: "1.1rem", color: "var(--ink-strong)" }}>
              This is what you came for. To be this Bridge for the New Earth. You are the Anointed,
              the Chosen, the One that is Answering the Call.
            </p>
          </div>
        </section>

        {/* ══ 6 · the Weekly Intuitive story + her videos ══ */}
        {/* TASK-154 item 4: the brown band goes (sky-warm → sky-glass);
            item 7: the join-us heading reads "Breathe with us". */}
        <section className="sky-glass" style={{ padding: "70px 0" }}>
          <div className="wrap">
            <div className="center reveal" style={{ marginBottom: 26 }}>
              <p className="kicker">Join Us — In This Grand Adventure!</p>
              <h2 className="stack-hero">
                <span className="sh-ink">{ABOUT_JOIN_LINES.ink}</span>
                <span className="sh-teal">{ABOUT_JOIN_LINES.teal}</span>
              </h2>
            </div>
            <div className="reveal" style={{ display: "grid", gap: 26, alignItems: "start", maxWidth: 960, margin: "0 auto",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))" }}>
              {/* TASK-154 item 5: the left glass box is gone — her words
                  stand on the band itself (the thin outline she likes is
                  the session-card bar, carried to her faces above). */}
              <div style={{ padding: "8px 2px", fontSize: ".93rem", color: "var(--ink-body)", lineHeight: 1.8 }}>
                <p style={{ marginTop: 0 }}>
                  — For years, when I couldn&apos;t sleep through the night, I knew that was the body
                  speaking to me: things were out of balance. I had been trying to change another, or
                  change the outside circumstances, to bring peace. That&apos;s when I knew…
                </p>
                <p>
                  …the only way for me to be happy again was to work with my body. To hear. To pay
                  attention to my emotions, my reactions, my beliefs — and ask, <i>is there another
                  way?</i> <b>I became the Observer of my inner world, and my outer world transformed
                  before my eyes.</b>
                </p>
                <p style={{ marginBottom: 0 }}>
                  — Fast forward to today… IAM bringing you back to the way of the heart. Group
                  conversations, connecting to the intelligence of earth, the intelligence of the
                  body, and the Divine You Are. Channeled messages through breath, through heart,
                  through community. You have all the answers — I prepare the energetic space.
                </p>
              </div>
              <div>
                {/* TASK-154 item 8: a PLAYLIST, not one video — the ids live
                    in ABOUT_VIDEOS above; each entry unfolds its own embed
                    (native details, no JS); an empty list tells the truth. */}
                {ABOUT_VIDEOS.length === 0 ? (
                  <p style={{ fontSize: ".9rem", color: "var(--muted)", textAlign: "center" }}>
                    {ABOUT_VIDEOS_EMPTY}{" "}
                    <a href="https://www.youtube.com/@Onecocreation" target="_blank" rel="noreferrer">
                      Love&apos;s channel
                    </a>
                  </p>
                ) : (
                  <div className="about-playlist">
                    {ABOUT_VIDEOS.map((v, i) => (
                      <details key={v.id} className="about-video" open={i === 0}>
                        <summary>{v.title}</summary>
                        <div style={{ position: "relative", aspectRatio: v.ratio }}>
                          <iframe
                            loading="lazy"
                            src={`https://www.youtube-nocookie.com/embed/${v.id}`}
                            title={`Love — ${v.title}`}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </details>
                    ))}
                  </div>
                )}
                <div className="center" style={{ marginTop: 18 }}>
                  <p style={{ fontSize: ".85rem", color: "var(--muted)", margin: "0 0 10px" }}>
                    ${t.priceUsd}/mo · ⚡ ≈ {t.priceSats.toLocaleString()} sats — readings, breath,
                    toning, light language, a held field
                  </p>
                  {/* item 4: the YES! door pours pink, not white */}
                  <Link className={ABOUT_PINK_DOOR} href="/packages/weekly-intuitive">YES!</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ 7 · the New Era of Love — the close, under meteors ══ */}
        <section className="keep-dark" style={{ padding: 0 }}>
          <div style={{
            backgroundImage: `linear-gradient(180deg, rgba(16,12,30,.6), rgba(16,12,30,.72)), url(${cartridge.hero.meteors})`,
            backgroundSize: "cover", backgroundPosition: "center 24%", position: "relative",
          }}>
            <CosmicSky />
            <div className="wrap center reveal" style={{ position: "relative", zIndex: 2, padding: "76px 22px", maxWidth: 640 }}>
              <p className="kicker" style={{ color: "var(--rose)" }}>The Value</p>
              <h2 className="stack-hero">
                <span className="sh-ink" style={{ color: "var(--ink-strong)" }}>A NEW ERA</span>
                <span className="sh-teal" style={{ color: "var(--teal-bright)" }}>OF LOVE</span>
              </h2>
              <p style={{ color: "var(--ink-body)", fontSize: ".95rem", lineHeight: 1.8, margin: "20px 0 0" }}>
                That love comes from inside of us — seeking love and validation from within you. We
                are moving out of the polarity of the Mind-Masculine dissonance, of controlling, and
                into a balance of the Divine Masculine and Feminine. The mind comes along —{" "}
                <b style={{ color: "var(--gold-2)" }}>letting the Heart lead the way.</b>
              </p>
              <p style={{ color: "var(--ink-body)", fontSize: ".92rem", lineHeight: 1.8 }}>
                We can BE the Now and create a more collaborative future for us and all — as IAM, WE
                ARE. The shifts are already here: a breaking down and a synchronistic leveling up,
                occurring now with Gaia. <b>The New Earth and the New Human, as Onecocreation.</b>
              </p>
              <p style={{ fontFamily: "var(--serif)", color: "var(--ink-strong)", fontSize: "1.2rem", margin: "26px 0 16px" }}>
                Ready to get started?
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                {/* TASK-154 item 7: the account door pours pink too */}
                <Link className={ABOUT_PINK_DOOR} href="/welcome">Create your account ✨</Link>
                {/* TASK-128 (0018.06.16 a₿): the ConsciousCuts & Waxing door is
                    retired with the service — the account door stays. */}
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
