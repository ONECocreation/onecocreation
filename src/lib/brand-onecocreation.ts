import { cartridge } from "@/brand/cartridge";

/**
 * One Cocreation — BrandTheme.
 *
 * Same PATTERN as the frens.earth brand kit (a theme object → CSS custom
 * properties), but this wears ONE COCREATION's own identity, not the arcade's
 * night-garden. Celestial + luminous: golden sun, purple/magenta, periwinkle
 * lavender, soft rose. House rule still holds — GOLD is money only (the sats /
 * bitcoin surfaces); everything else stays soft and warm.
 *
 * Typeface is Barlow (Love's display face — no serifs, FONT TRIO 0018.05.17).
 *
 * SINCE THE CARTRIDGE SPLIT (walk step 8, Admiral's walk, 0018.05.15) the
 * values live in src/brand/cartridge.ts — this file is a thin adapter that
 * keeps the exported shape the sign-in contract and MediaKit already speak.
 * Edit the cartridge, not this.
 */

export interface BrandTokens {
  // celestial dark (header / hero true-to-brand)
  space: string;
  panel: string;
  edge: string;
  // luminous body
  cream: string;
  blush: string;
  ink: string;
  muted: string;
  // accents
  gold: string; // MONEY ONLY (sats / bitcoin)
  goldDeep: string;
  purple: string;
  magenta: string;
  lavender: string;
  rose: string;
  copper: string; // the wire-wrapped jewelry
}

export interface BrandTheme {
  id: string;
  label: string;
  tokens: BrandTokens;
  fonts: { display: string; body: string };
  copy: {
    productName: string;
    tagline: string;
    memberNoun: string;
  };
}

export const oneCocreationTheme: BrandTheme = {
  id: "onecocreation",
  label: `${cartridge.name} — Where Heaven and Earth Meet`,
  tokens: { ...cartridge.palette },
  fonts: { ...cartridge.fonts },
  copy: { ...cartridge.copy },
};

/** Emit the theme as CSS custom properties (mirrors frens.earth brandCssVars). */
export function brandCssVars(t: BrandTokens = oneCocreationTheme.tokens): Record<string, string> {
  return {
    "--space": t.space,
    "--panel": t.panel,
    "--edge": t.edge,
    "--cream": t.cream,
    "--blush": t.blush,
    "--ink": t.ink,
    "--muted": t.muted,
    "--gold": t.gold,
    "--gold-deep": t.goldDeep,
    "--purple": t.purple,
    "--magenta": t.magenta,
    "--lavender": t.lavender,
    "--rose": t.rose,
    "--copper": t.copper,
  };
}
