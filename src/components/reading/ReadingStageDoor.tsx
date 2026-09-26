/* eslint-disable @next/next/no-img-element -- the book art is the same static house asset ReadingStage.tsx carries */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import JitsiRoom from "@/components/booking/JitsiRoom";

/**
 * THE GENERIC PAID-DOOR TOP SCREEN (TASK-473, block 968,624; course
 * change, same block — "ONE screen on /reading, join or leave any room
 * there while signed in, nobody goes to /rooms"). Parts 3 and 4 are BOTH
 * gated pilot rooms with the SAME wire contract: `{ok, open, decision,
 * reachable?, room?}` from a public status route — `/api/stage2` for
 * Part 3, `/api/qa-door` for Part 4 (T-475, mirrors `/api/stage2`
 * verbatim, min tier C). This ONE component reads whichever `door` its
 * caller names and renders the shared four states: closed (waiting
 * picture + the part's time), signed out (the page's own sign-in), not
 * owned (the caller's own `notOwned` node — price + `ReadingDayUnlockButton`,
 * composed by the caller so this file never imports `EncoreFloorDoor`/
 * `QaDoor` directly), and live (JitsiRoom mounted in place, exactly one
 * conference, disposed on hangup/switch).
 *
 * `/api/qa-door` doesn't exist yet (T-475, a separate lane) — a 404 or a
 * failed fetch never updates `wire` off its CLOSED default, so Part 4
 * honestly shows closed (or, once entitlement data exists, its offer
 * state) until that lane lands. `ReadingStagePart3`/`ReadingStagePart4`
 * are now thin callers of this one file, never a second implementation.
 *
 * `ReadingStageDoorBody` is the pure presentation (renderToStaticMarkup
 * tests, every wire state); the default export owns the fetching — the
 * same split `ReadingStage.tsx` already established.
 *
 * TASK-487 (block 968,624+, the Admiral's ruling, option C) — THE SITE
 * SWITCH REPLACES THE JITSI-EVENT GUESS, the same way `ReadingStage.tsx`
 * changes: `Wire.camera` (`"shown" | "hidden" | null`) now drives the
 * cover, never `JitsiRoom`'s `onHostVideo`/`hostVideoReducer` signal.
 * That reducer's CODE stays in `JitsiRoom.tsx` untouched; `onHostVideo`
 * is simply no longer passed from this mount either (see the comment at
 * the JitsiRoom mount below). The poll cadence also speeds up to ~5s
 * while the door is open (a camera flip must appear quickly) — see the
 * default export's own `POLL_MS_LIVE`/`POLL_MS_WAITING`.
 */

export type ReadingDoorKind = "housewarming" | "stage2" | "qa";

export interface Wire {
  decision: "hidden" | "signin" | "package" | "open" | null;
  reachable: boolean | null;
  room: string | null;
  /** TASK-487 — present only alongside a real `room` string (the member
   *  routes' own rule: camera never rides the envelope without a room to
   *  show it for). Absent (or any other value) reads as hidden. */
  camera?: "shown" | "hidden" | null;
}

export const CLOSED: Wire = { decision: null, reachable: null, room: null, camera: null };
/* TASK-487: TWO cadences off the same one poll (never a second timer) —
   20s while the door isn't open, 5s once it is (a camera flip must
   appear quickly). */
const POLL_MS_WAITING = 20_000;
const POLL_MS_LIVE = 5_000;

export const DOOR_COVER_SRC = "/images/reading-love-cover.jpg";
const COVER_ALT = "Love, by Leo Buscaglia: the word LOVE in white over a swirling violet and rose nebula";

