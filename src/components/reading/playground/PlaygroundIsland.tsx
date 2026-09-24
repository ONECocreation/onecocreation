/* eslint-disable @next/next/no-img-element -- the book art is a static house asset; ReadingStage.tsx carries the same header */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import JitsiRoom from "@/components/booking/JitsiRoom";
import { readSession, readingViewerName } from "@/lib/session-read";
import type { Stage2Decision, Stage2PackageDoor } from "@/lib/stage2-access";

/**
 * THE PLAYGROUND ISLAND (TASK-449, block 968,364; AMENDMENT 1 block
 * 968,366 — Love named the two-way stage "the Playground"; every visible
 * "encore" moved, only the banner's "Want an encore?" stays) — the client
 * half of /reading/playground. The SERVER decides entitlement: this island
 * polls `/api/stage2` no-store every 20 s for DISPLAY (Stage2Door.tsx:66,
 * 187-199's pattern verbatim), renders the wire's decision, and NEVER
 * shows a room name or a raw call link to a viewer the rail refuses — a
 * room mounts only inside the in-call branch, off the join click's own
 * FRESH uncached answer (`fresh.decision === "open" && fresh.reachable &&
 * fresh.room`, Stage2Door.tsx:210-227's pattern).
 *
 * The five states (M19a–e, rulings 3 and 4 applied over the mock): closed
 * (hidden/pre-poll alike), the sign-in gate, the free-member gate (MAIN =
 * the derived tier-B package page, "Try one week" quiet nevermind-weight
 * riding the wire's own itemId — absent `week`, the option simply doesn't
 * render), the entitled ready frame (ONE `Join Love`), and the call
 * itself (Jitsi's own toolbar is the whole control surface — NO page
 * buttons under it). Plus K124's un-mocked sixth: JitsiRoom's onEnded
 * while the wire still says open reads "You left the Playground." with
 * the way back in (a Join Love that re-checks fresh); a poll that says
 * closed reads closed honestly.
 *
 * The known-by name (T-445's creation-time-identity law): ONE readSession
 * read at the accepted click, filtered through `readingViewerName` (an
 * email-local-part fallback is private, never a roster name), snapshotted
 * into `nameSnapshot` — a late session read never restarts a live call.
 *
 * `PlaygroundIslandBody` is the pure presentation (renderToStaticMarkup
 * tests); the default export owns the fetching.
 */

export interface PlaygroundIslandProps {
  jitsiDomain: string;
  /** the derived tier-B package page (the page computes it from
   *  TIER_PAGES — never a literal slug), /memberships on any miss */
  observerHref: string;
  /** the derived tier-B name (TIERS) — the main button's label */
  observerName: string;
  /** the server-composed Stage2Details rows (the server-composed-nodes
   *  idiom — the rail's dynamic imports can never enter a client bundle) */
  stage2Rows: React.ReactNode;
  /** the band's first paint — the server's own read of the same rail
   *  (words only; the body stays fail-closed until the wire answers) */
  initialDecision: Stage2Decision;
  /** the closed band's derived next-reading line (null: schedule off) */
  closedWhen: string | null;
  /** the visitor's package name when their tier clears the door (the
   *  "You're in" line), else null */
  tierName: string | null;
}

/** The band's words (pickup fix round, block 968,393): the kicker, the
 *  when-lines and the quiet line follow the SAME decision the island
 *  renders — the server read them once per request before, so a publish
 *  or unpublish under a seated visitor left the band contradicting the
 *  stage (K122 item 6a's ruling on /reading: only the island knows the
 *  phase). In the call the quiet line drops (M19d draws it null). */
export function playgroundBand(
  decision: Stage2Decision | null,
  inCall: boolean,
  tierName: string | null,
  closedWhen: string | null,
): { kicker: string; whenDay: string; whenTime: string | null; quiet: string | null } {
  if (decision === "open") {
    return {
      kicker: "The Playground · live now",
      whenDay: "Right after the reading",
      whenTime: null,
      quiet: inCall ? null : tierName ? `You're in: ${tierName}` : "A live video call with Love, for members",
    };
  }
  if (decision === "signin" || decision === "package") {
    return {
      kicker: "The Playground · open now",
      whenDay: "Right after the reading",
      whenTime: null,
      quiet: "A live video call with Love, for members",
    };
  }
  return { kicker: "The Playground · closed now", whenDay: "Opens right after the next reading", whenTime: closedWhen, quiet: null };
}

