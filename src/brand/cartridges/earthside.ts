import type { Cartridge } from "../cartridge";

/**
 * EARTHSIDE (S9 — the cartridges become real, 0018.05.28 a₿) — the third
 * cartridge, K3's authored direction, Pac's verdict 0018.05.25 a₿: "we
 * keep the 3rd view for love to look through." The Earth half of the
 * brand's own axis — Heaven (LOVE), Screen (PACMAN), Earth (EARTHSIDE):
 * warm paper, umber ink, copper wire, red-rock light, the hand in the
 * work.
 *
 * "The site is the same, we are just putting it different templates"
 * (Pac) — so the IDENTITY stays onecocreation's own: the name, the copy,
 * the voices, the thank-you, the real photography of Love and her work
 * all carry over, because EARTHSIDE is onecocreation looking through a
 * warmer window, not another community. What changes is the LIGHT: the
 * rendered pour lives in the earthside twin in src/app/cartridges.css
 * (daylight-first paper; the night twin dims to warm charcoal, copper
 * holds), reusing the cartridge's own long-idle --copper/#C77B4A and
 * sand #EAD9CB rather than inventing a palette.
 *
 * The two site-wide rulings are held here and noted, not re-litigated:
 * SERIF IS STRUCK (Pac: "the serif is a no on all one cocreation items")
 * — the display layer keeps Barlow, the body keeps the humanist stack,
 * nothing reaches for a serif; and haircuts/waxing sort LAST in display
 * orders (already encoded in src/lib/booking.ts — matched, not
 * contradicted).
 *
 * What is genuinely missing is the earth-toned brand ART (a copper-on-
 * paper lockup/mark, red-rock hero photography) — those slots are
 * labeled ASSET SLOT placeholders, never fabricated.
 */
