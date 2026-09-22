import Link from "next/link";
import type { CSSProperties } from "react";
import { TIERS, type Tier } from "@/lib/entitlement";
import { roomGate } from "@/lib/room-access";
import { TIER_PAGES } from "@/lib/tiers-content";
import { ROOMS, type MatrixRoom } from "@/lib/matrix";
import { listServices } from "@/lib/booking";
import { listItems, getItem } from "@/lib/store";
import { JAR_ITEMS } from "@/lib/jars";
import { getSiteConfig } from "@/lib/site-config";
import { tierRailsOn } from "@/lib/tier-offer";
import { jarsOpen, liveAdapter, ensureSquareVault } from "@/lib/payments";
import SubscribeForm from "./SubscribeForm";
import TipJar, { type JarKey } from "./TipJar";
import WildDoors from "./WildDoors";
import LightCode from "./LightCode";
import { cartridge } from "@/brand/cartridge";
import CosmicSky from "./CosmicSky";
import ServiceCard from "./ServiceCard";
import ContactDoors from "./ContactDoors";

/* eslint-disable @next/next/no-img-element */

/** TASK-393 (the toggle sweep, block 968,132+ a₿) — the live payment
 *  rails, judged once per render the SAME way cart/page.tsx and
 *  packages/[slug]/page.tsx already do: WARM BEFORE YOU JUDGE (T-186's
 *  idiom, cart/page.tsx:25-35) — liveAdapter() reads siteSwitchesSync()'s
 *  own warm cache, which under the KV/blob driver only reflects whatever
 *  the LAST getSiteConfig()/saveSiteConfig() call on this instance
 *  warmed it to; a caller that skips the await getSiteConfig() below
 *  judges last request's switches, one request behind (the walk finding,
 *  block 968,1xx — Donations() lagged while Affirmations() didn't,
 *  because Affirmations() happened to await getSiteConfig() first for
 *  its own store gate and Donations() never did). getSiteConfig() here
 *  makes every liveRails() caller correct regardless of what else it
 *  reads; ensureSquareVault() then warms the (separate) cold-instance
 *  square vault before the square check. Reused below by every
 *  home-shelf copy line that used to promise a rail unconditionally
 *  (Jewelry/Affirmations/Donations) — payments.ts stays READ-ONLY,
 *  called never edited. */
async function liveRails(): Promise<{ btc: boolean; card: boolean }> {
  await getSiteConfig();
  await ensureSquareVault();
  return { btc: liveAdapter() !== null, card: liveAdapter("square") !== null };
}

/* TASK-178 (0018.06.18 a₿ · block 966098) — THE HERO'S SECOND DOOR: join the
   weekly reading. DERIVED, never hardcoded: the room comes from the rooms
   registry (derive-or-dash — no registry entry, NO door, never a fake link),
   and the words follow the room's OWN tier — TIERS' name for it — so "free
   for every member" is only ever said of a room whose door is open to every
   member (the Weekly Reading is minTier B today → "with the Observer"). No
   public calendar derives the next Weekly Reading, so the words carry the
   room's standing cadence ("every week"). Pure + exported for
   tests/join-the-reading.test.ts — the house pins the model, not the render
   (same idiom as packageWaitlistProps below). */
export interface WeeklyReadingDoor {
  /** the room's Stage — T-174's gate sorts the visitor from there */
  href: string;
  /** when it happens + whose key opens it, both derived */
  words: string;
}

/** The signed-in state of the visitor, read ONCE by the page from the
 *  session cookie (fren-auth's sessionsFromCookieHeader — the same read
 *  the rooms' Stage makes) and threaded down as a plain prop. `tier` is
 *  the package the soul holds (member-tier's tierForSubject), null when
 *  the vault says none. TASK-210 (0018.06.23 a₿, Love's 0018.06.18 call):
 *  "the home page weekly-reading door does not know the visitor is signed
 *  in" — it never asked. */
