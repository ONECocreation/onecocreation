import type { Cartridge } from "../cartridge";

/**
 * NUMBER ONE × PACMAN (S9 — the cartridges become real, 0018.05.28 a₿) —
 * the second cartridge. Pac's ruling, verbatim: "the design is the dark
 * one that's currently deployed at onecocreation.vercel.app. that's the
 * pacx numberone." So the rendered palette IS the celestial night the kit
 * already ships — the twin in src/app/cartridges.css pours almost no
 * color. What this cartridge changes:
 *
 *  - the VOICE — arcade, warm, player-first ("interactive warm, easy to
 *    understand"). Gold still means money here (fleet semantic lock);
 *    it just isn't this brand's whole personality.
 *  - the DISPLAY FACE — Press Start 2P, ADOPTED. The twin pours
 *    var(--font-press-start) over the display tokens and --font-pixel, so
 *    the next/font registration in the root layout earns its bytes:
 *    PS2P is this cartridge's furniture, NOT dead (the Lane 4 verdict).
 *  - the MOTION BUDGET — Pac: "feel free to enhance this design with
 *    visual things like the parralax so it's not flat." The hero's
 *    nebula gains a scroll-driven pan (CSS scroll-timeline rendering of
 *    the live-extracted mechanism, onecocreation-live-capture §0.1),
 *    additive, static-by-default, prefers-reduced-motion wrapped; the
 *    studio's ParallaxBand/ParallaxImg already gives authored pages the
 *    real IO+rAF parallax, opt-in as ever.
 *
 * NO INVENTED MARKS: every art slot is a labeled ASSET SLOT placeholder
 * (the missing-art list rides the lane report) — onecocreation's marks
 * stay onecocreation's. The time door points at the arcade's own server
 * because this cartridge IS the arcade's voice; the door comes home.
 */
export const pacman: Cartridge = {
  name: "Number One × Pacman",

  /** the arcade's four-glyph signature — its own, never Love's */
  constellation: "🕹️ 👾 🟡 ✨",

  logo: {
    lockup: "/brand/pacman/lockup.svg", // ASSET SLOT — arcade lockup not yet drawn
    mark: "/brand/pacman/mark.svg", // ASSET SLOT — arcade mark not yet drawn
    consciouscuts: "/brand/pacman/service-mark.png", // ASSET SLOT — service mark not yet drawn
  },

  hero: {
    moon: "/images/pacman/sky-moon.webp", // ASSET SLOT — arcade sky art missing
    nebula: "/images/pacman/sky-nebula.webp", // ASSET SLOT — arcade sky art missing
    meteors: "/images/pacman/sky-meteors.webp", // ASSET SLOT — arcade sky art missing
    heavenEarth: "/images/pacman/heaven-earth.webp", // ASSET SLOT — hero photograph missing
    loveSidelook: "/images/pacman/host-sidelook.webp", // ASSET SLOT — host portrait missing
    lionsGate: "/images/pacman/gate.webp", // ASSET SLOT — memberships band art missing
  },

  portraits: {
    headshot: "/images/pacman/host-headshot.webp", // ASSET SLOT — host headshot missing
    /** the service photography, matched by service id — slots, not yet shot */
    cuts: {
      women: "/images/pacman/service-women.jpg", // ASSET SLOT
      wax: "/images/pacman/service-wax.jpg", // ASSET SLOT
      men: "/images/pacman/service-men.jpg", // ASSET SLOT
    },
  },

  /** membership art — A/B/C ride the tier system, not the file names */
  tierArt: {
    A: "/images/pacman/tier-a.webp", // ASSET SLOT — tier art missing
    B: "/images/pacman/tier-b.webp", // ASSET SLOT
    C: "/images/pacman/tier-c.webp", // ASSET SLOT
  },

  /** the arcade's thank-you — the words are real, the loop is a slot until
   *  the thank-you video is recorded (drop it in public/video) */
  thanks: {
    video: "/video/pacman-thanks.mp4", // ASSET SLOT — not yet recorded
    poster: "/video/pacman-thanks.jpg", // ASSET SLOT — not yet shot
    heading: "Thanks for Playing — Player One",
    message: "Your coin lands whole — no house cut, no middle machine. Game on, and thank you. 🕹️ 👾 🟡 ✨",
  },

  /** VOICES — an honest EMPTY field: testimonials are real words of real
   *  people or they are nothing. Love's voices are Love's; the arcade
   *  gathers its own. Never fabricate, never borrow. */
  voices: [],

  /** the time door comes home — this cartridge is the arcade's own voice,
   *  so the house clock's server is its own (A9, 0018.05.24 a₿) */
  doors: {
    timeTipUrl: "https://time.pacsarcade.org/api/chain/tip?full=1",
  },

  /** the deployed design's nav IS the gold nav (#FAC51C, live-extracted)
   *  — "gold" here is the plain truth of the render, and it tells
   *  CartridgeVars to pour nothing */
  nav: {
    accent: "gold" as "gold" | "dawn",
  },

  meta: {
    title: "Number One × Pacman — Pac's Arcade",
    description:
      "Games, sessions and community at Pac's Arcade. Pay in dollars or bitcoin — sats land in the arcade's own node, never held by anyone else.",
    themeColor: "#0a0a14",
  },

  /** the sign-in contract's palette — the deployed celestial night, the
   *  same render Pac pointed at; gold stays money (fleet semantic lock) */
  palette: {
    space: "#0a0a14",
    panel: "rgba(22,18,40,.66)",
    edge: "rgba(168,130,240,.22)",
    cream: "#FBF6EF",
    blush: "#F3DCE3",
    ink: "#4A4458",
    muted: "#897F97",
    gold: "#D9B24E", // MONEY ONLY (sats / bitcoin) — fleet semantic lock
    goldDeep: "#B4862B",
    purple: "#9B26D6",
    magenta: "#C42EC9",
    lavender: "#8B76C4",
    rose: "#C56E8B",
    copper: "#C77B4A",
  },

  fonts: {
    // PS2P leads the display layer — the arcade's own voice; no serifs anywhere
    display: "var(--font-press-start),'Press Start 2P',monospace",
    body: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  },

  copy: {
    productName: "Number One × Pacman",
    tagline: "Insert Coin — Meet Yourself",
    memberNoun: "player",
  },

  /** the sign-in door, arcade-voiced — same ceremony, same sovereignty,
   *  warmer cabinet light */
  signIn: {
    copy: {
      returningTitle: "Welcome back, player one",
      returningBlurb:
        "One tap to sign, and you're in. No passwords, nothing stored, nothing to leak — your name stays yours.",
      signInCta: "Press start 🔑",
      signingCta: "One breath — reading your signature…",
      doorsHeading: "New player?",
      doorsFootnote:
        "Your name@pacsarcade is yours — sovereign. Insert coin, keep your soul.",
    },
    doors: [
      {
        tag: "@pacsarcade",
        role: "join the arcade",
        blurb:
          "Claim your name and the doors open — the booking calendar, the meditation room, the community commons.",
        href: "/welcome",
        cta: "Press start →",
        accent: "cyan",
      },
    ],
  },
};