/** The band itself — the page's kicker, h1 and when-lines, rendered by the
 *  island so they move with the wire (fragment children: the sky band's
 *  `.kitx-flow>.kicker` rules still reach them). */
export function PlaygroundBand({ band }: { band: ReturnType<typeof playgroundBand> }) {
  return (
    <>
      <p className="kicker">{band.kicker}</p>
      <h1 className="kit-h1">The Playground with Love</h1>
      <div className="kit-when">
        <p className="kit-when-day">{band.whenDay}</p>
        {band.whenTime && <p className="kit-when-time">{band.whenTime}</p>}
        {band.quiet && <p className="kit-text-quiet">{band.quiet}</p>}
      </div>
    </>
  );
}

/** The wire body `/api/stage2` answers with, as display state (Stage2Door's
 *  own shape minus one field: `decision` is the contract; `reachable` and
 *  `pkg` ride along; `room` is NOT here — the display state structurally
 *  cannot hold a room, the join rides only the click's own fresh answer). */
interface PolledState {
  decision: Stage2Decision | null;
  reachable: boolean | null;
  pkg: Stage2PackageDoor | null;
}

const CLOSED: PolledState = { decision: null, reachable: null, pkg: null };
/** Stage2Door's own cadence (Stage2Door.tsx:66). */
const POLL_MS = 20_000;

function toPolled(d: {
  decision?: Stage2Decision;
  open?: boolean;
  reachable?: boolean | null;
  package?: Stage2PackageDoor | null;
}): PolledState {
  return {
    decision: d.decision ?? (d.open ? "open" : "hidden"),
    reachable: d.reachable ?? null,
    pkg: d.package ?? null,
  };
}

export interface PlaygroundIslandBodyProps {
  wire: PolledState;
  /** T-454: the wire hasn't answered yet AND the server read the stage open
   *  — the body shows the neutral waiting frame (no words, no buttons, no
   *  room) instead of the closed card. Fail-closed still: nothing joins
   *  before the click's own fresh answer. */
  pending?: boolean;
  /** non-null = in the call (M19d) — the room from the CLICK's fresh
   *  answer, never the poll's */
  joinedRoom: string | null;
  /** left while still open (K124's sixth state — decision G) */
  left: boolean;
  /** the known-by name, snapshotted at the accepted click */
  nameSnapshot: string;
  joining: boolean;
  weekBusy: boolean;
  note: string | null;
  jitsiDomain: string;
  observerHref: string;
  observerName: string;
  stage2Rows: React.ReactNode;
  onJoinClick: () => void;
  onTryWeek: (itemId: string) => void;
  onCallEnded: () => void;
}

const BOOK_ALT = "Love's book, its pages curling into a heart, a fairy and a dragon drawn in gold";

