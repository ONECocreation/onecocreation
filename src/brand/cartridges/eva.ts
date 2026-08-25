import type { Cartridge } from "../cartridge";

/**
 * EVA (TASK-35/S38 lane 2 — the northern-light cartridge,
 * 0018.06.03 a₿) — the seventh cartridge: the Eva design system's
 * theme maps, transcribed as VALUES ONLY (S36's verdict: Nebular's
 * components are Angular-bound and skipped; the Eva SCSS maps are MIT
 * data). Every color below is read from Akveo's Eva/Nebular theme maps
 * (src/framework/theme/styles/themes/_default.scss + _dark.scss), MIT;
 * the provenance line rides the twin in cartridges.css too.
 *
 * THE DISPLAYED NAME is the house's own voice, never the upstream's:
 * "Vela Cartridge" below is the lane's Admiral-ruled name (0018.06.03) — the report
 * carries the proposals, Fable/the Admiral rule the final name.
 *
 * THE MAPPING (S36 lane 3's table): Eva's dark theme = night, the
 * default theme = dawn. The basic ramp carries surfaces and inks
 * (night ground basic-1000 `#151a30`, panels basic-800 `#222b45`,
 * hint inks basic-600), primary `#3366ff` leads the accents, and the
 * state hues are exact fits: success `#00d68f` → `--ok`, info
 * `#0095ff` → `--info`, danger `#ff3d71` → `--err`.
 *
 * THE WARN TRAP (house law, the `--warn` incident precedent): Eva's
 * warning500 `#ffaa00` is NEVER poured — its 40° amber sits 7° from
 * bitcoin `#f7931a` and gold means money ONLY. The caution re-hues to
 * the house's own ruled rungs (the shift's Δ rides the twin's header
 * note): the money band is left to the metal, measurably.
 *
 * GOLD STAYS MONEY (fleet semantic lock): no Eva role pours onto
 * `--gold*` — the metal is the house's own, untouched.
 *
 * FONTS: Eva's font-family-primary is Open Sans. No new webfont
 * fetches and no new binaries (check:leaks stays 0): the stack NAMES
 * Open Sans first so systems that carry it use it, and falls through
 * to the nearest system sans everywhere else — stated, not hidden.
 *
 * DARK-FIRST, BOTH LIGHTS HONEST FROM BIRTH (the S20/S21 laws at
 * creation): every body-ink pair WCAG-measured ≥ 4.5:1 in BOTH themes
 * (the table rides the lane report; the tightest pair is dawn ok at
 * 4.80). A TEMPLATE, like blank and mono: every art path a labeled
 * ASSET SLOT, voices an honest empty, the time door sailing empty.
 */
export const eva: Cartridge = {
  name: "Vela Cartridge",

  /** no signature yet — an honest empty, not a borrowed glyph set */
  constellation: "",

  logo: {
    lockup: "/brand/eva/lockup.svg", // ASSET SLOT — the community's lockup, not yet drawn
    mark: "/brand/eva/mark.svg", // ASSET SLOT — the community's mark, not yet drawn
    consciouscuts: "/brand/eva/service-mark.png", // ASSET SLOT — service mark not yet drawn
  },

  hero: {
    moon: "/images/eva/hero-moon.webp", // ASSET SLOT — hero sky art missing
    nebula: "/images/eva/hero-nebula.webp", // ASSET SLOT — hero sky art missing
    meteors: "/images/eva/hero-meteors.webp", // ASSET SLOT — hero sky art missing
    heavenEarth: "/images/eva/heaven-earth.webp", // ASSET SLOT — hero photograph missing
    loveSidelook: "/images/eva/host-sidelook.webp", // ASSET SLOT — host portrait missing
    lionsGate: "/images/eva/gate.webp", // ASSET SLOT — memberships band art missing
  },

  portraits: {
    headshot: "/images/eva/host-headshot.webp", // ASSET SLOT — host headshot missing
    /** the service photography, matched by service id — slots, not yet shot */
    cuts: {
      women: "/images/eva/service-women.jpg", // ASSET SLOT
      wax: "/images/eva/service-wax.jpg", // ASSET SLOT
      men: "/images/eva/service-men.jpg", // ASSET SLOT
    },
  },

  /** membership art — A/B/C ride the tier system, not the file names */
  tierArt: {
    A: "/images/eva/tier-a.webp", // ASSET SLOT — tier art missing
    B: "/images/eva/tier-b.webp", // ASSET SLOT
    C: "/images/eva/tier-c.webp", // ASSET SLOT
  },

  /** the thank-you — placeholder words that say so; the loop is a slot
   *  until the community records its own (drop it in public/video) */
  thanks: {
    video: "/video/eva-thanks.mp4", // ASSET SLOT — not yet recorded
    poster: "/video/eva-thanks.jpg", // ASSET SLOT — not yet shot
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
    title: "Vela Cartridge — The Northern-Light Option",
    description:
      "A northern-light brand cartridge: the Eva design system's theme values, transcribed (values from Akveo Eva/Nebular theme maps, MIT). Dark-first, with an honest dawn.",
    themeColor: "#151A30", // the night ground (Eva basic-1000) — a literal, meta theme-color can't resolve var()
  },

  /** the sign-in contract's palette — the Eva dark theme: basic-1000
   *  grounds, basic-100/600 inks, the primary #3366ff family on the
   *  accent slots. Gold stays money (fleet semantic lock); the hue
   *  slots all wear Eva ramp rungs */
  palette: {
    space: "#151A30", // color-basic-1000 — the dark ground
    panel: "rgba(34,43,69,.78)", // color-basic-800 — background-basic-color-1 (dark)
    edge: "rgba(143,155,179,.4)", // color-basic-600, wearing the border ramp's alpha
    cream: "#F7F9FC", // color-basic-200 — the default theme's ground, worn as the pale slot
    blush: "#C5CEE0", // color-basic-500
    ink: "#EDF1F7", // color-basic-300 — near the dark theme's text-basic (basic-100)
    muted: "#8F9BB3", // color-basic-600 — text-hint-color
    gold: "#D9B24E", // MONEY ONLY (sats / bitcoin) — fleet semantic lock, no Eva role pours here
    goldDeep: "#B4862B",
    purple: "#3366FF", // color-primary-500 — the system's brand hue
    magenta: "#274BDB", // color-primary-600, wearing the slot
    lavender: "#598BFF", // color-primary-400 — links at night
    rose: "#FF708D", // color-danger-400 — kickers
    copper: "#42AAFF", // color-info-400, wearing the slot — the second accent
  },

  fonts: {
    // Eva's font-family-primary is Open Sans — named first, never
    // fetched: systems that carry the face use it, everything else
    // falls through to the nearest system sans (no new binaries,
    // check:leaks stays 0)
    display: "'Open Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    body: "'Open Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  },

  copy: {
    productName: "Vela Cartridge",
    tagline: "A northern-light design language",
    memberNoun: "voyager",
  },

  /** the sign-in door — placeholder words; the door accent is one of the
   *  house's four door inks (LoginPanel's ACCENT_INK map is the real
   *  constraint), cyan chosen as the closest of the four to the
   *  cartridge's azure accent */
  signIn: {
    copy: {
      returningTitle: "Welcome back, voyager",
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
