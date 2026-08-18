/**
 * THE BRAND CARTRIDGE (walk steps 7–8, Admiral's walk, 0018.05.15).
 *
 * One object carries the brand's non-CSS identity: the name, the emoji
 * constellation, every logo and hero-image path, the tier art, and the
 * metadata. A new artist edits THIS file (and cartridge.css beside it in
 * src/app) — never hunts literals through components.
 *
 * The RENDERED palette lives in src/app/cartridge.css (:root, dark-first).
 * The `palette` here is the sign-in contract's set (BrandProvider, MediaKit,
 * the login ceremony) — paper-era values, kept as they were so the contract
 * surfaces don't shift; the two sets serve different rooms on purpose.
 */

export const cartridge = {
  name: "One Cocreation",

  /** the four-glyph signature that rides under every stacked hero */
  constellation: "🌈 🦋 🪽 💫",

  logo: {
    lockup: "/brand/onecocreation-lockup-raylit.svg",
    mark: "/brand/onecocreation-mark.svg",
    consciouscuts: "/brand/consciouscuts-logo.png",
  },

  hero: {
    moon: "/images/consciouscuts/moon.webp",
    nebula: "/images/consciouscuts/nebula.webp",
    meteors: "/images/consciouscuts/meteors.webp",
    heavenEarth: "/images/heaven-earth.webp",
    loveSidelook: "/images/love-sidelook.webp",
    lionsGate: "/images/lions-gate.webp",
  },

  portraits: {
    headshot: "/images/love-headshot.webp",
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

  /**
   * THE THANK-YOU (Admiral, 0018.05.15) — the moment after a paid order.
   * The loop is a living portrait snipped from Love's own channel trailer
   * (the quiet greeting smile — the Admiral's pick, 0018.05.15;
   * /video/love-thanks-laugh.mp4 holds the beaming-laugh alternate). When
   * Love records a real thank-you message, drop the file in public/video
   * and point `video` at it.
   */
  thanks: {
    video: "/video/love-thanks.mp4",
    poster: "/video/love-thanks.jpg",
    heading: "Thank You — With Love",
    message: "Your exchange tends the Heartfield — felt, and thanked. 🌈 🦋 🪽 💫",
  },

  /**
   * VOICES OF THE FIELD (Admiral, 0018.05.15) — real public comments from
   * Love's YouTube channel, quoted verbatim (light trims marked …), each
   * linked to the video it lives under. Curate freely; keep them honest.
   */
  voices: [
    { quote: "What a profoundly beautiful soul. Subscribed from Sydney Australia. ❤", name: "From Sydney", who: "@DEFEATELITES", href: "https://www.youtube.com/watch?v=Gt24u_BAybA" },
    { quote: "Way down the bottom of the world, we thank you ❤ New Zealand 😊", name: "David", who: "@DavidTuara", href: "https://www.youtube.com/watch?v=Gt24u_BAybA" },
    { quote: "I really can't say how much I appreciate you", name: "James", who: "@James-mg4zy", href: "https://www.youtube.com/watch?v=OwUPYSwh0Wo" },
    { quote: "Thank you it is beautiful", name: "Elan", who: "@Elan-Immortal", href: "https://www.youtube.com/watch?v=vwB3B0VGXoU" },
    { quote: "Well done ❤", name: "Kristi", who: "@kristiseccombe1096", href: "https://www.youtube.com/watch?v=L4g2KfCSobs" },
    { quote: "Good to hear you 😊", name: "Shawnah", who: "@possiblyeverything-shawnah1406", href: "https://www.youtube.com/watch?v=Gt24u_BAybA" },
  ],

  /** THE ARCADE'S TIME DOOR (A9, 0018.05.24 a₿): the orrery's second ladder
   *  rung — the house clock's own time server, CORS open. A cartridge value,
   *  not code: another brand points this at ITS time server, or empties it
   *  ("") to sail on its own seam + the honest ~ model alone. */
  doors: {
    timeTipUrl: "https://time.pacsarcade.org/api/chain/tip?full=1",
  },

  meta: {
    title: "One Cocreation — Where Heaven and Earth Meet",
    description:
      "Intuitive sessions, meditations and community with Love. Pay in dollars or bitcoin — sats land in One Cocreation's own node, never held by anyone else.",
    themeColor: "#0a0a14",
  },

  /** the sign-in contract's palette (see the header note — NOT the site's
   *  rendered :root; that truth is cartridge.css) */
  palette: {
    space: "#0a0a14",
    panel: "rgba(22,18,40,.66)",
    edge: "rgba(168,130,240,.22)",
    cream: "#FBF6EF",
    blush: "#F3DCE3",
    ink: "#4A4458",
    muted: "#897F97",
    gold: "#D9B24E", // MONEY ONLY (sats / bitcoin) — house law
    goldDeep: "#B4862B",
    purple: "#9B26D6",
    magenta: "#C42EC9",
    lavender: "#8B76C4",
    rose: "#C56E8B",
    copper: "#C77B4A", // the wire-wrapped jewelry
  },

  fonts: {
    // Love's law: no serifs (FONT TRIO, 0018.05.17) — display now speaks Barlow
    display: "var(--font-barlow,'Barlow'),'Barlow',-apple-system,sans-serif",
    body: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  },

  copy: {
    productName: "One Cocreation",
    tagline: "The Way of the Heart",
    memberNoun: "soul",
  },
} as const;

export type Cartridge = typeof cartridge;
