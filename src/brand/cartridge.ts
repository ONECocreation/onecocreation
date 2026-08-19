/**
 * THE BRAND CARTRIDGES (walk steps 7–8, Admiral's walk, 0018.05.15;
 * the registry, S9 — the cartridges become real, 0018.05.28 a₿).
 *
 * One object carries the brand's non-CSS identity: the name, the emoji
 * constellation, every logo and hero-image path, the tier art, and the
 * metadata. A new artist edits THIS file (and cartridge.css beside it in
 * src/app) — never hunts literals through components.
 *
 * S9 made the one cartridge a REGISTRY of three directions — LOVE (the
 * ShinePages original, THE DEFAULT), NUMBER ONE × PACMAN (the deployed
 * dark design, arcade-voiced), EARTHSIDE (K3's authored earth direction,
 * Pac's verdict 0018.05.25 a₿). `love` below is the original object
 * moved VERBATIM — every field line byte-identical, so the dressing
 * room's anchors (src/lib/cartridge-identity.ts) still match exactly
 * once; the other two live in src/brand/cartridges/ beside this file for
 * the same reason. Consumers keep importing `cartridge` and never learn
 * about the registry: the selection at the bottom is the one line a fork
 * flips (the nav.accent precedent, whole-cartridge scale), and with
 * "love" selected the machinery emits ZERO extra bytes — no attribute,
 * no pour, no reorder.
 *
 * The RENDERED palette lives in src/app/cartridge.css (:root, dark-first).
 * The `palette` here is the sign-in contract's set (MediaKit, the login
 * ceremony, the kit-variable block in cartridge.css) — paper-era values,
 * kept as they were so the contract surfaces don't shift; the two sets
 * serve different rooms on purpose.
 */

import { pacman } from "./cartridges/pacman";
import { earthside } from "./cartridges/earthside";

/** LOVE — the ShinePages original, fidelity-guarded. The whole object is
 *  the pre-registry cartridge, verbatim. */
const love = {
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

  /** THE NAV ACCENT (S8, cartridge hardening) — "gold" is Love's original
   *  nav (#FAC51C links, live-extracted from the production render — the
   *  shipped onecocreation default, Version B); "dawn" is the kit's offered
   *  retint (rose→lavender, Version A, navfix 10a — gold then lives on
   *  money + the coin mark only). One line a fork flips; the recipe rides
   *  cartridge.css as inert --nav-dawn-* data and components/CartridgeVars
   *  pours it over the consumed nav tokens. With "gold" nothing extra
   *  renders. */
  nav: {
    accent: "gold" as "gold" | "dawn",
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

  /**
   * THE SIGN-IN DOOR (S8 cartridge hardening, 0018.05.26) — the words and
   * the community door the login ceremony speaks, moved here from the
   * retired multi-brand sign-in kit (src/lib/brand; this site has ONE
   * brand, and it lives in this cartridge). `copy` is the six strings
   * LoginPanel reads; `doors` is the card under the sign-in. The name
   * stays free without saying so (Pac, 0018.05.26 — that framing was for
   * frens.earth): sovereignty is stated, the sales line is not.
   */
  signIn: {
    copy: {
      /* the two-breath voice (Admiral, 0018.05.15) — warm, zero machinery */
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
} as const;

/** THE CARTRIDGE IDS (S9) — the three directions: LOVE (Heaven, the
 *  default), NUMBER ONE × PACMAN (the Screen), EARTHSIDE (the Earth). */
export type CartridgeId = "love" | "pacman" | "earthside";

/**
 * THE CARTRIDGE SHAPE — DERIVED from love's object, never hand-written in
 * parallel (a parallel interface drifts; a derived one cannot): same keys,
 * string literals widened to `string` so the other voices can speak their
 * own values, arrays kept readonly as `as const` made them. Two honest
 * exceptions, both named `accent`: nav.accent keeps its `"gold" | "dawn"`
 * cast union (the dressing room's write rail pours it), and a sign-in
 * door's accent widens to the house's four door inks — LoginPanel's
 * ACCENT_INK map is the real constraint, so the type says it.
 */
type CartridgeShape<T> = T extends string
  ? string
  : T extends readonly (infer R)[]
    ? readonly CartridgeShape<R>[]
    : T extends object
      ? {
          [K in keyof T]: K extends "accent"
            ? T[K] extends "gold" | "dawn"
              ? T[K]
              : "cyan" | "pink" | "coin" | "neon"
            : CartridgeShape<T[K]>;
        }
      : T;

export type Cartridge = CartridgeShape<typeof love>;

/** THE REGISTRY (S9) — one entry per direction. */
export const cartridges: Record<CartridgeId, Cartridge> = { love, pacman, earthside };

/**
 * THE SELECTION (S9) — the one line a fork flips, the nav.accent
 * precedent at whole-cartridge scale. The root layout reads it: with
 * "love" it sets NOTHING (byte-identical output); with another cartridge
 * it sets html[data-oc-cartridge] and that cartridge's twin in
 * src/app/cartridges.css pours its tokens — no stylesheet fork, no rule
 * overrides, no specificity debt.
 */
export const activeCartridgeId: CartridgeId = "love";

/** THE ONE ACCESSOR — the active cartridge, resolved once. Consumers
 *  import `cartridge` exactly as before the registry existed. */
export const cartridge: Cartridge = cartridges[activeCartridgeId];
