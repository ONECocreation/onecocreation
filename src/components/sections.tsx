import Link from "next/link";
import type { CSSProperties } from "react";
import { TIERS } from "@/lib/entitlement";
import { TIER_PAGES } from "@/lib/tiers-content";
import { ROOMS } from "@/lib/matrix";
import { listServices } from "@/lib/booking";
import { listItems } from "@/lib/store";
import SubscribeForm from "./SubscribeForm";
import TipJar from "./TipJar";
import WildDoors from "./WildDoors";
import LightCode from "./LightCode";
import { cartridge } from "@/brand/cartridge";
import CosmicSky from "./CosmicSky";
import ServiceCard from "./ServiceCard";
import ContactDoors from "./ContactDoors";

/* eslint-disable @next/next/no-img-element */

export function Hero() {
  return (
    <section className="hero keep-dark">{/* keep-dark: the design holds the dark hero in both
        themes — "light code draws in light against the void" (cartridge.css);
        without it the dawn repaint erased the white glyph and the gold days */}
      {/* the living sky — twinkle + the odd shooting star, behind the light */}
      <CosmicSky />
      <div className="inner wrap">
        {/* Love's channeled Love Light Language glyph — DRAWN IN LIGHT on
            arrival (the bench-artifact animation Love loved; LightCode.tsx). */}
        <LightCode />
        <div className="days">5 Days</div>
        <h1>Leap of Faith</h1>
        <div className="sub">A Fresh Step Into a New Mindset</div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn btn-shimmer" href="/packages">Begin the Journey</Link>
          <Link className="btn btn-ghost" href="/#free">Receive the Free Meditation</Link>
        </div>
      </div>
    </section>
  );
}

