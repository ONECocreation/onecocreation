/**
 * THE ABOUT PLAYLIST — a pure state machine (TASK-215, 0018.06.23 a₿,
 * Love's call #23: "opens on hover, not click"; "cycles the videos, plays
 * through once and does not restart"). Same shape as door-machine.ts
 * (reduce(state, event) — pinned at the model, not the render, tests/
 * about-playlist-cycle.test.ts).
 *
 * The rule in one paragraph: the playlist opens on the FIRST video by
 * default (the old details-open-by-default parity). Hovering an entry
 * jumps straight to it — no click required. Independently, an idle timer
 * ADVANCEs the open entry forward through the list once; reaching the end
 * marks the pass DONE and holds on the last video — it never wraps back
 * to the first. Once done, every further hover is a no-op: the playlist
 * played through once and does not restart.
 */

export interface PlaylistState {
  /** the entry currently open/playing */
  index: number;
  /** true once the auto-cycle has reached the last entry — the pass is over */
  done: boolean;
}

export type PlaylistEvent =
  /** the visitor's pointer (or focus) lands on entry `index` */
  | { type: "hover"; index: number }
  /** the idle timer fired — advance to the next entry, or finish */
  | { type: "advance" };

export const initialPlaylistState: PlaylistState = { index: 0, done: false };

/** `count` is the number of videos — the machine never needs the videos
 *  themselves, only how many there are. */
export function reduce(state: PlaylistState, event: PlaylistEvent, count: number): PlaylistState {
  // played through once — nothing restarts it, hover included
  if (state.done) return state;
  if (count <= 0) return state;

  if (event.type === "hover") {
    if (event.index < 0 || event.index >= count || event.index === state.index) return state;
    return { index: event.index, done: false };
  }

  // "advance"
  const next = state.index + 1;
  if (next >= count) return { index: state.index, done: true }; // hold on the last — no wrap, no restart
  return { index: next, done: false };
}
