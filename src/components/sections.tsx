import Link from "next/link";
import { TIERS } from "@/lib/entitlement";
import { ROOMS } from "@/lib/matrix";

/* eslint-disable @next/next/no-img-element */

export function Hero() {
  return (
    <section className="hero">
      <div className="inner wrap">
        {/* Love's channeled Love Light Language glyph — glowing on the dark celestial hero.
            (The animated draw-in lives in preview-elevated.html; static glow here.) */}
        <img className="glyph" src="/brand/love-light-language.svg" alt="Love Light Language" />
        <div className="days">5 Days</div>
        <h1>Leap of Faith</h1>
        <div className="sub">A Fresh Step Into a New Mindset</div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn btn-gold" href="/packages">Begin the Journey</Link>
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
        <div style={{ display: "grid", gap: 40, gridTemplateColumns: "minmax(0,.8fr) minmax(0,1.2fr)", alignItems: "center" }}>
          <img src="/images/love-headshot.webp" alt="Love — founder of One Cocreation" style={{ borderRadius: 24, boxShadow: "var(--soft)" }} />
          <div>
            <p>I have been a solo adventurer for a while now — like most, on the hero&apos;s journey. Over time I found none of us are here to shrink, but to standout. Not here to separate, but to gather together — to bring kindness to the world, to be unapologetically US.</p>
            <p style={{ color: "var(--rose)", fontFamily: "var(--serif)", fontSize: "1.3rem", lineHeight: 1.5 }}>
              &ldquo;To those drawn by the energy of the soul, Welcome Home. You Are the Bridge, Where Heaven and Earth Meet.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Packages() {
  const cards = [
    { tier: "A" as const, img: "/images/weekly-intuitive.webp", feats: ["Live weekly Zoom — 4× a month", "Explore your Claire Senses through breath", "Meditations, toning, light language", "A held energetic field, in community"] },
    { tier: "B" as const, img: "/images/observer.webp", feats: ["Everything in Package A", "Weekly recorded reading + affirmations", "Weekly live Zoom meetup group", "Movement, meditation & navigation"] },
    { tier: "C" as const, img: "/images/evening-star.webp", feats: ["Everything in Packages A & B", "Monthly 1–1½ hr focused meeting", "Quantum healing & reference tools", "All classes + full community"] },
  ];
  return (
    <section id="packages">
      <div className="wrap">
        <p className="kicker center">The Heart Field — Where Heaven and Earth Meet</p>
        <h2 className="center sec-h">Memberships</h2>
        <p className="lead center">Three ways into the field — each includes everything before it. Pay monthly in dollars or in bitcoin; your tier gently becomes your key.</p>
        <div className="grid grid-3">
          {cards.map((c) => {
            const t = TIERS[c.tier];
            return (
              <div className="card" key={c.tier}>
                <img className="thumb" src={c.img} alt={t.name} />
                <div className="body">
                  <div style={{ width: 42, height: 42, borderRadius: "50%", display: "grid", placeItems: "center", fontFamily: "var(--serif)", fontSize: "1.25rem", color: c.tier === "C" ? "#3a2a06" : "#fff", background: c.tier === "C" ? "linear-gradient(135deg,var(--gold-2),var(--gold-deep))" : "linear-gradient(135deg,#cbbbea,var(--lavender))", marginBottom: 12 }}>{c.tier}</div>
                  <h3 style={{ fontWeight: 400 }}>{t.name}</h3>
                  <div className="price">${t.priceUsd}<small>/mo</small></div>
                  <div className="sats">⚡ ≈ {t.priceSats.toLocaleString()} sats / month</div>
                  <ul className="feat">{c.feats.map((f) => <li key={f}>{f}</li>)}</ul>
                  <Link className={`btn ${c.tier === "C" ? "btn-gold" : "btn-ghost"} push`} href="/support">Yes! — ⚡ or $</Link>
                </div>
              </div>
            );
          })}
        </div>
        <p className="note"><b>How the gate works:</b> pay in bitcoin (or dollars) → your package opens automatically. Your tier is checked before content, classes, and community render — the house level-locked door. <em>(Entitlement gate — stub in this scaffold.)</em></p>
      </div>
    </section>
  );
}

function Pendant({ from, to }: { from: string; to: string }) {
  const id = `g${from.replace("#", "")}`;
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <defs><radialGradient id={id} cx="45%" cy="38%"><stop offset="0%" stopColor={from} /><stop offset="100%" stopColor={to} /></radialGradient></defs>
      <ellipse cx="60" cy="66" rx="25" ry="33" fill={`url(#${id})`} />
      <path d="M60 20 C41 34 41 60 60 66 C79 60 79 34 60 20" fill="none" stroke="#C77B4A" strokeWidth="3" />
      <path d="M35 60 Q60 94 85 60" fill="none" stroke="#C77B4A" strokeWidth="3" />
      <circle cx="60" cy="14" r="6" fill="none" stroke="#C77B4A" strokeWidth="3" />
    </svg>
  );
}

export function Jewelry() {
  const items = [
    { name: "Rose Quartz Spiral", story: "Divine feminine — soft heart-opening.", usd: 88, sats: "88,000", from: "#efc6da", to: "#b06a97" },
    { name: "Amethyst Ascension", story: "Crown-chakra clarity, held in wire.", usd: 111, sats: "111,000", from: "#cbb7ee", to: "#6f57a8" },
    { name: "Amazonite Waters", story: "Throat-song truth — for speaking your knowing.", usd: 77, sats: "77,000", from: "#bfe3dc", to: "#5f9b90" },
    { name: "Citrine Sun", story: "Divine masculine — warmth and the golden spiral.", usd: 99, sats: "99,000", from: "#f6e2b0", to: "#c79433" },
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
                <Link className="btn btn-ghost btn-sm push" href="/support">Add ⚡</Link>
                <span style={{ display: "block", textAlign: "center", fontSize: ".66rem", textTransform: "uppercase", color: "var(--rose)", marginTop: 8 }}>Artist photo coming</span>
              </div>
            </div>
          ))}
        </div>
        <p className="note"><b>Physical goods</b> — each piece is handmade and posted to you. Checkout is bitcoin/lightning (or dollars), non-custodial to Love&apos;s own node; shipping &amp; address collected at checkout. <em>(Placeholder motifs — Love&apos;s real product photos drop straight in.)</em></p>
      </div>
    </section>
  );
}

