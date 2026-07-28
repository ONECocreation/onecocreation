/**
 * One Cocreation — BrandTheme.
 *
 * Same PATTERN as the frens.earth brand kit (a theme object → CSS custom
 * properties), but this wears ONE COCREATION's own identity, not the arcade's
 * night-garden. Celestial + luminous: golden sun, purple/magenta, periwinkle
 * lavender, soft rose. House rule still holds — GOLD is money only (the sats /
 * bitcoin surfaces); everything else stays soft and warm.
 *
 * Typeface is Cochin (Love's brand serif, self-hosted in /public/fonts).
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
  label: "One Cocreation — Where Heaven and Earth Meet",
  tokens: {
    space: "#0a0a14",
    panel: "rgba(22,18,40,.66)",
    edge: "rgba(168,130,240,.22)",
    cream: "#FBF6EF",
    blush: "#F3DCE3",
    ink: "#4A4458",
    muted: "#897F97",
    gold: "#D9B24E",
    goldDeep: "#B4862B",
    purple: "#9B26D6",
    magenta: "#C42EC9",
    lavender: "#8B76C4",
    rose: "#C56E8B",
    copper: "#C77B4A",
  },
  fonts: {
    display: "'Cochin','Optima','Palatino Linotype',Georgia,serif",
    body: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  },
  copy: {
    productName: "One Cocreation",
    tagline: "The Way of the Heart",
    memberNoun: "soul",
  },
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
