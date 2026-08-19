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
    faq: (items: { q: string; a: string }[]) => mk("Faq", { items }),
    img: (src: string, alt: string, width = 320, radius = "soft", align = "center") => mk("Image", { src, alt, width, radius, align }),
    list: (items: string[], marker = "check", align = "left") => mk("List", { marker, align, items: items.map((text) => ({ text })) }),
    button: (label: string, href: string, variant = "gold", align = "left") => mk("Button", { label, href, variant, align, style: st() }),
    buttons: (list: { label: string; href: string; variant: string }[], align = "center") => mk("Buttons", { align, buttons: list }),
    panel: (content: Block[]) => mk("Panel", { content }),
    twocol: (left: Block[], right: Block[], gap = 26, valign = "top") => mk("TwoColumns", { gap, valign, left, right }),
    threecol: (a: Block[], b: Block[], c: Block[], gap = 22, valign = "top") => mk("ThreeColumns", { gap, valign, a, b, c }),
    band: (
      background: string,
      hold: string,
      content: Block[],
      ground?: { bgSrc?: string; bgColor?: string },
    ) => mk("Band", { background, hold, content, ...(ground ?? {}) }),
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

/*
 * ── the "(old)" seeds — Love's ORIGINAL ShinePages pages, transcribed from
 * the 0018.05.20 capture (docs/shinepages-capture-manifest.md, screenshots in
 * ~/dev/troubleshooting/onecocreation/original/) so the operator can open each
 * original beside its new version and restyle it. Rules of this lane:
 *   - copy VERBATIM where legible; "[illegible in capture]" where not
 *   - 1:1 IMAGERY (the seed-surgeon pass, 0018.05.21): every Image carries
 *     its REAL rescued asset from the ONECocreation/onecocreation-assets
 *     repo (docs/original-assets-map.json); original image grounds ride the
 *     Band bgSrc prop, original flat grounds ride bgColor (puck-config
 *     0.13.0). NOTE: plugin-rails ground-tracking doesn't know custom
 *     grounds — these bands stay lint-tracked as their hold (documented
 *     package limitation).
 *   - live widgets (forms, booking calendars, checkout) become Notes
 *   - LEGIBILITY DOCTRINE: on light custom grounds (lavender #DBD4E4,
 *     gray #E1E1E1) direct text/heading children carry INK "#2A2140" (a
 *     theme-independent dark) so the archive reads in both themes; bands
 *     that gained a photo ground hold the night (the bgSrc veil is dark)
 *   - archival heading demotions (one-h1 / heading-order) are noted in place
 */
const RAW = "https://raw.githubusercontent.com/ONECocreation/onecocreation-assets/main/originals";
/** theme-independent dark ink for light archival grounds */
const INK_DARK = "#2A2140";

/* ── home-old — hero, Leap of Faith band, triad, Be In The Know ─────────── */
const hmo = kit("hmo");
const homeOldContent: Block[] = [
  hmo.band("sky-veil", "night", [
    hmo.note("── original had: PopUp 1 'Get your free meditation! / Unzip into the new you' (Name/Email/DOWNLOAD IT NOW, timed 2s, once per session) — stays code-side / future lane ──"),
    hmo.img(`${RAW}/popup-free-guide/unzip-9141826.png`, "Unzip Into The New You — the popup's free-meditation light-body graphic", 320, "soft", "center"),
  ], { bgSrc: `${RAW}/home/IMG_0334-9138867.png` }),
  hmo.band("sky-glass", "night", [
    hmo.heading("LEAP OF FAITH", "h1", "left"),
    hmo.text("5 DAYS", "left"),
    hmo.text("FRESH STEP INTO A NEW MINDSET", "left"),
    hmo.button("GET STARTED TODAY", "/packages", "gold", "center"),
    hmo.note("── original button: WHITE squared (0-radius) letterspaced caps ──"),
  ], { bgColor: "#2B2C30" }),
  hmo.band("meteors", "night", [
    hmo.note("── original had: intro video of Love (04:12) centered over a black band with a DNA-helix strip graphic — stays code-side ──"),
  ], { bgSrc: `${RAW}/about/IMG_3142-0518689.png` }),
  hmo.band("plain", "theme", [
    hmo.heading("Memberships", "h2", "center", st({ color: INK_DARK })),
    hmo.threecol(
      [hmo.panel([
        hmo.img(`${RAW}/shared/IMG_0176-0521729.jpeg`, "Woman in profile with a glowing brain of light threads — The Weekly Intuitive card art (purple gradient card)", 300, "soft", "center"),
        hmo.heading("The Weekly Intuitive", "h3", "center"),
        hmo.button("YES!", "/packages/weekly-intuitive", "gold", "center"),
      ])],
      [hmo.panel([
        hmo.img(`${RAW}/shared/IMG_0177-0521729.jpeg`, "Photographer in purple watching comets fall over a sunset plain — The Observer card art (gold gradient card)", 300, "soft", "center"),
        hmo.heading("The Observer", "h3", "center"),
        hmo.button("YES!", "/packages/observer", "gold", "center"),
      ])],
      [hmo.panel([
        hmo.img(`${RAW}/shared/IMG_0175-0521729.jpeg`, "Silhouette with arms outstretched against a green-teal galaxy — The Evening Star card art (teal gradient card)", 300, "soft", "center"),
        hmo.heading("The Evening Star", "h3", "center"),
        hmo.button("YES!", "/packages/evening-star", "gold", "center"),
      ])],
    ),
  ], { bgColor: "#DBD4E4" }),
  hmo.band("sky-warm", "theme", [
    hmo.heading("BE IN THE KNOW", "h2", "center"),
    hmo.twocol(
      [
        hmo.img(`${RAW}/home/IMG_7315-0518689.jpeg`, "Love posing in front of a painted angel-wings wall mural", 320, "soft", "center"),
      ],
      [
        hmo.text("Sign up below and receive a free recording to Unzip Into The New You!"),
        hmo.text("This is meant to be a once a week communication to let you know of Spontaneous Lives, Monthly Events, Location for Hair and Waxing Sessions when in your area, and Weekly Inspirations, that you can apply in your life. As this community grows there will be more news to share. A way to remember to make space to tune in and tune up, as you go about your day and expand your wings to allow you to live life with intention. To Connect, Feel Alive, all while you are Living your Human Experience as the New Human you Are."),
        hmo.note("── original had: subscribe form (Desired Name* / Email* / Submit) — stays code-side ──"),
      ],
      36,
      "top",
    ),
    hmo.note("── original footer rendered literal 'Copyright © {2026} {OneCocreation} | Terms & Conditions | Privacy Policy | Site Powered by ShinePages' (broken merge tags — tell Love) ──"),
  ]),
];