export interface VisitorSession {
  handle: string;
  space: string;
  tier?: Tier | null;
}

/**
 * The door, for THIS visitor. `visitor` undefined = the page didn't say
 * (the T-178 render, the Stage's bare address); null = a signed-out soul
 * (the door leads to the sign-in card with ?next= carried — the rooms
 * middleware would bounce them there anyway; the door now says so
 * upfront); a session = straight to the Stage, and when the soul's own
 * key opens the room the words say THAT instead of naming a package to
 * buy. The gate decision is roomGate's — the Stage's own — never a second
 * ladder invented here.
 */
export function weeklyReadingDoor(
  rooms: MatrixRoom[] = ROOMS,
  visitor?: VisitorSession | null,
): WeeklyReadingDoor | null {
  const slugOf = (id: string) => id.slice(1, id.indexOf(":"));
  const room = rooms.find((r) => slugOf(r.id) === "weekly-reading");
  if (!room) return null;
  const stage = `/rooms/${slugOf(room.id)}`;
  const tierWords =
    room.minTier === "all"
      ? "Every week, live in Love's room — free for every member."
      : `Every week, live in Love's room — with the ${TIERS[room.minTier].name} membership.`;
  if (visitor === null) {
    return { href: `/login?next=${encodeURIComponent(stage)}`, words: `${tierWords} Sign in and the room knows you.` };
  }
  if (visitor && roomGate(room.minTier, { signedIn: true, tier: visitor.tier ?? null }) === "open") {
    const key = room.minTier === "all" ? "your membership" : `your ${TIERS[visitor.tier as Tier].name} key`;
    return { href: stage, words: `Every week, live in Love's room — ${key} opens it.` };
  }
  return { href: stage, words: tierWords };
}

export function Hero({ session }: { session?: VisitorSession | null }) {
  const readingDoor = weeklyReadingDoor(ROOMS, session);
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
        {/* TASK-119 (Love's Sept 1 list, 0018.06.16 a₿): the 5 Days / Leap of
            Faith hero gives way to the Heart Field welcome — white h1, the
            rose line beneath (.sub already wears var(--rose)); "Begin the
            Journey" dropped while payments are hidden. [AMBER: the two lines] */}
        <h1 style={{ color: "#fff" }}>Welcome to the Heart Field</h1>
        {/* TASK-154 item 6 (0018.06.17 a₿ · block 966,019) — DECLARED
            forced edit (Hero is outside this lane's OWNS): Love asked the
            "Where Heaven and Earth Meet" line to wear the same face as
            "Home IS where the Heart IS" — the pull-quote's var(--serif),
            plain: the uppercase + wide tracking leave, the face stays. */}
        <div className="sub" style={{ textTransform: "none", letterSpacing: ".02em", fontSize: "1.25rem" }}>Where Heaven and Earth Meet</div>
        {/* TASK-178: the doors STACK top-to-bottom at the bottom of the
            hero (the Admiral's law, 0018.06.17), the house's rose + ghost
            pair — the meditation stays ghost, the reading door wears rose. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
          <Link className="btn btn-ghost" href="/#free">Receive the Free Meditation</Link>
          {readingDoor && (
            <>
              <p style={{ margin: "4px 0 0", fontSize: ".9rem", color: "var(--muted)" }}>{readingDoor.words}</p>
              <Link className="btn btn-rose" href={readingDoor.href}>Join the Weekly Reading</Link>
              {/* TASK-228 (0018.06.23 a₿): Love's own Weekly Reading art — an
                  open book whose pages curl into a heart — sits under the
                  door, the door's own width, framed like the welcome doors'
                  .card (theme-aware border/panel/shadow so the dark ground
                  image still reads on a dawn page). No crop of the heart:
                  intrinsic 1400×1017, scaled by width alone. */}
              <div className="card" style={{ width: "100%", maxWidth: 280, overflow: "hidden" }}>
                <img
                  src="/images/reading-book.webp"
                  alt="An open book whose pages curl into a heart"
                  width={1400}
                  height={1017}
                  style={{ display: "block", width: "100%", height: "auto" }}
                />
              </div>
            </>
          )}
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
          {/* TASK-252 (0018.06.24 a₿): the cartridge's headshot flipped to
              Love's new square photo (love-2.webp, 900×900) — the block was
              sized by the old 2:3 portrait, so the img gets an explicit
              square frame here (cover-crop) rather than reflowing the
              two-column composition. */}
          <img src={cartridge.portraits.headshot} alt="Love — founder of One Cocreation" style={{ width: "100%", maxWidth: 360, aspectRatio: "1/1", objectFit: "cover", borderRadius: 24, boxShadow: "var(--soft)" }} />
          <div>
            <p>I have been a solo adventurer for a while now — like most, on the hero&apos;s journey. Over time I found none of us are here to shrink, but to standout. Not here to separate, but to gather together — to bring kindness to the world, to be unapologetically US.</p>
            <p style={{ color: "var(--rose)", fontFamily: "var(--serif)", fontSize: "1.3rem", lineHeight: 1.5 }}>
              {/* TASK-154 item 6 (0018.06.17 a₿ · block 966,019): the period leaves */}
              &ldquo;To those drawn by the energy of the soul, Welcome Home. You Are the Bridge, Where Heaven and Earth Meet&rdquo;
            </p>
            {/* TASK-119 [AMBER] — Love's Sept 1 list: one more rose line by the pull-quote */}
            <p style={{ color: "var(--rose)" }}>It will all be right here.</p>
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

