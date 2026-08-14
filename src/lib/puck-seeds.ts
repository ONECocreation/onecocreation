import type { PuckPageData } from "./puck-store";
import { cartridge } from "@/brand/cartridge";

/**
 * Puck page seeds (PUCK P4, Admiral-approved 2026-08-11). A seed is the
 * starting Puck data for a real page, translated from its hand-built version
 * so the studio opens PRE-POPULATED and the rebuild looks like the original.
 *
 * The wiring keeps the live page safe:
 *  - /studio/<slug> loads draft ?? live ?? SEEDS[slug] -> Love opens the
 *    rebuild, tweaks it, previews both themes, and Publishes when happy.
 *  - the real route (/about) renders getPuckPage("about") if published, else
 *    its EXISTING hand-built JSX -> visitors keep seeing today's page until
 *    Love chooses to publish the Puck version.
 *
 * /about is Love's story in her exact words (kept verbatim), her stacked
 * headings, pull-quotes, the teal/gold coloured prose, the portrait + scene
 * galleries, her video, and the seven sky bands.
 */

let _i = 0;
type Block = { type: string; props: Record<string, unknown> };
const blk = (type: string, props: Record<string, unknown> = {}): Block => ({ type, props: { id: `ab-${_i++}`, ...props } });

const DS = { font: "default", size: 0, kerning: 0, lineHeight: 0, color: "default", spaceAbove: 0, spaceBelow: 0 };
const st = (o: Partial<typeof DS> = {}) => ({ ...DS, ...o });

const eyebrow = (text: string, align = "left") => blk("Eyebrow", { text, align, style: st() });
const stacked = (line1: string, line2: string, tag = "h2", align = "center") => blk("StackedHeading", { line1, line2, tag, align, style: st() });
const text = (t: string, align = "left", style = st()) => blk("Text", { text: t, align, style });
const rich = (html: string, align = "left", style = st()) => blk("RichText", { html, align, style });
const quote = (t: string, align = "center", style = st()) => blk("PullQuote", { text: t, align, style });
const img = (src: string, alt = "", width = 320, radius = "soft", align = "center") => blk("Image", { src, alt, width, radius, align });
const gallery = (images: { src: string; alt: string }[], tilt = "yes") => blk("Gallery", { images, tilt });
const video = (youtube: string, ratio = "9/16") => blk("Video", { youtube, ratio });
const button = (label: string, href: string, variant = "gold", align = "left") => blk("Button", { label, href, variant, align, style: st() });
const buttons = (list: { label: string; href: string; variant: string }[], align = "center") => blk("Buttons", { align, buttons: list });
const panel = (content: Block[]) => blk("Panel", { content });
const twocol = (left: Block[], right: Block[], gap = 26, valign = "top") => blk("TwoColumns", { gap, valign, left, right });
const band = (background: string, hold: string, content: Block[]) => blk("Band", { background, hold, content });