/* ── about-old — red-rock hero, My Story, the lavender story bands ──────── */
const abo = kit("abo");
const aboutOldContent: Block[] = [
  abo.band("sky-warm", "night", [
    abo.note("── the red-rock arms-raised hero (the EARTH half of the brand) is the band's real ground — caption in the original: 'Smiles, Love' ──"),
  ], { bgSrc: `${RAW}/about/welcome-0086394.png` }),
  abo.band("plain", "theme", [
    abo.img(`${RAW}/about/where_heaven_and_earth_meet-1394563.png`, "Purple calligraphy banner: 'Where Heaven and Earth Meet' — script artwork, an image in the original, not live text", 560, "none", "center"),
  ], { bgColor: "#DBD4E4" }),
  abo.band("plain", "theme", [
    abo.heading("My Story", "h1", "center"),
    abo.twocol(
      [
        abo.text("I have been a solo adventurer for a while now. Like most, on the hero’s journey. A call put out. A readiness to answer that call...but well? How many of you have heard that same call but your companion’s Procrastination, Uncertainty, Imposter and Fear wanted to take over the itinerary.", "center"),
        abo.text("Maybe like me, you never felt like you belonged here. I didn’t understand the unkindness I saw in this world and I played small, wanting to be seen but not noticed. I people pleased to avoid confrontation. I was an introvert and proud, to not be a part of anything. Why? Because that meant that I wasn’t the one being rejected. That WAS me.", "center"),
      ],
      [
        abo.img(`${RAW}/about/IMG_3098-1465149.jpeg`, "Love holding an oracle card (an eagle card) toward the camera, pink flower in her hair", 320, "soft", "center"),
        abo.text("The ability to stretch, and expand against all odds! All the while yearning for Home. All the while, always possessing the choice, the power to go home, to Be home. For home is not a destination. Home IS where the Heart IS. In presence. In Now. It is within the Heartmind Coherence that the You and the Devine as One, bring all to balanced form."),
      ],
      40,
      "top",
    ),
    abo.text("I consciously connect with the land and the waters. Where I go IAM Home. I have been offering Silent Hair Sessions in my mobile studio where I travel. Offering heart connective awareness. I prepare and create the space, for One’s epiphanies to arise and make themselves know."),
    abo.text("To those drawn by the energy of the soul, Welcome Home to you. You Are the Bridge, Where Heaven and Earth Meet."),
    abo.img(`${RAW}/shared/IMG_2330-0939418.jpeg`, "Panorama of mountains and a lake at sunset (Love's own photo), beneath a heart outline icon", 560, "soft", "center"),
  ]),
  abo.band("plain", "theme", [
    abo.text("—For Years when I couldn’t sleep through the night, I knew that, that was a sign of the body speaking to me that there were things out of balance in life. I had been trying to change an other, or change the outside circumstances to bring peace. That’s when I knew ....in that moment I knew that the only way for me to be happy again was to work with my body, to hear, to pay attention to my emotions, my reactions, my beliefs and ask is there another way. I became the Observer of my inner world and my outer world transformed before my eyes.", "center", st({ color: INK_DARK })),
    abo.text("—Fast Forward to Current Day ....IAM bringing you back to the way of the heart. Through group conversations, connecting to the intelligence of earth, intelligence of the body and the Devine You Are. Channeled messages through our Devine connection Through breath, through heart, through community through earth connection. I prepare the energetic space to assist you to see what is next for you as you go along your path. You have all the answers.", "left", st({ color: INK_DARK })),
    abo.text("We will explore themes of material meditations, books, modalities of intuitives, of coaches, of the quantum for you to add to your tools of ascension. I’ll be there along the way guiding you in the practical use of tools and information that arises. As you join me and I have a chance to work with you as a group or one on one I will be tuning in to and asking what your Claire or Clairs are and bringing your awareness to it when I can, when it comes in. And then guiding you to working more with me or other intuitives that will assist you further in that area.", "left", st({ color: INK_DARK })),
    abo.text("I have come to know that IAM here to assist ones like you into a different relationship with not just your body, your cells but your relationship to all that surrounds you. Your connection to your Clair senses, the still point that lies within you, and the world we came here for. We are shifting and expanding our consciousness in form.", "left", st({ color: INK_DARK })),
    abo.note("── original had: video of Love and a friend on a couch (pink flower in hair) — stays code-side ──"),
  ], { bgColor: "#DBD4E4" }),
  abo.band("plain", "theme", [
    abo.text("This can be uncomfortable, confusing, but also wonderful, for as we each expand energetically we weave together energetic threads for this Golden age. As we tune in and tune up, our nervous system to our inner voice, inner sight, inner hearing, inner knowing, inner sensing, and FEEL... into different frequencies, toning, movement and more! Your body and mind will get more familiar with that greatest aspect of you. The one that already knows where you are going and what is needed along the way to support you. There will meet people and tools that you will be introduced to, that will resonate along your path as we explore together. Through readings of books you will receive light codes both through the frequency of my voice as well as the book chosen for that time. This is a way to nurture You. Your inner child and the adult you are, as we adventure through many types of activating literature. Whether you decide to read along or simply InJoy and surrender to what comes forth, you will receive exactly what is needed for you at that time.", "left", st({ color: INK_DARK })),
  ], { bgColor: "#E1E1E1" }),
  abo.band("plain", "theme", [
    abo.heading("The Value: We are Stepping into a New Era of Love", "h2"),
    abo.list([
      "That love comes from inside of us",
      "Seeking love and validation from within you",
      "We are moving out of the polarity of the Mind Masculine dissonance, of controlling, and into a",
      "Balance of the Devine Masculine and Feminine in Balance. The mind comes along, letting the Heart Lead The Way.",
    ]),
    abo.note("── original had: stock pink-blazer video + empty 'CALL TO ACTION' button (template residue — tell Love) ──"),
  ]),
  abo.band("plain", "theme", [
    abo.img(`${RAW}/about/New_Earth_Living-2073893.png`, "Purple-and-gold calligraphy banner: 'New Earth Living' — script artwork, an image in the original", 560, "none", "center"),
    abo.text("We can BE the Now and create a more collaborative future for us and all, as IAM WE ARE. We are seeing the shifts already. The shifts in our world, and the world systems as a breaking down and a synchronistic leveling up, is occurring now with Gaia. The New Earth and the New Human as Onecocreation.", "center", st({ color: INK_DARK })),
  ], { bgColor: "#DBD4E4" }),
  abo.band("sky-warm", "night", [
    abo.note("── the sun-through-clouds ocean photo is the band's real ground; the original added a purple ink-wave divider above it (restyle pass) ──"),
    abo.panel([
      abo.heading("Ready to Get Started?", "h2", "center"),
      abo.note("── original had: empty 'CALL TO ACTION' button (template residue — tell Love) ──"),
    ]),
    abo.note("── original footer rendered literal 'Copyright © {2026} {OneCocreation}' ──"),
  ], { bgSrc: `${RAW}/shared/IMG_2938-0939419.jpeg` }),
];

