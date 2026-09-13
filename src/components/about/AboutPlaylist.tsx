"use client";

import { useEffect, useReducer, useRef } from "react";
import type { AboutVideo } from "@/lib/about-content";
import { initialPlaylistState, reduce, type PlaylistEvent, type PlaylistState } from "./about-playlist-machine";

/**
 * TASK-215 (0018.06.23 a₿, Love's call #23) — the About playlist, HOVER not
 * CLICK, cycling through once. Was a native `<details>`/`<summary>` accordion
 * (a click was required to toggle any entry but the first); now a hover-
 * driven single-open list, backed by the pure state machine in
 * about-playlist-machine.ts. An idle timer stands in for "the video
 * finished" (no YouTube postMessage API, no new dependency) — DWELL_MS is
 * generous enough to actually watch, short enough to keep cycling. Reaching
 * the last video marks the pass done; the machine refuses to restart it
 * from there, hover included — "plays through once and does not restart".
 *
 * The header is a real <button> (onMouseEnter AND onFocus) so a keyboard/
 * screen-reader visitor can reach every entry, not only a mouse.
 */
const DWELL_MS = 45_000;

export default function AboutPlaylist({ videos }: { videos: AboutVideo[] }) {
  const [state, dispatch] = useReducer(
    (s: PlaylistState, e: PlaylistEvent) => reduce(s, e, videos.length),
    initialPlaylistState,
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (state.done || videos.length <= 1) return;
    timer.current = setTimeout(() => dispatch({ type: "advance" }), DWELL_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state.index, state.done, videos.length]);

  if (videos.length === 0) return null;

  return (
    <div className="about-playlist">
      {videos.map((v, i) => {
        const active = i === state.index;
        return (
          <div key={v.id} className={`about-video${active ? " is-active" : ""}`}>
            <button type="button" className="about-video-head"
              onMouseEnter={() => dispatch({ type: "hover", index: i })}
              onFocus={() => dispatch({ type: "hover", index: i })}
              aria-expanded={active}>
              {v.title}
            </button>
            {active && (
              <div style={{ position: "relative", aspectRatio: v.ratio }}>
                <iframe
                  loading="lazy"
                  src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&mute=1`}
                  title={`Love — ${v.title}`}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