export function PlaygroundIslandBody({
  wire,
  pending = false,
  joinedRoom,
  left,
  nameSnapshot,
  joining,
  weekBusy,
  note,
  jitsiDomain,
  observerHref,
  observerName,
  stage2Rows,
  onJoinClick,
  onTryWeek,
  onCallEnded,
}: PlaygroundIslandBodyProps) {
  /* IN THE CALL (M19d, ruling 4) — Jitsi's normal toolbar is the whole
     control surface: NO page buttons under the call. The phone frame
     stands 3:4 (decision B's ONE kit modifier). */
  if (joinedRoom) {
    return (
      <div className="kit-stage">
        <div className="kit-stage-media kit-stage-media--playground">
          {/* pickup fix: the media box is a centring grid, so a bare
              JitsiRoom shrank to its iframe's 300 px default — the
              existing .kit-stage-viewer (absolute, inset 0) fills the
              frame, exactly as JitsiViewer does on /reading */}
          <div className="kit-stage-viewer">
            <JitsiRoom
              domain={jitsiDomain}
              room={joinedRoom}
              displayName={nameSnapshot}
              height="100%"
              onEnded={onCallEnded}
            />
          </div>
          <span className="kit-stage-chip">Live · the Playground</span>
        </div>
      </div>
    );
  }

  const waitingMedia = (
    <div className="kit-stage-media kit-stage-waiting">
      <img src="/images/reading-book.webp" alt={BOOK_ALT} width="1400" height="1017" />
      <span className="kit-stage-chip">Live</span>
    </div>
  );

  /* T-454 — BEFORE THE FIRST ANSWER, with the server's own read saying the
     stage is open: the book waits in the frame, and nothing on the page
     says "closed" or sends the visitor away while the wire is on its way
     (for a paid member that first answer includes a server-side check of
     the meet host, up to ~3 s). */
  if (pending) {
    return <div className="kit-stage">{waitingMedia}</div>;
  }

  /* LEFT WHILE STILL OPEN (K124's words riding M19c's frame — no M-scene
     exists, decision G). Only while the wire still says open; a closed
     poll falls through to the closed card below, honestly. */
  if (left && wire.decision === "open") {
    return (
      <div className="kit-stage">
        {waitingMedia}
        <div className="kit-stage-controls">
          <p className="kit-body">You left the Playground.</p>
          {/* pickup fix: the way back in honours the wire like the open
              branch does — unreachable reads the honest words, and a
              failed re-check's note is said, never swallowed */}
          {wire.reachable ? (
            <div className="kit-btn-row">
              <button type="button" className="kit-btn kit-btn-main" disabled={joining} onClick={onJoinClick}>
                {joining ? "Joining…" : "Join Love"}
              </button>
            </div>
          ) : (
            <p className="kit-body">The Playground isn&apos;t answering right now.</p>
          )}
          {note && <p className="kit-text-quiet">{note}</p>}
        </div>
      </div>
    );
  }

  if (wire.decision === "open") {
    /* ENTITLED (M19c, ruling 4: the button reads Join Love) — or the
       honest unreachable words (Stage2Door.tsx:166-168), never a room */
    return (
      <div className="kit-stage">
        {waitingMedia}
        <div className="kit-stage-controls">
          {wire.reachable ? (
            <>
              <div className="kit-btn-row">
                <button type="button" className="kit-btn kit-btn-main" disabled={joining} onClick={onJoinClick}>
                  {joining ? "Joining…" : "Join Love"}
                </button>
              </div>
              <p className="kit-text-quiet">
                Your browser asks for your camera and mic next. You can turn either off inside the call.
              </p>
            </>
          ) : (
            <p className="kit-body">The Playground isn&apos;t answering right now.</p>
          )}
          {note && <p className="kit-text-quiet">{note}</p>}
        </div>
      </div>
    );
  }

  if (wire.decision === "signin") {
    /* SIGNED OUT (M19a) — Sign in returns here (T-442's safeNextPath rides unchanged) */
    return (
      <div className="kit-card kit-card-body kitx-flow kit-stage2-card">
        <h2 className="kit-h2">Come up and talk with Love</h2>
        <p className="kit-body">
          The Playground is a live video call with Love, camera and mic. It comes with every membership, from Weekly
          Intuitive up, or with a one-week pass.
        </p>
        <div className="kit-btn-row kitx-actions">
          <Link href="/login?next=%2Freading%2Fplayground" className="kit-btn kit-btn-main kit-btn-sm">
            Sign in
          </Link>
          <Link href="/memberships" className="kit-btn kit-btn-second kit-btn-sm">
            See the memberships
          </Link>
        </div>
        {note && <p className="kit-text-quiet">{note}</p>}
        {stage2Rows}
      </div>
    );
  }

  if (wire.decision === "package") {
    /* FREE MEMBER (M19b, ruling 3) — MAIN = the derived tier-B package;
       "Try one week" is quiet nevermind-weight UNDER the actions, riding
       the wire's own week offer (absent → the option simply doesn't
       render, stage2-access.ts:46-50). */
    const week = wire.pkg ? wire.pkg.week : null;
    return (
      <div className="kit-card kit-card-body kitx-flow kit-stage2-card">
        <p className="kicker">Heart Field · your free membership</p>
        <h2 className="kit-h2">The Playground comes with a paid membership</h2>
        <p className="kit-body">Join Weekly Intuitive or above, or try one week, and come straight back here to join Love.</p>
        <div className="kit-btn-row kitx-actions">
          <Link href={observerHref} className="kit-btn kit-btn-main kit-btn-sm">
            {observerName}
          </Link>
          <Link href="/memberships" className="kit-btn kit-btn-second kit-btn-sm">
            See the memberships
          </Link>
        </div>
        {week && (
          <div className="kit-btn-row">
            <button type="button" className="kit-btn kit-btn-quiet" disabled={weekBusy} onClick={() => onTryWeek(week.itemId)}>
              {weekBusy ? "Adding…" : `Try one week — ${week.price}`}
            </button>
          </div>
        )}
        {note && <p className="kit-text-quiet">{note}</p>}
        {stage2Rows}
      </div>
    );
  }

  /* CLOSED (M19e) — `hidden` AND the pre-poll null both read closed */
  return (
    <div className="kit-card kit-card-body kitx-flow kit-stage2-card">
      <h2 className="kit-h2">The Playground is closed right now</h2>
      <p className="kit-body">
        It opens right after each reading, when Love turns it on. Keep the reading open: a banner shows there the
        moment it opens.
      </p>
      <div className="kit-btn-row kitx-actions">
        <Link href="/reading" className="kit-btn kit-btn-second kit-btn-sm">
          Go to the reading
        </Link>
      </div>
      {note && <p className="kit-text-quiet">{note}</p>}
      {stage2Rows}
    </div>
  );
}