/* ── memberships-old — the cosmic white-lion page, single text column ───── */
const mbo = kit("mbo");
const membershipsOldContent: Block[] = [
  mbo.band("nebula", "night", [
    mbo.note("── original: WHITE page over the full-bleed cosmic white-lion — the lion is now the band's real ground (veiled dark; restyle pass may lift toward the original white read) ──"),
    mbo.heading("Memberships", "h1"),
    mbo.heading("Welcome to The Heart Field where “Heaven and Earth Meet”", "h2"),
    mbo.rich("<b>3 Different Memberships</b>"),
    mbo.text("Here IAM meeting up with the energetic field of the ones ready to play and live by The Way of the heart. As IAM WE ARE ONE."),
    mbo.text("You are the one Alion ing in your sovereignty, as I hold an energetic field for this work to take place.. if you have found me you ARE.. ready for this heart connection with you 🌈💕🦁"),
    mbo.text("You are aligning to higher potential timeline when you are in this space."),
    mbo.text("This magnetizes to you the people, places, things, to your highest reality.. as you honor your Self you bring forth new energies for humanity."),
    mbo.text("This community is crafted to create a space and field that forms the shape of a unified field.."),
    mbo.heading("You..", "h2"),
    mbo.text("For you hold the universe within you. The earth planets stars galaxies .. We will feel into our Claire senses and bring tools forth that have always been there. You just didn’t know where to look. We will explore together, though sound movement inspiration and community. Unifying your connection within and without, Above and Below, Where Heaven Meets Earth, Paradise in Form."),
    mbo.text("Here to live a life, we love to love, and live to love."),
    mbo.text("Your presence adds to the field and"),
    mbo.text("And shapes the new human."),
    mbo.text("you have arrived!"),
    mbo.text("Welcome to the Field of the Heart!💖"),
    mbo.button("GET STARTED TODAY", "/packages", "gold", "center"),
    mbo.note("── original button: WHITE squared; 'You..' rendered large-type (demoted to H2 here for heading order) ──"),
  ], { bgSrc: `${RAW}/memberships/lion-ai-0088969.png` }),
];

