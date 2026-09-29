import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PaletteVars from "@/components/PaletteVars";
import ReplaysList from "@/components/replays/ReplaysList";
import { getSiteConfig } from "@/lib/site-config";

/**
 * TASK-496 (block 969,088+) - REPLAYS: Love's links of what has been read,
 * playable on the site ("maybe just the link is there like there's an area
 * with all the links of what's been read and they just click on it" - and
 * on the site, not YouTube). ONE page, podcast style, top level at
 * /replays: the Admiral put it under the Community MENU, not under the
 * reading's URL tree, and the letters will point straight at it, so it
 * wants a short address that reads well aloud; navChildHere (NavMenu.tsx)
 * would light the "Read with Love" row for any /reading/replays visit,
 * mislabeling where the visitor stands, since Replays belongs to
 * Community.
 *
 * THE LIST SHIPS EMPTY - the first recording's link sits in Love's email
 * to the Admiral, not on the ship; he pastes it in /a himself. There is no
 * seed (unlike the About playlist): absent config and a saved empty list
 * BOTH render the designed empty state below, never an invented video
 * (derive-or-dash). The empty state is a first-class surface of this lane,
 * not a fallback - the page must be worth telling people about before the
 * first link lands.
 *
 * Every class here is the existing kit/house vocabulary (kitx-section,
 * kitx-flow, kit-btn, kit-day); no new CSS, no inline styles, no literal
 * colours (the template-first law; the design-drift ratchet enforces it).
 */

export const metadata: Metadata = {
  title: "Replays",
};

export const dynamic = "force-dynamic";

export default async function ReplaysPage() {
  const config = await getSiteConfig();
  const replays = config.replays ?? []; // absent and empty are ONE state

  return (
    <>
      <SiteHeader />
      <PaletteVars />
      <main className="center kitx-balanced">
        <section className="kitx-section kitx-section-first">
          <div className="wrap kitx-flow">
            <p className="kicker">Read with Love</p>
            <h1 className="kit-h1">Replays</h1>
            <p className="kit-body">Every recorded reading, kept here to play again.</p>
          </div>
        </section>

        <section className="kitx-section">
          <div className="wrap">
            {replays.length === 0 ? (
              <div className="card room-card kit-day">
                <div className="kit-card-body">
                  <div className="kit-stack">
                    <p className="kit-text-quiet">
                      Nothing here yet. When a reading has been recorded, its replay lands on this page.
                    </p>
                    <div className="kit-btn-row kitx-actions">
                      <a className="kit-btn kit-btn-main kit-btn-sm" href="/reading">
                        Read with Love
                      </a>
                    </div>
                    <p className="kit-note">
                      <a href="/classes">Visit the Community page</a>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <ReplaysList replays={replays} />
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
