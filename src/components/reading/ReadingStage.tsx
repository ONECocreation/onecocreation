/* eslint-disable @next/next/no-img-element -- the book art is a static house asset; reading/page.tsx carries the same header */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import JitsiRoom from "@/components/booking/JitsiRoom";
import ReadingPartSelectLink from "./ReadingPartSelectLink";
import { useReadingPart } from "./ReadingPartContext";

/**
 * READING STAGE (TASK-438, block 968,222; HOLD LIFTED block 968,269) —
 * the /reading island: Stage 1, in place.
 *
 * TASK-471 (block 968,624) — Love's first live reading is tomorrow. The
 * Admiral's ruling: Stage 1 becomes TWO-WAY and lives ON /reading. When
 * Stage 1 is published and the viewer is signed in, this island mounts
 * `JitsiRoom` (the same two-way embed the Playground already uses) in
 * place of the waiting picture — never `JitsiViewer` (that component is
 * WATCH-ONLY, one-way, and is retired from this page). Signed out: the
 * page's own sign-in box (`#sign-up`, below the stage) is the one way in,
 * never a link elsewhere. Before live: the book art waiting picture
 * stays. Jitsi's own prejoin screen (device permissions + a Join click) IS
 * the join gesture — there is no separate site "Watch" click any more, and no
 * site "Try again": a script-load failure is JitsiRoom's own to report
 * (its "open it directly" fallback), not re-implemented here.
 *
 * EVERY "Go to the Heart Field" door is RETIRED from this file (ruling 2):
 * closed and published both used to Link to `/rooms/heart-field`; now
 * neither does — the room IS this page. TASK-457's reversal (block
 * 968,543, "Love only ever goes live in the Heart Field") is itself
 * reversed by this ruling; `tests/reading-watch-heart-field-457.test.ts`,
 * `reading-small-watch-464.test.ts` and `reading-buttons-phone-463.test.ts`
 * carry this lane's re-trued pins.
 *
 * The phase-control law still holds where it still applies: closed has no
 * control, the room's own toolbar (fullscreen, hang-up, chat — Jitsi's,
 * never a page control) is the only control while showing the room, left
 * offers one in-page "Back to the reading" (no navigation — it just
 * remounts the same room).
 *
 * TASK-473 (block 968,624, the Admiral's flow ruling) — this file is now
 * ONE of four screens `ReadingStageDeck` can mount ("the video changes to
 * the correct one" as the visitor picks a time on the agenda); it stays
 * completely unchanged in its OWN prop contract (parts 1 and 2 share this
 * one door). Two things this ruling DID retire from here: the old
 * "encore" banner, shown whenever Stage 2 was open — gone, its job is now
 * the agenda's own single notice line, `ReadingDayOpenNotice` — and the
 * ended card's Link to `/reading/playground` (now
 * `ReadingPartSelectLink`, an in-page pick of Part 3 — no address on
 * /reading points at `/reading/playground` any more).
 *
 * `ReadingStageBody` is the pure presentation (renderToStaticMarkup
 * tests); the default export owns the fetching.
 */

