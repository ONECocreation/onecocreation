import type { Metadata, Viewport } from "next";
import { Barlow, Open_Sans, Press_Start_2P, Roboto } from "next/font/google";
import localFont from "next/font/local";
import { EASY_MODE_BOOT_SCRIPT } from "@pacsarcade/arcade-ui";
import ScrollFix from "@/components/ScrollFix";
import AliveEffects from "@/components/AliveEffects";
import CartridgeVars from "@/components/CartridgeVars";
import { PenModeProvider } from "@/components/PenMode";
import "./globals.css";
/* The face, split in two (cartridge walk step 8): cartridge.css is the
   BRAND (tokens, bands, faces, imagery), house.css is the brand-free
   framework. Loaded AFTER globals so Love's tokens win, including inside
   the admin shell — cartridge first, house reads its tokens. */
import "./cartridge.css";
import "./house.css";

/* Retronoid (the arcade skin's display face) moved OFF the root (QW9,
   ~0018.05.24 a₿) — it ships only to arcade-skin routes via
   components/ArcadeFonts. Press Start 2P stays here: the signed-in member
   chip in the site header wears font-pixel on EVERY page. Montserrat
   dropped: --disp leads with Barlow and never fell back to it. */

/* Self-hosted — easy mode must not lean on a third-party CDN */
const openDyslexic = localFont({
  src: [
    { path: "../../public/fonts/OpenDyslexic-Regular.woff2", weight: "400" },
    { path: "../../public/fonts/OpenDyslexic-Bold.woff2", weight: "700" },
  ],
  variable: "--font-opendyslexic",
});

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
});

/* Love's blessed FONT TRIO, leg 1 — Barlow carries H1/display (0018.05.17).
   --font-barlow feeds --serif and --disp in cartridge.css/house.css so the
   whole display layer (headlines, hero stacks, prices) speaks one voice. */
const barlow = Barlow({
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-barlow",
  display: "swap",
});

const roboto = Roboto({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

/* The restored primary CTA's own voice (the flagged fidelity item): Open
   Sans 700 letterspaced caps, white square — exactly the original site's
   button face (live-extracted, onecocreation-live-capture §0.3). */
const openSans = Open_Sans({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "One Cocreation — Where Heaven and Earth Meet",
  description:
    "Intuitive sessions, meditations and community with Love. Pay in dollars or bitcoin — sats land in One Cocreation's own node, never held by anyone else.",
  /* Module 6 — installable on the home screen; iOS reads these, the
     manifest (src/app/manifest.ts) covers the rest */
  appleWebApp: {
    capable: true,
    title: "One Cocreation",
    statusBarStyle: "black-translucent",
  },
};

/* One phone contract for every surface: real device width, no forced zoom
   lock (pinch stays — accessibility), edge-to-edge under the notch, and the
   browser chrome tinted Love's celestial night. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // S2 (0018.05.25 a₿): = --space, kept literal — a meta theme-color tag can't resolve var()
  themeColor: "#0a0a14",
};

/**
 * De-housed (design punch list, 0018.05.10): the clone wears ONLY Love's
 * face at the root. The arcade's CRT scan lines and the BFT clock are
 * frens.earth furniture and do not ship here; the easy-mode boot script
 * stays — accessibility is house law, not house branding.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${pressStart2P.variable} ${roboto.variable} ${openDyslexic.variable} ${barlow.variable} ${openSans.variable}`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html:
          "try{if(localStorage.getItem('oc-theme')==='light')document.documentElement.setAttribute('data-oc-theme','light')}catch(e){}" }} />
        <script dangerouslySetInnerHTML={{ __html: EASY_MODE_BOOT_SCRIPT }} />
        <CartridgeVars />
        {/* S8 (0018.05.26): the multi-brand sign-in kit is retired — the one
            brand lives in the cartridge (src/brand/cartridge.ts); the CSS
            variables the old BrandProvider wrapper injected moved to
            cartridge.css :root, verbatim, so nothing rendered shifts */}
        <PenModeProvider>
          <ScrollFix />
          <AliveEffects />
          {children}
        </PenModeProvider>
      </body>
    </html>
  );
}
