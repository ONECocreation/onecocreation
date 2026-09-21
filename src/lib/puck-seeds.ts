import type { PuckPageData } from "./puck-store";
import {
  ABOUT_BRIDGE_LINE,
  ABOUT_JOIN_LINES,
  ABOUT_VIDEOS,
  type AboutVideo,
} from "@/lib/about-content";
import { renderCartridgeId, cartridge } from "@/brand/cartridge";
import { RETREATS_EMPTY_TEXT } from "@/lib/puck-blocks/retreats-list";

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
/* T-121 THE PINK PASS: the default button variant is "rose" (the popup's
   soft pink) — "gold" still renders, but through the swapped tokens it too
   pours rose; no seed keeps a gold door by default anymore */
const button = (label: string, href: string, variant = "rose", align = "left") => blk("Button", { label, href, variant, align, style: st() });
/* TASK-355 (0018.07.02 a₿): the top-level `buttons()` helper's one caller —
   the about seed's account-door entry — is now `blk("AccountDoor")`
   (REVIEW-K86 item 6); removed here rather than left dead (the `kit()`
   factory below has its own `buttons` method, still used by home/support/
   memberships and untouched). */
const twocol = (left: Block[], right: Block[], gap = 26, valign = "top") => blk("TwoColumns", { gap, valign, left, right });
const band = (background: string, hold: string, content: Block[]) => blk("Band", { background, hold, content });

/* S11 lane 1 — the seeds learn the cartridge. A sky band's `hold` is a MOOD
   decision, not a colour: "night" pins the band dark even when the theme
   flips light (the .keep-dark trick); "theme" lets it follow the theme.
   LOVE is dark-first, so her sky bands hold the night; EARTHSIDE is
   daylight-first paper, so the SAME bands follow the theme — they ride the
   paper day and dim to the warm-charcoal twin only when the switch does;
   PACMAN IS the dark build and keeps the night. Resolved once, off the
   compile-time selection (the kd() precedent in app/services/page.tsx) —
   with LOVE active the value is today's "night" verbatim, the
   byte-identical law, and both moods' sky classes are already re-toned per
   cartridge in app/cartridges.css (S10 lane 3). Bands over a PHOTO or
   colour ground (nebula, meteors, bgSrc, bgColor) keep their literal
   "night" under EVERY cartridge: the vendored Band veil is dark
   (@frens-earth/puck-config), so their ink must stay light — re-toning that
   veil is package territory, not seed territory. S29: reads the RENDER
   selection (renderCartridgeId) so the bench override resolves the same
   way the cartridge it wears would. */
const skyHold: string = renderCartridgeId === "earthside" ? "theme" : "night";