export interface ReadingStageProps {
  initialPhase: "closed" | "prepared" | "published";
  /** the server's own read of whether THIS visitor is signed in (the same
   *  cookie read reading/page.tsx already does for the Playground lock) —
   *  the two-way embed never mounts for a signed-out visitor. */
  signedIn: boolean;
  next: { startsAtMs: number; endsAtMs: number } | null;
  /** the occurrence AFTER next (K122 item 7) — the ended words name the
   *  next reading, never the one that just ended */
  following: { startsAtMs: number; endsAtMs: number } | null;
  scheduleTz: string;
  jitsiDomain: string;
  /** the server-composed blocks countdown — rendered only while CLOSED
   *  (K122 item 6a: the counting stops the moment the phase says otherwise) */
  countdown: React.ReactNode;
  /** the when-lines companion — rendered while live/left, never in
   *  ended (the ended words name the date themselves) */
  countdownWhen: React.ReactNode;
  /** TASK-466 (block 968,561) — the server's own read of whether THIS
   *  visitor already clears the Playground's floor, computed in reading/
   *  page.tsx the exact way `/api/stage2/route.ts`'s GET does
   *  (`tierForSubject` then `tierSatisfies` against `STAGE2_MIN_TIER`) —
   *  never re-implemented. Display only: the ended card's Playground
   *  link always goes to `/reading/playground`, which re-decides for
   *  real. `floorName` reads `TIERS[STAGE2_MIN_TIER].name` — never a
   *  literal. */
  playgroundLock: { locked: boolean; floorName: string };
  /** fix round (block 968,624, the Admiral's Chrome walk) — "the top
   *  screen must say which part it's showing": the FULL label strings
   *  ReadingDayBody's own rows already carry ("12:12 PM MDT · The
   *  Housewarming" / "1:11 PM MDT · The Reading"), computed once in
   *  reading/page.tsx from the SAME `clockWords()` call — never a second
   *  literal. Null only when the schedule itself is off. The default
   *  export picks between the two off the shared selection (parts 1/2
   *  share this one door, but the visitor picked ONE of the two rows). */
  housewarmingLabel: string | null;
  readingLabel: string | null;
}

export interface ReadingStageBodyProps {
  phase: "closed" | "published";
  signedIn: boolean;
  /** the ONE room string the poll's own fresh read gives while published —
   *  null until it arrives (a brief first-paint gap), or once the stage
   *  closes. A room is never re-implemented or guessed here. */
  room: string | null;
  jitsiDomain: string;
  /** the viewer left a STILL-PUBLISHED stage (their own hangup, K122 item
   *  8) — "You left the reading." + a Back button, never the ended words */
  left: boolean;
  ended: boolean;
  nextWords: string | null;
  /** fix round (block 968,624) — see ReadingStageProps; already resolved
   *  to the ONE label the default export's own `selected` picked. Null
   *  only when the schedule is off (no clock words to show at all). */
  partLabel: string | null;
  /** TASK-466 — see ReadingStageProps. Read only on the ended card's own
   *  Playground link: locked shows the lock glyph + the quiet floor
   *  words, entitled shows neither. */
  playgroundLock: { locked: boolean; floorName: string };
  /** the server-composed countdown nodes — see ReadingStageProps */
  countdown: React.ReactNode;
  countdownWhen: React.ReactNode;
  /** JitsiRoom's own farewell event (its hangup, or Love ending the call)
   *  — the island re-reads the stage's fresh truth: left-while-published,
   *  or ended (K122 item 8). */
  onRoomEnded: () => void;
  /** the "left" card's own Back button — no navigation, no re-fetch: it
   *  simply remounts the same still-published room. */
  onRejoin: () => void;
}

/** The wire body `/api/stage1` answers with (its exact four keys). */
interface Stage1Wire {
  ok: boolean;
  phase: string;
  room: string | null;
  jitsiDomain: string | null;
}

/** The poll's fresh answer is the only thing that can name a room:
 *  published WITH a non-empty room string -> that room; anything else —
 *  prepared, closed, a failed read, a published body without one — is
 *  null, and a stale read never mounts a stale room. */
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
   quiet inline padlock ahead of "Watch part two" for a visitor who
   doesn't clear the Playground's floor yet. Decorative only (aria-hidden)
   — the words underneath still say who it's for IN WORDS, never the icon
   alone (the legibility doctrine). */
