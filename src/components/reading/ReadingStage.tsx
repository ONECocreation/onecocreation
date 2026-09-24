/* eslint-disable @next/next/no-img-element -- the book art is a static house asset; reading/page.tsx carries the same header */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import JitsiViewer from "@/components/reading/JitsiViewer";

/**
 * READING STAGE (TASK-438, block 968,222; HOLD LIFTED block 968,269) —
 * the /reading island: Watch, then room 2. The page SSRs the PHASE ONLY
 * (phase-only SSR — never a room, never a host URL); the island polls
 * `/api/stage1` every 20 s, and the Watch click does its OWN fresh
 * no-store fetch and mounts ONLY the fresh answer's room
 * (`stage1WatchTarget` — a click past a close, a midnight-Denver expiry,
 * or a rotation never replays a stale room).
 *
 * The phase-control law (block 968,349): closed has no page control,
 * published has "Watch Love live", watching has no page control because
 * Jitsi's toolbar (fullscreen + hang-up) is the control — the Admiral:
 * redundant with the player's own hover buttons. Failed has "Try again",
 * left-while-published (K122 item 8 — a hangup is not an
 * ending) has "Watch again", ended has "Watch again" only while the room
 * is still published. The book art is in closed, published and ended;
 * there is no <img> of it while watching (JitsiViewer replaces it in the
 * SAME frame).
 *
 * THE PLAYGROUND BANNER (TASK-449, block 968,364; AMENDMENT 1 block
 * 968,366): Stage 2 has its own address now — /reading/playground. The
 * in-place Stage 2 card and the single-embed branch are REPLACED by this
 * banner, shown in EVERY phase (watching, ended, closed — K124 §3) while
 * the island's own 20 s `/api/stage2` poll says Stage 2 is open
 * (`d?.ok && d.open === true`, the anonymous-safe key), gone the poll
 * after Love closes. Ruling 1's words, no arrow, no emoji, no idle
 * motion, no click effect. The banner is display only — the Playground
 * page's island re-decides everything at its own door.
 *
 * `ReadingStageBody` is the pure presentation (renderToStaticMarkup
 * tests); the default export owns the fetching.
 */

export interface ReadingStageProps {
  initialPhase: "closed" | "prepared" | "published";
  next: { startsAtMs: number; endsAtMs: number } | null;
  /** the occurrence AFTER next (K122 item 7) — the ended words name the
   *  next reading, never the one that just ended */
  following: { startsAtMs: number; endsAtMs: number } | null;
  scheduleTz: string;
  jitsiDomain: string;
  /** the server-composed blocks countdown — rendered only while CLOSED
   *  (K122 item 6a: the counting stops the moment the phase says otherwise) */
  countdown: React.ReactNode;
  /** the when-lines companion — rendered while live/failed/left, never in
   *  ended (the ended words name the date themselves) */
  countdownWhen: React.ReactNode;
}

export interface ReadingStageBodyProps {
  phase: "closed" | "published";
  watching: boolean;
  failed: boolean;
  ended: boolean;
  /** the viewer left a STILL-PUBLISHED stage (K122 item 8) — "You left
   *  the reading." + Watch again, never the ended words */
  left: boolean;
  room: string | null;
  jitsiDomain: string;
  nextWords: string | null;
  /** the Playground banner's open truth (the island's own /api/stage2
   *  poll) — the banner shows in every phase while Stage 2 is open */
  playgroundOpen: boolean;
  /** the server-composed countdown nodes — see ReadingStageProps */
  countdown: React.ReactNode;
  countdownWhen: React.ReactNode;
  onWatch: () => void;
  onTryAgain: () => void;
  /** JitsiViewer's farewell events (its hangup, or the host ending the
   *  call) — the island re-reads the stage's fresh truth: left-while-
   *  published, or ended (K122 item 8). */
  onViewerEnded: () => void;
  /** JitsiViewer's script-load failure — the island marks failed. */
  onViewerFailed?: () => void;
}

/** The wire body `/api/stage1` answers with (its exact four keys). */
interface Stage1Wire {
  ok: boolean;
  phase: string;
  room: string | null;
  jitsiDomain: string | null;
}

/** The click's fresh answer is the only thing that can mount a room:
 *  published WITH a non-empty room string -> that room; anything else —
 *  prepared, closed, a failed read, a published body without one — is
 *  null, and a fresh-click rejection never mounts. */
export function stage1WatchTarget(body: Stage1Wire | null): string | null {
  if (!body?.ok || body.phase !== "published") return null;
  return typeof body.room === "string" && body.room.length > 0 ? body.room : null;
}

/** K122 item 7 — which occurrence the island's words name: `next` before
 *  its start, the FOLLOWING one once the clock is at or past the start
 *  (a visitor who loaded before or during the reading must never be told
 *  the reading that just ended is "the next reading"). */