export interface ReadingStageDoorBodyProps {
  wire: Wire;
  jitsiDomain: string;
  whenWords: string | null;
  label: string;
  /** fix round (block 968,624, the Admiral's Chrome walk) — "the top
   *  screen must say which part it's showing": the FULL label
   *  ("2:22 PM MDT · The book talk") the caller composes from the SAME
   *  `clockWords()` the agenda row already reads — never a second
   *  literal. Null only when the schedule is off. */
  partLabel: string | null;
  notOwned: ReactNode;
  left: boolean;
  onEnded: () => void;
  onRejoin: () => void;
  /** TASK-487 (block 968,624+, the Admiral's ruling, option C): the
   *  default export's own read of the door's `camera` field — the SITE
   *  SWITCH, never a Jitsi participant-event guess. Defaults to `false`
   *  (fail CLOSED), replacing TASK-479's `hostVideoOn` prop, which this
   *  lane retires from this file. */
  cameraShown?: boolean;
  /** TASK-488: whether THIS viewer has joined the call yet (JitsiRoom's
   *  `onJoined`) — the picture never hides Jitsi's prejoin Join button.
   *  Defaults to `true` (the picture rule as before). */
  joined?: boolean;
  /** TASK-488: JitsiRoom's own join signal, passed straight through. */
  onJoined?: (joined: boolean) => void;
}