/** TASK-138 (0018.06.17 a₿): the per-tier waitlist door's props, pure —
 *  so the tag/label/note/next contract is pinned by a test without
 *  rendering (the source that segments the list, the compact "I'm
 *  interested" word, the honest pre-list note, and the walk to that
 *  tier's own page on success). Exported for tests/package-waitlist.test.ts;
 *  Packages() below is its only real caller. */
export function packageWaitlistProps(tier: "A" | "B" | "C", slug: string | undefined) {
  return {
    source: `waitlist-${tier.toLowerCase()}`,
    label: "I'm interested",
    note: "Add me to the pre-list — pre-order coming soon.",
    next: slug ? `/packages/${slug}` : undefined,
  };
}

/** TASK-229 (0018.06.23 a₿) — the package cards' closing words, ONE exported
 *  const so T-232's later verbiage seed can find (and Love can overwrite)
 *  this exact string without touching Packages() itself. REC only — the
 *  Admiral's call (00:52–01:00): "your tier gently becomes your key" read
 *  to Love as a bitcoin thing, not a doors thing; ":346" (NotOpenYet) already
 *  carries the right idea — "your package opens the doors." */
export const PACKAGE_DOORS_WORDS = "Your package opens its doors.";

export async function Packages() {
  /* TASK-187 GATE (0018.06.18 a₿ · block 966,104) — the home hero's package
     doors follow the memberships switch, same visibility-only idiom as
     Services()/Classes()/Affirmations() above: default ON, so this section
     keeps rendering exactly as before until the switch flips OFF. */
  const switches = await getSiteConfig();
  if (!switches.features.memberships) return null;
  /* end TASK-187 GATE */
  /* TASK-229 (0018.06.23 a₿): the card's door reads the SAME switch the
     tier page reads (tierRailsOn, lifted to src/lib/tier-offer.ts) — rails
     ON means the tier pages are selling today, so the card's picture and
     its door both walk straight to that sale instead of collecting another
     waitlist signup. */
  const railsOn = tierRailsOn(switches);
  const cards = [
    { tier: "A" as const, accent: "a", img: cartridge.tierArt.A, feats: ["Live weekly meetup in Love's room — 4× a month", "Explore your Clair Senses through breath", "Meditations, toning, light language", "A held energetic field, in community"] },
    { tier: "B" as const, accent: "b", img: cartridge.tierArt.B, feats: ["Everything in Weekly Intuitive", "Weekly recorded reading + affirmations", "Weekly live meetup in Love's room", "Movement, meditation & navigation"] },
    { tier: "C" as const, accent: "c", img: cartridge.tierArt.C, feats: ["Everything in Weekly Intuitive & Observer", "Monthly 1–1½ hr focused meeting", "Quantum healing & reference tools", "All classes + full community"] },
  ];
  return (
    <section id="packages" className="lions-gate">
      {/* TASK-229: keyboard focus on the new picture-door link, scoped here
          (this lane owns Packages() only, not house.css) — same "own-CSS
          via a scoped <style>" idiom Contact() already uses above.
          TASK-254 (0018.06.24 a₿): the rails-ON door ("See the package")
          is a direct child of `.push`, the rails-OFF door is a `<form>`
          whose own button sits a level deeper — `.push>a.btn` reaches
          ONLY the direct-child anchor, so the waitlist form's button
          (SubscribeForm.tsx) is untouched, and `.push` itself in
          house.css (T-253's) is never edited. No class/word changes. */}
      <style>{`#packages .thumb-link{display:block}#packages .thumb-link:focus-visible{outline:2px solid var(--rose,#c56e8b);outline-offset:3px;border-radius:16px}#packages .push>a.btn{width:100%;text-align:center}`}</style>
      <div className="wrap">
        <p className="kicker center">The Heart Field — Where Heaven and Earth Meet</p>
        <h2 className="center sec-h">Memberships</h2>
        <p className="lead center">Three ways into the field — each includes everything before it. Pay monthly in dollars or in bitcoin. {PACKAGE_DOORS_WORDS}</p>
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
            const slug = TIER_PAGES.find((p) => p.tier === c.tier)?.slug;
            return (
              <div className="card shine-hover" key={c.tier}>
                {/* TASK-229 (0018.06.23 a₿, Love on the call: "I'd rather
                    just the picture be a [button] instead of more words") —
                    the picture itself is now the door to the tier's own
                    page; the hover-scale on `.card .thumb` (house.css)
                    still fires through the Link, unchanged. */}
                <Link href={`/packages/${slug}`} className="thumb-link" aria-label={t.name}>
                  <img className="thumb" src={c.img} alt={t.name} />
                </Link>
                <div className="body">
                  <Link href={`/packages/${slug}`} className={`tier-name-pill tier-pill--${c.accent}`} style={{ textDecoration: "none" }}>{t.name}</Link>
                  <div className="price">${t.priceUsd}<small>/mo</small></div>
                  <div className="sats">⚡ ≈ {t.priceSats.toLocaleString()} sats / month</div>
                  <ul className="feat">{c.feats.map((f) => <li key={f}>{f}</li>)}</ul>
                  {/* TASK-119 (0018.06.16 a₿): buy/pay buttons hidden while
                      payments are off — each tier offers the waitlist instead
                      ("no payment buttons"; "add me to the list"). Tier names
                      and prices stay visible.
                      TASK-138 (0018.06.17 a₿, the Admiral's picture): the
                      button is the SHORT word, "I'm interested" — compact
                      .btn-sm, never the giant full-sentence button — with
                      the "add me to the pre-list" honesty as its own small
                      note underneath, and the click walks to the tier's own
                      page (view more) where the same door waits again.
                      TASK-229 (0018.06.23 a₿): the tier pages ARE selling
                      today when the store rails are ON — the card's door
                      follows the same switch, so it walks straight to that
                      sale instead of collecting another waitlist signup. */}
                  <div className="push" style={{ width: "100%" }}>
                    {railsOn ? (
                      <Link href={`/packages/${slug}`} className="btn btn-sm">See the package</Link>
                    ) : (
                      <SubscribeForm {...packageWaitlistProps(c.tier, slug)} />
                    )}
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

export async function Jewelry() {
  /* TASK-393 (R5 of the block-968,133 amendment) — both payment promises
     below used to be unconditional ("Pay in bitcoin or dollars" / "Checkout
     is bitcoin/lightning (or dollars)") regardless of payments.btcpay /
     payments.square. Judged once here, the same liveRails() helper the
     other home-shelf copy below uses — never a claim on a dark rail. */
  const rails = await liveRails();
  const payLine = rails.btc && rails.card
    ? "Pay in bitcoin or by card; shipped to your door."
    : rails.btc
      ? "Pay in bitcoin; shipped to your door."
      : rails.card
        ? "Pay by card; shipped to your door."
        : "Shipped to your door once checkout opens.";
  const checkoutLine = rails.btc && rails.card
    ? "Checkout is bitcoin — non-custodial to Love’s own node — or by card; shipping & address collected at checkout."
    : rails.btc
      ? "Checkout is bitcoin, non-custodial to Love’s own node; shipping & address collected at checkout."
      : rails.card
        ? "Checkout is by card; shipping & address collected at checkout."
        : "Checkout isn’t open yet; shipping & address will be collected once it is.";
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
        <p className="lead center">Wire-wrapped pendants, made one at a time — copper and rose-gold spirals holding stones that chose you. {payLine}</p>
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
        <p className="note"><b>Physical goods</b> — each piece is handmade and posted to you. {checkoutLine} <em>These are stand-in images — photos of the real pieces are coming soon.</em></p>
      </div>
    </section>
  );
}

export async function Services() {
  // T-129 follow-through (Number One): the whole shelf sits behind the switches — sessions OFF and cuts OFF
  // means "hide what isn't done" (Love, 0018.06.16). The cuts heading alone follows `cuts`.
  const switches = await getSiteConfig();
  if (!switches.features.sessions && !switches.features.cuts) return null;
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
          <h2 className="sec-h" style={{ color: "var(--ink-strong)" }}>{switches.features.cuts ? <>ConsciousCuts &amp; Waxing 🦋</> : <>Sessions with Love</>}</h2>
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

/** TASK-394 (Astra plan-review R3, block 968,140) — label() hoisted to a
 *  named export so tests/package-names.test.ts can pin the exact A/B/C →
 *  real-name mapping by calling it directly, not by rendering. The "all"
 *  arm is byte-identical to before; anything else resolves through TIERS,
 *  the one source of truth already imported above (:3). Classes() below
 *  is still its only real caller. */
export const label = (min: string) => (min === "all" ? "All members" : TIERS[min as Tier].name);

export async function Classes() {
  /* TASK-129 (0018.06.16 a₿) — THE SWITCHES, visibility only (no copy): the
     section stands when `community` or `classes` is on; each card reads its
     own switch. Both off (Love's streamlined default) → the section doesn't
     render at all. */
  const switches = await getSiteConfig();
  if (!switches.features.community && !switches.features.classes) return null;
  const classes = ROOMS.filter((r) => r.kind === "class");
  const community = ROOMS.filter((r) => r.kind === "community");
  return (
    <section id="classes">
      <div className="wrap">
        {/* was "Chronicles of Wonderland" — a Degen Wonderland remnant (Admiral's catch, 0018.05.15) */}
        <p className="kicker center">The Heart Field</p>
        <h2 className="center sec-h">Classes &amp; Community</h2>
        <p className="lead center">Your own luminous rooms — powered by Matrix — an open protocol; your rooms, your keys. Tier-gated: your package opens the doors.</p>
        <div className="grid grid-2" style={{ maxWidth: 860, margin: "0 auto" }}>
          {switches.features.classes && (
            <div className="card reveal"><div className="body">
              <h3 style={{ fontWeight: 400 }}>📚 Classes</h3>
              {classes.map((r) => (
                <div className="roomrow" key={r.id}>
                  <span aria-hidden>✦</span> {r.title}
                  <span className="lockpill nowrap">{label(r.minTier as string)}</span>
                </div>
              ))}
            </div></div>
          )}
          {switches.features.community && (
            <div className="card reveal" style={{ transitionDelay: ".12s" }}><div className="body">
              <h3 style={{ fontWeight: 400 }}>💗 Community</h3>
              {community.map((r) => (
                <div className="roomrow" key={r.id}>
                  <span aria-hidden>♡</span> {r.title}
                  <span className="lockpill nowrap">{label(r.minTier as string)}</span>
                </div>
              ))}
            </div></div>
          )}
        </div>
        <div className="center reveal" style={{ marginTop: 24 }}>
          <Link className="btn" href="/classes">Enter your rooms</Link>
        </div>
        <p className="note reveal"><b>Matrix-powered</b> — paying for a package sends your invite automatically, One Cocreation-branded (replacing Patreon / Mighty Networks / Kajabi). Your rooms, your keys.</p>
      </div>
    </section>
  );
}

export async function Affirmations() {
  /* TASK-137 (0018.06.17 a₿) — Affirmations FOLLOWS THE STORE SWITCH: "If I
     turn the store off the guided affirmations should be gone too" (the
     Admiral). Same pattern as Classes()/jarsOpen() — visibility only, no
     copy change, store OFF (Love's streamlined default) → this section
     doesn't render on the home page at all.
     (ported from the home lane's stalled attempt, worktree task-137) */
  const switches = await getSiteConfig();
  if (!switches.features.store) return null;
  /* TASK-393 (R5 of the block-968,133 amendment) — "Each payable in
     bitcoin." was unconditional on payments.btcpay; rail-judged the same
     way Jewelry() above does. */
  const rails = await liveRails();
  const payableLine = rails.btc && rails.card
    ? "Each payable in bitcoin or by card."
    : rails.btc
      ? "Each payable in bitcoin."
      : rails.card
        ? "Each payable by card."
        : "Each one, the moment checkout opens.";
  const aff = [
    { name: "Thank You", sub: "Wake Up Affirmations · 1 hr 11 min", img: "/images/affirmation-thankyou.webp" },
    // TASK-393 (§8.7): "hide large sums of money for now" — stays in data, the flag brings it back in one line
    ...(switches.features.largeSums
      ? [{ name: "Large Sums of Money", sub: "Sleep Affirmation · 16 min · no music", img: "/images/affirmation-largesums.webp" }]
      : []),
    { name: "IAM Worthy", sub: "Sleep Affirmation · 3 hr 3 min", img: "/images/affirmation-iamenough.webp" },
  ];
  return (
    <section id="offers">
      <div className="wrap">
        <p className="kicker center">With Love, Recorded</p>
        <h2 className="center sec-h">Guided Affirmations</h2>
        <p className="lead center">Recorded meditations to nurture the New You. {payableLine}</p>
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

/* TASK-411 (block 968,170 a₿) — DERIVE-OR-DASH ON THE SHELF: a jar is
   offered only while its store item is live. The key→itemId map lives
   ONCE in @/lib/jars (a neutral module — a server page cannot call a
   client-module export, payments.ts:656's own note), read by this gate
   and by TipJar's give() alike; the lane's pin 4 pins that single source
   against the JARS words. /support imports liveJarKeys too — the two
   faces can never disagree. */
export async function liveJarKeys(): Promise<JarKey[]> {
  const live = await Promise.all(
    (Object.keys(JAR_ITEMS) as JarKey[]).map(async (key) => {
      const item = await getItem(JAR_ITEMS[key]);
      return item?.status === "live" ? key : null;
    }),
  );
  return live.filter((k): k is JarKey => k !== null);
}

export async function Donations() {
  /* TASK-134 (0018.06.17 a₿) — THE JARS FOLLOW THE SWITCHES: the jars block
     renders only when jarsOpen() — features.jars ON *and* the bitcoin rail
     actually live — so this section and /support can never disagree.
     TASK-411 adds the shelf truth: only jars whose store item is live are
     offered (derive-or-dash); with none live the copy stands with no
     widget, same as jarsOpen() false. */
  const open = jarsOpen();
  const liveJars = open ? await liveJarKeys() : [];
  /* TASK-393 (R5 of the block-968,133 amendment) — "Give in bitcoin over
     lightning or simply in dollars" was unconditional on the payment
     rails (a separate concern from the jarsOpen()+shelf gate on the
     TipJar widget above). Rail-judged the same way
     as Jewelry()/Affirmations() above. */
  const rails = await liveRails();
  const giveLine = rails.btc && rails.card
    ? "Give in bitcoin or simply in dollars; bitcoin is an option here, never a demand."
    : rails.btc
      ? "Give in bitcoin, straight to Love."
      : rails.card
        ? "Give in dollars."
        : "Giving opens again soon.";
  return (
    <section id="support">
      <div className="wrap">
        <div style={{ background: "var(--warm-panel)", border: "1px solid var(--warm-edge)", borderRadius: 30, padding: 44, boxShadow: "var(--soft)" }}>
          <p className="kicker">Support This Work — Gently</p>
          <h2 className="sec-h">Tend the Field</h2>
          <p style={{ color: "var(--ink-body)", maxWidth: 640 }}>
            A gift lands with Love <strong style={{ color: "var(--gold-deep)" }}>whole</strong> — no
            platform between, no cut taken. {giveLine}
          </p>
          {open && liveJars.length > 0 && <TipJar only={liveJars} />}

          {/* ── the three doors (TASK-126, 0018.06.16 a₿ — same words as /support) ── */}
          <div style={{ marginTop: 34 }}>
            <h3 style={{ fontWeight: 400, margin: "0 0 6px" }}>Three Doors</h3>
            <p style={{ color: "var(--ink-body)", maxWidth: 640, fontSize: ".95rem", margin: "0 0 10px" }}>
              Give forward, follow along, read with me.
            </p>
            <WildDoors />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "26px 0 4px" }}>
            {/* TASK-119 (0018.06.16 a₿): "Book a Session" and "Visit the
                Store" links removed — sessions/store off the home while
                payments are hidden. The Full Support Room stays. */}
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
            <p style={{ fontSize: ".85rem", color: "var(--muted)", margin: "0 0 26px" }}>Delivered straight to your inbox — on the house, from our 💞 to yours.</p>
            <SubscribeForm source="meditation" />
          </div>
        </div>
      </div>
    </section>
  );
}

export async function Contact() {
  /* TASK-129 (0018.06.16 a₿) — THE SWITCHES: the home-side door hide now
     READS the switches instead of the hardcoded pair (T-119's style block).
     The cuts/services door hides unless `cuts`, the discovery-call door
     unless `sessions`, the 11:11 Live with Love door unless `community`.
     Hidden at this call site (this lane owns sections.tsx, not the shared
     ContactDoors.tsx), so /contact keeps the full three-door set unchanged. */
  const switches = await getSiteConfig();
  const hidden: string[] = [];
  if (!switches.features.sessions) hidden.push(`a[href="/book/discovery-call"]`);
  if (!switches.features.cuts) hidden.push(`a[href="/services"]`);
  if (!switches.features.community) hidden.push(`a[href^="https://www.youtube.com/"]`);
  return (
    <section id="contact">
      <div className="wrap">
        <p className="kicker center">E.T. Phone Home</p>
        <h2 className="center sec-h" style={{ marginBottom: "1em" }}>Connect</h2>
        {/* every card IS its door (Admiral, 0018.05.17); the doors themselves
            are shared with /contact (0018.05.15 — the Admiral prefers that set) */}
        {hidden.length > 0 && (
          <style>{`.home-contact-doors ${hidden.join(",.home-contact-doors ")}{display:none}`}</style>
        )}
        <div className="home-contact-doors">
          <ContactDoors />
        </div>
      </div>
    </section>
  );
}