const aboutContent: Block[] = [
  // 1 - Smiles Love: the faces, under a living dawn
  /* TASK-154 (0018.06.17 a₿ · block 966,019): item 1 — the band takes the
     darkest sky in the block vocabulary (sky-glass; the hand-built page
     wears the home hero's galaxy ground verbatim + twinkle-only stars —
     the Band block carries no star field, so there is nothing to mute
     here). Item 2 — the faces stand LEVEL (tilt "no"); the square purple
     session-card frame lives in house.css's about rules, beyond the
     Gallery block's vocabulary. The middle slot wears Love's Sep 8 selfie
     (TASK-238, love-2.webp, 900×900 — landed) and TASK-252 (0018.06.24 a₿)
     carried the same file into the home "My Story" block below. */
  band("sky-glass", skyHold, [
    eyebrow("Smiles, Love", "center"),
    stacked("MY", "STORY", "h1", "center"),
    text(cartridge.constellation, "center", st({ kerning: 6, size: 20, spaceAbove: 6 })),
    gallery([
      { src: "/images/about/love-1.webp", alt: "Love" },
      { src: "/images/about/love-2.webp", alt: "Love" },
      { src: "/images/about/love-3.webp", alt: "Love" },
    ], "no"),
  ]),

  // 2 - the hero's journey, her words whole
  band("sky-glass", skyHold, [
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
    /* TASK-154 item 3: the white 1px outline around the script graphic is
       a house.css about rule — the Image block has no border vocabulary. */
    img(cartridge.hero.heavenEarth, "Where Heaven and Earth Meet", 560, "none", "center"),
    /* TASK-154 item 6: the period leaves; "display" is the house Barlow —
       the same face the PullQuote below speaks. The line itself is
       single-sourced in @/lib/about-content. */
    text(ABOUT_BRIDGE_LINE, "center", st({ color: "rose", size: 24, font: "display", spaceAbove: 10 })),
    text("The ability to stretch and expand against all odds — all the while yearning for Home. All the while always possessing the choice, the power, to go home. To BE home. For home is not a destination:", "center"),
    quote("Home IS where the Heart IS."),
    text("In presence. In Now. It is within the Heartmind Coherence that the You and the Divine as One bring all to balanced form. A Cocreation where Heaven meets Earth — whether it’s Heaven on earth, or a paradise in the making.", "center"),
    text("This is what you came for. To be this Bridge for the New Earth. You are the Anointed, the Chosen, the One that is Answering the Call.", "center", st({ color: "ink", size: 18 })),
  ]),

  // 6 - the Weekly Intuitive story + her videos
  /* TASK-154: item 4 — the brown band goes (sky-warm → sky-glass) and the
     YES! door pours pink ("rose", not "gold"); item 5 — the left glass
     box is gone, her words stand bare; item 7 — the join-us heading reads
     "Breathe with us"; item 8 — a playlist of several real videos from
     her channel (ids confirmed over oEmbed), not one. */
  band("sky-glass", "theme", [
    eyebrow("Join Us — In This Grand Adventure!", "center"),
    stacked(ABOUT_JOIN_LINES.ink, ABOUT_JOIN_LINES.teal, "h2", "center"),
    twocol(
      [
        text("— For years, when I couldn’t sleep through the night, I knew that was the body speaking to me: things were out of balance. I had been trying to change another, or change the outside circumstances, to bring peace. That’s when I knew…"),
        rich("…the only way for me to be happy again was to work with my body. To hear. To pay attention to my emotions, my reactions, my beliefs — and ask, <i>is there another way?</i> <b>I became the Observer of my inner world, and my outer world transformed before my eyes.</b>"),
        text("— Fast forward to today… IAM bringing you back to the way of the heart. Group conversations, connecting to the intelligence of earth, the intelligence of the body, and the Divine You Are. Channeled messages through breath, through heart, through community. You have all the answers — I prepare the energetic space."),
      ],
      [
        /* the playlist is single-sourced in @/lib/about-content — the same
           ids and ratios the hand-built page embeds */
        ...ABOUT_VIDEOS.map((v) => video(v.id, v.ratio)),
        text("Readings, breath, toning, light language, a held field — the Weekly Intuitive.", "center", st({ color: "body", size: 15, spaceAbove: 14 })),
        button("YES!", "/packages/weekly-intuitive", "rose", "center"),
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
    /* TASK-355 (0018.07.02 a₿, REVIEW-K86 item 6): the plain "Create your
       account ✨" button becomes the session-aware AccountDoor block — a
       signed-in visitor reads "Go to your page →" instead of an invitation
       to a second account (the Admiral's own walk). The retired
       "ConsciousCuts & Waxing ✂️" second entry (TASK-128) leaves the seed
       here too, matching the hand-built page it had already left. */
    blk("AccountDoor"),
  ]),
];

/**
 * TASK-239 (0018.06.23 a₿ · block 966,895) — the "Top of About" video
 * (SiteConfig.about.featured, site-config.ts; Love's Sep 8 ask) on a
 * published Puck /about, applied the same way about-playlist-puck.ts's
 * applyPlaylistToPuck applies her saved playlist: a pure, structural insert
 * at request time, not baked into the seed, so a page published BEFORE she
 * ever pastes one — or before this feature existed at all — still gains it
 * the moment she saves it on /a/site/about-videos. (applyPlaylistToPuck
 * itself lives in about-playlist-puck.ts, a file outside this lane's OWNS —
 * see the lane's Seams note — so this sibling transform lives here, next to
 * the seed it's registered into.)
 *
 * No saved featured ⇒ the data comes back UNTOUCHED, same reference
 * (derive-or-dash — nothing added, no placeholder band).
 *
 * Inserted as its own plain Band right after the FIRST top-level block —
 * the "Smiles, Love" faces band in the /about seed above, and the lead
 * section of any hand-edited version — the same "between section 1 and
 * section 2" spot the hand-built page mounts <AboutFeatured> at. The Puck
 * vendored Video block never autoplays (that behaviour is code-side, on
 * AboutFeatured itself); this is the designer-branch equivalent so the
 * video is at least visible there too, not the pixel-identical component.
 */
/** The white lion — one path, the cartridge's own (`hero.lionsGate`). */
export const LION_GROUND = "/images/lions-gate.webp";

/**
 * TASK-256 (0018.06.24 a₿) — the lion holds the memberships field on the
 * DESIGNER branch too. A published /memberships snapshot from before the
 * seed carried the lion has a first Band with no ground of its own; this
 * gives that Band the lion as `bgSrc` (the Band's own veil rides over it,
 * the way the home section's .lions-gate veil does). A Band that already
 * carries a custom ground (bgSrc or bgColor) is Love's own choice and is
 * left alone; a page whose first block is not a Band is left alone
 * (derive-or-dash — never a guessed wrapper). Pure; never touches the store.
 */
export function applyLionToPuck<T extends { content?: unknown[] }>(data: T, lion: string = LION_GROUND): T {
  const current = Array.isArray(data.content) ? data.content : [];
  const first = current[0] as { type?: string; props?: Record<string, unknown> } | undefined;
  if (!first || first.type !== "Band" || !first.props) return data;
  if (first.props.bgSrc || first.props.bgColor) return data;
  const patched = { ...first, props: { ...first.props, bgSrc: lion } };
  return { ...data, content: [patched, ...current.slice(1)] } as T;
}

export function applyFeaturedToPuck<T extends { content?: unknown[] }>(
  data: T,
  featured: AboutVideo | undefined,
): T {
  if (!featured) return data;
  const current = Array.isArray(data.content) ? data.content : [];
  const featuredBand = band("plain", "theme", [
    video(featured.id, "16/9"),
    text(featured.title, "center", st({ color: "ink", spaceAbove: 12 })),
    text("Tap the speaker to hear her", "center", st({ color: "muted", size: 14 })),
  ]);
  const content = current.length === 0
    ? [featuredBand]
    : [current[0], featuredBand, ...current.slice(1)];
  return { ...data, content } as T;
}

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
    button: (label: string, href: string, variant = "rose", align = "left") => mk("Button", { label, href, variant, align, style: st() }), /* T-121: default variant rose (the pink pass) */
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
/** an explicit, stable id override — the switch-visibility filter below
 *  (applyHomeSwitchesToPuck) finds a band by this id, reorder-safe, the
 *  same reason retreats/packages inject by block TYPE rather than array
 *  position. */
const withId = (b: Block, id: string): Block => { b.props.id = id; return b; };

/* TASK-293 (0018.06.25 a₿ · block 967,144) — NO Hero content block here on
   purpose: the home hero carries the signed-in visitor's OWN weekly-
   reading door (weeklyReadingDoor, T-210) — per-request, per-soul state a
   static Puck seed can never hold honestly. src/app/page.tsx renders the
   real <Hero session={session}/> from sections.tsx on BOTH branches,
   always, above whatever this content renders. The seed's earlier
   Hero+Buttons pair (stale "5 Days / Leap of Faith" copy, pre-T-119's
   "Welcome to the Heart Field" rewrite) is retired here rather than kept
   stale — never fossilised. */
const homeContent: Block[] = [
  // 1 - My Story, the short version (the whole journey lives on /about)
  hm.band("plain", "theme", [
    hm.eyebrow("Smiles, Love", "center"),
    hm.heading("My Story", "h2", "center"),
    hm.twocol(
      [hm.img(cartridge.portraits.headshot, "Love — founder of One Cocreation", 320, "round", "center")],
      [
        hm.text("I have been a solo adventurer for a while now — like most, on the hero’s journey. Over time I found none of us are here to shrink, but to standout. Not here to separate, but to gather together — to bring kindness to the world, to be unapologetically US."),
        hm.quote("“To those drawn by the energy of the soul, Welcome Home. You Are the Bridge, Where Heaven and Earth Meet”", "left"),
        // TASK-119 [AMBER] rose line, sections.tsx:160 — carried verbatim
        hm.text("It will all be right here.", "left", st({ color: "rose" })),
        hm.button("Read my full story", "/about", "quiet", "left"),
      ],
      40,
      "center",
    ),
  ]),

  // 2 - the memberships shelf (prices/sats single-sourced in entitlement.ts)
  withId(hm.band("plain", "theme", [
    hm.eyebrow("The Heart Field — Where Heaven and Earth Meet", "center"),
    hm.heading("Memberships", "h2", "center"),
    // PACKAGE_DOORS_WORDS (sections.tsx) carried verbatim, not imported —
    // this seed's own convention keeps every other number/word a literal too
    hm.text("Three ways into the field — each includes everything before it. Pay monthly in dollars or in bitcoin. Your package opens its doors.", "center"),
    hm.threecol(
      [hm.panel([
        hm.img(cartridge.tierArt.A, "Weekly Intuitive", 300, "soft", "center"),
        hm.heading("Weekly Intuitive", "h3", "center"),
        hm.text("$33/mo — ⚡ ≈ 55,555 sats / month", "center"),
        hm.list([
          "Live weekly meetup in Love's room — 4× a month",
          "Explore your Clair Senses through breath",
          "Meditations, toning, light language",
          "A held energetic field, in community",
        ]),
        // Seam (not blocking): the live card's door swaps between this
        // direct link (rails ON, tierRailsOn) and a waitlist form (rails
        // OFF) — a live switch a generic Button block can't reproduce; the
        // about page's own "YES!" tier link carries the same simplification
        // (always a direct link, never gated). This door always works.
        hm.button("See the package", "/packages/weekly-intuitive", "gold", "center"),
      ])],
      [hm.panel([
        hm.img(cartridge.tierArt.B, "Observer", 300, "soft", "center"),
        hm.heading("Observer", "h3", "center"),
        hm.text("$55/mo — ⚡ ≈ 88,888 sats / month", "center"),
        hm.list([
          "Everything in Weekly Intuitive",
          "Weekly recorded reading + affirmations",
          "Weekly live meetup in Love's room",
          "Movement, meditation & navigation",
        ]),
        hm.button("See the package", "/packages/observer", "gold", "center"),
      ])],
      [hm.panel([
        hm.img(cartridge.tierArt.C, "Evening Star", 300, "soft", "center"),
        hm.heading("Evening Star", "h3", "center"),
        hm.text("$111/mo — ⚡ ≈ 177,777 sats / month", "center"),
        hm.list([
          "Everything in Weekly Intuitive & Observer",
          "Monthly 1–1½ hr focused meeting",
          "Quantum healing & reference tools",
          "All classes + full community",
        ]),
        hm.button("See the package", "/packages/evening-star", "gold", "center"),
      ])],
    ),
    hm.note("How the gate works: pay in bitcoin (or dollars) → your package opens automatically. Your tier is checked before content, classes, and community render — the house level-locked door — live and enforcing."),
  ]), "home-memberships"),

  // 3 - the Heart Field — rooms, tier-gated
  withId(hm.band("plain", "theme", [
    hm.eyebrow("The Heart Field", "center"),
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
          "♡ The Heart Field · All members",
          "♡ Daily Tune-Up & Check-ins · Package A",
          "♡ The Observers’ Circle · Package B",
          "♡ Evening Star — Inner Sanctum · Package C",
        ], "none"),
      ])],
    ),
    hm.button("Enter your rooms", "/classes", "gold", "center"),
    hm.note("Matrix-powered — paying for a package sends your invite automatically, One Cocreation-branded (replacing Patreon / Mighty Networks / Kajabi). Your rooms, your keys."),
  ]), "home-classes-community"),

  // 4 - the recorded affirmations
  withId(hm.band("plain", "theme", [
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
  ]), "home-affirmations"),

  // 5 - ConsciousCuts/Sessions, LAST among the offerings (Love's meeting,
  // 0018.05.11) — the heading text itself follows `cuts` on the live JSX
  // (Services(), sections.tsx:356); the seed's literal default is the
  // switches' OWN default (cuts off ⇒ "Sessions with Love"),
  // applyHomeSwitchesToPuck swaps it at render time, matching the fallback.
  withId(hm.band("sky-veil", skyHold, [
    hm.heading("Sessions with Love", "h2", "center", st({ color: "ink" })),
    hm.text("The Way of the Heart, one-on-one. Sessions where you don’t have to keep up conversation. Pick a time — you’re held.", "center", st({ color: "muted" })),
    hm.note("── live sessions shelf stays code-side (the real booking cards) ──"),
    hm.text("Pick a session → choose a real open time → pay in sats or dollars → confirmed with a calendar file, held with love.", "center", st({ color: "muted", size: 15 })),
  ]), "home-services"),

  // 6 - tend the field
  hm.band("sky-warm", "theme", [
    hm.panel([
      hm.eyebrow("Support This Work — Gently ⚡"),
      hm.heading("Tend the Field", "h2"),
      hm.rich("A gift lands with Love <b style=\"color:var(--gold-deep)\">whole</b> — no platform between, no cut taken. Give in bitcoin over lightning or simply in dollars; bitcoin is an option here, never a demand."),
      hm.note("── live tip jar stays code-side ──"),
      hm.heading("Three Doors", "h3"),
      hm.text("Give forward, follow along, read with me."),
      hm.note("── live wild doors stay code-side ──"),
      hm.buttons([
        { label: "The Full Support Room", href: "/support", variant: "quiet" },
      ], "left"),
    ]),
  ]),

  // 7 - the free meditation
  hm.band("plain", "theme", [
    hm.twocol(
      [hm.img("/images/newsletter.webp", "Free guided meditation", 420, "soft", "center")],
      [
        hm.eyebrow("Be in the Know"),
        hm.heading("A Free Meditation, With Love", "h2"),
        hm.rich("Join the newsletter and receive <b style=\"color:var(--rose)\">“Unzip Into the New You”</b> — a free guided meditation, plus a weekly note of inspiration."),
        hm.text("Delivered straight to your inbox — on the house, from our 💞 to yours.", "left", st({ size: 15 })),
        hm.note("── live subscribe form stays code-side ──"),
      ],
      36,
      "center",
    ),
  ]),

  // 8 - connect & book
  hm.band("plain", "theme", [
    hm.eyebrow("E.T. Phone Home", "center"),
    hm.heading("Connect", "h2", "center"),
    hm.note("── live contact doors stay code-side ──"),
  ]),
];