/* ── consciouscuts-old — moon hero, silent question, how it works ───────── */
const cco = kit("cco");
const consciousCutsOldContent: Block[] = [
  cco.band("sky-veil", "night", [
    cco.note("── original: small purple calligraphy 'Where Heaven and Earth Meet' top-left of the moon hero (the moon-cartwheel photo is the band's real ground) ──"),
    cco.img(`${RAW}/consciouscuts-waxing/IMG_0313-8971737.jpeg`, "Gold winged-scissors ConsciousCuts logo on a black panel", 240, "none", "center"),
    cco.heading("CONSCIOUS CUTS & WAXING", "h1", "center"),
    cco.heading("WELCOME 🌈 🦋 🪶 💫", "h2", "center"),
    cco.img(`${RAW}/consciouscuts-waxing/IMG_4524-8983940.jpeg`, "Love with blue-streaked hair blowing a kiss — portrait photo", 320, "soft", "center"),
    cco.button("CREATE AN ACCOUNT", "/welcome", "gold", "center"),
    cco.text("WELCOME TO", "center"),
    cco.text("The Way of the Heart", "center"),
    cco.text("Mindfulness in action. Sessions where you don’t have to keep up conversation. You get to choose..", "center"),
    cco.text("To BE Silent or Not to be Silent", "center"),
    cco.text("that is the Question", "center"),
    cco.text("We find out what your needs are, sometimes use photos to get us in the right direction. You get to sit back and enjoy the magic. All sessions have the pleasure of an affirmations card chosen. A message sent to you from The Universe to take with you in your day.", "center"),
  ], { bgSrc: `${RAW}/consciouscuts-waxing/IMG_0266-3095756.jpeg` }),
  cco.band("nebula", "night", [
    cco.heading("IS A SILENT HAIR SESSION FOR YOU?", "h2", "center"),
    cco.threecol(
      [cco.panel([
        cco.heading("Hair and Waxing", "h3", "center"),
        cco.text("A heart to heart connection, through presence. Here we will explore the look you desire, and collab. It’s more than hair. But have no fear you get to choose, a regular hair service or MORE. Often through hair we are maintaining, cleaning up, creating a new. This is one way we unconsciously work with energy. Here aware that we are both human and soul, we will provide a space for intentional presence and [continues — cut off in capture]"),
      ])],
      [cco.panel([
        cco.img(`${RAW}/consciouscuts-waxing/IMG_3230-0674274.jpeg`, "Blue-toned woman holding a point of light — 'Conscious Cuts & Waxing / A Curious Traveler _ FB Live' card", 280, "soft", "center"),
        cco.button("CREATE AN ACCOUNT", "/welcome", "gold", "center"),
      ])],
      [cco.panel([
        cco.heading("BECOME A FREE MEMBER", "h3"),
        cco.list([
          "Discovery Call that is put towards your service",
          "Access to booking Calendar",
          "Access to one month free of, The Weekly Intuitive",
        ], "dot"),
        cco.note("── original had: grid of stock hair-model photos ──"),
      ])],
    ),
  ], { bgSrc: `${RAW}/consciouscuts-waxing/IMG_0292-8983552.jpeg` }),
  cco.band("sky-glass", "night", [
    cco.heading("HOW IT WORKS", "h2"),
    cco.text("CREATE YOUR FREE MEMBERSHIP"),
    cco.text("HERES WHERE THE ADVENTURE BEGINS!"),
    cco.text("WHEN YOU SIGN UP YOU WILL NOW HAVE ACCESS TO"),
    cco.list([
      "-THE BOOKING CALENDAR",
      "-ONE MONTH ACCESS TO THE WEEKLY INTUITIVE",
      "--YOUR DISCOVERY CALL- 15-20 MIN CALL or just book the appointment.",
      "--YOUR SERVICES",
    ], "none"),
    cco.text("Let’s get to know each other. Know what you want? Simply book your appointment. Or respond to the email for a ZOOM call."),
    cco.text("We collaborate over a call. I am great with photos. Email me pics of perspective looks and I’ll send you photos of styles that will compliment your face shape, hair type and maintenance level. You get to tell me what you’re looking for. We’ll discuss any waxing needs and the Question behind if a Silent Hair Session is for you and what it can unlock within you."),
    cco.button("GET STARTED TODAY", "/welcome", "gold", "center"),
  ]),
  cco.band("plain", "theme", [
    cco.note("── original had: testimonial carousel (small blue script on a pale gold panel — transcribed from a small capture, wording approximate) ──"),
    cco.quote("I went with the conscious cut. I loved the idea of being silent during the session. There’s been some trauma from getting my hair done in the past. I focused on my own nervous system while she was cutting, without the distraction of making small talk. At one point I started leaving my body and Love really attuned to what was happening with me. She stopped cutting, put her hands so gently on my shoulders and guided both of us back to our breath. She only started cutting again once she could feel the relaxation in my own system. Hands down this was the best cut I’ve ever received. It’s more than getting your hair cut. Love provides a healing and nurturing energy and it is genuinely felt. I walked out of her studio that day not only looking fabulous, but also feeling fabulous. Thanks again! —Jennifer"),
    cco.quote("I’ve had my hair done by Love for two years, now and have had only the best experience. She has a wonderful sense of style and vision as well as being to create the haircut that is beyond what you have in mind. [rest illegible in capture]"),
  ]),
  cco.band("plain", "theme", [
    cco.threecol(
      [cco.panel([
        cco.heading("The Weekly Intuitive", "h3", "center"),
        cco.button("YES!", "/packages/weekly-intuitive", "gold", "center"),
      ])],
      [cco.panel([
        cco.heading("The Observer", "h3", "center"),
        cco.button("YES!", "/packages/observer", "gold", "center"),
      ])],
      [cco.panel([
        cco.heading("The Evening Star", "h3", "center"),
        cco.button("YES!", "/packages/evening-star", "gold", "center"),
      ])],
    ),
  ], { bgColor: "#DBD4E4" }),
  cco.band("sky-warm", "theme", [
    cco.heading("BE IN THE KNOW", "h2", "center"),
    cco.text("Sign up below and receive a free recording to Unzip Into The New You!", "center"),
    cco.note("── original had: subscribe form (Desired Name* / Email* / Submit) beside the angel-wings mural photo — stays code-side ──"),
  ]),
];

/* ── contact-old — FAQ accordions + E.T. Phone Home ─────────────────────── */
const cto = kit("cto");
const contactOldContent: Block[] = [
  cto.band("plain", "theme", [
    cto.note("── original: violet accordion bars (Faq block styling is theme-side — restyle pass) ──"),
    cto.heading("FAQ", "h2", "center", st({ color: INK_DARK })),
    cto.faq([
      { q: "WHAT TIME ZONES ARE UTUBE \" LIVE WITH LOVE\"", a: "[answer not captured — accordion closed in the capture]" },
      { q: "HOW DO I GET A SILENT HAIR CUT?", a: "[answer not captured — accordion closed in the capture]" },
      { q: "Title", a: "[unfinished placeholder accordion in the original — tell Love]" },
    ]),
  ], { bgColor: "#E1E1E1" }),
  cto.band("plain", "theme", [
    cto.heading("E.T. Phone Home", "h1", "left", st({ color: INK_DARK })),
    cto.note("── original image: deep starfield band photo beside the contact form — NOT recovered in the harvest (only the moon-cartwheel survived for this page) ──"),
    cto.note("── original had: contact form (Full Name / Email / Subject / Message / SEND) — stays code-side ──"),
    cto.img(`${RAW}/consciouscuts-waxing/IMG_0266-3095756.jpeg`, "Silhouette cartwheeling in front of a giant full moon over a flower field", 420, "soft", "center"),
    cto.heading("Or... Book a 30 min Discovery Call", "h2", "center", st({ color: INK_DARK })),
    cto.note("── original had: embedded booking calendar (Pick a Date and Time · August · evening slots · Pacific Daylight Time GMT-07:00) — stays code-side ──"),
    cto.panel([
      cto.heading("Discovery Call", "h3", "center"),
      cto.text("with One Cocreation Discovery", "center"),
      cto.text("This is a mobile studio. Location shared on appointment date.", "center"),
      cto.text("LETS PLAY ! Learn if this is right for you! We’ll hop on a one on one phone call to explore some of the services that you are considering for you or your family. It is here that we start the journey.", "center"),
      cto.note("── the full Discovery Call description lives on book-a-call-old (same widget, transcribed there) ──"),
    ]),
  ], { bgColor: "#DBD4E4" }),
];