const aboutContent: Block[] = [
  // 1 - Smiles Love: the faces, under a living dawn
  band("sky-veil", "night", [
    eyebrow("Smiles, Love", "center"),
    stacked("MY", "STORY", "h1", "center"),
    text(cartridge.constellation, "center", st({ kerning: 6, size: 20, spaceAbove: 6 })),
    gallery([
      { src: "/images/about/love-1.webp", alt: "Love" },
      { src: "/images/about/love-2.webp", alt: "Love" },
      { src: "/images/about/love-3.webp", alt: "Love" },
    ], "yes"),
  ]),

  // 2 - the hero's journey, her words whole
  band("sky-glass", "night", [
    rich("I have been a solo adventurer for a while now. Like most, on the hero’s journey. A call put out. A readiness to answer that call… but well? How many of you have heard that same call, but your companion’s <b>Procrastination, Uncertainty, Imposter and Fear</b> wanted to take over the itinerary."),
    rich("Maybe like me, you never felt like you belonged here. I didn’t understand the unkindness I saw in this world and I played small — wanting to be seen but not noticed. I people-pleased to avoid confrontation. I was an introvert and proud to <i>not</i> be a part of anything. Why? Because that meant that I wasn’t the one being rejected. That WAS me."),
    quote("None of us are here to shrink, but to standout. Not here to separate, but gather together — to be unapologetically US!"),
    text("There is a time where the hero must face many challenges. A necessary part of the quest, often done alone — a time when the hero must reach deep, deep inside, and through processes and experiences finds the courage, the knowing, the heart, that was always there."),
    rich("But is it really a lonesome journey we are on? Or do we tell ourselves it has to be that way, because <i>“up until now”</i> that’s all experience has shown us?"),
    quote("We are never actually alone — but always guided along the path.", "center", st({ color: "ink" })),
  ]),

  // 3 - the Claires, deep space interlude
  band("nebula", "night", [
    rich("I have been Tuning in, tuning up — through Pranic Healing, Quantum Physics, Vibration, and the cells and systems of the body worked with on energetic levels. Attracted first to the <b style=\"color:var(--teal-bright)\">Science of Energy</b>, that then melded with Spiritual Energetics."),
    rich("Now, with the help of friends along the way, I’ve been brought to the awareness that the knowingness I have had for years is actually one of my <b style=\"color:var(--gold-2)\">Claires</b>! And now IAM."),
    text("IAM trusting the Senses I never knew were a gift — and assisting others to trust theirs. To hear, to tune into the body and tune up the body, to receive the light that is coming into this planet with more grace and ease.", "left", st({ color: "ink", size: 18 })),
  ]),

  // 4 - the traveler, her lands
  band("sky-glass", "theme", [
    gallery([
      { src: "/images/about/scene-1.webp", alt: "A heart shape found in the rock" },
      { src: "/images/about/scene-2.webp", alt: "Desert road at sunset" },
      { src: "/images/about/scene-3.webp", alt: "Storm light over open fields" },
      { src: "/images/about/scene-4.webp", alt: "Clouds over the coastline" },
    ], "no"),
    rich("IAM a lover of nature, hiking, paddling, adventuring, creating wire creations and conscious connections. Mostly a traveler of the lands of America — with recent international travel of Egypt and England — I have been between <b>Colorado, Sedona, and Mt Shasta</b>. I consciously connect with the land and the waters.", "center"),
    quote("Where I go, IAM Home.", "center", st({ color: "teal" })),
    text("I offer Silent Hair Sessions in my mobile studio as I travel — heart-connective awareness. I prepare and create the space for One’s epiphanies to arise and make themselves known.", "center"),
  ]),

  // 5 - the Bridge, her welcome
  band("sky-warm", "theme", [
    img(cartridge.hero.heavenEarth, "Where Heaven and Earth Meet", 560, "none", "center"),
    text("“To those drawn by the energy of the soul — Welcome Home to you. You Are the Bridge, Where Heaven and Earth Meet.”", "center", st({ color: "rose", size: 24, font: "display", spaceAbove: 10 })),
    text("The ability to stretch and expand against all odds — all the while yearning for Home. All the while always possessing the choice, the power, to go home. To BE home. For home is not a destination:", "center"),
    quote("Home IS where the Heart IS."),
    text("In presence. In Now. It is within the Heartmind Coherence that the You and the Divine as One bring all to balanced form. A Cocreation where Heaven meets Earth — whether it’s Heaven on earth, or a paradise in the making.", "center"),
    text("This is what you came for. To be this Bridge for the New Earth. You are the Anointed, the Chosen, the One that is Answering the Call.", "center", st({ color: "ink", size: 18 })),
  ]),

  // 6 - the Weekly Intuitive story + her video
  band("sky-warm", "theme", [
    eyebrow("Join Us — In This Grand Adventure!", "center"),
    stacked("THE WEEKLY", "INTUITIVE", "h2", "center"),
    twocol(
      [
        panel([
          text("— For years, when I couldn’t sleep through the night, I knew that was the body speaking to me: things were out of balance. I had been trying to change another, or change the outside circumstances, to bring peace. That’s when I knew…"),
          rich("…the only way for me to be happy again was to work with my body. To hear. To pay attention to my emotions, my reactions, my beliefs — and ask, <i>is there another way?</i> <b>I became the Observer of my inner world, and my outer world transformed before my eyes.</b>"),
          text("— Fast forward to today… IAM bringing you back to the way of the heart. Group conversations, connecting to the intelligence of earth, the intelligence of the body, and the Divine You Are. Channeled messages through breath, through heart, through community. You have all the answers — I prepare the energetic space."),
        ]),
      ],
      [
        video("2LrWVQDnLd0", "9/16"),
        text("Readings, breath, toning, light language, a held field — the Weekly Intuitive.", "center", st({ color: "body", size: 15, spaceAbove: 14 })),
        button("YES!", "/packages/weekly-intuitive", "gold", "center"),
      ],
      26,
      "top",
    ),
  ]),

  // 7 - the New Era of Love, the close
  band("meteors", "night", [
    eyebrow("The Value", "center"),
    stacked("A NEW ERA", "OF LOVE", "h2", "center"),
    rich("That love comes from inside of us — seeking love and validation from within you. We are moving out of the polarity of the Mind-Masculine dissonance, of controlling, and into a balance of the Divine Masculine and Feminine. The mind comes along — <b style=\"color:var(--gold-2)\">letting the Heart lead the way.</b>", "center"),
    rich("We can BE the Now and create a more collaborative future for us and all — as IAM, WE ARE. The shifts are already here: a breaking down and a synchronistic leveling up, occurring now with Gaia. <b>The New Earth and the New Human, as Onecocreation.</b>", "center"),
    text("Ready to get started?", "center", st({ color: "ink", size: 19, font: "display", spaceAbove: 20, spaceBelow: 16 })),
    buttons([
      { label: "Create your free account ✨", href: "/welcome", variant: "gold" },
      { label: "ConsciousCuts & Waxing ✂️", href: "/services", variant: "teal" },
    ], "center"),
  ]),
];

