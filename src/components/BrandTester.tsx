import LoginPanel from "@/components/LoginPanel";
import SiteFooter from "@/components/SiteFooter";
import { cartridge } from "@/brand/cartridge";

/**
 * THE BRAND KIT, single-brand (S8 cartridge hardening, 0018.05.26): the
 * multi-brand sign-in kit is retired — no candidate themes, no compare
 * column. This site has ONE brand and it lives in the cartridge
 * (src/brand/cartridge.ts + src/app/cartridge.css). What remains here is
 * the honest preview: the cartridge's sign-in palette as swatches, its two
 * faces, and the REAL front door below wearing them — exactly what the
 * site's sign-in renders, because it reads the same cartridge.
 */

/** the palette's own notes — gold is money only, the rest speak softly */
const SWATCH_NOTES: Record<string, string> = {
  space: "page night",
  panel: "card glass",
  edge: "borders",
  cream: "dawn paper",
  blush: "dawn blush",
  ink: "body ink",
  muted: "quiet ink",
  gold: "MONEY ONLY",
  goldDeep: "money, deep",
  purple: "info",
  magenta: "the one flair",
  lavender: "interactive",
  rose: "soft danger",
  copper: "the jewelry",
};

export default function BrandTester() {
  return (
    <main className="bg-void">
      <div className="mx-auto max-w-5xl px-6 pb-6 pt-10">
        <p className="lcars-eyebrow mb-3" data-accent="pink">
          THE FITTING · ONE BRAND, ONE CARTRIDGE
        </p>
        <h2 className="mb-3 font-arcade text-4xl text-cyan glow-cyan">BRAND KIT</h2>
        <p className="max-w-2xl font-body text-sm text-white/55">
          The sign-in kit&apos;s themes are retired — the brand lives in the cartridge now. These
          are its sign-in palette and faces, and below, the actual front door wearing them. Edit
          the cartridge, watch this page move with the site.
        </p>

        {/* the swatch board — cartridge.palette, every slot named */}
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {Object.entries(cartridge.palette).map(([key, value]) => (
            <div key={key} className="rounded-lg border border-edge bg-panel p-2.5 text-center">
              <span
                aria-hidden
                className="mb-1.5 block h-8 w-full rounded border border-white/10"
                style={{ background: value }}
              />
              <p className="font-pixel text-[10px] uppercase text-white/80">{key}</p>
              <p className="font-body text-[11px] leading-tight text-white/45">
                {SWATCH_NOTES[key] ?? value}
              </p>
            </div>
          ))}
        </div>

        {/* the two faces — display and body, straight from the cartridge */}
        <div className="mt-6 rounded-xl border-2 border-edge bg-panel p-5">
          <p style={{ fontFamily: cartridge.fonts.display }} className="text-2xl text-white/90">
            Where Heaven and Earth Meet
          </p>
          <p style={{ fontFamily: cartridge.fonts.body }} className="mt-2 text-sm text-white/60">
            {cartridge.copy.productName} — {cartridge.copy.tagline}. Body copy stays calm,
            readable, glow-free.
          </p>
        </div>
      </div>

      {/* the real sign-in, wearing the cartridge — the same LoginPanel the
          front door renders, reading the same cartridge.signIn */}
      <div className="border-t-2 border-edge p-6">
        <div className="mx-auto max-w-md">
          <p className="mb-5 text-center font-pixel text-[10px] uppercase tracking-widest text-white/40">
            ◆ THE FRONT DOOR, LIVE FROM THE CARTRIDGE
          </p>
        </div>
        <LoginPanel />
      </div>

      <SiteFooter />
    </main>
  );
}