const PLAYGROUND_LOCK_ICON = (
  <svg className="kit-lock-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export function ReadingStageBody({
  phase,
  signedIn,
  room,
  jitsiDomain,
  left,
  ended,
  nextWords,
  playgroundLock,
  countdown,
  countdownWhen,
  onRoomEnded,
  onRejoin,
  partLabel,
}: ReadingStageBodyProps) {
  /* the ONE gate for mounting the real two-way room: published, signed
     in, not left, not ended, and a room the poll actually gave us. */
  const showRoom = phase === "published" && signedIn && !left && !ended && !!room;
  /* fix round (block 968,624) — the chip ALWAYS names the part (when the
     schedule gives one); "Live · " only rides while actually published
     and not ended, the same condition the old bare "Live" chip used. */
  const isLive = phase === "published" && !ended;
  const chipText = partLabel ? (isLive ? `Live · ${partLabel}` : partLabel) : isLive ? "Live" : null;

  return (
    <>
      {/* the countdown rides the island now (K122 item 6a): the cells only
          while closed, the when-lines until ended, NEITHER in ended */}
      {phase === "closed" && !ended ? countdown : !ended ? countdownWhen : null}
      {phase === "published" && !ended && <p className="kit-body kit-stage-live-line">Love is live now</p>}
      <div className="kit-stage">
        {showRoom ? (
          <div className="kit-stage-media">
            <div className="kit-stage-viewer">
              <JitsiRoom domain={jitsiDomain} room={room as string} onEnded={onRoomEnded} height="100%" />
            </div>
            {chipText && <span className="kit-stage-chip">{chipText}</span>}
          </div>
        ) : (
          <div className="kit-stage-media kit-stage-waiting kit-stage-waiting--cover">
            <img src={COVER_SRC} alt={COVER_ALT} width="600" height="358" />
            {chipText && <span className="kit-stage-chip">{chipText}</span>}
          </div>
        )}
        {showRoom ? null : ended ? (
          <div className="kit-stage-controls">
            {/* TASK-466: two sentences, no dash (ruling 2's shape) */}
            <p className="kit-body">The reading has ended.</p>
            <p className="kit-body">Thank you for being here.</p>
            {/* K122 item 13 — with no date (the schedule off) the words
                promise one soon instead of naming one */}
            <p className="kit-text-quiet">
              {nextWords ? `The next reading is ${nextWords}.` : "Love will share the next reading date soon."}
            </p>
            {/* TASK-473 (block 968,624): the visitor picks Part 3 IN PAGE
                now — never a Link to /reading/playground (that address is
                retired from every door on /reading). */}
            <div className="kit-btn-row">
              <ReadingPartSelectLink part={3}>
                {playgroundLock.locked && PLAYGROUND_LOCK_ICON}
                Watch part two
              </ReadingPartSelectLink>
            </div>
            {playgroundLock.locked && (
              <p className="kit-text-quiet">Part two is for {playgroundLock.floorName} members and up.</p>
            )}
          </div>
        ) : left ? (
          /* K122 item 8 — the viewer's own hangup on a STILL-PUBLISHED
             stage: honest words and an in-page way back in (remount, not
             a link away — TASK-471 retired the Heart Field door here). */
          <div className="kit-stage-controls">
            <p className="kit-body">You left the reading.</p>
            <div className="kit-btn-row">
              <button type="button" className="kit-btn kit-btn-main kit-btn-sm" onClick={onRejoin}>
                Back to the reading
              </button>
            </div>
          </div>
        ) : phase === "published" && !signedIn ? (
          /* TASK-471 (block 968,624): signed out meets the page's own
             sign-in box, never a link elsewhere. */
          <div className="kit-stage-controls">
            <p className="kit-body">
              Love is live now, free to watch. Sign in with your email and come straight back here to join her.
            </p>
            <div className="kit-btn-row">
              <Link href="#sign-up" className="kit-btn kit-btn-main kit-btn-sm">
                Sign me up
              </Link>
            </div>
          </div>
        ) : phase === "published" ? (
          /* signed in, published, but the poll's fresh room hasn't landed
             yet (a brief first-paint gap) — honest, no room guessed */
          <div className="kit-stage-controls">
            <p className="kit-text-quiet">Opening the room…</p>
          </div>
        ) : (
          <div className="kit-stage-controls">
            <p className="kit-body">
              The reading is live to watch, free. Want to join the discussion? Stay after for a live group video
              call with Love.
            </p>
            <p className="kit-text-quiet">
              It plays right here, everyone in view. Your seat opens the moment Love goes live.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

const POLL_MS = 20_000;

export default function ReadingStage({
  initialPhase,
  signedIn,
  next,
  following,
  scheduleTz,
  jitsiDomain,
  countdown,
  countdownWhen,
  playgroundLock,
  housewarmingLabel,
  readingLabel,
}: ReadingStageProps) {
  /* fix round (block 968,624) — parts 1/2 share this one door, but the
     chip names whichever ROW the visitor actually picked. */
  const { selected } = useReadingPart();
  const partLabel = selected === 2 ? readingLabel : housewarmingLabel;
  /* prepared is PRIVATE — a visitor's phase is closed until published */
  const [phase, setPhase] = useState<"closed" | "published">(initialPhase === "published" ? "published" : "closed");
  const [room, setRoom] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [left, setLeft] = useState(false);
  /* the ended words' date — computed ONLY in handlers (the purity rule
     never meets Date.now() in render), and only ever rendered in the
     ended branch, so SSR and the first client paint agree */
  const [nextWords, setNextWords] = useState<string | null>(null);
  const phaseRef = useRef(phase);

  /* K122 item 7 + the purity law — the ended words name the NEXT reading
     (the FOLLOWING occurrence once the clock is at or past next's start),
     computed here in handler-land, never in render. */
  const markEnded = useCallback(() => {
    setLeft(false);
    setRoom(null);
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

  /* TASK-471 (block 968,624): the room mounts IN PLACE now — the poll
     itself is the fresh authorization (no separate click-time fetch, no
     "Watch" gesture; Jitsi's own prejoin screen is the join gesture). */
  useEffect(() => {
    let alive = true;
    function poll() {
      fetch("/api/stage1", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Stage1Wire | null) => {
          if (!alive || !d?.ok) return;
          const nextPhase: "closed" | "published" = d.phase === "published" ? "published" : "closed";
          const wasPublished = phaseRef.current === "published";
          phaseRef.current = nextPhase;
          setPhase(nextPhase);
          if (wasPublished && nextPhase === "closed") {
            /* the stage closed under us — the viewer leaves on THIS poll */
            markEnded();
            return;
          }
          if (nextPhase === "published") {
            /* the fresh room, every poll — the poll IS the authorization
               now (no separate click-time fetch) */
            setRoom(stage1WatchTarget(d));
            if (!wasPublished) {
              /* a FRESH publish (closed -> published) clears any
                 ended/left flag left over from an earlier occurrence */
              setEnded(false);
              setLeft(false);
            }
          }
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
  }, [markEnded]);

  /* K122 item 8 — a viewer's own hangup is NEVER assumed to be "the
     reading has ended": the stage's own fresh truth decides. Still
     published -> "You left the reading." + Back to the reading (an
     in-page remount); only a closed or expired stage shows the ended
     words. */
  const roomEnded = useCallback(() => {
    /* TASK-471 review: unmount the embed in THIS commit (PlaygroundIsland's
       callEnded law), so JitsiRoom's own farewell card never flashes; the
       re-check below only corrects "left" to "ended" when the stage closed */
    setLeft(true);
    fetch("/api/stage1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Stage1Wire | null) => {
        if (d?.ok && d.phase === "published") {
          const target = stage1WatchTarget(d);
          setRoom(target);
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

  /* the "left" card's Back button — no navigation, no re-fetch: the room
     string from the hangup's own fresh re-check is still good, so this
     simply remounts JitsiRoom against it. */
  const rejoin = useCallback(() => {
    setLeft(false);
  }, []);

  return (
    <ReadingStageBody
      phase={phase}
      signedIn={signedIn}
      room={room}
      jitsiDomain={jitsiDomain}
      left={left}
      ended={ended}
      nextWords={nextWords}
      playgroundLock={playgroundLock}
      countdown={countdown}
      countdownWhen={countdownWhen}
      onRoomEnded={roomEnded}
      onRejoin={rejoin}
      partLabel={partLabel}
    />
  );
}
