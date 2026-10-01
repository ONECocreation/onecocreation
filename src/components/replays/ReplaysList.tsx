/* eslint-disable @next/next/no-img-element -- the thumbnails are YouTube's
   own public poster frames and Love's cover is an existing house asset;
   plain img exactly as the reading page's host portrait idiom. */
"use client";

import { useState } from "react";
import type { AboutVideo } from "@/lib/about-content";

/**
 * TASK-532 (block 969,334, the Admiral's round-2 NOD; pause lifted
 * 2026-09-30) - the Replays list, REBUILT to the ruled look (draft 2
 * frames R2/R3, walks/969334/replays-thumbs): the newest recap in a
 * full-width 16:9 player ON TOP, mini thumbnails below that swap into the
 * top player, all replays, no max. YouTube's own fullscreen button stays
 * (the iframe keeps allowFullScreen).
 *
 * THE GATE IS THE PLAYER, NOT THE LIST (the NOD supersedes the body's
 * hide-the-list shape): titles and thumbnails are PUBLIC. The page reads
 * the member session server-side and hands `signedIn` down - this client
 * component never reads a session of its own. Signed IN: the top player
 * is the real youtube-nocookie iframe and the minis carry YouTube's own
 * public poster frames. Signed OUT: Love's public cover picture
 * (/images/reading-love-cover.jpg, play mark stays) stands in for every
 * video picture, the top area carries the one "Sign in to watch" door,
 * and every mini is a link that signs in and returns to THAT replay
 * (/login?next=%2Freplays%3Fplay%3D<id>, NOD pick 4) - no iframe and no
 * YouTube host ever reaches a signed-out response.
 *
 * ?play=<id> lands here as `initialId`, already validated server-side
 * against the saved list (anything else fell back to the newest up
 * there). The saved `id` is the bare 11-char id (the /a card's parser did
 * the parsing at save time - this component never re-parses a URL).
 *
 * The embed is the house's youtube-nocookie idiom, unchanged: a replay
 * keeps autoplay=1, playsinline=1, rel=0 and DROPS mute=1. The top frame
 * is the house's one stage frame (.kit-stage-media with the iframe wearing
 * .kit-stage-viewer-frame); the player and the minis wear the round-2
 * kitx- rules in kit.css (tokens only, the design-drift ratchet).
 */

/** The one place the embed URL is spelled - pinned in tests/replays.test.ts
    so the nocookie host and the no-mute rule can never drift. */
export function replayEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`;
}

const LOVE_COVER = "/images/reading-love-cover.jpg";
const LOVE_COVER_ALT = "Love, with her open book";

/** YouTube's own public poster frame for a video id (signed-in minis only). */
function posterUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** The sign-in door that returns to THIS replay after the code (NOD pick
    4): every small picture carries its id, the newest included, exactly
    as the R3 frame draws it. */
function thumbSignInHref(id: string): string {
  return `/login?next=${encodeURIComponent(`/replays?play=${id}`)}`;
}

export default function ReplaysList({
  replays,
  signedIn,
  initialId,
}: {
  replays: AboutVideo[];
  signedIn: boolean;
  /** server-validated against the saved list; always a member of replays */
  initialId: string;
}) {
  const [currentId, setCurrentId] = useState(initialId);
  const current = replays.find((v) => v.id === currentId) ?? replays[0];
  const newestId = replays[0]?.id ?? "";

  return (
    <div className="card room-card kit-day">
      <div className="kit-card-body">
        <div className="kitx-player kit-stack">
          {signedIn ? (
            <>
              <div className="kit-stage-media">
                <iframe
                  key={current.id}
                  className="kit-stage-viewer-frame"
                  loading="lazy"
                  src={replayEmbedUrl(current.id)}
                  title={`Replay: ${current.title}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <h2 className="kit-h2">{current.title}</h2>
            </>
          ) : (
            <>
              <div className="kit-stage-media">
                <img src={LOVE_COVER} alt={LOVE_COVER_ALT} />
                <span className="kitx-stage-play keep-dark" aria-hidden="true"></span>
              </div>
              <p className="kit-text-quiet">Replays are for our members. A free membership is all it takes.</p>
              <div className="kit-btn-row kitx-actions">
                {/* the top door: plain /replays when the newest is up (the
                    R3 frame); a deep-linked selection returns to THAT id */}
                <a
                  className="kit-btn kit-btn-main kit-btn-sm"
                  href={current.id === newestId ? "/login?next=%2Freplays" : thumbSignInHref(current.id)}
                >
                  Sign in to watch
                </a>
              </div>
            </>
          )}
        </div>
        <ul className="kitx-thumbs kitx-thumbs-mini" aria-label="Replays">
          {replays.map((v) => (
            <li key={v.id}>
              {signedIn ? (
                <button
                  type="button"
                  className="kitx-thumb"
                  aria-current={v.id === current.id ? "true" : undefined}
                  aria-label={`Play ${v.title}`}
                  onClick={() => setCurrentId(v.id)}
                >
                  <span className="kitx-thumb-pic">
                    <img src={posterUrl(v.id)} alt="" width={480} height={270} loading="lazy" />
                    <span className="kitx-thumb-play keep-dark" aria-hidden="true"></span>
                  </span>
                  <span className="kitx-thumb-title">{v.title}</span>
                  {v.id === current.id && <span className="kit-note">Playing now</span>}
                </button>
              ) : (
                <a className="kitx-thumb" href={thumbSignInHref(v.id)} aria-label={`Sign in to watch ${v.title}`}>
                  <span className="kitx-thumb-pic">
                    <img src={LOVE_COVER} alt="" width={480} height={270} loading="lazy" />
                    <span className="kitx-thumb-play keep-dark" aria-hidden="true"></span>
                  </span>
                  <span className="kitx-thumb-title">{v.title}</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