/** TASK-293 (0018.06.25 a₿ · block 967,144) — the render-time switch filter:
 *  four of the bands above stand behind the SAME site-config switches their
 *  sections.tsx twins read (Packages()/Classes()/Affirmations()/Services())
 *  — never fossilised into the stored doc, resolved fresh on every request
 *  exactly like applyRetreatsToPuck/applyPackagesToPuck's live injection.
 *  No new Puck block, no puck-config.tsx change: this only removes/edits
 *  the seed's own generic Band/Heading blocks by their stable ids.
 *
 *  KNOWN SIMPLIFICATION (Seam, not blocking — see SUMMARY.md): the live
 *  Classes()/Community JSX hides EACH card independently when only one of
 *  `classes`/`community` is on; this filter hides the whole band only when
 *  BOTH are off (today's actual default), leaving both cards showing
 *  whenever either switch is on. Untouched-path law: no switch changes
 *  anything ⇒ the same `data` reference comes back. */
export function applyHomeSwitchesToPuck<T extends { content?: unknown[] }>(
  data: T,
  switches: { memberships: boolean; classes: boolean; community: boolean; store: boolean; sessions: boolean; cuts: boolean },
): T {
  const current = Array.isArray(data.content) ? (data.content as Block[]) : [];
  const hideIds = new Set<string>();
  if (!switches.memberships) hideIds.add("home-memberships");
  if (!switches.classes && !switches.community) hideIds.add("home-classes-community");
  if (!switches.store) hideIds.add("home-affirmations");
  if (!switches.sessions && !switches.cuts) hideIds.add("home-services");

  let touched = false;
  const content = current
    .filter((b) => {
      const id = b.props?.id as string | undefined;
      if (id && hideIds.has(id)) { touched = true; return false; }
      return true;
    })
    .map((b) => {
      if (b.props?.id !== "home-services" || hideIds.has("home-services")) return b;
      const inner = Array.isArray(b.props.content) ? (b.props.content as Block[]) : [];
      const wantText = switches.cuts ? "ConsciousCuts & Waxing 🦋" : "Sessions with Love";
      let headingTouched = false;
      const nextInner = inner.map((c) => {
        if (c.type !== "Heading" || c.props.text === wantText) return c;
        headingTouched = true;
        return { ...c, props: { ...c.props, text: wantText } };
      });
      if (!headingTouched) return b;
      touched = true;
      return { ...b, props: { ...b.props, content: nextInner } };
    });

  return touched ? ({ ...data, content } as T) : data;
}

