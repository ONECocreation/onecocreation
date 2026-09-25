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
 * TASK-457 (block 968,543) — REVERSAL of the earlier ruling that retired
 * the Heart Field doors from /reading (the Admiral, block 968,516: Love
 * only ever goes live in the Heart Field; /reading keeps its own page but
 * every Watch control now LINKS there instead of mounting the stream in
 * place). Every control that used to call `onWatch` (published, ended-
 * while-published, left-while-published) is now a `Link` to
 * `/rooms/heart-field` with the same label; the class was uniform `kit-btn
 * kit-btn-main` until TASK-464 (block 968,548) added `kit-btn-sm` to the
 * published control alone (ended/left keep the full-size class) — the
 * room's own door does the sign-in + return trip (`middleware.ts` +
 * `door-machine.ts`, unread here). The closed state gains its own such
 * link, "Go to the Heart Field". `onWatch` and
 * the click-time fresh-fetch `watch()` stay wired (still reachable from
 * Try again → tryAgain() → watch()) — dead-path removal of the in-place
 * viewer mount is the after-Saturday tidy lane, not this one.
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
 * TASK-466 (block 968,561) — the Admiral's three notes on the block
 * picture: (1) every button on the card is the SAME size now — "Try
 * again" and the ended/left "Watch again" pick up `kit-btn-sm` too, the
 * one class every other control here already carries; (2) the ended
 * sentence's em dash is slop — it is now two sentences, "The reading has
 * ended." then, on its own line, "Thank you for being here."; the failed
 * sentence loses its own dash the same way. (3) "Watch again" is RETIRED
 * on the ended card — there is no replay right now — replaced in BOTH
 * ended variants (still published, or closed underneath) by one link
 * onward to part two, `/reading/playground` ("Watch part two in the
 * Playground"). That page already owns sign-in, the package door and the
 * join for real; this link and its lock are display only. A visitor who
 * doesn't yet clear the Playground's floor (`playgroundLock`, computed
 * server-side in reading/page.tsx the exact way `/api/stage2/route.ts`'s
 * GET does — never re-implemented here) sees a quiet lock glyph ahead of
 * the label and, in words underneath (never the icon alone — the
 * legibility doctrine), who it's for. The ended card's own link steps
 * aside when the Playground banner is ALREADY showing its own door
 * (`playgroundOpen`) — never two Playground buttons on one page. The
 * "left" state (K122 item 8) is untouched beyond the size: rejoining the
 * LIVE show is not a replay, so its Heart Field link and label stay.
 * Every button row here was ALREADY centered by kit.css
 * (`.kit-stage-controls .kit-btn-row` and the banner's own `.kitx-
 * actions`) — no new centering rule was needed. `tests/reading-
 * polish-466.test.ts` carries this lane's own new pins; `reading-
 * stage.test.ts`, `reading-watch-heart-field-457.test.ts` and `reading-
 * small-watch-464.test.ts` carry the re-trued old-shape pins.
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
  /** TASK-466 (block 968,561) — the server's own read of whether THIS
   *  visitor already clears the Playground's floor, computed in reading/
   *  page.tsx the exact way `/api/stage2/route.ts`'s GET does
   *  (`tierForSubject` then `tierSatisfies` against `STAGE2_MIN_TIER`) —
   *  never re-implemented here. Display only: the ended card's Playground
   *  link always goes to `/reading/playground`, which re-decides for
   *  real. `floorName` reads `TIERS[STAGE2_MIN_TIER].name` — never a
   *  literal tier name, so the words stay true once TASK-465 moves the
   *  floor from A to B. */
  playgroundLock: { locked: boolean; floorName: string };
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
  /** TASK-466 — see ReadingStageProps. Read only on the ended card's own
   *  Playground link: locked shows the lock glyph + the quiet floor
   *  words, entitled shows neither. */
  playgroundLock: { locked: boolean; floorName: string };
  /** the server-composed countdown nodes — see ReadingStageProps */
  countdown: React.ReactNode;
  countdownWhen: React.ReactNode;
  /** TASK-457 (block 968,543): kept for the wired component's click-time
   *  fresh-fetch (`watch()`, still reachable from Try again) — no control
   *  in `ReadingStageBody` calls it any more; every former Watch control
   *  is now a plain `Link` to `/rooms/heart-field`. */
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

/* T-456 (block 968,445, the Admiral): until Love goes live, /reading waits
   on the cover of the book she is reading ("Love BOOK.jpeg"). The
   Playground, the home page and the Heart Field keep the heart-book art. */
const COVER_SRC = "/images/reading-love-cover.jpg";
const COVER_ALT = "Love, by Leo Buscaglia: the word LOVE in white over a swirling violet and rose nebula";

/* TASK-466 (block 968,561, ruling 1) — the ended card's lock glyph: a
   quiet inline padlock ahead of "Watch part two in the Playground" for a
   visitor who doesn't clear its floor yet. Decorative only (aria-hidden)
   — the words underneath still say who it's for IN WORDS, never the icon
   alone (the legibility doctrine). The house's own inline-SVG shape
   (WildDoors.tsx's INSTAGRAM_GLYPH): no icon dependency, `currentColor`
   so it always matches the link's own ink. */
const PLAYGROUND_LOCK_ICON = (
  <svg className="kit-lock-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

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
  playgroundLock,
  countdown,
  countdownWhen,
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
          <div className="kit-stage-media kit-stage-waiting kit-stage-waiting--cover">
            <img src={COVER_SRC} alt={COVER_ALT} width="600" height="358" />
            {phase === "published" && !ended && !failed && <span className="kit-stage-chip">Live</span>}
          </div>
        )}
        {watching && room ? null : failed ? (
          <div className="kit-stage-controls">
            {/* TASK-466: two sentences, no dash (ruling 2's shape) */}
            <p className="kit-body">The picture didn&apos;t open just now. The reading itself is fine on our side.</p>
            <div className="kit-btn-row">
              {/* TASK-466: every button here is the small kit button now */}
              <button type="button" className="kit-btn kit-btn-main kit-btn-sm" onClick={onTryAgain}>
                Try again
              </button>
            </div>
          </div>
        ) : ended ? (
          <div className="kit-stage-controls">
            {/* TASK-466 (block 968,561, ruling 2): the em dash was slop —
                two sentences, the second on its own line */}
            <p className="kit-body">The reading has ended.</p>
            <p className="kit-body">Thank you for being here.</p>
            {/* K122 item 13 — with no date (the schedule off) the words
                promise one soon instead of naming one */}
            <p className="kit-text-quiet">
              {nextWords ? `The next reading is ${nextWords}.` : "Love will share the next reading date soon."}
            </p>
            {/* TASK-466 (block 968,561, ruling 1): "Watch again" is
                retired in BOTH ended variants (still published, or closed
                underneath) — there is no replay right now. One door
                onward instead, to part two; the lock and quiet floor
                words are display only (the Playground page's own door
                decides for real). Steps aside only when the banner below
                is ALREADY showing its own Playground door — never two on
                one page. */}
            {!playgroundOpen && (
              <>
                <div className="kit-btn-row">
                  <Link href="/reading/playground" className="kit-btn kit-btn-main kit-btn-sm">
                    {playgroundLock.locked && PLAYGROUND_LOCK_ICON}
                    Watch part two in the Playground
                  </Link>
                </div>
                {playgroundLock.locked && (
                  <p className="kit-text-quiet">Part two is for {playgroundLock.floorName} members and up.</p>
                )}
              </>
            )}
          </div>
        ) : left ? (
          /* K122 item 8 — the viewer's own hangup on a STILL-PUBLISHED
             stage: honest words and the way back in, never the ended
             words. Rejoining the LIVE show is not a replay (TASK-466
             left this branch alone beyond the one-size rule). */
          <div className="kit-stage-controls">
            <p className="kit-body">You left the reading.</p>
            <div className="kit-btn-row">
              <Link href="/rooms/heart-field" className="kit-btn kit-btn-main kit-btn-sm">
                Watch again
              </Link>
            </div>
          </div>
        ) : phase === "published" ? (
          /* TASK-457 (block 968,543): Love only ever goes live in the Heart
             Field now — this link sends the visitor there; the room's own
             door does the sign-in + return trip. */
          <div className="kit-stage-controls">
            {/* TASK-464: the small kit button — kit-btn never wraps, and at
                full size this label ran 3 px past the card on a 360 px
                phone */}
            <div className="kit-btn-row">
              <Link href="/rooms/heart-field" className="kit-btn kit-btn-main kit-btn-sm">
                Watch Love live
              </Link>
            </div>
            <p className="kit-text-quiet">
              It plays in the Heart Field. Sign in with your email if you haven&apos;t yet. It&apos;s free.
            </p>
          </div>
        ) : (
          <div className="kit-stage-controls">
            <p className="kit-body">
              The reading is live to watch, free. Want to join the discussion? Stay after for a live group video
              call with Love.
            </p>
            {/* TASK-457 (block 968,543): the closed state gets its own way
                to the Heart Field too, ahead of the schedule going live */}
            <div className="kit-btn-row">
              {/* TASK-463: the small kit button — kit-btn never wraps, and
                  at full size this label clipped inside the card on a
                  360 px phone */}
              <Link href="/rooms/heart-field" className="kit-btn kit-btn-main kit-btn-sm">
                Go to the Heart Field
              </Link>
            </div>
            <p className="kit-text-quiet">
              The reading plays in the Heart Field. Your Watch button appears right here when Love goes live.
            </p>
          </div>
        )}
      </div>
      {/* THE PLAYGROUND BANNER (TASK-449 — ruling 1's words, no arrow):
          after the stage, in every phase, only while Stage 2 is open */}
      {playgroundOpen && (
        <div className="kit-card kit-card-body kitx-flow kit-stage2-card">
          <p className="kicker">The Playground</p>
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
  playgroundLock,
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
          /* T-454: a failed read keeps the last-known state (it used to
             write undefined — a state change, a re-render) */
          if (alive && d?.ok) setPlaygroundOpen(d.open === true);
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
  /* T-454: STABLE identities — JitsiViewer's boot effect depends on
     [domain, room, onEnded, onFailed], so a new function on any re-render
     tore every watcher's picture down and rejoined the room. T-449's
     banner poll made that re-render real: the moment Love opened the
     Playground, every /reading watcher dropped and rejoined (the same bug
     T-450's pickup fixed in StageView). Setters and markEnded are stable. */
  const viewerEnded = useCallback(() => {
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
  }, [markEnded]);

  const viewerFailed = useCallback(() => {
    setWatching(false);
    setFailed(true);
  }, []);

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
      playgroundLock={playgroundLock}
      countdown={countdown}
      countdownWhen={countdownWhen}
      onWatch={() => void watch()}
      onTryAgain={tryAgain}
      onViewerEnded={viewerEnded}
      onViewerFailed={viewerFailed}
    />
  );
}
