import type { Cartridge } from "../cartridge";

/**
 * MONO (TASK-22/S24 lane 2 — the terminal cartridge, 0018.06.01 a₿) — the
 * fifth cartridge, ruled by the Admiral as a theme option in the brand
 * starter pack: the one for brands that want the terminal feel. This
 * closes S18's open ruling #1 ("MONO has no brand home") — the studio's
 * mono voice (ui-monospace, Menlo, Consolas, monospace, scattered through
 * the studio chrome) finally has a cartridge to live in.
 *
 * The TYPE is the identity: monospace in every role — display, body,
 * labels. The twin in src/app/cartridges.css pours the house's own mono
 * stack literal over every font token (the same literal the studio chrome
 * inlines today; S24 lane 1's --font-mono token is the studio-side twin
 * of this law, landing in parallel — this file does not depend on it).
 *
 * DARK-FIRST, BOTH LIGHTS HONEST FROM BIRTH (the S20/S21 laws, applied to
 * a new cartridge at creation rather than retrofitted): the bare
 * attribute is the night terminal — graphite grounds, soft phosphor ink,
 * one signal green — and the dawn is derived the house way: surfaces keep
 * their offsets, inks re-derive deep on sage paper, state hues hold their
 * meaning, keep-dark rooms hold the cartridge's own night. Every body-ink
 * pair measured ≥ 4.5:1 by WCAG luminance in BOTH themes (the table rides
 * the lane report; the tightest pair is dawn muted at 5.25).
 *
 * A TEMPLATE, like blank, not a community: no invented marks. Every art
 * path is a labeled ASSET SLOT under /brand/mono/ and /images/mono/,
 * voices is an honest empty, the time door sails empty until the
 * community stands up a clock. Gold stays money (fleet semantic lock) —
 * the cartridge's one hue is a phosphor green, far from gold.
 */
export const mono: Cartridge = {
  name: "Mono Cartridge",

  /** no signature yet — an honest empty, not a borrowed glyph set */
  constellation: "",

  logo: {
    lockup: "/brand/mono/lockup.svg", // ASSET SLOT — the community's lockup, not yet drawn
    mark: "/brand/mono/mark.svg", // ASSET SLOT — the community's mark, not yet drawn
    consciouscuts: "/brand/mono/service-mark.png", // ASSET SLOT — service mark not yet drawn
  },

  hero: {
    moon: "/images/mono/hero-moon.webp", // ASSET SLOT — hero sky art missing
    nebula: "/images/mono/hero-nebula.webp", // ASSET SLOT — hero sky art missing
    meteors: "/images/mono/hero-meteors.webp", // ASSET SLOT — hero sky art missing
    heavenEarth: "/images/mono/heaven-earth.webp", // ASSET SLOT — hero photograph missing
    loveSidelook: "/images/mono/host-sidelook.webp", // ASSET SLOT — host portrait missing
    lionsGate: "/images/mono/gate.webp", // ASSET SLOT — memberships band art missing
  },

  portraits: {
    headshot: "/images/mono/host-headshot.webp", // ASSET SLOT — host headshot missing
    /** the service photography, matched by service id — slots, not yet shot */
    cuts: {
      women: "/images/mono/service-women.jpg", // ASSET SLOT
      wax: "/images/mono/service-wax.jpg", // ASSET SLOT
      men: "/images/mono/service-men.jpg", // ASSET SLOT
    },
  },

  /** membership art — A/B/C ride the tier system, not the file names */
  tierArt: {
    A: "/images/mono/tier-a.webp", // ASSET SLOT — tier art missing
    B: "/images/mono/tier-b.webp", // ASSET SLOT
    C: "/images/mono/tier-c.webp", // ASSET SLOT
  },

  /** the thank-you — placeholder words that say so; the loop is a slot
   *  until the community records its own (drop it in public/video) */
  thanks: {
    video: "/video/mono-thanks.mp4", // ASSET SLOT — not yet recorded
    poster: "/video/mono-thanks.jpg", // ASSET SLOT — not yet shot
    heading: "Thank You",
    message: "Placeholder gratitude — the community writes its own thank-you here.",
  },

  /** VOICES — an honest EMPTY field: testimonials are real words of real
   *  people or they are nothing. A template has no voices yet. Never
   *  fabricate, never borrow. */
  voices: [],

  /** no time server yet — the documented honest empty: sail on the local
   *  seam until the community stands up its own clock */
  doors: {
    timeTipUrl: "",
  },

  /** "gold" tells CartridgeVars to pour nothing — the nav ink is re-poured
   *  by the twin itself (--nav-gold is the nav-link ink SLOT; gold itself
   *  keeps its money meaning untouched) */
  nav: {
    accent: "gold" as "gold" | "dawn",
  },

  meta: {
    title: "Mono Cartridge — The Terminal Option",
    description:
      "A monospace brand cartridge: the starter-pack option for communities that want the terminal feel. Dark-first, with an honest dawn.",
    themeColor: "#0B0D0E", // the night terminal ground — a literal, meta theme-color can't resolve var()
  },

  /** the sign-in contract's palette — graphite, phosphor ink, one signal
   *  green. Gold stays money (fleet semantic lock); the hue slots the
   *  terminal has no use for wear grays and say so */
  palette: {
    space: "#0B0D0E", // the night terminal ground
    panel: "rgba(20,24,26,.78)",
    edge: "rgba(146,160,150,.26)",
    cream: "#F2F6F3", // phosphor white
    blush: "#D9E2DC", // phosphor, dimmed
    ink: "#DEE4E1",
    muted: "#97A29B",
    gold: "#D9B24E", // MONEY ONLY (sats / bitcoin) — fleet semantic lock
    goldDeep: "#B4862B",
    purple: "#6E7A72", // a gray-green wearing the slot — the terminal has no purple
    magenta: "#7A857D", // a gray-green wearing the slot
    lavender: "#93D2A1", // the signal green — links
    rose: "#8FCE9D", // the signal green — kickers
    copper: "#8FC0CC", // a technical cyan wearing the slot — interactive accent
  },

  fonts: {
    // the identity: the house's own mono stack in BOTH roles — display and
    // body speak one voice (the literal the studio chrome inlines today)
    display: "ui-monospace,Menlo,Consolas,monospace",
    body: "ui-monospace,Menlo,Consolas,monospace",
  },

  copy: {
    productName: "Mono Cartridge",
    tagline: "The terminal, as a brand",
    memberNoun: "operator",
  },

  /** the sign-in door — terminal-voiced placeholder words; the door accent
   *  is one of the house's four door inks (LoginPanel's ACCENT_INK map is
   *  the real constraint), cyan chosen as the most technical of the four */
  signIn: {
    copy: {
      returningTitle: "Welcome back, operator",
      returningBlurb:
        "One tap to sign, and you're in. No passwords, nothing stored, nothing to leak — your name stays yours.",
      signInCta: "Sign in 🔑",
      signingCta: "Reading your signature…",
      doorsHeading: "New here?",
      doorsFootnote:
        "Placeholder footnote — the community writes its own welcome here.",
    },
    doors: [
      {
        tag: "@yourcommunity",
        role: "join the community",
        blurb:
          "Placeholder door — the community describes what opens when a name is claimed.",
        href: "/welcome",
        cta: "Enter →",
        accent: "cyan",
      },
    ],
  },
};
