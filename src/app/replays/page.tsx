import type { Metadata } from "next";
import { headers } from "next/headers";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PaletteVars from "@/components/PaletteVars";
import ReplaysList from "@/components/replays/ReplaysList";
import { getSiteConfig } from "@/lib/site-config";
import { sessionsFromCookieHeader } from "@/lib/member-auth";
import { loadReplays } from "@/lib/replays-source";

/**
 * TASK-496 (block 969,088+) built /replays: Love's links of what has been
 * read, playable on the site, ONE page under Community. TASK-532 (blocks
 * 969,313 + 969,334, the Admiral's round-2 NOD; pause lifted 2026-09-30)
 * re-faces it to the ruled look: "Read with Love" header, the newest recap
 * in a full-width 16:9 player ON TOP, mini thumbnails below that swap into
 * the top player, all replays, no max.
 *
 * THE GATE IS THE PLAYER, NOT THE LIST (the NOD supersedes the body's
 * hide-the-list gate): titles and thumbnails are PUBLIC - a signed-out
 * visitor sees every title with Love's public cover picture standing in
 * for the video pictures - and only the PLAYER iframe renders for a
 * member session. "At least a free member" = ANY valid member session
 * (`sessionsFromCookieHeader` on the raw cookie header, the reading
 * page's own idiom - never cookies(), whose URL-encoding breaks an email
 * handle's signature): a tierless email member is a member here, so this
 * page never reads a tier at all (there is no free tier; A/B/C only).
 * FAIL-CLOSED: any throw in the session read renders the signed-out
 * shape, never the player.
 *
 * THE DEEP LINK (NOD pick 4): /replays?play=<id> loads that id in the top
 * player - only a SAVED id; anything else falls back to the newest.
 *
 * THE SOURCE (rulings 2+3): the manual rows (pinned on top, Love's saved
 * order) plus one YouTube playlist auto-fill behind them via loadReplays
 * (its own KV docs; site-config.ts untouched). The playlist fetch is
 * member-triggered only: signed-in renders allow a stale-cache refetch,
 * signed-out renders read the cache and NEVER fetch (allowFetch:false -
 * a crawler must not be able to make this page fetch, SECURITY.md (d)).
 *
 * The list still ships EMPTY: absent config and a saved empty list BOTH
 * render the designed empty state below, never an invented video
 * (derive-or-dash). Every class here is the kit/house vocabulary plus the
 * round-2 kitx- rules in kit.css; no inline styles, no literal colours.
 */

export const metadata: Metadata = {
  title: "Replays",
};

export const dynamic = "force-dynamic";

export default async function ReplaysPage({
  searchParams,
}: {
  searchParams: Promise<{ play?: string }>;
}) {
  /* The member read, fail-closed: a session = the player renders; none
     (or any throw) = the invitation shape. A FREE email membership is
     enough - any valid session, tier or no tier. */
  let signedIn = false;
  try {
    signedIn = sessionsFromCookieHeader((await headers()).get("cookie")).length > 0;
  } catch {
    signedIn = false;
  }

  const config = await getSiteConfig();
  /* Manual rows + the playlist auto-fill. The fetch is member-triggered
     only: a signed-out render never fetches (the crawler law). */
  const replays = await loadReplays(config, { allowFetch: signedIn });

  /* The deep link: only a SAVED id may lead; anything else is the newest. */
  const play = (await searchParams).play;
  const selected = replays.find((v) => v.id === play) ?? replays[0];

  return (
    <>
      <SiteHeader />
      <PaletteVars />
      <main className="center kitx-balanced">
        <section className="kitx-section kitx-section-first kitx-replays">
          <div className="wrap kitx-flow kitx-wide">
            <p className="kicker">Read with Love</p>
            <h1 className="kit-h1">Replays</h1>
            <p className="kit-body">Every recorded reading, kept here to play again.</p>
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
              <>
                <ReplaysList replays={replays} signedIn={signedIn} initialId={selected.id} />
                {/* The stay-in-the-loop block, as ruled (NOD pick 3): one
                    button, no heading, no extra line. */}
                <div className="kit-btn-row kitx-actions">
                  <a className="kit-btn kit-btn-second kit-btn-sm" href="/reading#keep-posted">
                    Want a reminder email?
                  </a>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