/* ── gallaria-old — Visiting Artists and Collaborators (slug drift: my-fav-products) ── */
const glo = kit("glo");
const gallariaOldContent: Block[] = [
  glo.band("nebula", "night", [
    glo.heading("The Gallaria", "h1"),
    glo.note("── original: scalloped wave bottom edge on the hero (restyle pass); page name typo in the original tree: 'Visiting Artists and Collborators' ──"),
  ], { bgSrc: `${RAW}/shared/IMG_0175-0521729.jpeg` }),
  glo.band("plain", "theme", [
    glo.twocol(
      [
        glo.img(`${RAW}/gallaria/ac22e465-d346-4a53-9a68-ad4faf17b2a1-3030003.jpeg`, "Silhouette of a dancer balancing on a rooftop edge against a bright sun", 380, "soft", "center"),
      ],
      [
        glo.eyebrow("FEATURED COLLABORATORS"),
        glo.heading("COMING SOON", "h2"),
        glo.text("I HAVE HAD THE CHANCE TO MEET SO MANY DIFFERENT PEOPLE WITH SO MANY MARVELOUS CREATIONS AND SERVICES TO HUMANITY AS I'VE TRAVELED"),
        glo.note("── original had a stray '$' character here (residue — tell Love) ──"),
        glo.button("COMING SOON", "#", "gold"),
      ],
      36,
      "center",
    ),
  ]),
  glo.band("plain", "theme", [
    glo.note("── section top cropped between captures — a collaborator feature with a painting ──"),
    glo.img(`${RAW}/gallaria/IMG_7711-3031880.jpeg`, "Blue night painting of a heron by the water (collaborator artwork)", 420, "soft", "center"),
    glo.button("GET DISCOUNTS & MORE!", "#", "gold"),
  ]),
  glo.band("nebula", "night", [
    glo.note("── original: lavender #DBD4E4 panel floating over the moon band (panel restyle pass) ──"),
    glo.panel([
      glo.quote("\"WE CREATE FROM OUR INNER WELL\""),
      glo.text("- JULIA CAMERON", "center"),
    ]),
  ], { bgSrc: `${RAW}/consciouscuts-waxing/IMG_0266-3095756.jpeg` }),
  glo.band("sky-warm", "night", [
    glo.note("── ground: the rescued pond/swan arms-raised photo (the tiny capture read 'beach + wooden flamingo' — best match, flag for Love) ──"),
    glo.heading("COMING SOON", "h2", "center"),
    glo.text("In order to create, we draw from our inner well. This inner well, an artistic reservoir, is ideally like a well-stocked fish pond… If we don’t give some attention to upkeep, our well is apt to become depleted, stagnant, or blocked…As artists, we must learn to be self-nourishing. We must become alert enough to consciously replenish our creative resources as we draw on them — to restock the trout pond, so to speak.", "center"),
    glo.text("—Julia Cameron", "center"),
    glo.button("LEARN MORE", "#", "gold", "center"),
    glo.note("── original had: product carousel (Large Sums Of Money $11.11 · Thank You Wake Up Affirmations $11.11 · The Observer $55.00/month — Buy Now) — stays code-side / store lane ──"),
  ], { bgSrc: `${RAW}/gallaria/IMG_1348-3033912.jpeg` }),
];

/* ── thank-you-old — the general Thank You Page ─────────────────────────── */
const tyo = kit("tyo");
const thankYouOldContent: Block[] = [
  tyo.band("plain", "theme", [
    tyo.heading("THANK YOU", "h1", "center", st({ color: INK_DARK })),
    tyo.text("It is a pleasure to connect with you", "center", st({ color: INK_DARK })),
    tyo.text("So much is available to you", "center", st({ color: INK_DARK })),
    tyo.text("This is but a first step into who you are", "center", st({ color: INK_DARK })),
    tyo.text("Thank you for allowing me to be part of your Journey", "center", st({ color: INK_DARK })),
    tyo.text("Check out other memberships for a little face to face, heart to heart connection", "center", st({ color: INK_DARK })),
    tyo.img(`${RAW}/thank-you-page/IMG_0090-9067730.png`, "Glowing energy-body figure with chakra points, labeled 'Left Side' — still from the meditation video", 480, "soft", "center"),
  ], { bgColor: "#DBD4E4" }),
  tyo.band("nebula", "night", [
    tyo.panel([
      tyo.stacked("Unzip Into", "The New You", "h2", "center"),
      tyo.text("A guided meditation", "center"),
      tyo.button("DOWNLOAD YOUR FREEBIE", "/meditation", "gold", "center"),
    ]),
    tyo.note("── original: lavender panel (panel restyle pass); download delivery stays code-side ──"),
  ], { bgSrc: `${RAW}/shared/IMG_0292-7424980.png` }),
];

