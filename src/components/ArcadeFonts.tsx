import localFont from "next/font/local";
import type { ReactNode } from "react";

/**
 * THE ARCADE SKIN'S OWN FONTS — scoped (QW9, ~0018.05.24 a₿). Retronoid
 * ships ONLY to the arcade-skin routes (the /a console, /u profiles, /bb,
 * /bday, /media, /time, /welcome) — the celestial brand's law is "no pixel
 * type on a celestial brand", so the root layout no longer pays for it.
 * (Press Start 2P stays on the root layout: the signed-in member chip in
 * the site header wears font-pixel on EVERY page.) Wrap any arcade-skin
 * surface in this and the variable cascades through its subtree; the
 * font-arcade fallback chain degrades to Press Start 2P elsewhere.
 */
const retronoid = localFont({
  src: "../../public/fonts/Retronoid.ttf",
  variable: "--font-retronoid",
});

export default function ArcadeFonts({ children }: { children: ReactNode }) {
  return <div className={`${retronoid.variable} contents`}>{children}</div>;
}