/*
 * The content import (PUCK P4 grows, 2026-08-14): every static page becomes
 * a seed so /studio/<slug> opens pre-populated. Live/interactive widgets
 * (booking shelves, tip jars, forms, product grids) can't be blocks — each
 * spot carries a Note ("── … stays code-side ──") marking where the code
 * component keeps living. The kit below is /about's helper vocabulary with
 * a per-page id prefix, so ids follow the <slug>-N convention page by page.
 */
const kit = (prefix: string) => {
  let i = 0;
  const mk = (type: string, props: Record<string, unknown> = {}): Block => ({ type, props: { id: `${prefix}-${i++}`, ...props } });
  return {
    eyebrow: (text: string, align = "left") => mk("Eyebrow", { text, align, style: st() }),
    heading: (text: string, level = "h2", align = "left", style = st()) => mk("Heading", { text, level, align, style }),
    stacked: (line1: string, line2: string, tag = "h2", align = "center") => mk("StackedHeading", { line1, line2, tag, align, style: st() }),
    text: (t: string, align = "left", style = st()) => mk("Text", { text: t, align, style }),
    rich: (html: string, align = "left", style = st()) => mk("RichText", { html, align, style }),
    quote: (t: string, align = "center", style = st()) => mk("PullQuote", { text: t, align, style }),
    note: (t: string) => mk("Note", { text: t }),
    img: (src: string, alt: string, width = 320, radius = "soft", align = "center") => mk("Image", { src, alt, width, radius, align }),
    list: (items: string[], marker = "check", align = "left") => mk("List", { marker, align, items: items.map((text) => ({ text })) }),
    button: (label: string, href: string, variant = "gold", align = "left") => mk("Button", { label, href, variant, align, style: st() }),
    buttons: (list: { label: string; href: string; variant: string }[], align = "center") => mk("Buttons", { align, buttons: list }),
    panel: (content: Block[]) => mk("Panel", { content }),
    twocol: (left: Block[], right: Block[], gap = 26, valign = "top") => mk("TwoColumns", { gap, valign, left, right }),
    threecol: (a: Block[], b: Block[], c: Block[], gap = 22, valign = "top") => mk("ThreeColumns", { gap, valign, a, b, c }),
    band: (background: string, hold: string, content: Block[]) => mk("Band", { background, hold, content }),
    hero: (days: string, title: string, sub: string) => mk("Hero", { days, title, sub }),
  };
};