export default function PlaygroundIsland({
  jitsiDomain,
  observerHref,
  observerName,
  stage2Rows,
  initialDecision,
  closedWhen,
  tierName,
}: PlaygroundIslandProps) {
  const [wire, setWire] = useState<PolledState>(CLOSED);
  /* the band follows the server's read until the wire first answers,
     then the wire alone (the body is fail-closed from the start) */
  const [answered, setAnswered] = useState(false);
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
  const [nameSnapshot, setNameSnapshot] = useState("Guest");
  const [left, setLeft] = useState(false);
  const [joining, setJoining] = useState(false);
  const [weekBusy, setWeekBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  /* the display poll (Stage2Door.tsx:183-204's pattern verbatim) — paused
     while in the call, resumed the moment it ends; display only, never
     the authorization */
  useEffect(() => {
    if (joinedRoom) return;
    let alive = true;
    function poll() {
      fetch("/api/stage2", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d?.ok) {
            setWire(toPolled(d));
            setAnswered(true);
          }
        })
        .catch(() => {
          /* a missed poll leaves the last-known display state — the
             click-time re-check below is what actually authorizes a
             join, never this poll */
        });
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [joinedRoom]);

  /* the join click's OWN fresh, uncached re-check at the instant of the
     click (Stage2Door.tsx:210-227's pattern) — the fresh answer repaints
     the island at once, and the join rides ONLY the open/reachable/room
     triple. The known-by name is read ONCE here, at the accepted click. */
  async function join() {
    setJoining(true);
    setNote(null);
    try {
      const res = await fetch("/api/stage2", { cache: "no-store" });
      const fresh = res.ok ? await res.json() : null;
      if (fresh?.ok) {
        setWire(toPolled(fresh));
        setAnswered(true);
        if (fresh.decision === "open" && fresh.reachable && fresh.room) {
          const session = await readSession();
          setNameSnapshot(readingViewerName(session));
          setLeft(false);
          setJoinedRoom(fresh.room as string);
        }
      } else {
        setNote("The Playground couldn't be reached just now — try again.");
      }
    } catch {
      setNote("The Playground couldn't be reached just now — try again.");
    } finally {
      setJoining(false);
    }
  }

  /* the one-week pass — the tier page's basket-button fetch shape
     (Stage2Door.tsx:237-254, verbatim), never importing that button */
  async function tryWeek(itemId: string) {
    setWeekBusy(true);
    setNote(null);
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    })
      .then((r) => r.json())
      .catch(() => null);
    if (res?.ok) {
      window.dispatchEvent(new Event("oc-cart-changed"));
      window.location.assign("/cart");
    } else {
      setNote(res?.reason ?? "could not add — try again");
      setWeekBusy(false);
    }
  }

  /* JitsiRoom's end signal while the wire may still say open — K124's
     sixth state: the call unmounts, the honest words + the way back in */
  const callEnded = useCallback(() => {
    setJoinedRoom(null);
    setLeft(true);
  }, []);

  const band = playgroundBand(answered ? wire.decision : initialDecision, joinedRoom !== null, tierName, closedWhen);

  return (
    <>
      <PlaygroundBand band={band} />
      <PlaygroundIslandBody
        wire={wire}
        pending={!answered && initialDecision !== "hidden"}
        joinedRoom={joinedRoom}
        left={left}
        nameSnapshot={nameSnapshot}
        joining={joining}
        weekBusy={weekBusy}
        note={note}
        jitsiDomain={jitsiDomain}
        observerHref={observerHref}
        observerName={observerName}
        stage2Rows={stage2Rows}
        onJoinClick={() => void join()}
        onTryWeek={(itemId) => void tryWeek(itemId)}
        onCallEnded={callEnded}
      />
    </>
  );
}
