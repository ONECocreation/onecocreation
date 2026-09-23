/* eslint-disable @next/next/no-img-element -- the book art is a static house asset; reading/page.tsx carries the same header */
"use client";

import { useEffect, useRef, useState } from "react";
import JitsiRoom from "@/components/booking/JitsiRoom";
import Stage2Door from "@/components/rooms/Stage2Door";
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
 * The phase-control law (Amendment 1): each phase has exactly ONE primary
 * control — closed has none, published has "Watch Love live", watching has
 * only the two small kit-btn-quiet tools (Full screen and Leave), failed
 * has "Try again", ended has "Watch again" only while the room is still
 * published. The book art is in closed, published and ended; there is no
 * <img> of it while watching (JitsiViewer replaces it in the SAME frame).
 *
 * THE SINGLE-EMBED CONDITIONAL (StageView.tsx:150-163's pattern): joining
 * Stage 2 unmounts the Stage 1 viewer and mounts the UNCHANGED JitsiRoom
 * in its place — one embed on the page at a time; "Leave Stage 2 · back
 * to the reading" is always visible while joined and re-polls at once
 * (never an auto-restart of Stage 1).
 *
 * `ReadingStageBody` is the pure presentation (renderToStaticMarkup
 * tests); the default export owns the fetching.
 *
 * The Stage 2 details arrive PRE-RENDERED from the server page
 * (`stage2Details`) — Stage2Details reads the entitlement rail, whose
 * dynamic `redis` import can never enter a client bundle, so this island
 * only decides the card's visibility and never imports it.
 */

export interface ReadingStageProps {
  initialPhase: "closed" | "prepared" | "published";
  next: { startsAtMs: number; endsAtMs: number } | null;
  scheduleTz: string;
  jitsiDomain: string;
  /** the server-rendered Stage2Details — visibility is the island's only say */
  stage2Details: React.ReactNode;
}

export interface ReadingStageBodyProps {
  phase: "closed" | "published";
  watching: boolean;
  failed: boolean;
  ended: boolean;
  room: string | null;
  stage2Room: string | null;
  jitsiDomain: string;
  nextWords: string | null;
  /** the server-rendered Stage2Details (null renders nothing extra) */
  stage2Details: React.ReactNode;
  onWatch: () => void;
  onTryAgain: () => void;
  onLeave: () => void;
  onFullScreen: () => void;
  onLeaveStage2: () => void;
  onJoinStage2: (room: string) => void;
  /** the frame Full screen requests — the island owns the ref. */
  frameRef?: React.RefObject<HTMLDivElement | null>;
  /** JitsiViewer's farewell events (its hangup, or the host ending the
   *  call) — the island marks the reading ended; defaults to Leave. */
  onViewerEnded?: () => void;
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

const BOOK_ALT = "Love's book, its pages curling into a heart, a fairy and a dragon drawn in gold";

export function ReadingStageBody({
  phase,
  watching,
  failed,
  ended,
  room,
  stage2Room,
  jitsiDomain,
  nextWords,
  stage2Details,
  onWatch,
  onTryAgain,
  onLeave,
  onFullScreen,
  onLeaveStage2,
  onJoinStage2,
  frameRef,
  onViewerEnded,
  onViewerFailed,
}: ReadingStageBodyProps) {
  /* the Stage 2 card's visibility (the approved sheets): once the reading
     is live, once it has ended, and for the whole time Stage 2 itself is
     joined — a fresh closed visitor sees the book and the welcome only */
  const showStage2Card = phase === "published" || ended || stage2Room !== null;
  return (
    <>
      {stage2Room ? (
        /* THE SINGLE-EMBED CONDITIONAL — Stage 2 rides the SAME frame,
           the Stage 1 viewer is gone */
        <div className="kit-stage" ref={frameRef}>
          <div className="kit-stage-media">
            <JitsiRoom domain={jitsiDomain} room={stage2Room} height="100%" />
          </div>
          <div className="kit-stage-controls kit-stage-controls-slim">
            <div className="kit-stage-tools">
              <button type="button" className="kit-btn kit-btn-quiet" onClick={onLeaveStage2}>
                Leave Stage 2 · back to the reading
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {phase === "published" && !ended && <p className="kit-body kit-stage-live-line">Love is live now</p>}
          <div className="kit-stage" ref={frameRef}>
            {watching && room ? (
              <div className="kit-stage-media">
                <JitsiViewer
                  domain={jitsiDomain}
                  room={room}
                  onEnded={onViewerEnded ?? onLeave}
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
            {watching && room ? (
              <div className="kit-stage-controls kit-stage-controls-slim">
                <div className="kit-stage-tools">
                  <button type="button" className="kit-btn kit-btn-quiet" onClick={onFullScreen}>
                    Full screen
                  </button>
                  <button type="button" className="kit-btn kit-btn-quiet" onClick={onLeave}>
                    Leave
                  </button>
                </div>
              </div>
            ) : failed ? (
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
                {nextWords && <p className="kit-text-quiet">{`The next reading is ${nextWords}.`}</p>}
                {phase === "published" && (
                  <div className="kit-btn-row">
                    <button type="button" className="kit-btn kit-btn-main" onClick={onWatch}>
                      Watch again
                    </button>
                  </div>
                )}
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
        </>
      )}
      {showStage2Card && (
        <div className="kit-card kit-card-body kitx-flow kit-stage2-card">
          {stage2Details}
          <Stage2Door
            jitsiDomain={jitsiDomain}
            joined={stage2Room !== null}
            onJoin={onJoinStage2}
            signInHref="/login?next=%2Freading"
          />
        </div>
      )}
    </>
  );
}

const POLL_MS = 20_000;

export default function ReadingStage({ initialPhase, next, scheduleTz, jitsiDomain, stage2Details }: ReadingStageProps) {
  /* prepared is PRIVATE — a visitor's phase is closed until published */
  const [phase, setPhase] = useState<"closed" | "published">(initialPhase === "published" ? "published" : "closed");
  const [room, setRoom] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ended, setEnded] = useState(false);
  const [stage2Room, setStage2Room] = useState<string | null>(null);
  const phaseRef = useRef(phase);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const pollNow = useRef<() => void>(() => {});

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
            setEnded(true);
          }
          phaseRef.current = nextPhase;
          setPhase(nextPhase);
        })
        .catch(() => {
          /* a missed poll leaves the last-known display state — the Watch
             click's own fresh fetch is what actually mounts a room */
        });
    }
    pollNow.current = poll;
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
      } else {
        /* the stage moved between the last paint and this click — a fresh
           closed reads as ended, and nothing mounts */
        phaseRef.current = "closed";
        setPhase("closed");
        setRoom(null);
        setWatching(false);
        setEnded(true);
      }
    } catch {
      setFailed(true);
    }
  }

  function leave() {
    setWatching(false); // a Leave is never an ending — the stage may still be live
  }

  function tryAgain() {
    setFailed(false);
    void watch();
  }

  function fullScreen() {
    try {
      void frameRef.current?.requestFullscreen();
    } catch {
      /* the tool is a courtesy — the viewer stays exactly where they were */
    }
  }

  function joinStage2(roomName: string) {
    /* the single-embed conditional — the Stage 1 viewer unmounts HERE */
    setWatching(false);
    setStage2Room(roomName);
  }

  function leaveStage2() {
    setStage2Room(null);
    pollNow.current(); // the reading's own fresh truth at once — never an auto-restart
  }

  const nextWords = next
    ? new Intl.DateTimeFormat("en-US", { timeZone: scheduleTz, weekday: "long", month: "long", day: "numeric" }).format(
        new Date(next.startsAtMs),
      )
    : null;

  return (
    <ReadingStageBody
      phase={phase}
      watching={watching}
      failed={failed}
      ended={ended}
      room={room}
      stage2Room={stage2Room}
      jitsiDomain={jitsiDomain}
      nextWords={nextWords}
      stage2Details={stage2Details}
      onWatch={() => void watch()}
      onTryAgain={tryAgain}
      onLeave={leave}
      onFullScreen={fullScreen}
      onLeaveStage2={leaveStage2}
      onJoinStage2={joinStage2}
      frameRef={frameRef}
      onViewerEnded={() => {
        setWatching(false);
        setEnded(true);
      }}
      onViewerFailed={() => {
        setWatching(false);
        setFailed(true);
      }}
    />
  );
}