/* ── home — the whole front walk, section by section ───────────────────── */
const hm = kit("hm");
const homeContent: Block[] = [
  // 1 - the hero (the living sky + light-drawn glyph stay code-side)
  hm.hero("5 Days", "Leap of Faith", "A Fresh Step Into a New Mindset"),
  hm.buttons([
    { label: "Begin the Journey", href: "/packages", variant: "gold" },
    { label: "Receive the Free Meditation", href: "/#free", variant: "quiet" },
  ], "center"),

  // 2 - My Story, the short version (the whole journey lives on /about)
  hm.band("plain", "theme", [
    hm.eyebrow("Smiles, Love", "center"),
    hm.heading("My Story", "h2", "center"),
    hm.twocol(
      [hm.img(cartridge.portraits.headshot, "Love — founder of One Cocreation", 320, "round", "center")],
      [
        hm.text("I have been a solo adventurer for a while now — like most, on the hero’s journey. Over time I found none of us are here to shrink, but to standout. Not here to separate, but to gather together — to bring kindness to the world, to be unapologetically US."),
        hm.quote("“To those drawn by the energy of the soul, Welcome Home. You Are the Bridge, Where Heaven and Earth Meet.”", "left"),
        hm.button("Read my full story →", "/about", "quiet", "left"),
      ],
      40,
      "center",
    ),
  ]),

  // 3 - the memberships shelf (prices/sats single-sourced in entitlement.ts)
  hm.band("plain", "theme", [
    hm.eyebrow("The Heart Field — Where Heaven and Earth Meet", "center"),
    hm.heading("Memberships", "h2", "center"),
    hm.text("Three ways into the field — each includes everything before it. Pay monthly in dollars or in bitcoin; your tier gently becomes your key.", "center"),
    hm.threecol(
      [hm.panel([
        hm.img(cartridge.tierArt.A, "Weekly Intuitive", 300, "soft", "center"),
        hm.heading("Weekly Intuitive", "h3", "center"),
        hm.text("$33/mo — ⚡ ≈ 55,555 sats / month", "center"),
        hm.list([
          "Live weekly Zoom — 4× a month",
          "Explore your Clair Senses through breath",
          "Meditations, toning, light language",
          "A held energetic field, in community",
        ]),
        hm.button("YES! →", "/packages/weekly-intuitive", "gold", "center"),
      ])],
      [hm.panel([
        hm.img(cartridge.tierArt.B, "Observer", 300, "soft", "center"),
        hm.heading("Observer", "h3", "center"),
        hm.text("$55.55/mo — ⚡ ≈ 88,888 sats / month", "center"),
        hm.list([
          "Everything in Weekly Intuitive",
          "Weekly recorded reading + affirmations",
          "Weekly live Zoom meetup group",
          "Movement, meditation & navigation",
        ]),
        hm.button("YES! →", "/packages/observer", "gold", "center"),
      ])],
      [hm.panel([
        hm.img(cartridge.tierArt.C, "Evening Star", 300, "soft", "center"),
        hm.heading("Evening Star", "h3", "center"),
        hm.text("$111.11/mo — ⚡ ≈ 177,777 sats / month", "center"),
        hm.list([
          "Everything in Weekly Intuitive & Observer",
          "Monthly 1–1½ hr focused meeting",
          "Quantum healing & reference tools",
          "All classes + full community",
        ]),
        hm.button("YES! →", "/packages/evening-star", "gold", "center"),
      ])],
    ),
    hm.note("How the gate works: pay in bitcoin (or dollars) → your package opens automatically. Your tier is checked before content, classes, and community render — the house level-locked door — live and enforcing."),
  ]),

  // 4 - the Heartfield Commons — rooms, tier-gated
  hm.band("plain", "theme", [
    hm.eyebrow("The Heartfield Commons", "center"),
    hm.heading("Classes & Community", "h2", "center"),
    hm.text("Your own luminous rooms — powered by Matrix — an open protocol; your rooms, your keys. Tier-gated: your package opens the doors.", "center"),
    hm.twocol(
      [hm.panel([
        hm.heading("📚 Classes", "h3"),
        hm.list([
          "✦ Clair Senses — Foundations · Package A",
          "✦ Chronicles: Weekly Reading · Package B",
          "✦ Quantum Healing — Deep Dive · Package C",
        ], "none"),
      ])],
      [hm.panel([
        hm.heading("💗 Community", "h3"),
        hm.list([
          "♡ The Heart Field — Commons · All members",
          "♡ Daily Tune-Up & Check-ins · Package A",
          "♡ The Observers’ Circle · Package B",
          "♡ Evening Star — Inner Sanctum · Package C",
        ], "none"),
      ])],
    ),
    hm.button("Enter your rooms →", "/classes", "gold", "center"),
    hm.note("Matrix-powered — paying for a package sends your invite automatically, One Cocreation-branded (replacing Patreon / Mighty Networks / Kajabi). Your rooms, your keys."),
  ]),

  // 5 - the recorded affirmations
  hm.band("plain", "theme", [
    hm.eyebrow("With Love, Recorded", "center"),
    hm.heading("Guided Affirmations", "h2", "center"),
    hm.text("Recorded meditations to nurture the New You. Each payable in bitcoin.", "center"),
    hm.threecol(
      [hm.panel([
        hm.img("/images/affirmation-thankyou.webp", "Thank You", 280, "soft", "center"),
        hm.heading("Thank You", "h3", "center"),
        hm.text("Wake Up Affirmations · 1 hr 11 min", "center", st({ size: 15 })),
        hm.text("$11.11 — ⚡ ≈ 11,110 sats", "center"),
        hm.button("Add ⚡", "/store", "quiet", "center"),
      ])],
      [hm.panel([
        hm.img("/images/affirmation-largesums.webp", "Large Sums of Money", 280, "soft", "center"),
        hm.heading("Large Sums of Money", "h3", "center"),
        hm.text("Sleep Affirmation · 16 min · no music", "center", st({ size: 15 })),
        hm.text("$11.11 — ⚡ ≈ 11,110 sats", "center"),
        hm.button("Add ⚡", "/store", "quiet", "center"),
      ])],
      [hm.panel([
        hm.img("/images/affirmation-iamenough.webp", "IAM Worthy", 280, "soft", "center"),
        hm.heading("IAM Worthy", "h3", "center"),
        hm.text("Sleep Affirmation · 3 hr 3 min", "center", st({ size: 15 })),
        hm.text("$11.11 — ⚡ ≈ 11,110 sats", "center"),
        hm.button("Add ⚡", "/store", "quiet", "center"),
      ])],
    ),
  ]),

  // 6 - ConsciousCuts, LAST among the offerings (Love's meeting, 0018.05.11)
  hm.band("sky-veil", "night", [
    hm.heading("ConsciousCuts & Waxing 🦋", "h2", "center", st({ color: "ink" })),
    hm.text("The Way of the Heart, one-on-one. Sessions where you don’t have to keep up conversation. Pick a time — you’re held.", "center", st({ color: "muted" })),
    hm.note("── live sessions shelf stays code-side (the real booking cards) ──"),
    hm.text("Pick a session → choose a real open time → pay in sats or dollars → confirmed with a calendar file, held with love.", "center", st({ color: "muted", size: 15 })),
  ]),

  // 7 - tend the field
  hm.band("sky-warm", "theme", [
    hm.panel([
      hm.eyebrow("Support This Work — Gently ⚡"),
      hm.heading("Tend the Field", "h2"),
      hm.rich("A gift lands with Love <b style=\"color:var(--gold-deep)\">whole</b> — no platform between, no cut taken. Give in bitcoin over lightning or simply in dollars; bitcoin is an option here, never a demand."),
      hm.note("── live tip jar stays code-side ──"),
      hm.eyebrow("Where Pay It Forward Flows 🎁"),
      hm.text("The Pay-It-Forward jar doesn’t stop here — Love passes it onward to the beings holding this Earth together."),
      hm.note("── live wild doors stay code-side ──"),
      hm.buttons([
        { label: "Book a Session", href: "/book", variant: "quiet" },
        { label: "Visit the Store", href: "/store", variant: "quiet" },
        { label: "The Full Support Room →", href: "/support", variant: "quiet" },
      ], "left"),
    ]),
  ]),

  // 8 - the free meditation
  hm.band("plain", "theme", [
    hm.twocol(
      [hm.img("/images/newsletter.webp", "Free guided meditation", 420, "soft", "center")],
      [
        hm.eyebrow("Be in the Know"),
        hm.heading("A Free Meditation, With Love", "h2"),
        hm.rich("Join the newsletter and receive <b style=\"color:var(--rose)\">“Unzip Into the New You”</b> — a free guided meditation, plus a weekly note of inspiration."),
        hm.text("Delivered straight to your inbox — no strings, only love.", "left", st({ size: 15 })),
        hm.note("── live subscribe form stays code-side ──"),
      ],
      36,
      "center",
    ),
  ]),

  // 9 - connect & book
  hm.band("plain", "theme", [
    hm.eyebrow("E.T. Phone Home", "center"),
    hm.heading("Connect & Book", "h2", "center"),
    hm.note("── live contact doors stay code-side ──"),
  ]),
];