export function About() {
  return (
    <section id="about">
      <div className="wrap">
        <p className="kicker center">Smiles, Love</p>
        <h2 className="center sec-h" style={{ marginBottom: "1em" }}>My Story</h2>
        <div className="two-col" style={{ "--cols": "minmax(0,.8fr) minmax(0,1.2fr)" } as CSSProperties}>
          <img src={cartridge.portraits.headshot} alt="Love — founder of One Cocreation" style={{ borderRadius: 24, boxShadow: "var(--soft)" }} />
          <div>
            <p>I have been a solo adventurer for a while now — like most, on the hero&apos;s journey. Over time I found none of us are here to shrink, but to standout. Not here to separate, but to gather together — to bring kindness to the world, to be unapologetically US.</p>
            <p style={{ color: "var(--rose)", fontFamily: "var(--serif)", fontSize: "1.3rem", lineHeight: 1.5 }}>
              &ldquo;To those drawn by the energy of the soul, Welcome Home. You Are the Bridge, Where Heaven and Earth Meet.&rdquo;
            </p>
            {/* the short version lives here; the whole journey has its own room */}
            <Link className="btn btn-ghost btn-sm" href="/about" style={{ marginTop: 6, display: "inline-block" }}>
              Read my full story
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Packages() {
  const cards = [
    { tier: "A" as const, accent: "a", img: cartridge.tierArt.A, feats: ["Live weekly Zoom — 4× a month", "Explore your Clair Senses through breath", "Meditations, toning, light language", "A held energetic field, in community"] },
    { tier: "B" as const, accent: "b", img: cartridge.tierArt.B, feats: ["Everything in Weekly Intuitive", "Weekly recorded reading + affirmations", "Weekly live Zoom meetup group", "Movement, meditation & navigation"] },
    { tier: "C" as const, accent: "c", img: cartridge.tierArt.C, feats: ["Everything in Weekly Intuitive & Observer", "Monthly 1–1½ hr focused meeting", "Quantum healing & reference tools", "All classes + full community"] },
  ];
  return (
    <section id="packages" className="lions-gate">
      <div className="wrap">
        <p className="kicker center">The Heart Field — Where Heaven and Earth Meet</p>
        <h2 className="center sec-h">Memberships</h2>
        <p className="lead center">Three ways into the field — each includes everything before it. Pay monthly in dollars or in bitcoin; your tier gently becomes your key.</p>
        <nav className="tier-pills" aria-label="Membership plans">
          {TIER_PAGES.map((p) => (
            <Link key={p.slug} className="tier-pill" href={`/packages/${p.slug}`}>
              {TIERS[p.tier].name}
            </Link>
          ))}
        </nav>
        <div className="grid grid-3">
          {cards.map((c) => {
            const t = TIERS[c.tier];
            return (
              <div className="card shine-hover" key={c.tier}>
                <img className="thumb" src={c.img} alt={t.name} />
                <div className="body">
                  <Link href={`/packages/${TIER_PAGES.find((p) => p.tier === c.tier)?.slug}`} className={`tier-name-pill tier-pill--${c.accent}`} style={{ textDecoration: "none" }}>{t.name}</Link>
                  <div className="price">${t.priceUsd}<small>/mo</small></div>
                  <div className="sats">⚡ ≈ {t.priceSats.toLocaleString()} sats / month</div>
                  <ul className="feat">{c.feats.map((f) => <li key={f}>{f}</li>)}</ul>
                  <div className="push" style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                    <Link className={`btn tier-btn--${c.accent}`} href={`/packages/${TIER_PAGES.find((p) => p.tier === c.tier)?.slug}`}>YES!</Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="note"><b>How the gate works:</b> pay in bitcoin (or dollars) → your package opens automatically. Your tier is checked before content, classes, and community render — the house level-locked door — live and enforcing.</p>
      </div>
    </section>
  );
}

function Pendant({ from, to }: { from: string; to: string }) {
  const id = `g${from.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <defs><radialGradient id={id} cx="45%" cy="38%"><stop offset="0%" stopColor={from} /><stop offset="100%" stopColor={to} /></radialGradient></defs>
      <ellipse cx="60" cy="66" rx="25" ry="33" fill={`url(#${id})`} />
      <path d="M60 20 C41 34 41 60 60 66 C79 60 79 34 60 20" fill="none" stroke="var(--copper)" strokeWidth="3" />
      <path d="M35 60 Q60 94 85 60" fill="none" stroke="var(--copper)" strokeWidth="3" />
      <circle cx="60" cy="14" r="6" fill="none" stroke="var(--copper)" strokeWidth="3" />
    </svg>
  );
}

export function Jewelry() {
  const items = [
    { name: "Rose Quartz Spiral", story: "Divine feminine — soft heart-opening.", usd: 88, sats: "88,000", from: "var(--rose-soft)", to: "var(--room-rose)" },
    { name: "Amethyst Ascension", story: "Crown-chakra clarity, held in wire.", usd: 111, sats: "111,000", from: "var(--room-lavender-soft)", to: "var(--room-lavender)" },
    { name: "Amazonite Waters", story: "Throat-song truth — for speaking your knowing.", usd: 77, sats: "77,000", from: "var(--room-teal-soft)", to: "var(--room-teal)" },
    { name: "Citrine Sun", story: "Divine masculine — warmth and the golden spiral.", usd: 99, sats: "99,000", from: "var(--room-gold-soft)", to: "var(--room-gold)" },
  ];
  return (
    <section id="jewelry">
      <div className="wrap">
        <p className="kicker center">Handmade by Love</p>
        <h2 className="center sec-h">The Adornments</h2>
        <p className="lead center">Wire-wrapped pendants, made one at a time — copper and rose-gold spirals holding stones that chose you. Pay in bitcoin or dollars; shipped to your door.</p>
        <div className="jgrid">
          {items.map((it) => (
            <div className="card" key={it.name}>
              <div className="pendant"><Pendant from={it.from} to={it.to} /></div>
              <div className="body">
                <h3 style={{ fontWeight: 400, fontSize: "1.1rem" }}>{it.name}</h3>
                <p style={{ color: "var(--muted)", fontSize: ".85rem", minHeight: "2.4em" }}>{it.story}</p>
                <div className="price" style={{ fontSize: "1.2rem" }}>${it.usd}</div>
                <div className="sats">⚡ ≈ {it.sats} sats</div>
                <p style={{ fontSize: ".72rem", color: "var(--muted)", margin: "8px 0 12px" }}>Handmade · ships in 3–5 days</p>
              </div>
            </div>
          ))}
        </div>
        <p className="note"><b>Physical goods</b> — each piece is handmade and posted to you. Checkout is bitcoin/lightning (or dollars), non-custodial to Love&apos;s own node; shipping &amp; address collected at checkout. <em>These are stand-in images — photos of the real pieces are coming soon.</em></p>
      </div>
    </section>
  );
}

export async function Services() {
  // The REAL shelf — same services the booking rail sells, in Love's order.
  const services = await listServices();
  const shelfIds = new Set((await listItems()).map((i) => i.id));
  // real photography per session (Admiral, 0018.05.15 — no more emoji tiles)
  const IMG: [RegExp, string][] = [
    [/discovery/i, cartridge.hero.loveSidelook],
    [/soul/i, cartridge.hero.moon],
    [/women|female/i, cartridge.portraits.cuts.women],
    [/men|male/i, cartridge.portraits.cuts.men],
    [/wax/i, cartridge.portraits.cuts.wax],
  ];
  const imgFor = (id: string) => IMG.find(([re]) => re.test(id))?.[1] ?? cartridge.hero.nebula;
  return (
    <section id="services" className="sky-veil" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
      <CosmicSky shooting={false} />
      <div className="wrap" style={{ position: "relative", zIndex: 2, padding: "70px 22px 76px" }}>
        <div className="center reveal">
          <h2 className="sec-h" style={{ color: "var(--ink-strong)" }}>ConsciousCuts &amp; Waxing 🦋</h2>
          <p className="lead" style={{ color: "var(--muted)", marginBottom: 34 }}>
            The Way of the Heart, one-on-one.<br />
            Sessions where you don&apos;t have to keep up conversation.<br />
            Pick a time — you&apos;re held.
          </p>
        </div>
        <div className="grid grid-2" style={{ maxWidth: 880, margin: "0 auto" }}>
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
        <p className="center reveal" style={{ margin: "30px auto 0", maxWidth: 640, fontSize: ".88rem", color: "var(--muted)" }}>
          Pick a session → choose a real open time → pay in sats or dollars → confirmed with a calendar file, held with love.
        </p>
      </div>
    </section>
  );
}

export function Classes() {
  const classes = ROOMS.filter((r) => r.kind === "class");
  const community = ROOMS.filter((r) => r.kind === "community");
  const label = (min: string) => (min === "all" ? "All members" : `Package ${min}`);
  return (
    <section id="classes">
      <div className="wrap">
        {/* was "Chronicles of Wonderland" — a Degen Wonderland remnant (Admiral's catch, 0018.05.15) */}
        <p className="kicker center">The Heartfield Commons</p>
        <h2 className="center sec-h">Classes &amp; Community</h2>
        <p className="lead center">Your own luminous rooms — powered by Matrix — an open protocol; your rooms, your keys. Tier-gated: your package opens the doors.</p>
        <div className="grid grid-2" style={{ maxWidth: 860, margin: "0 auto" }}>
          <div className="card reveal"><div className="body">
            <h3 style={{ fontWeight: 400 }}>📚 Classes</h3>
            {classes.map((r) => (
              <div className="roomrow" key={r.id}>
                <span aria-hidden>✦</span> {r.title}
                <span className="lockpill">{label(r.minTier as string)}</span>
              </div>
            ))}
          </div></div>
          <div className="card reveal" style={{ transitionDelay: ".12s" }}><div className="body">
            <h3 style={{ fontWeight: 400 }}>💗 Community</h3>
            {community.map((r) => (
              <div className="roomrow" key={r.id}>
                <span aria-hidden>♡</span> {r.title}
                <span className="lockpill">{label(r.minTier as string)}</span>
              </div>
            ))}
          </div></div>
        </div>
        <div className="center reveal" style={{ marginTop: 24 }}>
          <Link className="btn" href="/classes">Enter your rooms</Link>
        </div>
        <p className="note reveal"><b>Matrix-powered</b> — paying for a package sends your invite automatically, One Cocreation-branded (replacing Patreon / Mighty Networks / Kajabi). Your rooms, your keys.</p>
      </div>
    </section>
  );
}

export function Affirmations() {
  const aff = [
    { name: "Thank You", sub: "Wake Up Affirmations · 1 hr 11 min", img: "/images/affirmation-thankyou.webp" },
    { name: "Large Sums of Money", sub: "Sleep Affirmation · 16 min · no music", img: "/images/affirmation-largesums.webp" },
    { name: "IAM Worthy", sub: "Sleep Affirmation · 3 hr 3 min", img: "/images/affirmation-iamenough.webp" },
  ];
  return (
    <section id="offers">
      <div className="wrap">
        <p className="kicker center">With Love, Recorded</p>
        <h2 className="center sec-h">Guided Affirmations</h2>
        <p className="lead center">Recorded meditations to nurture the New You. Each payable in bitcoin.</p>
        <div className="grid grid-3">
          {aff.map((a) => (
            <div className="card" key={a.name}>
              <img className="thumb" src={a.img} alt={a.name} />
              <div className="body">
                <h3 style={{ fontWeight: 400 }}>{a.name}</h3>
                <p style={{ color: "var(--muted)", margin: ".2em 0 .6em" }}>{a.sub}</p>
                <div className="price">$11.11</div><div className="sats">⚡ ≈ 11,110 sats</div>
                <Link className="btn btn-ghost push" style={{ marginTop: 16 }} href="/store">Add ⚡</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Donations() {
  return (
    <section id="support">
      <div className="wrap">
        <div style={{ background: "var(--warm-panel)", border: "1px solid var(--warm-edge)", borderRadius: 30, padding: 44, boxShadow: "var(--soft)" }}>
          <p className="kicker">Support This Work — Gently ⚡</p>
          <h2 className="sec-h">Tend the Field</h2>
          <p style={{ color: "var(--ink-body)", maxWidth: 640 }}>
            A gift lands with Love <strong style={{ color: "var(--gold-deep)" }}>whole</strong> — no
            platform between, no cut taken. Give in bitcoin over lightning or simply in dollars;
            bitcoin is an option here, never a demand.
          </p>
          <TipJar />

          {/* ── where Pay It Forward flows (Love's word, 0018.05.15) ───── */}
          <div style={{ marginTop: 34 }}>
            <p className="kicker" style={{ marginBottom: 6 }}>Where Pay It Forward Flows 🎁</p>
            <p style={{ color: "var(--ink-body)", maxWidth: 640, fontSize: ".95rem", margin: "0 0 10px" }}>
              The Pay-It-Forward jar doesn&apos;t stop here — Love passes it onward to the beings
              holding this Earth together.
            </p>
            <WildDoors />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "26px 0 4px" }}>
            <Link className="btn btn-ghost" href="/book">Book a Session</Link>
            <Link className="btn btn-ghost" href="/store">Visit the Store</Link>
            <Link className="btn btn-ghost" href="/support">The Full Support Room</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FreeMeditation() {
  return (
    <section id="free">
      <div className="wrap">
        <div className="two-col" style={{ gap: 36 }}>
          <img src="/images/dusk-lake-storm-light.webp" alt="Love's own photograph: a still lake under mountains at dusk, orange light breaking through storm cloud" style={{ borderRadius: 24, boxShadow: "var(--soft)" }} />
          <div>
            <p className="kicker">Be in the Know</p>
            <h2 className="sec-h">A Free Meditation, With Love</h2>
            <p style={{ color: "var(--ink-body)", fontSize: "1.02rem" }}>Join the newsletter and receive <strong style={{ color: "var(--rose)" }}>&ldquo;Unzip Into the New You&rdquo;</strong> — a free guided meditation, plus a weekly note of inspiration.</p>
            <p style={{ fontSize: ".85rem", color: "var(--muted)", margin: "0 0 26px" }}>Delivered straight to your inbox — no strings, only love.</p>
            <SubscribeForm source="meditation" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  return (
    <section id="contact">
      <div className="wrap">
        <p className="kicker center">E.T. Phone Home</p>
        <h2 className="center sec-h" style={{ marginBottom: "1em" }}>Connect &amp; Book</h2>
        {/* every card IS its door (Admiral, 0018.05.17); the doors themselves
            are shared with /contact (0018.05.15 — the Admiral prefers that set) */}
        <ContactDoors />
      </div>
    </section>
  );
}