/* ── book-a-call-old — Let's Chat! + the Discovery Call copy in full ────── */
const bco = kit("bco");
const bookACallOldContent: Block[] = [
  bco.band("plain", "theme", [
    bco.heading("Let's Chat!", "h1"),
    bco.note("── original had: embedded booking calendar (Pick a Date and Time · August · 07:00-10:00 PM slots · Pacific Daylight Time GMT-07:00 · DATE 'Sat, Aug 15 2026' / TIME 'Pick a Date and Time') — stays code-side ──"),
    bco.panel([
      bco.heading("Discovery Call", "h2", "center"),
      bco.text("with One Cocreation Discovery", "center"),
      bco.text("This is a mobile studio. Location shared on appointment date.", "center"),
      bco.text("LETS PLAY ! Learn if this is right for you! We’ll hop on a one on one phone call to explore some of the services that you are considering for you or your family. It is here that we start the journey.", "center"),
      bco.text("Here we can speak of different hair styles, and your maintenance level. Sculpting is my art! Photos of full haircuts or part of one, and elements of others to combine into a customized creation for you is my speciality.", "center"),
      bco.text("On the day of service we will review and get clear on the direction you want to go and if it is consistent with what was spoken of previously or need an update. Whether it’s a trim, or a completely new look, I’m your gal! Don’t have any idea what you want? I will be sending you different possibilities after our discussion. Want to leave it all up to me? I will still be getting an idea of what you DON’T like, as to find you the perfect fit.", "center"),
      bco.text("Have children? I spare no technique. Children deserve just as much attention in their own unique ✨styles and it is my joy to work with them!", "center"),
      bco.text("Waxing consultation will also be in our conversation to assist with pesky hairs of the nose, lip, brows etc. And speak of what you would like not to grow back in the long term, underarms, bikini, back etc.", "center"),
      bco.text("AND THE BIG QUESTION ON EVERYONES MIND HEART. WHAT VERSION OF SESSION TO CHOOSE? TO SPEAK OR NOT TO SPEAK THAT IS THE QUESTION. 🤫shhhhhhh", "center"),
      bco.text("Not really", "center"),
      bco.text("TELL EVERYONE!", "center"),
      bco.note("── the BIG QUESTION paragraph appeared TWICE in the original widget (residue — tell Love) ──"),
    ]),
    bco.button("Book a call", "/book/discovery-call", "gold", "center"),
    bco.note("── button added for the archive page's action; the original's action was the live calendar itself ──"),
  ]),
];

/* ── weekly-intuitive-old — the $33/$11 sales page ──────────────────────── */
const wio = kit("wio");
const weeklyIntuitiveOldContent: Block[] = [
  wio.band("nebula", "night", [
    wio.heading("The Weekly Intuitive", "h1"),
    wio.note("── original: gold heading over a face/soundwave cosmic hero band (best surviving match: the Weekly Intuitive face art rides as the ground — flag for Love) ──"),
  ], { bgSrc: `${RAW}/shared/IMG_0176-0521729.jpeg` }),
  wio.band("sky-glass", "theme", [
    wio.note("── original: soft blue gradient ground ──"),
    wio.twocol(
      [
        wio.heading("Weekly Live Zooms", "h2"),
        wio.text("$33/Month or"),
        wio.text("$11 week (one time purchase)"),
        wio.heading("Meets 4 times a month", "h3"),
        wio.text("Live on Zoom Once a week session. We will explore our Claire Senses through Breath, Explore tools You already have, to dive deeper into WHO YOU ARE."),
        wio.text("We will be tuning into recordings of material you already have access to. We will [continues — cut off in capture]"),
      ],
      [
        wio.img(`${RAW}/shared/IMG_0176-0521729.jpeg`, "Woman in profile with a glowing brain of light threads — the Weekly Intuitive art, on a white card", 380, "soft", "center"),
      ],
      36,
      "top",
    ),
  ]),
  wio.band("plain", "theme", [
    wio.note("── middle sections not captured before the account purge — the page continued with template blocks below ──"),
    wio.note("── original had: 'BE SURE TO WATCH UNTIL THE END TO GET A Special Bonus' stock video placeholder (template residue) ──"),
    wio.heading("Testimonials", "h2", "center"),
    wio.note("── original had: two 5-star stock-avatar testimonials, each reading \"Coming Soon\" ──"),
  ]),
];

/* ── links-old — the link-in-bio skeleton ───────────────────────────────── */
const lko = kit("lko");
const linksOldContent: Block[] = [
  lko.band("plain", "theme", [
    lko.img(`${RAW}/links/IMG_2282-2500869.jpeg`, "Love magazine-cover style art — '444' cover with dragon-card artwork and headline text", 320, "soft", "center"),
    lko.heading("Hi  there!", "h1", "center"),
    lko.note("── original had: three black 'LINK HERE / 14 Day Free Trial' placeholder buttons (skeleton, never filled — tell Love); slug drift twin 'links-copy' existed too ──"),
  ]),
];

/* ── evening-star-old — the $111.11 sales page ──────────────────────────── */
const eso = kit("eso");
const eveningStarOldContent: Block[] = [
  eso.band("nebula", "night", [
    eso.heading("The Evening Star", "h1"),
    eso.note("── original: gold heading over the green cosmic arms-outstretched hero (the Evening Star art rides as the ground) ──"),
  ], { bgSrc: `${RAW}/shared/IMG_0175-0521729.jpeg` }),
  eso.band("sky-glass", "theme", [
    eso.note("── original: teal-green gradient ground ──"),
    eso.twocol(
      [
        eso.heading("Monthly Focus", "h2"),
        eso.text("The Evening Star Includes:"),
        eso.text("$111.11/Month"),
        eso.list([
          "-The Weekly Intuitive",
          "-The Observer",
          "-Monthly 1hr to 1 1/2hr meeting",
          "-Focus Foxy on an area in life",
          "-Monthly Theme",
          "-What this can show up as",
          "-Quantum Healing",
          "-Reference Tools",
          "-Answers to questions",
          "-Observation of beliefs",
        ], "none"),
        eso.note("── list continues below the fold — cut off in capture; 'Focus Foxy' transcribed as printed ──"),
      ],
      [
        eso.img(`${RAW}/shared/IMG_0175-0521729.jpeg`, "Silhouette with arms outstretched against a green-teal galaxy, on a white card", 380, "soft", "center"),
      ],
      36,
      "top",
    ),
  ]),
  eso.band("plain", "theme", [
    eso.note("── middle sections not captured before the account purge ──"),
    eso.note("── original had: 'BE SURE TO WATCH UNTIL THE END TO GET A Special Bonus' stock video placeholder (template residue) ──"),
    eso.heading("Testimonials", "h2", "center"),
    eso.note("── original had: two 5-star stock-avatar testimonials, each reading \"Coming Soon\" ──"),
  ]),
];