/* ── book — the Sessions door: night hero + the living 2×2 ──────────────── */
const bk = kit("bk");
const bookContent: Block[] = [
  bk.band("sky-veil", "night", [
    bk.eyebrow("One-on-One with Love", "center"),
    bk.stacked("BOOK", "A SESSION", "h1", "center"),
    bk.text(cartridge.constellation, "center", st({ kerning: 6, size: 20, spaceAbove: 6 })),
    bk.rich("Pick a session, choose a real open time — <b style=\"color:var(--gold-2)\">you’re held.</b>", "center"),
  ]),
  bk.band("plain", "theme", [
    bk.note("── live sessions shelf stays code-side (the 2×2 booking cards on the real calendar) ──"),
    bk.text("not sure where to begin? the discovery call — credited toward your first session — is the gentlest door 🕊️", "center", st({ size: 15 })),
    bk.button("The Discovery Call →", "/book/discovery-call", "gold", "center"),
  ]),
];

/* ── memberships — the lion page, Love's words from her live site ───────── */
const mb = kit("mb");
const membershipsContent: Block[] = [
  mb.band("sky-veil", "night", [
    mb.eyebrow("Memberships"),
    mb.heading("Welcome to The Heart Field — where “Heaven and Earth Meet”", "h1"),
    mb.rich("<b>3 Different Memberships</b>"),
    mb.text("Here IAM meeting up with the energetic field of the ones ready to play and live by The Way of the Heart. As IAM, WE ARE ONE."),
    mb.text("You are the one A-lion-ing in your sovereignty, as I hold an energetic field for this work to take place… if you have found me you ARE… ready for this heart connection with you 🌈💕🦁"),
    mb.text("You are aligning to a higher potential timeline when you are in this space. This magnetizes to you the people, places, things, to your highest reality… as you honor your Self you bring forth new energies for humanity."),
    mb.text("This community is crafted to create a space and field that forms the shape of a unified field."),
    mb.text("You…", "left", st({ color: "ink", size: 26, font: "display", spaceAbove: 26, spaceBelow: 8 })),
    mb.text("For you hold the universe within you. The earth, planets, stars, galaxies… We will feel into our clair senses and bring tools forth that have always been there — you just didn’t know where to look. We will explore together through sound, movement, inspiration and community. Unifying your connection within and without, Above and Below — Where Heaven Meets Earth, Paradise in Form."),
    mb.text("Here to live a life: we love to love, and live to love. Your presence adds to the field and shapes the new human. You have arrived! Welcome to the Field of the Heart! 💖"),
    mb.button("Get Started Today", "/packages", "gold", "center"),
  ]),
];