export const earthside: Cartridge = {
  name: "One Cocreation",

  /** the same field, seen from the earth side — the signature holds */
  constellation: "🌈 🦋 🪽 💫",

  logo: {
    lockup: "/brand/earthside/lockup.svg", // ASSET SLOT — copper-on-paper lockup not yet drawn
    mark: "/brand/earthside/mark.svg", // ASSET SLOT — copper-on-paper mark not yet drawn
    consciouscuts: "/brand/consciouscuts-logo.png", // the real service mark — the same brand's service
  },

  hero: {
    moon: "/images/earthside/red-rock-moon.webp", // ASSET SLOT — red-rock sky photograph missing
    nebula: "/images/earthside/red-rock-band.webp", // ASSET SLOT — red-rock band photograph missing
    meteors: "/images/earthside/red-rock-meteors.webp", // ASSET SLOT — desert-night photograph missing
    heavenEarth: "/images/heaven-earth.webp", // REAL — Love's red-rock, arms-raised photograph: the earthside thesis, already shot
    loveSidelook: "/images/love-sidelook.webp", // REAL — the same face, the same site
    lionsGate: "/images/lions-gate.webp", // REAL — her own art trove; an earth-toned memberships band is a wanted asset
  },

  portraits: {
    headshot: "/images/love-headshot.webp", // REAL — the same person
    /** the ConsciousCuts service photography, matched by service id */
    cuts: {
      women: "/images/cut-1.jpg",
      wax: "/images/cut-2.jpg",
      men: "/images/cut-3.jpg",
    },
  },

  /** membership art — A/B/C ride the tier system, not the file names */
  tierArt: {
    A: "/images/weekly-intuitive.webp",
    B: "/images/observer.webp",
    C: "/images/evening-star.webp",
  },

  /** the thank-you is the same moment — the same community, the same
   *  living portrait */
  thanks: {
    video: "/video/love-thanks.mp4",
    poster: "/video/love-thanks.jpg",
    heading: "Thank You — With Love",
    message: "Your exchange tends the Heartfield — felt, and thanked. 🌈 🦋 🪽 💫",
  },

  /** the same voices — real public comments from Love's channel. A view
   *  of the field does not get a different field. */
  voices: [
    { quote: "What a profoundly beautiful soul. Subscribed from Sydney Australia. ❤", name: "From Sydney", who: "@DEFEATELITES", href: "https://www.youtube.com/watch?v=Gt24u_BAybA" },
    { quote: "Way down the bottom of the world, we thank you ❤ New Zealand 😊", name: "David", who: "@DavidTuara", href: "https://www.youtube.com/watch?v=Gt24u_BAybA" },
    { quote: "I really can't say how much I appreciate you", name: "James", who: "@James-mg4zy", href: "https://www.youtube.com/watch?v=OwUPYSwh0Wo" },
    { quote: "Thank you it is beautiful", name: "Elan", who: "@Elan-Immortal", href: "https://www.youtube.com/watch?v=vwB3B0VGXoU" },
    { quote: "Well done ❤", name: "Kristi", who: "@kristiseccombe1096", href: "https://www.youtube.com/watch?v=L4g2KfCSobs" },
    { quote: "Good to hear you 😊", name: "Shawnah", who: "@possiblyeverything-shawnah1406", href: "https://www.youtube.com/watch?v=Gt24u_BAybA" },
  ],

  /** the house clock's time door, unchanged — the view doesn't move the
   *  server */
  doors: {
    timeTipUrl: "https://time.pacsarcade.org/api/chain/tip?full=1",
  },

  /** "gold" tells CartridgeVars to pour nothing — EARTHSIDE's nav is
   *  re-inked copper by its own twin (gold stays money; the field only
   *  drives the gold/dawn pour, it is not the nav's whole truth) */
  nav: {
    accent: "gold" as "gold" | "dawn",
  },

  meta: {
    title: "One Cocreation — Where Heaven and Earth Meet",
    description:
      "Intuitive sessions, meditations and community with Love. Pay in dollars or bitcoin — sats land in One Cocreation's own node, never held by anyone else.",
    themeColor: "#F6EFE3", // the paper day — daylight-first
  },

  /** the sign-in contract's palette, earth-toned — the proposal's palette
   *  table is the truth; gold stays money (fleet semantic lock), copper
   *  is THE accent, and --copper/#C77B4A + sand #EAD9CB are the
   *  cartridge's own long-idle values, reused not invented */
  palette: {
    space: "#F6EFE3", // the ground is warm paper — daylight-first
    panel: "rgba(255,252,246,.82)",
    edge: "rgba(199,123,74,.4)", // the copper hairline
    cream: "#FBF6EF",
    blush: "#EFE5D2", // paper-deep
    ink: "#2B2016", // umber ink
    muted: "#8A7560",
    gold: "#D9B24E", // MONEY ONLY (sats / bitcoin) — fleet semantic lock
    goldDeep: "#B4862B",
    purple: "#5C4A38", // umber, soft — the earth family wearing the slot
    magenta: "#9C4F2E", // clay — hover/active depth
    lavender: "#EAD9CB", // sand — fills, chips
    rose: "#C56E8B", // kickers keep their rose — semantic lock
    copper: "#C77B4A", // THE accent — interactive, rules, links
  },

  fonts: {
    // SERIF STRUCK site-wide (Pac, 0018.05.25 a₿): Barlow display, the
    // humanist system stack for body — the same type law as LOVE's
    display: "var(--font-barlow,'Barlow'),'Barlow',-apple-system,sans-serif",
    body: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  },

  copy: {
    productName: "One Cocreation",
    tagline: "The Way of the Heart",
    memberNoun: "soul",
  },

  /** the sign-in door — the same words, the same community door; the
   *  template changes the light, not the welcome */
  signIn: {
    copy: {
      returningTitle: "Good to see you again",
      returningBlurb:
        "One tap to sign, and you're in. No passwords, nothing stored, nothing to leak — your name stays yours.",
      signInCta: "Open the door 🔑",
      signingCta: "One breath — reading your signature…",
      doorsHeading: "New here?",
      doorsFootnote:
        "Your name@onecocreation is yours — sovereign. Where Heaven and Earth meet.",
    },
    doors: [
      {
        tag: "@onecocreation",
        role: "join the field",
        blurb:
          "Claim your name and the doors open — the booking calendar, the free meditation, Heartfield Commons.",
        href: "/welcome",
        cta: "Walk the welcome path →",
        accent: "pink",
      },
    ],
  },
};
