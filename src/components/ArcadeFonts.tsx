import localFont from "next/font/local";
import type { ReactNode } from "react";

/**
 * THE ARCADE SKIN'S OWN FONTS — scoped (QW9, ~0018.05.24 a₿). Retronoid
 * ships ONLY to the arcade-skin routes (the /a console, /u profiles, /bb,
 * /bday, /media, /time, /welcome) — the celestial brand's law is "no pixel
 * type on a celestial brand", so the root layout no longer pays for it.
 * (Press Start 2P stays on the root layout for the PACMAN cartridge, which
 * adopted it as its display face — cartridges.css pours
 * var(--font-press-start), and next/font registers that variable on
 * <html>. Nothing celestial reads it: the kit's font-pixel / font-arcade
 * tokens are re-faced by cartridge.css, the console theme, or a cartridge
 * twin before they can ever reach PS2P.) Wrap any arcade-skin surface in
 * this and the variable cascades through its subtree.
 */
const retronoid = localFont({
  src: "../../public/fonts/Retronoid.ttf",
  variable: "--font-retronoid",
});

export default function ArcadeFonts({ children }: { children: ReactNode }) {
  return <div className={`${retronoid.variable} contents`}>{children}</div>;
}