/* ── support — the full room: hero, jars, wild doors, more ways ─────────── */
const su = kit("su");
const supportContent: Block[] = [
  su.band("plain", "theme", [
    su.eyebrow("Support This Work — Gently ⚡", "center"),
    su.stacked("TEND", "THE FIELD", "h1", "center"),
    su.text(cartridge.constellation, "center", st({ kerning: 6, size: 20, spaceAbove: 6 })),
    su.rich("Everything here — the sessions, the rooms, the letters — is held by one pair of hands. A gift lands with Love <b style=\"color:var(--gold-deep)\">whole</b>: no platform between, no cut taken. Choose the jar it fills.", "center"),
  ]),
  su.band("plain", "theme", [
    su.panel([
      su.heading("The Three Jars", "h2"),
      su.text("pick a jar, pick an amount — lightning opens, and it’s done in a breath."),
      su.note("── live tip jars stay code-side ──"),
      su.text("Bitcoin gifts travel the Lightning Network straight to Love’s own wallet — nothing held, nothing routed by anyone else. Dollars are always welcome too: bitcoin is an option here, never a demand.", "left", st({ size: 15 })),
    ]),
  ]),
  su.band("plain", "theme", [
    su.eyebrow("Where Pay It Forward Flows 🎁", "center"),
    su.heading("It Doesn’t Stop Here", "h2", "center"),
    su.text("The Pay-It-Forward jar funds sessions for those who can’t right now — and Love passes it onward to the beings holding this Earth together.", "center"),
    su.note("── live wild doors stay code-side (beasts grow out of their cells on hover) ──"),
  ]),
  su.band("plain", "theme", [
    su.eyebrow("More Ways to Hold the Work", "center"),
    su.twocol(
      [
        su.panel([
          su.heading("🕊️ Book a session", "h3"),
          su.text("a discovery call, a soul conversation, a silent cut", "left", st({ size: 15 })),
          su.button("Open →", "/services", "gold"),
        ]),
        su.panel([
          su.heading("🎁 Gift a session", "h3"),
          su.text("any session in the store can be given to another", "left", st({ size: 15 })),
          su.button("Open →", "/store#sessions", "quiet"),
        ]),
      ],
      [
        su.panel([
          su.heading("⭐ Join a package", "h3"),
          su.text("the classrooms, the circle, the weekly rhythm", "left", st({ size: 15 })),
          su.button("Open →", "/packages", "quiet"),
        ]),
        su.panel([
          su.heading("🌙 Share the free meditation", "h3"),
          su.text("sometimes the greatest gift is a friend’s ear", "left", st({ size: 15 })),
          su.button("Open →", "/meditation", "quiet"),
        ]),
      ],
      16,
    ),
  ]),
];