export function ReadingStageDoorBody({
  wire,
  jitsiDomain,
  whenWords,
  label,
  partLabel,
  notOwned,
  left,
  onEnded,
  onRejoin,
  cameraShown = false,
  joined = true,
  onJoined,
}: ReadingStageDoorBodyProps) {
  const showRoom = wire.decision === "open" && wire.reachable === true && !!wire.room && !left;
  /* TASK-487: same rule as ReadingStage.tsx — the book stays over the
     mounted (still-listening) room until Love's own site switch says her
     camera is shown. `cameraShown` defaults false (fail CLOSED). */
  /* TASK-488: and never over Jitsi's prejoin screen (its Join button) */
  const coverUp = showRoom && joined && !cameraShown;
  const cap = `${label[0].toUpperCase()}${label.slice(1)}`;
  /* fix round (block 968,624) — the chip ALWAYS names the part (when the
     schedule gives one); "Live · " only rides while the door is actually
     open (and the visitor hasn't left it). */
  const isLive = wire.decision === "open" && !left;
  const chipText = partLabel ? (isLive ? `Live · ${partLabel}` : partLabel) : isLive ? "Live" : null;

  return (
    <div className="kit-stage">
      {showRoom ? (
        <div className={coverUp ? "kit-stage-media kit-stage-waiting kit-stage-waiting--cover" : "kit-stage-media"}>
          <div className="kit-stage-viewer">
            {/* TASK-487: onHostVideo deliberately NOT passed here any more
                — the cover is driven by `cameraShown` (the door's own
                site-switch poll), never JitsiRoom's own onHostVideo/
                hostVideoReducer signal. That reducer's CODE stays in
                JitsiRoom.tsx untouched; this mount just stops using it. */}
            <JitsiRoom domain={jitsiDomain} room={wire.room as string} onEnded={onEnded} onJoined={onJoined} height="100%" guestView />
          </div>
          {coverUp && (
            <div className="kit-stage-cover">
              <img src={DOOR_COVER_SRC} alt={COVER_ALT} width="600" height="358" />
            </div>
          )}
          {chipText && <span className="kit-stage-chip">{chipText}</span>}
        </div>
      ) : (
        <div className="kit-stage-media kit-stage-waiting kit-stage-waiting--cover">
          <img src={DOOR_COVER_SRC} alt={COVER_ALT} width="600" height="358" />
          {chipText && <span className="kit-stage-chip">{chipText}</span>}
        </div>
      )}
      {coverUp && (
        /* TASK-479: no fake "Tap for sound" button — see ReadingStage.tsx's
           own comment (FEASIBILITY.md §4); the cover's own click-through
           layer above is the real mechanism, this is a plain hint. */
        <div className="kit-stage-controls kit-stage-controls-slim">
          <p className="kit-body">Love is here. Her camera comes on in a moment.</p>
          <p className="kit-text-quiet">No sound? Tap the screen.</p>
        </div>
      )}
      {!showRoom && (
        <div className="kit-stage-controls">
          {wire.decision === "open" && left ? (
            <>
              <p className="kit-body">{`You left ${label}.`}</p>
              <div className="kit-btn-row">
                <button type="button" className="kit-btn kit-btn-main kit-btn-sm" onClick={onRejoin}>
                  {`Back to ${label}`}
                </button>
              </div>
            </>
          ) : wire.decision === "open" ? (
            <p className="kit-body">{`${cap} can't connect right now.`}</p>
          ) : wire.decision === "package" ? (
            notOwned
          ) : wire.decision === "signin" ? (
            <>
              <p className="kit-body">{`${cap} is live now. Sign in with your email and come straight back here to join it.`}</p>
              <div className="kit-btn-row">
                <Link href="#sign-up" className="kit-btn kit-btn-main kit-btn-sm">
                  Sign me up
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="kit-body">{`${cap} is not live yet.`}</p>
              {whenWords && <p className="kit-text-quiet">{`Opens ${whenWords}.`}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export interface ReadingStageDoorProps {
  door: ReadingDoorKind;
  jitsiDomain: string;
  /** "2:22 PM MDT" / "3:33 PM MDT" — null only when the schedule is off */
  whenWords: string | null;
  /** the words used in the door's own sentences, e.g. "the book talk" /
   *  "the Q&A" */
  label: string;
  /** fix round (block 968,624) — see ReadingStageDoorBodyProps */
  partLabel: string | null;
  /** the not-owned card's own body — price line(s) + `ReadingDayUnlockButton`,
   *  composed by the caller from its own door data (EncoreFloorDoor /
   *  QaDoor) — never re-derived here. */
  notOwned: ReactNode;
}

/** Which public route each door polls — the ONE place this mapping is
 *  written (tests pin this). TASK-481: `"housewarming"` added minimally
 *  beside the existing two cases. */
export function doorPath(door: ReadingDoorKind): string {
  if (door === "housewarming") return "/api/housewarming-door";
  return door === "stage2" ? "/api/stage2" : "/api/qa-door";
}

export default function ReadingStageDoor({
  door,
  jitsiDomain,
  whenWords,
  label,
  partLabel,
  notOwned,
}: ReadingStageDoorProps) {
  const path = doorPath(door);
  const [wire, setWire] = useState<Wire>(CLOSED);
  const [left, setLeft] = useState(false);
  /* TASK-488: JitsiRoom reports false on every boot, true once joined */
  const [joined, setJoined] = useState(false);

  /* TASK-471 (block 968,624): a recursive setTimeout (never setInterval)
     so the delay before the NEXT fetch can depend on what THIS fetch just
     found — TASK-487: 5s once the door's decision is "open" (a camera
     flip must appear quickly), 20s otherwise. Still exactly ONE poll loop
     for this route; nothing here doubles it. */
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastDecision: Wire["decision"] = null;
    function poll() {
      fetch(path, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          /* a 404 (T-475 not live yet) or any failed read never updates the
             wire off its CLOSED default — honestly closed, never guessed. */
          if (!alive || !d?.ok) return;
          const decision = d.decision ?? (d.open ? "open" : "hidden");
          lastDecision = decision;
          setWire({
            decision,
            reachable: d.reachable ?? null,
            room: d.room ?? null,
            camera: d.camera === "shown" ? "shown" : d.camera === "hidden" ? "hidden" : null,
          });
        })
        .catch(() => {
          /* a missed poll leaves the last-known display state */
        })
        .finally(() => {
          if (alive) timer = setTimeout(poll, lastDecision === "open" ? POLL_MS_LIVE : POLL_MS_WAITING);
        });
    }
    poll();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [path]);

  /* the hangup unmounts the embed in THIS commit (the TASK-471 review
     law) — no farewell-card flash while the fresh state comes back */
  const onEnded = useCallback(() => setLeft(true), []);
  /* TASK-487: no cameraShown reset needed on rejoin any more — that
     value comes from the door's own polled `wire.camera`, never from
     JitsiRoom's per-mount reducer state, so there is nothing stale to
     clear here. */
  const onRejoin = useCallback(() => setLeft(false), []);

  return (
    <ReadingStageDoorBody
      wire={wire}
      jitsiDomain={jitsiDomain}
      whenWords={whenWords}
      label={label}
      partLabel={partLabel}
      notOwned={notOwned}
      left={left}
      onEnded={onEnded}
      onRejoin={onRejoin}
      cameraShown={wire.camera === "shown"}
      joined={joined}
      onJoined={setJoined}
    />
  );
}
