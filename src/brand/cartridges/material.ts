import type { Cartridge } from "../cartridge";

/**
 * MATERIAL (TASK-35/S38 lane 1 — the design-language cartridge,
 * 0018.06.03 a₿) — the sixth cartridge: a palette/type reading of the
 * Material Design 3 token system, quarried as VALUES ONLY (S36's verdict:
 * material-web is a maintained token quarry, never a runtime — no
 * @material/web anywhere in this repo). Every color below is transcribed
 * from Google's material-web MD3 v0.192 tokens (tokens/versions/v0_192/),
 * Apache-2.0; the provenance line rides the twin in cartridges.css too.
 *
 * THE NAMING LAW (Apache-2.0 §6 — trademarks withheld): the internal id
 * is `material`, a machine key; the DISPLAYED name is the house's own
 * voice, never "Material" as a brand position. "Blueprint Cartridge"
 * below is the lane's working pick — the report carries the proposals,
 * Fable/the Admiral rule the final name.
 *
 * THE MAPPING (S36 lane 3's table): MD3 dark scheme = night, light
 * scheme = dawn. The six-rung surface-container ladder COLLAPSES onto
 * the house's ground/panel rungs (chosen, not mapped): night ground is
 * surface neutral6 `#141218`, panels walk neutral10/12/17; inks are the
 * on-surface family, edges are the outline rungs, accents are the
 * primary `#6750a4`/`#d0bcff` family with tertiary on the rose slot and
 * secondary on copper's. MD3 error is the only MD3 state hue and pours
 * `--err`. MD3 has NO ok/warn/info — per S36's compose ruling ("the two
 * systems compose: MD3 for surfaces/ink/accent, Eva for states") those
 * three borrow Eva's ramps (`#00d68f`/`#0095ff` and the shifted caution
 * — see the eva twin for the shift's Δ), stated here as the choice.
 *
 * GOLD STAYS MONEY (fleet semantic lock): no MD3 role pours onto
 * `--gold*` — the metal is the house's own, untouched.
 *
 * FONTS: MD3's typescale speaks Roboto. No new webfont fetches and no
 * new binaries (check:leaks stays 0): the stack NAMES Roboto first so
 * systems that carry it (Android et al.) use it, and falls through to
 * the nearest system sans everywhere else — stated, not hidden.
 *
 * DARK-FIRST, BOTH LIGHTS HONEST FROM BIRTH (the S20/S21 laws at
 * creation): every body-ink pair WCAG-measured ≥ 4.5:1 in BOTH themes
 * (the table rides the lane report; the tightest pair is dawn ok at
 * 4.81). A TEMPLATE, like blank and mono: every art path a labeled
 * ASSET SLOT, voices an honest empty, the time door sailing empty.
 */
export const material: Cartridge = {
  name: "Blueprint Cartridge",

  /** no signature yet — an honest empty, not a borrowed glyph set */
  constellation: "",

  logo: {
    lockup: "/brand/material/lockup.svg", // ASSET SLOT — the community's lockup, not yet drawn
    mark: "/brand/material/mark.svg", // ASSET SLOT — the community's mark, not yet drawn
    consciouscuts: "/brand/material/service-mark.png", // ASSET SLOT — service mark not yet drawn
  },

  hero: {
    moon: "/images/material/hero-moon.webp", // ASSET SLOT — hero sky art missing
    nebula: "/images/material/hero-nebula.webp", // ASSET SLOT — hero sky art missing
    meteors: "/images/material/hero-meteors.webp", // ASSET SLOT — hero sky art missing
    heavenEarth: "/images/material/heaven-earth.webp", // ASSET SLOT — hero photograph missing
    loveSidelook: "/images/material/host-sidelook.webp", // ASSET SLOT — host portrait missing
    lionsGate: "/images/material/gate.webp", // ASSET SLOT — memberships band art missing
  },

  portraits: {
    headshot: "/images/material/host-headshot.webp", // ASSET SLOT — host headshot missing
    /** the service photography, matched by service id — slots, not yet shot */
    cuts: {
      women: "/images/material/service-women.jpg", // ASSET SLOT
      wax: "/images/material/service-wax.jpg", // ASSET SLOT
      men: "/images/material/service-men.jpg", // ASSET SLOT
    },
  },

  /** membership art — A/B/C ride the tier system, not the file names */
  tierArt: {
    A: "/images/material/tier-a.webp", // ASSET SLOT — tier art missing
    B: "/images/material/tier-b.webp", // ASSET SLOT
    C: "/images/material/tier-c.webp", // ASSET SLOT
  },

  /** the thank-you — placeholder words that say so; the loop is a slot
   *  until the community records its own (drop it in public/video) */
  thanks: {
    video: "/video/material-thanks.mp4", // ASSET SLOT — not yet recorded
    poster: "/video/material-thanks.jpg", // ASSET SLOT — not yet shot
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
    title: "Blueprint Cartridge — The Design-Language Option",
    description:
      "A measured brand cartridge: a palette/type reading of the Material Design 3 token language (values from Google material-web MD3 v0.192, Apache-2.0). Dark-first, with an honest dawn.",
    themeColor: "#141218", // the night ground (MD3 surface, neutral6) — a literal, meta theme-color can't resolve var()
  },

  /** the sign-in contract's palette — the MD3 night scheme: surface
   *  neutral6 grounds, on-surface inks, outline edges, the primary
   *  #6750a4/#d0bcff family on the accent slots. Gold stays money (fleet
   *  semantic lock); the hue slots all wear MD3 ramp rungs */
  palette: {
    space: "#141218", // surface (dark) — neutral6
    panel: "rgba(29,27,32,.78)", // surface-container-low — neutral10
    edge: "rgba(147,143,153,.4)", // outline (dark) — neutral-variant60
    cream: "#FEF7FF", // neutral98 — the light-scheme surface, worn as the pale slot
    blush: "#CAC4D0", // neutral-variant80 — on-surface-variant (dark)
    ink: "#E6E0E9", // on-surface (dark) — neutral90
    muted: "#938F99", // outline (dark) — neutral-variant60
    gold: "#D9B24E", // MONEY ONLY (sats / bitcoin) — fleet semantic lock, no MD3 role pours here
    goldDeep: "#B4862B",
    purple: "#6750A4", // primary40 — the language's brand hue
    magenta: "#7F67BE", // primary50, wearing the slot
    lavender: "#D0BCFF", // primary80 (dark primary) — links
    rose: "#EFB8C8", // tertiary80 — kickers
    copper: "#CCC2DC", // secondary80, wearing the slot — the second accent
  },

  fonts: {
    // MD3's typescale speaks Roboto — named first, never fetched: systems
    // that carry the face use it, everything else falls through to the
    // nearest system sans (no new binaries, check:leaks stays 0)
    display: "Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif",
    body: "Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif",
  },

  copy: {
    productName: "Blueprint Cartridge",
    tagline: "A measured design language",
    memberNoun: "maker",
  },

  /** the sign-in door — placeholder words; the door accent is one of the
   *  house's four door inks (LoginPanel's ACCENT_INK map is the real
   *  constraint), neon chosen as the closest of the four to the
   *  cartridge's violet accent */
  signIn: {
    copy: {
      returningTitle: "Welcome back, maker",
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
        accent: "neon",
      },
    ],
  },
};