/* ── classes — the Community door: commons hero + the live shelves ──────── */
const cm = kit("cm");
const classesContent: Block[] = [
  cm.band("sky-veil", "night", [
    cm.eyebrow("The Heartfield Commons", "center"),
    cm.stacked("CLASSES &", "COMMUNITY", "h1", "center"),
    cm.text(cartridge.constellation, "center", st({ kerning: 6, size: 20, spaceAbove: 6 })),
    cm.text("Your own luminous rooms — your keys, Love’s server, nobody in between. Your package opens the doors.", "center"),
  ]),
  cm.band("sky-glass", "theme", [
    cm.note("── live community spotlight stays code-side (who holds the field + the voices) ──"),
  ]),
  cm.band("sky-glass", "night", [
    cm.note("── live rooms shelf stays code-side (tier-gated Matrix doors) ──"),
  ]),
];

/* ── store — the shelf headers; the grids themselves are live ───────────── */
const sr = kit("sr");
const storeContent: Block[] = [
  sr.band("plain", "theme", [
    sr.eyebrow("Where Heaven and Earth Meet", "center"),
    sr.stacked("THE", "STORE", "h1", "center"),
    sr.text("Everything Love makes — sessions, meditations, memberships, and wares. Paid in bitcoin, straight to the artist.", "center"),
    sr.note("── live category pills stay code-side ──"),
  ]),
  sr.band("nebula", "night", [
    sr.heading("🌙 Meditations & Journeys", "h2", "center", st({ color: "ink" })),
    sr.text("Recorded affirmations and journeys — yours the moment payment settles.", "center"),
    sr.note("── live product grid stays code-side ──"),
  ]),
  sr.band("sky-warm", "theme", [
    sr.heading("⭐ Memberships", "h2", "center"),
    sr.text("The packages — classroom doors, community circle, and Love’s weekly rhythm.", "center"),
    sr.note("── live product grid stays code-side ──"),
  ]),
  sr.band("sky-glass", "theme", [
    sr.heading("🎁 Wares from the Studio", "h2", "center"),
    sr.text("Made or chosen by hand, shipped with love.", "center"),
    sr.note("── live product grid stays code-side ──"),
  ]),
  sr.band("sky-veil", "night", [
    sr.heading("✂️ ConsciousCuts & Soul Sessions", "h2", "center"),
    sr.text("One-on-one time on Love’s real calendar — pick a session, choose an open time, you’re held.", "center"),
    sr.note("── live product grid stays code-side ──"),
  ]),
];

export const SEEDS: Record<string, PuckPageData> = {
  about: { content: aboutContent, root: {} },
  home: { content: homeContent, root: {} },
  book: { content: bookContent, root: {} },
  memberships: { content: membershipsContent, root: {} },
  support: { content: supportContent, root: {} },
  classes: { content: classesContent, root: {} },
  store: { content: storeContent, root: {} },
};