/* ── leap-of-faith-old — the June 5-10 event page ───────────────────────── */
const lfo = kit("lfo");
const leapOfFaithOldContent: Block[] = [
  lfo.band("sky-glass", "night", [
    lfo.heading("LEAP OF FAITH", "h1"),
    lfo.text("5 DAYS  FRESH STEP INTO A NEW MINDSET"),
    lfo.text("June 5-10"),
    lfo.button("GET STARTED TODAY", "/packages", "gold", "center"),
    lfo.img(`${RAW}/home/IMG_0334-9138867.png`, "Golden figure leaping from a cliff toward a radiant sun — full-width band image", 560, "none", "center"),
  ], { bgColor: "#000000" }),
  lfo.band("plain", "theme", [
    lfo.note("── a section heading may be cropped between captures ──"),
    lfo.threecol(
      [lfo.panel([
        lfo.heading("The Weekly Intuitive", "h2", "center"),
        lfo.button("YES!", "/packages/weekly-intuitive", "gold", "center"),
      ])],
      [lfo.panel([
        lfo.heading("The Observer", "h2", "center"),
        lfo.button("YES!", "/packages/observer", "gold", "center"),
      ])],
      [lfo.panel([
        lfo.heading("The Evening Star", "h2", "center"),
        lfo.button("YES!", "/packages/evening-star", "gold", "center"),
      ])],
    ),
  ], { bgColor: "#DBD4E4" }),
  lfo.band("sky-veil", "night", [
    lfo.note("── original had: dark film-reel band of Conscious Cuts & Waxing style cards ('A Curious Traveler' + stock hair-model photos) ──"),
    lfo.heading("IS A SILENT HAIR SESSION FOR YOU?", "h2", "center"),
  ]),
  lfo.band("sky-warm", "theme", [
    lfo.heading("BE IN THE KNOW", "h2", "center"),
    lfo.text("Sign up below and receive a free recording to Unzip Into The New You!", "center"),
    lfo.text("This is meant to be a once a week communication to let you know of Spontaneous Lives, Monthly Events, Location for Hair and Waxing Sessions when in your area, and Weekly Inspirations, that you can apply in your life. As this community grows there will be more news to share. A way to remember to make space to tune in and tune up, as you go about your day and expand your wings to allow you to live life with intention. To Connect, Feel Alive, all while you are Living your Human Experience as the New Human you Are.", "center"),
    lfo.note("── original had: subscribe form (Desired Name* / Email* / Submit) + angel-wings mural photo — stays code-side ──"),
  ]),
];

/* ── the three product thank-you pages — shared original layout ─────────── */
const thankYouProductOld = (
  prefix: string,
  gift: [string, string],
  artAlt: string,
  artSrc: string,
): Block[] => {
  const k = kit(prefix);
  return [
    k.band("plain", "theme", [
      k.heading("THANK YOU", "h1", "center", st({ color: INK_DARK })),
      k.text("Check out other memberships for a little face to face, heart to heart connection", "center", st({ color: INK_DARK })),
      k.img(artSrc, artAlt, 480, "soft", "center"),
    ], { bgColor: "#DBD4E4" }),
    k.band("nebula", "night", [
      k.panel([
        k.stacked(gift[0], gift[1], "h2", "center"),
        k.button("DOWNLOAD", "/store", "gold", "center"),
      ]),
      k.note("── original: lavender panel (panel restyle pass); download delivery stays code-side ──"),
    ], { bgSrc: `${RAW}/shared/IMG_0292-7424980.png` }),
  ];
};

const thankYouMorningMeditationOldContent = thankYouProductOld(
  "tmo",
  ["Thank you", "Morning Meditation"],
  "Golden figure of light holding a glowing heart, flower-of-life halo",
  `${RAW}/shared/IMG_0270-3098597.jpeg`,
);
const thankYouLargeSumsOldContent = thankYouProductOld(
  "tlo",
  ["Thank you", "Large Sums of Money"],
  "Golden doorway bursting with light, banknotes swirling through the air",
  `${RAW}/shared/IMG_0267-3097825.jpeg`,
);
const thankYouIamWorthyOldContent = thankYouProductOld(
  "tio",
  ["Thank you", "IAM Worthy Meditation"],
  "Silhouette with hands in prayer above the head, sun blazing at the heart, sunset sky",
  `${RAW}/shared/IMG_0269-3098622.jpeg`,
);

/* ── observer-old — the misfiled REAL Observer page (slug `observer`, named
 *    "Weekly Intuitive" inside the demo funnel) ──────────────────────────── */