export function readingShownNext(
  next: { startsAtMs: number; endsAtMs: number } | null,
  following: { startsAtMs: number; endsAtMs: number } | null,
  nowMs: number,
): { startsAtMs: number; endsAtMs: number } | null {
  if (next && following && nowMs >= next.startsAtMs) return following;
  return next;
}

const BOOK_ALT = "Love's book, its pages curling into a heart, a fairy and a dragon drawn in gold";

export function ReadingStageBody({
  phase,
  watching,
  failed,
  ended,
  left,
  room,
  jitsiDomain,
  nextWords,
  playgroundOpen,
  countdown,
  countdownWhen,
  onWatch,
  onTryAgain,
  onViewerEnded,
  onViewerFailed,
}: ReadingStageBodyProps) {
  return (
    <>
      {/* the countdown rides the island now (K122 item 6a): the cells only
          while closed, the when-lines until ended, NEITHER in ended */}
      {phase === "closed" && !ended ? countdown : !ended ? countdownWhen : null}
      {phase === "published" && !ended && <p className="kit-body kit-stage-live-line">Love is live now</p>}
      <div className="kit-stage">
        {watching && room ? (
          <div className="kit-stage-media">
            <JitsiViewer
              domain={jitsiDomain}
              room={room}
              onEnded={onViewerEnded}
              onFailed={onViewerFailed ?? (() => {})}
            />
            <span className="kit-stage-chip">Live</span>
          </div>
        ) : (
          <div className="kit-stage-media kit-stage-waiting">
            <img src="/images/reading-book.webp" alt={BOOK_ALT} width="1400" height="1017" />
            {phase === "published" && !ended && !failed && <span className="kit-stage-chip">Live</span>}
          </div>
        )}
        {watching && room ? null : failed ? (
          <div className="kit-stage-controls">
            <p className="kit-body">The picture didn&apos;t open just now — the reading itself is fine on our side.</p>
            <div className="kit-btn-row">
              <button type="button" className="kit-btn kit-btn-main" onClick={onTryAgain}>
                Try again
              </button>
            </div>
          </div>
        ) : ended ? (
          <div className="kit-stage-controls">
            <p className="kit-body">The reading has ended — thank you for being here.</p>
            {/* K122 item 13 — with no date (the schedule off) the words
                promise one soon instead of naming one */}
            <p className="kit-text-quiet">
              {nextWords ? `The next reading is ${nextWords}.` : "Love will share the next reading date soon."}
            </p>
            {phase === "published" && (
              <div className="kit-btn-row">
                <button type="button" className="kit-btn kit-btn-main" onClick={onWatch}>
                  Watch again
                </button>
              </div>
            )}
          </div>
        ) : left ? (
          /* K122 item 8 — the viewer's own hangup on a STILL-PUBLISHED
             stage: honest words and the way back in, never the ended words */
          <div className="kit-stage-controls">
            <p className="kit-body">You left the reading.</p>
            <div className="kit-btn-row">
              <button type="button" className="kit-btn kit-btn-main" onClick={onWatch}>
                Watch again
              </button>
            </div>
          </div>
        ) : phase === "published" ? (
          <div className="kit-stage-controls">
            <div className="kit-btn-row">
              <button type="button" className="kit-btn kit-btn-main" onClick={onWatch}>
                Watch Love live
              </button>
            </div>
            <p className="kit-text-quiet">One tap starts her picture and sound.</p>
          </div>
        ) : (
          <div className="kit-stage-controls">
            <p className="kit-body">
              The reading is live to watch, free. Want to join the discussion? Stay after for a live group video
              call with Love.
            </p>
            <p className="kit-text-quiet">Your Watch button appears right here when Love goes live.</p>
          </div>
        )}
      </div>
      {/* THE PLAYGROUND BANNER (TASK-449 — ruling 1's words, no arrow):
          after the stage, in every phase, only while Stage 2 is open */}
      {playgroundOpen && (
        <div className="kit-card kit-card-body kitx-flow kit-stage2-card">
          <p className="kicker">Stage 2 · the Playground</p>
          <h2 className="kit-h2">Want an encore?</h2>
          <p className="kit-body">
            Love is opening the Playground now: a live video call right after the reading. Come up and talk with her.
          </p>
          <div className="kit-btn-row kitx-actions">
            <Link href="/reading/playground" className="kit-btn kit-btn-main kit-btn-sm">
              Go to the Playground
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

const POLL_MS = 20_000;

export default function ReadingStage({
  initialPhase,
  next,
  following,
  scheduleTz,
  jitsiDomain,
  countdown,
  countdownWhen,
}: ReadingStageProps) {
  /* prepared is PRIVATE — a visitor's phase is closed until published */
  const [phase, setPhase] = useState<"closed" | "published">(initialPhase === "published" ? "published" : "closed");
  const [room, setRoom] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ended, setEnded] = useState(false);
  const [left, setLeft] = useState(false);
  /* the ended words' date — computed ONLY in handlers (the purity rule
     never meets Date.now() in render), and only ever rendered in the
     ended branch, so SSR and the first client paint agree */
  const [nextWords, setNextWords] = useState<string | null>(null);
  /* TASK-449 — the banner's own open truth (display only; the Playground
     page's island re-decides at its own door) */
  const [playgroundOpen, setPlaygroundOpen] = useState(false);
  const phaseRef = useRef(phase);

  /* K122 item 7 + the purity law — the ended words name the NEXT reading
     (the FOLLOWING occurrence once the clock is at or past next's start),
     computed here in handler-land, never in render. */
  const markEnded = useCallback(() => {
    setLeft(false);
    const shown = readingShownNext(next, following, Date.now());
    setNextWords(
      shown
        ? new Intl.DateTimeFormat("en-US", { timeZone: scheduleTz, weekday: "long", month: "long", day: "numeric" }).format(
            new Date(shown.startsAtMs),
          )
        : null,
    );
    setEnded(true);
  }, [next, following, scheduleTz]);

  useEffect(() => {
    let alive = true;
    function poll() {
      fetch("/api/stage1", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Stage1Wire | null) => {
          if (!alive || !d?.ok) return;
          const nextPhase: "closed" | "published" = d.phase === "published" ? "published" : "closed";
          if (phaseRef.current === "published" && nextPhase === "closed") {
            /* the stage closed under us — the viewer leaves on THIS poll */
            setWatching(false);
            setRoom(null);
            markEnded();
          }
          phaseRef.current = nextPhase;
          setPhase(nextPhase);
        })
        .catch(() => {
          /* a missed poll leaves the last-known display state — the Watch
             click's own fresh fetch is what actually mounts a room */
        });
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [markEnded]);

  /* TASK-449 — the Playground banner's own poll (the same 20 s cadence
     the Stage 2 door uses; a sibling poll, not a shared one): the banner
     shows in EVERY phase while Stage 2 is open and goes the poll after
     Love closes. The anonymous-safe key is `d.open` — an anonymous
     visitor learns only whether the door is open, never a room. */
  useEffect(() => {
    let alive = true;
    function poll() {
      fetch("/api/stage2", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive) setPlaygroundOpen(d?.ok && d.open === true);
        })
        .catch(() => {
          /* a missed poll leaves the last-known display state */
        });
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  /* the Watch click's OWN fresh, uncached re-check at the instant of the
     click — the poll above is display only, never the authorization */
  async function watch() {
    try {
      const res = await fetch("/api/stage1", { cache: "no-store" });
      const body = res.ok ? ((await res.json()) as Stage1Wire) : null;
      const target = stage1WatchTarget(body);
      if (target) {
        phaseRef.current = "published";
        setPhase("published");
        setRoom(target);
        setWatching(true);
        setFailed(false);
        setEnded(false);
        setLeft(false);
      } else {
        /* the stage moved between the last paint and this click — a fresh
           closed reads as ended, and nothing mounts */
        phaseRef.current = "closed";
        setPhase("closed");
        setRoom(null);
        setWatching(false);
        markEnded();
      }
    } catch {
      setFailed(true);
    }
  }

  /* K122 item 8 — a viewer's own hangup is NEVER assumed to be "the
     reading has ended": the stage's own fresh truth decides. Still
     published -> "You left the reading." + Watch again; only a closed or
     expired stage shows the ended words. */
  function viewerEnded() {
    setWatching(false);
    setRoom(null);
    fetch("/api/stage1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Stage1Wire | null) => {
        if (d?.ok && d.phase === "published") {
          setEnded(false);
          setLeft(true);
        } else {
          markEnded();
        }
      })
      .catch(() => {
        /* a failed re-check can't know — the ended words are the honest
           fallback, never a "still live" claim on a guess */
        markEnded();
      });
  }

  function tryAgain() {
    setFailed(false);
    void watch();
  }

  return (
    <ReadingStageBody
      phase={phase}
      watching={watching}
      failed={failed}
      ended={ended}
      left={left}
      room={room}
      jitsiDomain={jitsiDomain}
      nextWords={nextWords}
      playgroundOpen={playgroundOpen}
      countdown={countdown}
      countdownWhen={countdownWhen}
      onWatch={() => void watch()}
      onTryAgain={tryAgain}
      onViewerEnded={viewerEnded}
      onViewerFailed={() => {
        setWatching(false);
        setFailed(true);
      }}
    />
  );
}