/* ── book — the Sessions door: night hero + the living 2×2 ──────────────── */
const bk = kit("bk");
const bookContent: Block[] = [
  bk.band("sky-veil", skyHold, [
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
  /* TASK-256 (0018.06.24 a₿): the white lion is the BAND'S GROUND — the same
     lion background the home page's memberships section (.lions-gate) and the
     hand-built page (.lions-gate-dark) wear — not an inline picture (the
     0018.06.17 seed put it in as an Image; the Admiral: "we lost the lion
     background on the /memberships page"). bgSrc rides the Band's own veil
     (0.13.0 custom grounds). A page published BEFORE this seed gets the same
     ground at render time through applyLionToPuck (memberships/page.tsx). */
  mb.band("sky-veil", skyHold, [
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
  ], { bgSrc: LION_GROUND }),
];

/* ── packages — the memberships INDEX: her words, the LIVE tier grid ────── */
const pk = kit("pk");
const packagesContent: Block[] = [
  /* TASK-232 (0018.06.25 a₿ · block 967,125): /packages becomes a designer
     page. The words are transcribed from Packages() (src/components/
     sections.tsx — the fallback, NOT edited; two pins source-grep it):
     the kicker, the "Memberships" heading, the lead closing on T-229's
     PACKAGE_DOORS_WORDS verbatim, and the gate-explainer footnote.
     Names and prices NEVER enter the seed — they live in TIERS and render
     through the PackagesGrid block below (rails-ON sale door / rails-OFF
     waitlist, switch-live at render time via applyPackagesToPuck). The
     lion: the words band carries it as its ground (bgSrc, the memberships
     seed's idiom — the vendored Band's veil is dark, documented package
     limitation) and the grid block's own section wears .lions-gate exactly
     like today's; the plain-band footnote is the one stretch the
     continuous lion ground can't carry across separate blocks. */
  pk.band("sky-veil", skyHold, [
    pk.eyebrow("The Heart Field — Where Heaven and Earth Meet", "center"),
    /* h1, not the hand-built page's h2: the publish rails require exactly
       one h1 (one-h1 is an ERROR — the seed must publish clean); the
       promotion is noted here, the house's archival-heading idiom */
    pk.heading("Memberships", "h1", "center"),
    pk.text("Three ways into the field — each includes everything before it. Pay monthly in dollars or in bitcoin. Your package opens its doors.", "center"),
  ], { bgSrc: LION_GROUND }),
  /* a unique id (T-231's collision lesson): the kit consumed pk-0…pk-3 */
  { type: "PackagesGrid", props: { id: "pk-grid" } },
  pk.band("plain", "theme", [
    pk.note("How the gate works: pay in bitcoin (or dollars) → your package opens automatically. Your tier is checked before content, classes, and community render — the house level-locked door — live and enforcing."),
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
      su.heading("Gifts of Gratitude", "h2"),
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
  cm.band("sky-veil", skyHold, [
    cm.eyebrow("The Heart Field", "center"),
    cm.stacked("CLASSES &", "COMMUNITY", "h1", "center"),
    cm.text(cartridge.constellation, "center", st({ kerning: 6, size: 20, spaceAbove: 6 })),
    cm.text("Your own luminous rooms — your keys, Love’s server, nobody in between. Your package opens the doors.", "center"),
  ]),
  cm.band("sky-glass", "theme", [
    cm.note("── live community spotlight stays code-side (who holds the field + the voices) ──"),
  ]),
  cm.band("sky-glass", skyHold, [
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
  sr.band("sky-veil", skyHold, [
    sr.heading("✂️ ConsciousCuts & Soul Sessions", "h2", "center"),
    sr.text("One-on-one time on Love’s real calendar — pick a session, choose an open time, you’re held.", "center"),
    sr.note("── live product grid stays code-side ──"),
  ]),
];

/* ── retreats — the journey page: hero + lead, then the LIVE shelf ─────── */
const rt = kit("rt");
const retreatsContent: Block[] = [
  /* TASK-231 (0018.06.24 a₿ · block 967,070): /retreats becomes a designer
     page. The words are transcribed from the hand-built page
     (src/app/retreats/page.tsx) — kicker, stacked hero, lead. The card grid
     is NOT seed prose: it is ONE RetreatsList entry where the grid sits
     today, and the live shelf (booking config + order book seat math)
     arrives at render time through applyRetreatsToPuck — the dynamic part
     never fossilises here. The empty-shelf line rides the BLOCK as its
     rewordable emptyText field, not a static Text block: it is conditional
     on live data (only renders when no retreats are live), so static prose
     would show it beside a full shelf. */
  rt.band("plain", "theme", [
    rt.eyebrow("A Journey, Not an Appointment", "center"),
    rt.stacked("RETREATS", "& EXCURSIONS", "h1", "center"),
    rt.text("Blocks of days at a place, held together — sold by the seat, paid in bitcoin, straight to the artist.", "center"),
  ]),
  /* the id must be UNIQUE across the whole page, slot children included —
     the kit above consumed rt-0…rt-3; a colliding id makes the designer's
     canvas render this block in both spots (React keys by props.id) */
  { type: "RetreatsList", props: { id: "rt-list", emptyText: RETREATS_EMPTY_TEXT } },
];

/* ── privacy — the legal page, said plainly (TASK-295 wave A pair 2) ────── */
const pv = kit("pv");
const privacyContent: Block[] = [
  /* TASK-295 (0018.06.25 a₿ · block 967,178): /privacy becomes a designer
     page. The words are transcribed VERBATIM from src/app/privacy/page.tsx
     (the fallback, NOT edited — the words law: the legal pages' words are
     never rewritten). Pure prose: no images, no doors, no forms, no live
     data — so no new block, no Note. The mgmt chrome (the 720px column, the
     small muted body) maps to one plain band: eyebrow, h1, muted blurb,
     then the five bold-lead paragraphs as RichText (size 14 = text-sm,
     spaceBelow 16 = space-y-4). The band's own wrap is wider than the
     fallback's 720px column — a documented approximation, not a rewrite. */
  pv.band("plain", "theme", [
    pv.eyebrow("Your data, plainly"),
    pv.heading("Privacy Policy", "h1"),
    pv.text("Draft v1 — this page describes what the site actually does.", "left", st({ color: "muted", size: 15, spaceBelow: 10 })),
    pv.rich("<b>What we collect.</b> Only what an order or letter needs: an email for receipts and sign-in codes; a name and address only when something ships; city/state/zip only for in-person visits; your nostr public key if you sign in with one. No ad trackers, no analytics beacons, no third-party cookies.", "left", st({ size: 14, spaceBelow: 16 })),
    pv.rich("<b>What we forget.</b> Contact and shipping details on orders are automatically purged about 30 days after delivery — the returns window closes, and then we forget on purpose. Order records themselves (what was bought, for how much) remain for the books.", "left", st({ size: 14, spaceBelow: 16 })),
    pv.rich("<b>Email.</b> The list is opt-in. Every newsletter carries a one-click unsubscribe. Sign-in codes expire in ten minutes.", "left", st({ size: 14, spaceBelow: 16 })),
    pv.rich("<b>Payments.</b> Bitcoin invoices are processed by One Cocreation's own payment server. We never see card numbers (there are none) and never custody your keys.", "left", st({ size: 14, spaceBelow: 16 })),
    pv.rich("<b>Your rights.</b> Ask and we'll show you what we hold about you, correct it, or delete what the law lets us delete. Write to the house at the addresses in the footer.", "left", st({ size: 14 })),
  ]),
];

/* ── terms — the fine print, kindly (TASK-295 wave A pair 2) ────────────── */
const tm = kit("tm");
const termsContent: Block[] = [
  /* TASK-295 (0018.06.25 a₿ · block 967,178): /terms becomes a designer
     page — same transcription law as /privacy above: VERBATIM from
     src/app/terms/page.tsx (the fallback, NOT edited), pure prose, no new
     block. "Rescheduling & refunds." carries &amp; in the html field so the
     RichText block emits the same glyph the JSX's &amp; entity does. */
  tm.band("plain", "theme", [
    tm.eyebrow("The fine print, kindly"),
    tm.heading("Terms & Conditions", "h1"),
    tm.text("Draft v1 — plain language; final wording with Love.", "left", st({ color: "muted", size: 15, spaceBelow: 10 })),
    tm.rich("<b>What you're buying.</b> Digital offerings (meditations, affirmations, courses) unlock for the signed-in account that bought them. Memberships open their tier's rooms and content for the paid period. In-person sessions are booked for a specific time and place.", "left", st({ size: 14, spaceBelow: 16 })),
    tm.rich("<b>Payment.</b> Prices are shown in dollars and sats. Bitcoin payments (lightning or on-chain) settle to One Cocreation's own wallet — non-custodial, no third parties holding funds. A payment is complete when the invoice settles.", "left", st({ size: 14, spaceBelow: 16 })),
    tm.rich("<b>Rescheduling &amp; refunds.</b> Life happens — reach out and we'll work with you. Refunds of bitcoin payments are returned in sats to an address you provide. Pay-what-you-can offers are accepted or kindly declined by Love; declined offers are refunded in full.", "left", st({ size: 14, spaceBelow: 16 })),
    tm.rich("<b>Sessions.</b> Booked times are held for you; unpaid holds release automatically. In-person visits depend on location — the mobile studio travels, and your city/state/zip at checkout tells us where.", "left", st({ size: 14, spaceBelow: 16 })),
    tm.rich("<b>Not medical advice.</b> Sessions, meditations and classes are spiritual and wellness offerings, not medical or psychological treatment.", "left", st({ size: 14, spaceBelow: 16 })),
    tm.rich("<b>Your account.</b> Keys are yours; we never hold them. Email sign-in codes are single-use and short-lived. Be kind in community rooms — Love may remove access for harm.", "left", st({ size: 14 })),
  ]),
];

/* ── bday — the Bitcoin Birthday door, an honest placeholder ────────────── */
const bd = kit("bd");
const bdayContent: Block[] = [
  /* TASK-295 wave A pair 6 (0018.06.25 a₿ · block 967,188): /bday becomes a
     designer page. The words are transcribed VERBATIM from
     src/app/bday/page.tsx (the fallback, NOT edited — the words law). Pure
     prose: no images, no buttons, no forms, no live data (the page exists
     BECAUSE the modeled birth-block reading stays off this site — the
     0018.05.26 a₿ dashes-over-estimates ruling). Two documented
     approximations: the fallback wraps the page in <DisplayFonts> (the Puck
     blocks wear the site fonts — nothing to transcribe), and the blurb's
     inline /time link rides the RichText html field as a real anchor — a
     small stretch of the package's documented inline set (b/i/br/span),
     same dangerouslySetInnerHTML render path, noted here. */
  bd.band("plain", "theme", [
    bd.eyebrow("One Cocreation The Bitcoin Birthday checker"),
    bd.heading("When were you born, in bitcoin time?", "h1"),
    bd.rich("The checker that answered this has moved with the time kit to its own world — it reads a modeled birth block, and this site only shows what the chain can vouch for. It returns with this door's new face. The plain live reading keeps ticking at <a href=\"/time\">/time</a>.", "left", st({ color: "muted", size: 15 })),
  ]),
];

/* ── time — the clock door: static words + the LIVE read, said ───────────── */
const tc = kit("tc");
const timeContent: Block[] = [
  /* TASK-295 wave A pair 6 (0018.06.25 a₿ · block 967,188): /time's seed was
     written while the ROUTE stayed words — the ruled flag-and-stop (K36):
     the page's live BFT read (block height → 00YY.MM.DD a₿, live-or-dashes)
     is live data and must NEVER fossilise into a stored doc. TASK-296 wave
     B, pair bb-time: the stop LANDS — the BftClock block (client-live, the
     stored doc carries only its id) now holds the clock's place where the
     interim code-side note stood, and the route wires up. The static words
     are transcribed VERBATIM from src/app/time/page.tsx (the fallback, NOT
     edited). The paper link rides the RichText html field as a real anchor
     (the same documented inline-set stretch as /bday's, noted there); the
     mono small-caps styling of the link and the "tick tock" line is the
     mgmt chrome, beyond the block vocabulary (documented). */
  tc.band("plain", "theme", [
    tc.eyebrow("The time door"),
    tc.heading("The clock that syncs to the block, not the sun", "h1"),
    tc.text("Bitcoin Federated Time, plainly: the canonical date and the live block height. The orrery that used to perform here has gone home to its own world — a new face for this door is being drawn.", "left", st({ color: "muted", size: 15, spaceBelow: 10 })),
    /* TASK-296 wave B, pair bb-time (0018.06.25 a₿): the flag-and-stop LANDS
       — the pair-6 note becomes the real data-bound block (BftClock renders
       the client-live TimeClock; the stored doc carries only this id, never
       a reading). A unique id, the rt-list/pk-grid idiom: the kit consumed
       tc-0…tc-2 below and tc-3…tc-5 after. */
    { type: "BftClock", props: { id: "tc-clock" } },
    tc.rich("<a href=\"https://github.com/PacsArcade/bitcoin-federated-time\">read the paper on GitHub</a>", "left", st({ size: 13 })),
    tc.text("tick tock, it all comes back to the block", "center", st({ color: "muted", size: 12, kerning: 4, spaceAbove: 40 })),
  ]),
];

/* ── bb — the Bitcoin Buddy door: header words + the LIVE console ────────── */
const bb = kit("bb");
const bbContent: Block[] = [
  /* TASK-296 wave B, pair bb-time (0018.06.25 a₿): /bb becomes a designer
     page. The header words are transcribed VERBATIM from
     src/app/bb/page.tsx (the fallback, NOT edited — the words law). The
     console is the { id }-only BbConsole block (GO §2 rubric line 2 — the
     widget is self-contained client machinery, nothing to inject, nothing
     to fossilise): a literal block with an explicit unique id, the
     rt-list/pk-grid idiom (the kit consumed bb-0…bb-2). The fallback wraps
     the page in <DisplayFonts> — the published branch wears the site fonts
     (the declared font difference, pair 6's bday precedent, said in the
     lane's SUMMARY). */
  bb.band("plain", "theme", [
    bb.eyebrow("One Cocreation"),
    bb.heading("Bitcoin Buddy", "h1"),
    bb.text("A lil buddy tied to the block — co-owned with your friends, kept alive with your key.", "left", st({ color: "muted", size: 15, spaceBelow: 24 })),
    { type: "BbConsole", props: { id: "bb-console" } },
  ]),
];

/* ── live — the door: the eyebrow words + the LIVE state block ──────────── */
const lv = kit("lv");
const liveContent: Block[] = [
  /* TASK-296 wave B, pair live (0018.06.25 a₿ · block 967,201): /live
     becomes a designer page. The eyebrow is the page's one always-static
     word (transcribed VERBATIM from src/app/live/page.tsx — the fallback,
     NOT edited). Everything else is the ONE LiveDoor data-bound block (GO
     §2 rubric line 3): the h1 flips with the server-judged live flag, so
     the h1 belongs to the block, not the seed; the idle h1/schedule/YouTube
     URL ride as its editable FIELDS (stored), the live card + embed arrive
     by injection at render (never stored). The field defaults are literals
     transcribed from src/lib/live.ts's LIVE_SCHEDULE/LIVE_YOUTUBE — this
     file reaches the client (PagesPanel) and @/lib/live is server-only
     (the matrix-rooms Turbopack lesson), so the import can't happen here;
     tests/live-puck.test.ts pins the literals against the constants. A
     literal block with an explicit unique id, the rt-list/pk-grid idiom
     (the kit consumed lv-0). */
  lv.band("plain", "theme", [
    lv.eyebrow("Live"),
    { type: "LiveDoor", props: {
      id: "lv-door",
      idleH1: "Live, on the rhythm",
      schedule: "Mon · Wed · Fri ~11:11",
      youtubeUrl: "https://www.youtube.com/@Onecocreation",
    } },
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
  cco.band("sky-glass", skyHold, [
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
    cco.text("Let’s get to know each other. Know what you want? Simply book your appointment. Or respond to the email for a live call."),
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
        wio.heading("Weekly Live Meetups", "h2"),
        wio.text("$33/Month or"),
        wio.text("$11 week (one time purchase)"),
        wio.heading("Meets 4 times a month", "h3"),
        wio.text("Live in Love's room, once a week session. We will explore our Claire Senses through Breath, Explore tools You already have, to dive deeper into WHO YOU ARE."),
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

/* ── evening-star-old — the $111 sales page ──────────────────────────── */
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
        eso.text("$111/Month"),
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
  lfo.band("sky-veil", skyHold, [
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
        obo.text("$55/Month"),
        obo.list([
          "-The Weekly Intuitive",
          "-Recorded Affirmations Included",
          "-Weekly Recorded Reading",
          "-Weekly Live Meetup in Love's Room",
          "-Movement or Meditation",
          "-Insights from the recorded readings",
          "-What are you navigating",
          "-More",
        ], "none"),
        obo.text("Or $22 one time purchase"),
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

/* ── T-295 wave A pair 1: /meditation — the free meditation door ──────────
   FreeMeditation (src/components/sections.tsx:517) transcribed verbatim —
   her words, the real photograph, the real alt. The live SubscribeForm
   stays code-side, said in the seed (the home seed's section-7 idiom): no
   subscribe block exists in the registry, and none is needed to open the
   page in the designer. The image is the section's REAL ground
   (/images/dusk-lake-storm-light.webp — her own dusk-lake photograph), not
   the newsletter.webp the home seed's twin band carries. */
const md = kit("md");
const meditationContent: Block[] = [
  md.band("plain", "theme", [
    md.twocol(
      [md.img("/images/dusk-lake-storm-light.webp", "Love's own photograph: a still lake under mountains at dusk, orange light breaking through storm cloud", 420, "soft", "center")],
      [
        md.eyebrow("Be in the Know"),
        md.heading("A Free Meditation, With Love", "h2"),
        md.rich("Join the newsletter and receive <b style=\"color:var(--rose)\">“Unzip Into the New You”</b> — a free guided meditation, plus a weekly note of inspiration."),
        md.text("Delivered straight to your inbox — on the house, from our 💞 to yours.", "left", st({ size: 15 })),
        md.note("── live subscribe form stays code-side ──"),
      ],
      36,
      "center",
    ),
  ]),
];

/* ── T-295 wave A pair 3: /jewelry — The Adornments ────────────────────────
   Jewelry() (src/components/sections.tsx:301) transcribed VERBATIM — her
   words, her four pieces, her prices. Fully static: no forms, no switches,
   no live data. The one piece a seed can't hold: the pendant art is an
   inline-SVG gradient drawn in code (there is no image file) — it stays
   JSX-only, said in the seed; the page's own closing note already tells
   visitors the real photos are coming. The jgrid's four cards map to two
   TwoColumns of Panels (the block vocabulary's nearest honest grid). */
const jw = kit("jw");
const jewelryCard = (name: string, story: string, usd: string, sats: string): Block[] => [
  jw.heading(name, "h3", "center"),
  jw.text(story, "center", st({ color: "muted", size: 14 })),
  jw.text(`$${usd}`, "center", st({ size: 19, spaceAbove: 8 })),
  jw.text(`⚡ ≈ ${sats} sats`, "center", st({ size: 14 })),
  jw.text("Handmade · ships in 3–5 days", "center", st({ color: "muted", size: 12, spaceAbove: 6 })),
];
const jewelryContent: Block[] = [
  jw.band("plain", "theme", [
    jw.eyebrow("Handmade by Love", "center"),
    jw.heading("The Adornments", "h2", "center"),
    jw.text("Wire-wrapped pendants, made one at a time — copper and rose-gold spirals holding stones that chose you. Pay in bitcoin or dollars; shipped to your door.", "center"),
    jw.twocol(
      [jw.panel(jewelryCard("Rose Quartz Spiral", "Divine feminine — soft heart-opening.", "88", "88,000"))],
      [jw.panel(jewelryCard("Amethyst Ascension", "Crown-chakra clarity, held in wire.", "111", "111,000"))],
    ),
    jw.twocol(
      [jw.panel(jewelryCard("Amazonite Waters", "Throat-song truth — for speaking your knowing.", "77", "77,000"))],
      [jw.panel(jewelryCard("Citrine Sun", "Divine masculine — warmth and the golden spiral.", "99", "99,000"))],
    ),
    jw.note("── the pendant stand-in art stays code-side (inline-SVG pendants drawn in code — real photos of the pieces are coming soon, as the note below says) ──"),
    jw.note("Physical goods — each piece is handmade and posted to you. Checkout is bitcoin/lightning (or dollars), non-custodial to Love's own node; shipping & address collected at checkout. These are stand-in images — photos of the real pieces are coming soon."),
  ]),
];

/* ── T-295 wave A pair 3: /artist — the registry door ──────────────────────
   On this tenant the live route REDIRECTS to /me (TASK-135; the gate stays
   FIRST on the page, before the Puck read — the T-232 idiom). Behind the
   gate, ArtistRegistry is a session-gated, API-backed app (entitlement,
   requests, watches, the auction board — /api/artist/*): per-soul state a
   static doc can never hold, so the app stays code-side, said in the seed.
   What IS honestly seedable is its header — eyebrow, title, blurb render
   unconditionally atop every gated state; transcribed VERBATIM from
   src/components/ArtistRegistry.tsx (the header's own words). */
const ar = kit("ar");
const artistContent: Block[] = [
  ar.band("plain", "theme", [
    ar.eyebrow("Artist training"),
    ar.heading("Artist Registry", "h1"),
    ar.text("Your name on the Spaces protocol — request it, watch the auction, anchor it to Bitcoin.", "left", st({ color: "muted" })),
    ar.note("── the live Artist Registry stays code-side (session-gated: the sign-in nudge, the level-locked screen, and the REQUEST / AUCTION BOARD / WATCHLIST tabs reading /api/artist/*) ──"),
  ]),
];

/* ── contact — E.T. Phone Home: hero, doors, write-to-me, her FAQ ───────── */
const ct = kit("ct");
const contactContent: Block[] = [
  /* TASK-295 wave A pair 4 (0018.06.25 a₿ · block 967,181): /contact becomes
     a designer page. The words are transcribed VERBATIM from
     src/app/contact/page.tsx (the fallback, NOT edited — the words law).
     The hero's CosmicSky star field and the glass frames live beyond the
     Band vocabulary (the about seed's documented approximation); the live
     widgets take the sanctioned "stays code-side, said in the seed" path
     (the T-293 home-seed idiom, pair 1's meditation precedent). The FAQ
     section's sky-night band maps to the nearest vocabulary ground
     (sky-glass — sky-night isn't one of the Band's six). The Faq block's
     answer is ONE plain paragraph: the fallback's two paragraphs join with
     a space and the bold on MST/PST and the days flattens — the words are
     verbatim, the markup is the block's. */
  ct.band("sky-veil", skyHold, [
    ct.eyebrow("E.T. Phone Home", "center"),
    ct.stacked("I'LL BE", "RIGHT HERE", "h1", "center"),
    ct.text(cartridge.constellation, "center", st({ kerning: 6, size: 20, spaceAbove: 6 })),
  ]),
  ct.band("sky-glass", "theme", [
    ct.note("── live contact doors stay code-side (the three doors shared with the homepage) ──"),
  ]),
  ct.band("sky-glass", "theme", [
    ct.heading("Write to Me 💌", "h2", "center"),
    ct.text("a note lands gently in Love's inbox — she writes back to your email.", "center", st({ color: "muted", size: 14, spaceBelow: 14 })),
    ct.note("── live contact form stays code-side (a note lands gently in Love's inbox, on the house mail rails) ──"),
  ]),
  ct.band("sky-glass", "theme", [
    ct.heading("FAQ", "h2", "center"),
    ct.faq([
      {
        q: "What time zones are the YouTube “Live with Love”?",
        a: "Time zones currently vary between MST (Mountain) and PST (Pacific) — Monday · Wednesday · Friday @ 11:11, or there abouts ;) 👍🏽🪶🛎️ To hear of any changes, Leap events, and random lives — a YouTube hint: if you haven't tapped a video or a thumbs-up 👍🏽 in a while, the lives and recent videos stop popping up in your feed until you're active with the channel again.",
      },
    ]),
  ]),
];

/* ── services — the dark-first galaxy walk ──────────────────────────────── */
const sv = kit("sv");
const servicesContent: Block[] = [
  /* TASK-295 wave A pair 4 (0018.06.25 a₿ · block 967,181): /services
     becomes a designer page. The words are transcribed VERBATIM from
     src/app/services/page.tsx (the fallback, NOT edited — the words law).
     The custom keep-dark gradient grounds (the page's kd() literals) map to
     the nearest named night bands — the Band's six grounds carry no custom
     gradients, and bgColor's one flat colour reads further from the
     gradients than the named veils do (the about seed's approximation
     idiom). The scrollzoom/aurora/CosmicSky dressings are likewise beyond
     the Band. THE LIVE PIECES take the sanctioned "stays code-side, said
     in the seed" path (pair 1's meditation idiom) — the sessions shelf
     (<Services/>, the real booking cards), the monthly membership cards
     (names and prices read LIVE from TIERS × TIER_PAGES — never fossilised,
     the T-232 law), the subscribe form, and the Retreats door (live only
     while a retreat is live). The four portraits are decorative (alt="");
     the Gallery block carries no circle crop or teal ring (documented). */
  sv.band("sky-veil", "night", [
    sv.eyebrow("Welcome To", "center"),
    /* h1, not the hand-built page's h2: the publish rails require exactly
       one h1 (one-h1 is an ERROR — the seed must publish clean); the
       promotion is noted here, the house's archival-heading idiom (T-232) */
    sv.heading("The Way of the Heart", "h1", "center"),
    sv.rich("Mindfulness in action. Sessions where you don't have to keep up conversation. You get to choose… <b style=\"color:var(--gold-2)\">To BE Silent or Not to be Silent — that is the Question.</b>", "center", st({ size: 18 })),
    sv.rich("We find out what your needs are — sometimes photos get us in the right direction. You get to sit back and enjoy the magic. Every session closes with an <b style=\"color:var(--rose)\">affirmations card</b> chosen for you — a message sent from The Universe to take with you into your day.", "center", st({ color: "muted", size: 15 })),
  ]),
  sv.band("sky-glass", "night", [
    sv.stacked("BECOME A", "FREE MEMBER", "h2", "center"),
    sv.text(cartridge.constellation, "center", st({ kerning: 6, size: 20, spaceAbove: 6 })),
    /* the kit carries no gallery helper (only the about seed's top-level one)
       — a literal Gallery block with an explicit unique id, the rt-list /
       pk-grid idiom (T-231's collision lesson). The four portraits are
       decorative (alt=""); the circle crop + teal ring are beyond the
       Gallery block (documented). */
    { type: "Gallery", props: { id: "sv-portraits", images: [
      { src: "/images/consciouscuts/lady.webp", alt: "" },
      { src: "/images/consciouscuts/men.webp", alt: "" },
      { src: "/images/consciouscuts/lady3.webp", alt: "" },
      { src: "/images/consciouscuts/men2.webp", alt: "" },
    ], tilt: "no" } },
    sv.threecol(
      [sv.panel([
        sv.text("🕊️", "center", st({ size: 27 })),
        sv.text("A Discovery Call — credited toward your service", "center", st({ size: 15 })),
      ])],
      [sv.panel([
        sv.text("🗓️", "center", st({ size: 27 })),
        sv.text("Access to the booking calendar", "center", st({ size: 15 })),
      ])],
      [sv.panel([
        sv.text("⭐", "center", st({ size: 27 })),
        sv.text("One month free of The Weekly Intuitive", "center", st({ size: 15 })),
      ])],
    ),
    /* rose, not gold — the account door (the about seed's "Create your
       account ✨" variant); gold is money only (house law) */
    sv.button("Create your membership ✨", "/welcome", "rose", "center"),
  ]),
  sv.band("sky-veil", "night", [
    sv.stacked("HOW IT", "WORKS", "h2", "center"),
    sv.text("Here's where the adventure begins!", "center", st({ color: "goldBright", kerning: 2, size: 14, font: "display", spaceAbove: 14 })),
    sv.threecol(
      [sv.panel([
        sv.text("1", "left", st({ color: "teal", size: 29, font: "display" })),
        sv.heading("Sign up — the doors open", "h3"),
        sv.text("Your free membership brings the booking calendar and one month of The Weekly Intuitive.", "left", st({ color: "muted", size: 14 })),
      ])],
      [sv.panel([
        sv.text("2", "left", st({ color: "teal", size: 29, font: "display" })),
        sv.heading("Your Discovery Call", "h3"),
        sv.text("15–20 minutes — or just book the appointment.", "left", st({ color: "muted", size: 14 })),
      ])],
      [sv.panel([
        sv.text("3", "left", st({ color: "teal", size: 29, font: "display" })),
        sv.heading("Your services", "h3"),
        sv.text("Tell me what you're looking for — and what the session can unlock within you.", "left", st({ color: "muted", size: 14 })),
      ])],
    ),
    sv.rich("🎁 $55 — as your session is booked, checkout hands you a <b>CODE taking $55 off</b> the total of your session (your Discovery Call, kept).", "center", st({ color: "goldBright", size: 15, spaceAbove: 16 })),
    /* the fallback's door wears btn-shimmer — the Button block carries no
       shimmer (documented approximation) */
    sv.button("Get Started Today", "/welcome", "rose", "center"),
  ]),
  sv.band("sky-glass", "night", [
    sv.note("── live sessions shelf stays code-side (the real booking cards, switch-gated exactly like today) ──"),
  ]),
  sv.band("sky-veil", "night", [
    sv.stacked("MONTHLY PAID", "MEMBERSHIPS", "h2", "center"),
    sv.note("── live membership cards stay code-side (names and prices read from the tiers — never fossilised) ──"),
  ]),
  sv.band("meteors", "night", [
    sv.stacked("BE IN", "THE KNOW", "h2", "center"),
    sv.rich("Sign up and receive a free recording — <b style=\"color:var(--gold-2)\">Unzip Into The New You!</b>", "center"),
    sv.text("A once-a-week note: Spontaneous Lives, monthly events, and weekly inspirations — a way to tune in and tune up, expand your wings, and live life with intention. To Connect, Feel Alive — as the New Human you Are.", "center", st({ size: 14 })),
    sv.note("── live subscribe form stays code-side ──"),
  ]),
  sv.band("plain", "theme", [
    sv.eyebrow("More Doors", "center"),
    sv.buttons([
      { label: "Memberships", href: "/packages", variant: "quiet" },
      { label: "The Store", href: "/store", variant: "quiet" },
      { label: "Free Meditation 🎁", href: "/meditation", variant: "quiet" },
    ], "center"),
    sv.note("── the Retreats 🏜️ door appears only while a retreat is live — stays code-side ──"),
  ]),
];

/* ── T-295 wave A pair 5: /news — From the Field ───────────────────────────
   src/app/news/page.tsx transcribed VERBATIM (the fallback, NOT edited — the
   words law). The StackedHero maps to the StackedHeading block (the about
   seed's convention). TWO live pieces take the sanctioned "stays code-side,
   said in the seed" path (pair 1's meditation idiom, pair 4's shelves): the
   public-letters shelf (listPublicLetters — the Letters registry read live
   every request; never fossilised) and the BeInTheKnow subscribe form. */
const nw = kit("nw");
const newsContent: Block[] = [
  nw.band("plain", "theme", [
    nw.eyebrow("From the Field", "center"),
    nw.stacked("NEWS", "& LETTERS", "h1", "center"),
    nw.text("Love's open notes — every public letter lives here after it lands in the inboxes.", "center"),
    nw.note("── live public-letters shelf stays code-side (every 🌍 PUBLIC letter from the Letters registry, linked to its reading room — the honest “no public notes yet — the first is coming ✨” rides it) ──"),
    nw.note("── live subscribe form (Be in the Know) stays code-side ──"),
  ]),
];

/* ── T-295 wave A pair 5: /media — the emojipedia replacement, but ours ────
   MediaKit (src/components/MediaKit.tsx) transcribed VERBATIM. Every WORD on
   the page is static and honestly seedable — the glyph notes, the download
   hrefs (real paths), the palette names/hexes/roles (the sign-in contract's
   palette, src/brand/cartridge.ts), the press blurbs. What a static doc
   can't hold is BEHAVIOUR, not data: the click-to-copy buttons (CopyButton,
   SwatchButton — clipboard state machines) and the two code-drawn visuals
   (the struck-ess SatMark, the palette's colour chips) stay code-side, said
   in the seed per band (the sanctioned idiom). The mgmt console chrome
   (pixel font, panel borders) maps to plain bands (pair 2/3's convention);
   the intro line's coin/cyan/neon class colours approximate to the nearest
   site vars, words untouched. */
const mi = kit("mi");
const mediaContent: Block[] = [
  mi.band("plain", "theme", [
    mi.eyebrow("Media & assets"),
    mi.heading("Copy a ₿ without leaving home", "h1"),
    mi.text("Bitcoin glyphs, the One Cocreation brand, and a press blurb — each one click to your clipboard. No trip to emojipedia required.", "left", st({ color: "muted" })),
  ]),
  mi.band("plain", "theme", [
    mi.heading("Bitcoin glyphs", "h2"),
    mi.rich("Click to copy. <b style=\"color:var(--gold-2)\">Gold is money</b> (the ₿ and the sat mark); <b style=\"color:var(--teal-bright)\">cyan is time</b> (the date markers); <b>neon is the rail</b>.", "left", st({ color: "muted", size: 14 })),
    mi.threecol(
      [mi.panel([
        mi.text("₿", "center", st({ size: 40 })),
        mi.text("MONEY", "center", st({ color: "muted", size: 11 })),
        mi.text("Bitcoin sign — Unicode U+20BF. The whole coin; 1 ₿ = 100,000,000 sats.", "center", st({ color: "muted", size: 12 })),
      ])],
      [mi.panel([
        /* the struck-ess SatMark is drawn in code (no codepoint exists) —
           the honest copyable value stands in its panel, the note below
           says the drawing stays code-side */
        mi.text("sats", "center", st({ size: 30 })),
        mi.text("MONEY · PROPOSAL", "center", st({ color: "muted", size: 11 })),
        mi.text("Satoshi — the cent of bitcoin, 100,000,000 to the ₿. No Unicode exists; paste the word.", "center", st({ color: "muted", size: 12 })),
      ])],
      [mi.panel([
        mi.text("a₿", "center", st({ size: 40 })),
        mi.text("TIME", "center", st({ color: "muted", size: 11 })),
        mi.text("After-bitcoin date marker — rides after a BFT date: 0018.04.15 a₿.", "center", st({ color: "muted", size: 12 })),
      ])],
    ),
    mi.threecol(
      [mi.panel([
        mi.text("b₿", "center", st({ size: 40 })),
        mi.text("TIME", "center", st({ color: "muted", size: 11 })),
        mi.text("Before-bitcoin marker — pre-genesis dates wear it the same way, after the date.", "center", st({ color: "muted", size: 12 })),
      ])],
      [mi.panel([
        mi.text("★", "center", st({ size: 40 })),
        mi.text("TIME", "center", st({ color: "muted", size: 11 })),
        mi.text("Star-in-a-box — every block height wears the boxed star in UI: ★ 957,661. Copy the star; the box is drawn by the component.", "center", st({ color: "muted", size: 12 })),
      ])],
      [mi.panel([
        mi.text("⚡", "center", st({ size: 40 })),
        mi.text("RAIL", "center", st({ color: "muted", size: 11 })),
        mi.text("Lightning — the rail sats ride: instant, tiny, off-chain settlement.", "center", st({ color: "muted", size: 12 })),
      ])],
    ),
    mi.note("── the click-to-copy buttons stay code-side (and the struck-ess sat mark is drawn in code — the word “sats” stands in its panel, as the note below explains) ──"),
    mi.note("On the sat mark · The struck ess is the lead among four satoshi-mark candidates — a lowercase gold s wearing ₿'s two hash-bars. It's a proposal, not yet a settled standard, so the honest copyable value is the text fallback sats — the word wallets already print."),
  ]),
  mi.band("plain", "theme", [
    mi.heading("Brand assets", "h2"),
    mi.text("The mark, the lockup, the wordmark, and the celestial palette.", "left", st({ color: "muted", size: 14 })),
    mi.threecol(
      [mi.panel([
        mi.img("/brand/onecocreation-mark.svg", "One Cocreation mark — the ring with the purple half", 160, "none", "left"),
        mi.text("The mark", "left", st({ size: 13 })),
        mi.text("The ring with the purple half — where heaven and earth meet.", "left", st({ color: "muted", size: 12 })),
        mi.buttons([
          { label: "DOWNLOAD SVG", href: "/brand/onecocreation-mark.svg", variant: "quiet" },
          { label: "DOWNLOAD EMAIL PNG", href: "/brand/onecocreation-mark-email.png", variant: "quiet" },
        ], "left"),
      ])],
      [mi.panel([
        mi.img("/brand/onecocreation-lockup-raylit.svg", "One Cocreation lockup — the raylit ring and wordmark together", 160, "none", "left"),
        mi.text("The lockup", "left", st({ size: 13 })),
        mi.text("The raylit lockup — mark and wordmark together, lit from above.", "left", st({ color: "muted", size: 12 })),
        mi.buttons([
          { label: "DOWNLOAD SVG", href: "/brand/onecocreation-lockup-raylit.svg", variant: "quiet" },
          { label: "DOWNLOAD EMAIL PNG", href: "/brand/onecocreation-lockup-email.png", variant: "quiet" },
        ], "left"),
      ])],
      [mi.panel([
        mi.text("The wordmark", "left", st({ color: "muted", size: 11 })),
        mi.text("One Cocreation", "left", st({ size: 28, font: "display" })),
      ])],
    ),
    mi.text("The palette — click a swatch to copy its hex", "left", st({ color: "muted", size: 11, spaceAbove: 14 })),
    mi.list([
      "space · #0A0A14 — surface",
      "cream · #FBF6EF — text",
      "gold · #D9B24E — money ONLY",
      "purple · #9B26D6 — info · verify",
      "lavender · #8B76C4 — live / success",
      "rose · #C56E8B — danger — gentle",
      "magenta · #C42EC9 — flair 💜",
      "copper · #C77B4A — warmth",
    ], "none"),
    mi.note("── the palette's colour chips and its click-to-copy stay code-side (as does the wordmark's COPY WORDMARK button) ──"),
    mi.note("Usage · Gold is money, and only money. The brand runs on the night sky — keep the mark on dark, at its natural aspect, never squeezed."),
  ]),
  mi.band("plain", "theme", [
    mi.heading("For press", "h2"),
    mi.text("Writing about us? Copy and paste — it's warm and it's true.", "left", st({ color: "muted", size: 14 })),
    mi.panel([
      mi.text("One-liner", "left", st({ color: "muted", size: 11 })),
      mi.quote("One Cocreation is the way of the heart — sessions, meditations, and a community where heaven and earth meet, with a free, sovereign name@onecocreation tag: your name, your keys, verified on nostr and tied to Bitcoin.", "left"),
    ]),
    mi.panel([
      mi.text("Short paragraph", "left", st({ color: "muted", size: 11 })),
      mi.quote("One Cocreation is where heaven and earth meet — a home for sessions, meditations, and the community room, walked the way of the heart. Claim a free name@onecocreation tag and it's yours forever: a name bound to keys only you hold, verifiable on nostr and anchored to Bitcoin — no rent, no resets, nobody to ask. Everything gets tied to the block.", "left"),
    ]),
    mi.note("── the COPY ONE-LINER / COPY PARAGRAPH buttons stay code-side ──"),
  ]),
];

/* ── T-296 wave B, letters-cart pair: /letters — the reading room ─────────
   src/app/letters/page.tsx transcribed VERBATIM (the words law) — the hero
   only; the page carries no blurb today. The room itself is NOT
   transcribed: the LettersRoom block carries only its id, and the page
   injects the live public shelf at render time (applyLettersToPuck — the
   shelf is data, never copy; never seed a letter's words). The literal
   block carries an explicit unique id (the rt-list / pk-grid idiom, T-231). */
const lt = kit("lt");
const lettersContent: Block[] = [
  lt.band("plain", "theme", [
    lt.eyebrow("From Love, To You", "center"),
    lt.stacked("YOUR", "LETTERS", "h1", "center"),
  ]),
  /* the block sits at the ROOT, where the room sits today — the injector
     (applyLettersToPuck) is top-level only, the PackagesGrid law: an entry
     nested into a slot keeps the designer placeholder */
  { type: "LettersRoom", props: { id: "lt-room" } },
];

/* ── T-296 wave B, letters-cart pair: /cart — the basket ──────────────────
   src/app/cart/page.tsx transcribed VERBATIM — the hero and the one blurb.
   The basket is NOT transcribed: the CartPanel block carries only its id,
   and the page injects the server-judged rails at render time
   (applyCartRailsToPuck — TASK-186's warm-before-you-judge order preserved
   on the page, verbatim). */
const ca = kit("ca");
const cartContent: Block[] = [
  ca.band("plain", "theme", [
    ca.eyebrow("The Store", "center"),
    ca.stacked("YOUR", "BASKET 🧺", "h1", "center"),
    ca.text("one checkout — everything settles together, by lightning or by card.", "center", st({ color: "muted", size: 14 })),
  ]),
  /* the block sits at the ROOT, where the basket sits today — the injector
     (applyCartRailsToPuck) is top-level only, the PackagesGrid law */
  { type: "CartPanel", props: { id: "ca-panel" } },
];

/* ── T-296 wave B, me-login pair: /me — the member's own room ─────────────
   src/app/me/page.tsx transcribed VERBATIM (the words law). The hero maps
   to the Band vocabulary (sky-veil holding the night — the fallback's
   keep-dark); CosmicSky's star field has no block twin (the declared
   difference, pair 4's contact idiom — said in the SUMMARY, not invented).
   The widget is NOT transcribed: the MeSwitch { id }-only block renders
   the real session-aware room on the published page and the designer
   canvas — nothing frozen (H116 A). The widget band holds the theme like
   the fallback's bare sky-night (no keep-dark there). The literal block
   carries an explicit unique id (the rt-list / pk-grid idiom, T-231). */
const me = kit("me");
const meContent: Block[] = [
  me.band("sky-veil", "night", [
    me.eyebrow("Members", "center"),
    me.stacked("YOUR", "FIELD", "h1", "center"),
    me.text(cartridge.constellation, "center", st({ kerning: 6, size: 20, spaceAbove: 6 })),
    me.text("Your name, your sessions, your profile card — this room is yours.", "center", st({ color: "body", size: 15 })),
  ]),
  me.band("sky-glass", "theme", [
    { type: "MeSwitch", props: { id: "me-switch" } },
  ]),
];

/* ── T-296 wave B, me-login pair: /login — the front door ─────────────────
   src/app/login/page.tsx transcribed VERBATIM. The hero maps like /me's
   (sky-veil holding the night; the login-galaxy veil and CosmicSky's star
   field are beyond the Band — the declared difference). DoorSheet is NOT
   transcribed: the LoginDoor { id }-only block renders SignInCard (RULED
   K83 — /login's Puck-published path is the one place SignInCard lives),
   page mount — the deep links (?next=) ride the component itself, so a
   published /login serves the identical door. */
const lg = kit("lg");
const loginContent: Block[] = [
  lg.band("sky-veil", "night", [
    lg.eyebrow("Members", "center"),
    lg.stacked("WELCOME", "HOME", "h1", "center"),
    lg.text(cartridge.constellation, "center", st({ kerning: 6, size: 20, spaceAbove: 6 })),
  ]),
  lg.band("sky-glass", "theme", [
    { type: "LoginDoor", props: { id: "lg-door" } },
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
  packages: { content: packagesContent, root: { props: {
    title: "Memberships — One Cocreation",
    description: "Three ways into the field — each includes everything before it. Pay monthly in dollars or in bitcoin.",
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
  retreats: { content: retreatsContent, root: { props: {
    title: "Retreats — One Cocreation",
    description: "A journey, not an appointment — blocks of days with Love, sold by the seat, paid in bitcoin.",
  } } },
  /* T-295 pair 1: /meditation's seed — title/description mirror the
     hand-built page's metadata verbatim */
  meditation: { content: meditationContent, root: { props: {
    title: "Free Meditation — One Cocreation",
    description: "A free guided meditation from Love — on the house, from our 💞 to yours.",
  } } },
  /* TASK-295: the two legal pages mirror their hand-built metadata exactly —
     title only (the pages carry no description today; none is invented) */
  privacy: { content: privacyContent, root: { props: {
    title: "Privacy Policy — One Cocreation",
  } } },
  terms: { content: termsContent, root: { props: {
    title: "Terms & Conditions — One Cocreation",
  } } },
  /* T-295 pair 3: /jewelry carries NO metadata export today — root: {}
     mirrors that honestly (pair 2's law: nothing invented). /artist mirrors
     its hand-built metadata verbatim */
  jewelry: { content: jewelryContent, root: {} },
  artist: { content: artistContent, root: { props: {
    title: "Artist Registry — One Cocreation",
    description: "Request your name on the Spaces protocol, watch the auction board, keep your names in sight — the artist door of One Cocreation.",
  } } },
  /* T-295 pair 4: /contact mirrors its hand-built metadata verbatim;
     /services carries NO metadata export today → the tolerated bare root
     (nothing to mirror, nothing invented — /p falls back to cartridge.meta) */
  contact: { content: contactContent, root: { props: {
    title: "Contact — One Cocreation",
    description: "E.T. Phone Home — I'll BE right here. Write to Love, catch the 11:11 lives, book a discovery call.",
  } } },
  services: { content: servicesContent, root: {} },
  /* T-295 pair 5: /news + /media mirror their hand-built metadata verbatim */
  news: { content: newsContent, root: { props: {
    title: "News & Letters — One Cocreation",
    description: "Love's public notes to the field.",
  } } },
  media: { content: mediaContent, root: { props: {
    title: "Media & assets — One Cocreation",
    description: "Copy bitcoin glyphs (₿, sats, a₿, ★, ⚡) and One Cocreation brand assets — the mark, wordmark, palette, and a press blurb. No trip to emojipedia required.",
  } } },
  /* T-295 pair 6: /bday and /time mirror their hand-built metadata
     verbatim. T-296 pair bb-time: /time's flag-and-stop LANDED (the
     BftClock block holds the live read), and /bb joins with its own
     verbatim metadata. */
  bday: { content: bdayContent, root: { props: {
    title: "Bitcoin Birthday — One Cocreation",
    description: "The Bitcoin Birthday checker has moved with the time kit — it returns with this door's new face.",
  } } },
  time: { content: timeContent, root: { props: {
    title: "The Clock — Bitcoin Federated Time — One Cocreation",
    description: "Bitcoin Federated Time, plainly: the canonical date and the live block height — read from the chain, never estimated.",
  } } },
  /* T-296 wave B, letters-cart pair: /letters mirrors its metadata
     verbatim; /cart carries NO description today — title only, none
     invented (pair 2's law) */
  letters: { content: lettersContent, root: { props: {
    title: "Your Letters — One Cocreation",
    description: "The letters Love has sent you, in one reading room.",
  } } },
  cart: { content: cartContent, root: { props: {
    title: "Your basket — One Cocreation",
  } } },
  /* T-296 wave B, me-login pair: /me + /login mirror their hand-built
     metadata verbatim */
  me: { content: meContent, root: { props: {
    title: "My field — One Cocreation",
    description: "Your name, your sessions, your profile card — a member's own room under the house sky.",
  } } },
  login: { content: loginContent, root: { props: {
    title: "Sign in — One Cocreation",
    description: "Sign in with your email or your key — no passwords, nothing stored. New here? The door turns to meet you.",
  } } },
  bb: { content: bbContent, root: { props: {
    title: "Bitcoin Buddy — One Cocreation",
    description: "Meet your Bitcoin Buddy — a co-owned virtual pet born at a block and cared for with your key. Sign in with nostr to start.",
  } } },
  /* T-296 pair live: /live mirrors its hand-built metadata exactly — title
     only (the page carries no description today; none is invented) */
  live: { content: liveContent, root: { props: {
    title: "Live — One Cocreation",
  } } },
  /* STUDIO P2: the popup lane. THE ONE REAL POPUP — the rebuild of the
     original platform's only popup ("Free Guide"), retargeted to the Free
     Meditation door (/meditation). The copy is Love's own, quoted from the
     /meditation section (src/components/sections.tsx FreeMeditation):
     "A Free Meditation, With Love" / "Unzip Into the New You" /
     "on the house, from our 💞 to yours" (Love's words, 0018.06.25). The Image restores the original popup's
     light-body graphic (gate punch-list 0018.05.25 a₿ — the text-only
     rebuild read thinner than Love's original; same asset the home-old
     seed references). The Button wears rose, not gold — gold is
     MONEY ONLY (house law, cartridge.ts). Seed protection applies: the
     panels and the API treat popup:* keys here as protected. */
  "popup:free-guide": { content: [
    blk("Eyebrow", { text: "On the house", align: "center", style: st() }),
    blk("Heading", { text: "A Free Meditation, With Love", level: "h2", align: "center", style: st() }),
    blk("Image", {
      src: `${RAW}/popup-free-guide/unzip-9141826.png`,
      alt: "Unzip Into The New You — the free meditation's light-body graphic",
      width: 320, radius: "soft", align: "center",
    }),
    blk("Text", {
      text: "Receive \u201cUnzip Into the New You\u201d — a free guided meditation, plus a weekly note of inspiration. On the house, from our 💞 to yours.",
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