export function Services() {
  const svcs = [
    { icon: "✂️", name: "Silent Haircut — Women", desc: "Conscious cut · affirmation card included", usd: 222, sats: "222,000" },
    { icon: "✂️", name: "Silent Haircut — Men", desc: "Conscious cut · affirmation card included", usd: 111, sats: "111,000" },
    { icon: "💫", name: "Soul Conversation (1:1)", desc: "Heart-connective session · with or without a cut", usd: 222, sats: "222,000" },
    { icon: "🕊️", name: "Discovery Call — 30 min", desc: "Feel into what's next · credited toward first service", usd: 55, sats: "55,000" },
  ];
  return (
    <section id="services">
      <div className="wrap">
        <p className="kicker center">ConsciousCuts &amp; Waxing — Book &amp; Pay in Sats ⚡</p>
        <h2 className="center sec-h">Silent Hair Sessions 🦋</h2>
        <p className="lead center">The Way of the Heart, one-on-one. Sessions where you don&apos;t have to keep up conversation. Pick a time, pay in sats, you&apos;re held.</p>
        {svcs.map((s) => (
          <div className="svc" key={s.name}>
            <div style={{ width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", fontSize: "1.4rem", background: "linear-gradient(135deg,#f3dce3,#cbbbea)" }}>{s.icon}</div>
            <div className="meta"><h4>{s.name}</h4><p>{s.desc}</p></div>
            <div style={{ textAlign: "right" }}><div className="pr">${s.usd}</div><div className="sats">⚡ ≈ {s.sats} sats</div></div>
            <Link className="btn btn-ghost btn-sm" href="/support">Book ⚡</Link>
          </div>
        ))}
        <p className="note"><span className="stub">Calendar &amp; booking — stub</span><br />Real availability, timezone &amp; confirmation arrive in Phase 2 (pick a slot → pay on book → confirmed).</p>
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
        <p className="kicker center">Chronicles of Wonderland</p>
        <h2 className="center sec-h">Classes &amp; Community</h2>
        <p className="lead center">Your own luminous rooms — powered by Matrix, the open protocol behind Pac&apos;s Arcade. Tier-gated: your package opens the doors.</p>
        <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr 1fr" }}>
          <div className="card"><div className="body"><h3 style={{ fontWeight: 400 }}>📚 Classes</h3>{classes.map((r) => <div className="roomrow" key={r.id}>{r.title}<span className="lockpill">{label(r.minTier as string)}</span></div>)}</div></div>
          <div className="card"><div className="body"><h3 style={{ fontWeight: 400 }}>💗 Community</h3>{community.map((r) => <div className="roomrow" key={r.id}>{r.title}<span className="lockpill">{label(r.minTier as string)}</span></div>)}</div></div>
        </div>
        <p className="note"><b>Matrix-powered</b> — paying for a package sends your invite automatically, One Cocreation-branded (replacing Patreon / Mighty Networks / Kajabi). <em>(Rooms illustrative in this scaffold.)</em></p>
      </div>
    </section>
  );
}

export function Affirmations() {
  const aff = [
    { name: "Thank You", sub: "Wake Up Affirmations · 1 hr 11 min", img: "/images/affirmation-thankyou.webp" },
    { name: "Large Sums of Money", sub: "Sleep Affirmation · 16 min · no music", img: "/images/affirmation-largesums.webp" },
    { name: "IAM Enough", sub: "Sleep Affirmation · 3 hr 3 min", img: "/images/affirmation-iamenough.webp" },
  ];
  return (
    <section id="offers">
      <div className="wrap">
        <p className="kicker center">Chronicles of Wonderland</p>
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
                <Link className="btn btn-ghost push" style={{ marginTop: 16 }} href="/support">Add ⚡</Link>
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
        <div style={{ background: "linear-gradient(150deg,rgba(255,255,255,.66),rgba(243,220,227,.5))", border: "1px solid rgba(217,178,78,.4)", borderRadius: 30, padding: 44, boxShadow: "var(--soft)" }}>
          <p className="kicker">Support This Work — gently, in bitcoin ⚡</p>
          <h2 className="sec-h">Sats straight to One Cocreation.</h2>
          <p style={{ color: "#544e64", maxWidth: 640 }}>Support the work, join a package, or gift a session over the Lightning Network. <strong style={{ color: "var(--gold-deep)" }}>Non-custodial:</strong> sats land in One Cocreation&apos;s own node. We provide the rails; we never touch, hold, or route the money. Or simply pay in dollars — bitcoin is an option, never a demand.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "18px 0 22px" }}>
            {["2,100 sats", "11,111 sats", "111,111 sats", "Custom"].map((c) => (
              <span key={c} style={{ border: "1.5px solid rgba(180,134,43,.5)", color: "var(--gold-deep)", borderRadius: 999, padding: "9px 17px", fontWeight: 700, fontSize: ".82rem" }}>{c}</span>
            ))}
          </div>
          <span className="stub">Stub — their BTCPay / LNbits node not yet linked (Phase 1)</span>
        </div>
      </div>
    </section>
  );
}

export function FreeMeditation() {
  return (
    <section id="free">
      <div className="wrap">
        <div style={{ display: "grid", gap: 36, gridTemplateColumns: "1fr 1fr", alignItems: "center" }}>
          <img src="/images/newsletter.webp" alt="Free guided meditation" style={{ borderRadius: 24, boxShadow: "var(--soft)" }} />
          <div>
            <p className="kicker">Be in the Know</p>
            <h2 className="sec-h">A Free Meditation, With Love</h2>
            <p style={{ color: "var(--muted)" }}>Join the newsletter and receive <strong style={{ color: "var(--rose)" }}>&ldquo;Unzip Into the New You&rdquo;</strong> — a free guided meditation, plus a weekly note of inspiration.</p>
            <p style={{ fontSize: ".82rem", color: "var(--muted)" }}>Delivered two ways: <b>a signed nostr note</b> + <b>an email</b>. <em>(Email is a new house capability — wired in Phase 5.)</em></p>
            <Link className="btn btn-rose" href="/support">Send My Free Meditation</Link>
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
        <div className="grid grid-3">
          <div className="card"><div className="body"><h3 style={{ fontWeight: 400, fontSize: "1.1rem" }}>11:11 Live with Love</h3><p style={{ color: "var(--muted)", fontSize: ".94rem" }}>Monday · Wednesday · Friday @ 11:11 (MST / PST), or there bouts ;) Live on YouTube @Onecocreation.</p></div></div>
          <div className="card"><div className="body"><h3 style={{ fontWeight: 400, fontSize: "1.1rem" }}>Book a Discovery Call</h3><p style={{ color: "var(--muted)", fontSize: ".94rem" }}>A 30-minute call to feel into what&apos;s next — the $55 credited toward your first service.</p></div></div>
          <div className="card"><div className="body"><h3 style={{ fontWeight: 400, fontSize: "1.1rem" }}>Silent Hair Session</h3><p style={{ color: "var(--muted)", fontSize: ".94rem" }}>Choose a package or a service, pay in bitcoin, and you&apos;ll receive booking-calendar access.</p></div></div>
        </div>
      </div>
    </section>
  );
}