const obo = kit("obo");
const observerOldContent: Block[] = [
  obo.band("nebula", "night", [
    obo.heading("The Observer", "h1"),
    obo.note("── original: gold heading over a comet-streaked starfield hero (best surviving match: the Observer comet art rides as the ground — flag for Love); page misfiled in the academy demo funnel under the name 'Weekly Intuitive', slug `observer` (tell Love) ──"),
  ], { bgSrc: `${RAW}/shared/IMG_0177-0521729.jpeg` }),
  obo.band("sky-warm", "theme", [
    obo.note("── original: warm gold gradient ground ──"),
    obo.twocol(
      [
        obo.stacked("Weekly", "Chronicles of Wonderland", "h2", "left"),
        obo.text("The Observer Includes:"),
        obo.text("$55.55/Month"),
        obo.list([
          "-The Weekly Intuitive",
          "-Recorded Affirmations Included",
          "-Weekly Recorded Reading",
          "-Weekly Live Zoom Meetup Group",
          "-Movement or Meditation",
          "-Insights from the recorded readings",
          "-What are you navigating",
          "-More",
        ], "none"),
        obo.text("Or $22.22 one time purchase"),
        obo.text("-1 Weekly Live, Recorded Reading and Meet Up"),
        obo.heading("Listen to my voice", "h3"),
        obo.note("── voice-sample section continues — cut off in capture ──"),
      ],
      [
        obo.img(`${RAW}/shared/IMG_0177-0521729.jpeg`, "Photographer with a lantern watching comets streak over a twilight plain, on a white card", 380, "soft", "center"),
      ],
      36,
      "top",
    ),
  ]),
  obo.band("plain", "theme", [
    obo.note("── original: a 'WELCOME TO Chronicles of Wonderland' heading sits above this section (top edge cropped in capture) ──"),
    obo.heading("Quick Preview of these recording offerings", "h2", "center"),
    obo.text("************ COMING SOON ************", "center"),
    obo.note("── original had: 'BE SURE TO WATCH UNTIL THE END TO GET A Special Bonus' stock video placeholder (template residue) ──"),
  ]),
];

/* STUDIO P1: the new-site seeds carry honest root props (page title +
   description for SEO/social) so a publish is a real page from the first
   push — titles/descriptions mirror the hand-built pages they rebuild. The
   *-old archive lane keeps `root: {}` (archive pages don't need fresh meta).
   Reads tolerate a bare `root: {}`: /p falls back to cartridge.meta, and
   Puck migrates to root.props on the next save. */
export const SEEDS: Record<string, PuckPageData> = {
  about: { content: aboutContent, root: { props: {
    title: "My Story — Love · One Cocreation",
    description: "Smiles, Love — the solo adventurer's story, the Claires, and the Bridge where Heaven and Earth meet.",
  } } },
  home: { content: homeContent, root: { props: {
    title: cartridge.meta.title,
    description: cartridge.meta.description,
  } } },
  book: { content: bookContent, root: { props: {
    title: "Sessions — book a time",
    description: "Pick a session, choose a real open time — you're held.",
  } } },
  memberships: { content: membershipsContent, root: { props: {
    title: "Memberships — One Cocreation",
    description: "Welcome to The Heart Field, where Heaven and Earth Meet.",
  } } },
  support: { content: supportContent, root: { props: {
    title: "Support — One Cocreation",
    description: "Tend the field — gifts land whole with Love, and Pay It Forward flows onward to the beings holding this Earth.",
  } } },
  classes: { content: classesContent, root: { props: {
    title: "Classes & Community — One Cocreation",
    description: "Your luminous rooms — classes and commons on One Cocreation's own server.",
  } } },
  store: { content: storeContent, root: { props: {
    title: "Store — One Cocreation",
    description: "Sessions, meditations, memberships, and wares from One Cocreation — paid in bitcoin, straight to the artist.",
  } } },
  /* STUDIO P2: the popup lane. THE ONE REAL POPUP — the rebuild of the
     original platform's only popup ("Free Guide"), retargeted to the Free
     Meditation door (/meditation). The copy is Love's own, quoted from the
     /meditation section (src/components/sections.tsx FreeMeditation):
     "A Free Meditation, With Love" / "Unzip Into the New You" /
     "no strings, only love". The Image restores the original popup's
     light-body graphic (gate punch-list 0018.05.25 a₿ — the text-only
     rebuild read thinner than Love's original; same asset the home-old
     seed references). The Button wears rose, not gold — gold is
     MONEY ONLY (house law, cartridge.ts). Seed protection applies: the
     panels and the API treat popup:* keys here as protected. */
  "popup:free-guide": { content: [
    blk("Eyebrow", { text: "A gift, no strings", align: "center", style: st() }),
    blk("Heading", { text: "A Free Meditation, With Love", level: "h2", align: "center", style: st() }),
    blk("Image", {
      src: `${RAW}/popup-free-guide/unzip-9141826.png`,
      alt: "Unzip Into The New You — the free meditation's light-body graphic",
      width: 320, radius: "soft", align: "center",
    }),
    blk("Text", {
      text: "Receive \u201cUnzip Into the New You\u201d — a free guided meditation, plus a weekly note of inspiration. No strings, only love.",
      align: "center", style: st(),
    }),
    blk("Button", { label: "Receive the meditation", href: "/meditation", variant: "rose", align: "center", style: st() }),
  ], root: { props: { title: "A Free Meditation — One Cocreation" } } },
  /* the "(old)" archive lane — Love's original ShinePages pages */
  "home-old": { content: homeOldContent, root: {} },
  "about-old": { content: aboutOldContent, root: {} },
  "memberships-old": { content: membershipsOldContent, root: {} },
  "consciouscuts-old": { content: consciousCutsOldContent, root: {} },
  "contact-old": { content: contactOldContent, root: {} },
  "gallaria-old": { content: gallariaOldContent, root: {} },
  "thank-you-old": { content: thankYouOldContent, root: {} },
  "book-a-call-old": { content: bookACallOldContent, root: {} },
  "weekly-intuitive-old": { content: weeklyIntuitiveOldContent, root: {} },
  "links-old": { content: linksOldContent, root: {} },
  "evening-star-old": { content: eveningStarOldContent, root: {} },
  "leap-of-faith-old": { content: leapOfFaithOldContent, root: {} },
  "thank-you-morning-meditation-old": { content: thankYouMorningMeditationOldContent, root: {} },
  "thank-you-large-sums-old": { content: thankYouLargeSumsOldContent, root: {} },
  "thank-you-iam-worthy-old": { content: thankYouIamWorthyOldContent, root: {} },
  "observer-old": { content: observerOldContent, root: {} },
};
