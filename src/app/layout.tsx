import type { Metadata, Viewport } from "next";
import { Barlow, Open_Sans, Press_Start_2P, Roboto } from "next/font/google";
import localFont from "next/font/local";
import { EASY_MODE_BOOT_SCRIPT } from "@pacsarcade/arcade-ui";
import { renderCartridgeId, cartridge } from "@/brand/cartridge";
import ScrollFix from "@/components/ScrollFix";
import AliveEffects from "@/components/AliveEffects";
import CartridgeVars from "@/components/CartridgeVars";
import CartridgePreview from "@/components/CartridgePreview";
import "./globals.css";
/* The face, split in two (cartridge walk step 8): cartridge.css is the
   BRAND (tokens, bands, faces, imagery), house.css is the brand-free
   framework. Loaded AFTER globals so Love's tokens win, including inside
   the admin shell — cartridge first, house reads its tokens. */
import "./cartridge.css";
import "./house.css";
/* S9 (0018.05.28 a₿): the non-default cartridge twins — inert unless the
   selection flips and <html> wears data-oc-cartridge (layout below). */
import "./cartridges.css";

/* Retronoid (the arcade skin's display face) moved OFF the root (QW9,
   ~0018.05.24 a₿) — it ships only to arcade-skin routes via
   components/ArcadeFonts. Press Start 2P stays here for the PACMAN
   cartridge, which adopted it as its display face: the twin in
   cartridges.css pours var(--font-press-start) over the display tokens,
   and next/font must register that variable on <html> for the pour to
   resolve. LOVE reads nothing from it — the kit's font-pixel/font-arcade
   tokens are re-faced in cartridge.css, and S10 struck globals' last dead
   PS2P declarations. Montserrat dropped: --disp leads with Barlow and
   never fell back to it. */

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
  /* S9 (0018.05.28 a₿): read from the ACTIVE cartridge — with LOVE
     selected these are byte-for-byte the literals that sat here before
     the registry; a fork flipping the selection retitles the site too */
  title: cartridge.meta.title,
  description: cartridge.meta.description,
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
  // S2 (0018.05.25 a₿): = --space of the ACTIVE cartridge (S9), kept to a
  // literal string in the cartridge — a meta theme-color tag can't resolve var()
  themeColor: cartridge.meta.themeColor,
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
      /* S9 (0018.05.28 a₿): the cartridge selection surfaces as ONE
         attribute — and only off the default. With LOVE active the prop
         is NOT PASSED AT ALL: a conditional spread, not an undefined
         value — undefined still serializes into the flight payload and
         costs bytes (caught by the rendered before/after diff); with
         another cartridge the twin in cartridges.css pours its tokens.
         S29: the pour reads the RENDER selection (renderCartridgeId) —
         the bench override included — never the raw selection line. */
      {...(renderCartridgeId === "love" ? {} : { "data-oc-cartridge": renderCartridgeId })}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html:
          "try{if(localStorage.getItem('oc-theme')==='light')document.documentElement.setAttribute('data-oc-theme','light')}catch(e){}" }} />
        <script dangerouslySetInnerHTML={{ __html: EASY_MODE_BOOT_SCRIPT }} />
        <CartridgeVars />
        {/* S11 lane 2 — see it before you wear it: the operator's cartridge
            PREVIEW. With no flag in sessionStorage this renders and touches
            NOTHING; only the gated dressing room sets the flag, and only the
            operator's own browser ever pours the twin + wears the strip. */}
        <CartridgePreview />
        {/* S8 (0018.05.26): the multi-brand sign-in kit is retired — the one
            brand lives in the cartridge (src/brand/cartridge.ts); the CSS
            variables the old BrandProvider wrapper injected moved to
            cartridge.css :root, verbatim, so nothing rendered shifts */}
        <ScrollFix />
        <AliveEffects />
        {children}
      </body>
    </html>
  );
}
