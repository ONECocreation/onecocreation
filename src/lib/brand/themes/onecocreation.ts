import type { BrandTheme } from "../contract";
import { oneCocreationTheme as site } from "../../brand-onecocreation";

/**
 * One Cocreation — the sign-in ceremony wearing Love's face.
 *
 * The hexes live in ONE place (src/lib/brand-onecocreation.ts — the site's
 * own brand file); this adapter maps them into the shared sign-in contract.
 * Semantic slots re-mapped for a non-arcade brand, said out loud:
 *   coin = gold (house law: money ONLY) · neon = lavender (live/success)
 *   cyan = purple (info) · ghost = rose (danger — this brand does not scream)
 *   pink = magenta (the one free-moving flair)
 * Faces: Barlow for display (no serifs — Love's law, FONT TRIO 0018.05.17),
 * the soft sans for labels and buttons — no pixel type on a celestial brand.
 */
export const oneCocreationBrand: BrandTheme = {
  id: "onecocreation",
  label: site.label,
  tokens: {
    // surfaces — the celestial night
    void: site.tokens.space,
    panel: site.tokens.panel,
    edge: site.tokens.edge,
    // semantic accents (re-mapped, documented above)
    coin: site.tokens.gold,
    neon: site.tokens.lavender,
    cyan: site.tokens.purple,
    ghost: site.tokens.rose,
    pink: site.tokens.magenta,
    // legacy base (body + .button)
    background: site.tokens.space,
    foreground: site.tokens.cream,
    primary: site.tokens.gold,
    secondary: site.tokens.panel,
    border: site.tokens.edge,
    accent: site.tokens.magenta,
  },
  fonts: {
    arcade: site.fonts.display,
    pixel: site.fonts.body,
    body: site.fonts.body,
    button: site.fonts.body,
  },
  copy: {
    productName: site.copy.productName,
    memberNoun: site.copy.memberNoun,
    /* the two-breath voice (Admiral, 0018.05.15) — warm, zero machinery */
    loginKicker: "One Cocreation · Sign in",
    loginTitle: "Your key opens the door",
    returningTitle: "Good to see you again",
    returningBlurb:
      "One tap to sign, and you're in. No passwords, nothing stored, nothing to leak — your name stays yours.",
    signInCta: "Open the door 🔑",
    signingCta: "One breath — reading your signature…",
    doorsHeading: "New here?",
    doorsFootnote:
      "Your name@onecocreation is yours — free and sovereign. Where Heaven and Earth meet.",
  },
  doors: [
    {
      tag: "@onecocreation",
      role: "join the field",
      blurb:
        "Claim your name and the doors open — the booking calendar, the free meditation, Heartfield Commons. All of it free.",
      href: "/welcome",
      cta: "Walk the welcome path →",
      accent: "pink",
    },
  ],
  roleLabels: {
    onecocreation: "COMMUNITY",
  },
};
