"use client";

import { useState } from "react";
import type { AboutVideo } from "@/lib/about-content";

/**
 * TASK-496 (block 969,088+) - the Replays list, podcast style: one row per
 * saved replay, title first; tap Play and THAT row unfolds its player,
 * one open at a time; the iframe exists only while its row is open (a
 * closed list mounts no frame at all, and the browser never touches
 * YouTube until the visitor asks).
 *
 * The embed is the house's youtube-nocookie idiom (AboutPlaylist.tsx /
 * AboutFeatured.tsx), with one ruled difference: a replay the visitor
 * TAPPED to hear keeps `autoplay=1`, `playsinline=1`, `rel=0` and DROPS
 * `mute=1`. The saved `id` is already the bare 11-char id (the /a card's
 * parseYoutubeInput did the parsing at save time - this component never
 * re-parses a URL).
 *
 * THE FRAME IS THE HOUSE'S ONE STAGE FRAME: `.kit-stage-media` (16/9) with
 * the iframe wearing `.kit-stage-viewer-frame` (absolute inset:0) - the
 * same frame /reading's stage uses. The brief's "aspect from ratio" would
 * need either a new CSS rule or an inline style, and this lane may add
 * neither (the template-first law; the design-drift ratchet); a portrait
 * (Shorts-shaped) replay letterboxes inside YouTube's own player, and the
 * saved `ratio` still rides the doc untouched for any future consumer.
 * Recorded in SUMMARY as the brief-vs-code correction.
 *
 * All classes are the existing kit/house vocabulary: the card is the
 * public agenda brick's own `card room-card kit-day` (ReadingDayBody.tsx),
 * the rows are `kit-rows` with one control on `kit-rows-end`, the player
 * rides as the open row's own third child (the kit-row-link placement
 * idiom - `.kit-rows>li`'s grid auto-places it under the words, and
 * room-card's phone rule stacks the row so the player goes full width).
 */

/** The one place the embed URL is spelled - pinned in tests/replays.test.ts
    so the nocookie host and the no-mute rule can never drift. */
export function replayEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`;
}

export default function ReplaysList({ replays }: { replays: AboutVideo[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="card room-card kit-day">
      <div className="kit-card-body">
        <ul className="kit-rows" aria-label="Replays">
          {replays.map((v) => {
            const open = openId === v.id;
            return (
              <li key={v.id} data-row={v.id}>
                <span>
                  <b>{v.title}</b>
                  <em>{open ? "Playing now" : "Tap Play and it opens right here"}</em>
                </span>
                <span className="kit-rows-end">
                  {open ? (
                    <button
                      type="button"
                      className="kit-btn kit-btn-second kit-btn-sm"
                      aria-expanded="true"
                      onClick={() => setOpenId(null)}
                    >
                      Close
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="kit-btn kit-btn-main kit-btn-sm"
                      aria-expanded="false"
                      onClick={() => setOpenId(v.id)}
                    >
                      Play
                    </button>
                  )}
                </span>
                {open && (
                  <div className="kit-stage-media">
                    <iframe
                      className="kit-stage-viewer-frame"
                      loading="lazy"
                      src={replayEmbedUrl(v.id)}
                      title={`Replay: ${v.title}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
