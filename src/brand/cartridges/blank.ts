import type { Cartridge } from "../cartridge";

/**
 * BLANK (TASK-09/S11 lane 3 — the kit leaves home) — the fourth cartridge,
 * and the proof that a stranger can add one. Not a brand: a TEMPLATE for
 * the next community, deliberately plain. No invented identity, no borrowed
 * art, no stock — every piece this cartridge does not have is a labeled
 * ASSET SLOT or an honest empty, never a fake.
 *
 * What plain means here, field by field:
 *
 *  - the NAME and COPY are placeholder words that say so;
 *  - the CONSTELLATION is an honest empty string — the four-glyph
 *    signature is Love's own, and the next community finds its own;
 *  - every ART path points into /brand/blank/ and /images/blank/, where
 *    nothing exists yet — the slots are labeled, the 404s are the truth;
 *  - VOICES is an empty shelf: testimonials are real words of real people
 *    or they are nothing (the pacman precedent);
 *  - the TIME DOOR is "" — the cartridge's own documented way to sail on
 *    its own seam until the community stands up a clock;
 *  - the PALETTE is neutral paper-and-ink; gold stays money (fleet
 *    semantic lock), the other color slots wear grays and say so;
 *  - the FONTS are the system stack — no registration, no download, the
 *    plainest thing that renders;
 *  - the rendered pour lives in the blank twin in src/app/cartridges.css,
 *    scoped html[data-oc-cartridge="blank"] — inert until selected.
 *
 * How this file came to be — every step, every surprise, every place that
 * did NOT pick the cartridge up on its own — is written down in
 * docs/adding-a-cartridge.md. Read that before copying this file.
 */
export const blank: Cartridge = {
  name: "Blank Cartridge",

  /** no signature yet — an honest empty, not a borrowed glyph set */
  constellation: "",

  logo: {
    lockup: "/brand/blank/lockup.svg", // ASSET SLOT — the next community's lockup, not yet drawn
    mark: "/brand/blank/mark.svg", // ASSET SLOT — the next community's mark, not yet drawn
    consciouscuts: "/brand/blank/service-mark.png", // ASSET SLOT — service mark not yet drawn
  },

  hero: {
    moon: "/images/blank/hero-moon.webp", // ASSET SLOT — hero sky art missing
    nebula: "/images/blank/hero-nebula.webp", // ASSET SLOT — hero sky art missing
    meteors: "/images/blank/hero-meteors.webp", // ASSET SLOT — hero sky art missing
    heavenEarth: "/images/blank/heaven-earth.webp", // ASSET SLOT — hero photograph missing
    loveSidelook: "/images/blank/host-sidelook.webp", // ASSET SLOT — host portrait missing
    lionsGate: "/images/blank/gate.webp", // ASSET SLOT — memberships band art missing
  },

  portraits: {
    headshot: "/images/blank/host-headshot.webp", // ASSET SLOT — host headshot missing
    /** the service photography, matched by service id — slots, not yet shot */
    cuts: {
      women: "/images/blank/service-women.jpg", // ASSET SLOT
      wax: "/images/blank/service-wax.jpg", // ASSET SLOT
      men: "/images/blank/service-men.jpg", // ASSET SLOT
    },
  },

  /** membership art — A/B/C ride the tier system, not the file names */
  tierArt: {
    A: "/images/blank/tier-a.webp", // ASSET SLOT — tier art missing
    B: "/images/blank/tier-b.webp", // ASSET SLOT
    C: "/images/blank/tier-c.webp", // ASSET SLOT
  },

  /** the thank-you — placeholder words that say so; the loop is a slot
   *  until the community records its own (drop it in public/video) */
  thanks: {
    video: "/video/blank-thanks.mp4", // ASSET SLOT — not yet recorded
    poster: "/video/blank-thanks.jpg", // ASSET SLOT — not yet shot
    heading: "Thank You",
    message: "Placeholder gratitude — the next community writes its own thank-you here.",
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

  /** "gold" tells CartridgeVars to pour nothing — a blank template offers
   *  no nav retint; the nav wears neutral ink from the twin */
  nav: {
    accent: "gold" as "gold" | "dawn",
  },

  meta: {
    title: "Blank Cartridge — A Plain Starting Point",
    description:
      "A plain cartridge template: the starting point for the next community's site. Replace every slot with its own words and art.",
    themeColor: "#F5F4F0", // the neutral paper — a literal, meta theme-color can't resolve var()
  },

  /** the sign-in contract's palette, neutral — paper, ink, gray. Gold
   *  stays money (fleet semantic lock); the other color slots wear grays
   *  and say so, because a template has no hues of its own */
  palette: {
    space: "#F5F4F0", // the ground is plain paper
    panel: "rgba(255,255,255,.82)",
    edge: "rgba(60,60,60,.18)",
    cream: "#FBFAF7",
    blush: "#EEEDE8", // paper-deep
    ink: "#2A2A2A",
    muted: "#777770",
    gold: "#D9B24E", // MONEY ONLY (sats / bitcoin) — fleet semantic lock
    goldDeep: "#B4862B",
    purple: "#555550", // a gray wearing the slot — the template has no purple
    magenta: "#6A6A62", // a gray wearing the slot
    lavender: "#E4E3DD", // a pale gray wearing the slot — fills, chips
    rose: "#8A8A82", // a gray wearing the slot — kickers
    copper: "#555550", // a gray wearing the slot — interactive accent
  },

  fonts: {
    // the system stack, both roles — no registration, no download
    display: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    body: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  },

  copy: {
    productName: "Blank Cartridge",
    tagline: "A plain starting point",
    memberNoun: "member",
  },

  /** the sign-in door — placeholder words, plainly spoken; the door accent
   *  is one of the house's four door inks (LoginPanel's ACCENT_INK map is
   *  the real constraint), cyan chosen as the most neutral of the four */
  signIn: {
    copy: {
      returningTitle: "Welcome back",
      returningBlurb:
        "One tap to sign, and you're in. No passwords, nothing stored, nothing to leak — your name stays yours.",
      signInCta: "Sign in 🔑",
      signingCta: "One moment — reading your signature…",
      doorsHeading: "New here?",
      doorsFootnote:
        "Placeholder footnote — the next community writes its own welcome here.",
    },
    doors: [
      {
        tag: "@yourcommunity",
        role: "join the community",
        blurb:
          "Placeholder door — the next community describes what opens when a name is claimed.",
        href: "/welcome",
        cta: "Walk the welcome path →",
        accent: "cyan",
      },
    ],
  },
};
