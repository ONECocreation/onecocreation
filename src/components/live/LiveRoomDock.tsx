/* eslint-disable @next/next/no-img-element -- the book cover is the same static house asset ReadingStage.tsx carries */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Sheet from "@/components/Sheet";
import JitsiRoom from "@/components/booking/JitsiRoom";
import JitsiViewer from "@/components/reading/JitsiViewer";
import { READING_COVER_SRC } from "@/lib/reading-cover";
import { useLiveRooms } from "./LiveRoomContext";

/**
 * THE LIVE-ROOM DOCK (T-639 BUILD, K184 block 972,965 — ruling A on desk
 * card 972844-oc-mockup-t-639: build the mockup, with Number One's fixes).
 * The layout-owned HOST: it renders the REAL embed (JitsiRoom guestView for
 * a "twoway" session — the TASK-477 keys, guest toolbar, prejoin on;
 * JitsiViewer for a "watch" session — Guest, the T-448 keys) once, keyed by
 * identity + mountKey, INSIDE one window element that never moves in the
 * DOM. The window restyles between the drawn states — stage (fixed exactly
 * over the owning bridge's rect, while that rect is on screen), dock
 * (bottom-right; on a phone a small strip above the bottom edge, tap to
 * grow), shade (the title bar alone, sound on), float (undocked, dragged
 * by the bar, position remembered) — and the iframe inside never reloads.
 *
 * Number One's fixes (K184 items 1-8), where they landed:
 *   1. every bar control is a WORD (Shrink/Grow, Undock/Dock, Close) with
 *      an aria-label, one size per group — no bare glyphs anywhere;
 *   2. the phone strip is uncramped: the full title, "Tap to grow" on one
 *      line, Close — the Back link stays in the grown card only (the
 *      disclosed drop);
 *   3. the leave Sheet is maxWidth 520 with the pair on flex:1 + nowrap —
 *      "Leave the reading" sits on one line at 1440 AND 390;
 *   4. the rejoin card serves ALL guests (ruling A) and self-dismisses at
 *      11 seconds (ruling E), keeping its close control;
 *   5. under /a the dock (and its card) paint nothing — the lrd-hidden
 *      class, NOT an unmount, so the room survives an operator's own
 *      console visit (ruling C is about what the console SHOWS);
 *   6. while the phone strip shows, <html> wears lrd-strip-on and the page
 *      grows bottom padding of 56px strip + 8px gap + the safe-area inset
 *      (ruling B) — the strip never covers a page control;
 *   7. the embeds are the real rooms (above);
 *   8. ?livedock=test on ANY non-production page joins a real meet.jit.si
 *      test room ("the dock test") — the iPhone check needs no live
 *      reading. The switch is read once per page visit, never hijacks a
 *      real session, and never fires on the production hostnames.
 *
 * The leave Sheet and the rejoin card are PORTALED to document.body (a
 * fixed window inside any glass/transformed ancestor is trapped — T-637's
 * lesson). The Sheet closes on Escape and a tap outside by adoption.
 * The inks ride the always-night popup family (--pop-bg/--pop-edge/
 * --pop-shadow + the --pop-ink/--pop-pink/--pop-rose pins beside them in
 * cartridge.css) because the card never theme-flips (TASK-398's law); the
 * Sheet's own surface DOES flip, so its words keep --gold-deep. All rules
 * carry the lrd- prefix and live in kit.css (a new .tsx gets a ZERO
 * hand-typed-colour allowance from the design-drift ratchet, and the
 * reading-look law forbids literals in the kit additions — so no inline
 * <style> block here).
 */

/** ruling E (block 972,844): the rejoin card dismisses itself at 11 s. */
export const REJOIN_DISMISS_MS = 11_000;

const FLOAT_POS_KEY = "oc-lrd-pos";
const COVER_ALT = "Love, by Leo Buscaglia: the word LOVE in white over a swirling violet and rose nebula";

/** item 8 — the operator/preview-only test room. meet.jit.si is the public
 *  Jitsi: zero risk to the house's own moderated server, and prejoin is on
 *  there by default (the camera-allow path is exactly what the iPhone
 *  check walks). */
const TEST_DOMAIN = "meet.jit.si";
const TEST_ROOM = "OneCocreationDockTest";
const PRODUCTION_HOSTS = ["onecocreation.com", "www.onecocreation.com"];

type Mode = "dock" | "shade" | "float";

export default function LiveRoomDock() {
  const live = useLiveRooms();
  const pathname = usePathname();
  const session = live?.session ?? null;
  const phase = live?.phase ?? "live";
  const [mode, setMode] = useState<Mode>("dock");
  const [grown, setGrown] = useState(false);
  const [asking, setAsking] = useState(false);
  /* a remembered float position survives the session (desk-dock's idiom) —
     lazy-init, not an effect (eslint's set-state-in-effect law); it only
     ever styles float mode, so SSR and the first client paint agree */
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const raw = typeof window === "undefined" ? null : localStorage.getItem(FLOAT_POS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  /* the embeds' boot effects depend on their callbacks' identities (the
     T-454 lesson — an unstable onEnded re-boots the room), so every callback
     handed to JitsiRoom/JitsiViewer is a []-stable ref reader. */
  const liveRef = useRef(live);
  useEffect(() => {
    liveRef.current = live;
  });
  const endFromEmbed = useCallback(() => liveRef.current?.endSession(), []);
  const failFromEmbed = useCallback(() => liveRef.current?.failSession(), []);
  const joinedFromEmbed = useCallback((joined: boolean) => liveRef.current?.joinedFromEmbed(joined), []);

  /* ruling C — the console never shows the dock. display:none, never an
     unmount: the room (and its audio) survives an operator's own /a visit. */
  const onAdmin = pathname === "/a" || pathname.startsWith("/a/");

  /* stage mode: the owning bridge is mounted AND its seat is at least
     partly on screen — scrolled past, the window falls back to the docked
     modes rather than riding off the top of the viewport. */
  const rect = session?.rect ?? null;
  const vh = typeof window === "undefined" ? 0 : window.innerHeight;
  const stageMode = !!session && phase === "live" && rect !== null && rect.top < vh && rect.top + rect.height > 0;

  /* item 8 — the test switch: ?livedock=test on any page, non-production
     hostnames only, never over a real session, once per page visit. */
  const testTried = useRef(false);
  useEffect(() => {
    if (!live || testTried.current || live.session) return;
    try {
      if (PRODUCTION_HOSTS.includes(window.location.hostname)) return;
      if (new URLSearchParams(window.location.search).get("livedock") !== "test") return;
      testTried.current = true;
      live.join(
        { kind: "twoway", domain: TEST_DOMAIN, room: TEST_ROOM },
        { title: "the dock test", homePath: "/", homeLabel: "Back to the front page" },
        {},
      );
    } catch {
      /* no window, no switch */
    }
  }, [live, pathname]);

  /* ruling E — the rejoin card dismisses itself; its Close ends it sooner */
  useEffect(() => {
    if (!live || !session || phase !== "left") return;
    const id = setTimeout(() => live.dismiss(), REJOIN_DISMISS_MS);
    return () => clearTimeout(id);
  }, [session, phase, live]);

  /* ruling B / item 6 — while the phone strip shows, the page grows bottom
     padding of 56px strip + 8px gap + the safe-area inset (kit.css's
     html.lrd-strip-on rule), so the strip never covers a page control. */
  const stripOn = !!session && phase === "live" && !stageMode && mode === "dock" && !grown && !onAdmin;
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => document.documentElement.classList.toggle("lrd-strip-on", stripOn && mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.documentElement.classList.remove("lrd-strip-on");
    };
  }, [stripOn]);

  /* item 1's Close: a camera-on (twoway) room asks first — the amendment's
     Sheet; a watch-only room closes with no pop-up (K183's law), straight
     to the rejoin card. */
  const askOrLeave = useCallback(() => {
    if (session?.kind === "twoway") setAsking(true);
    else liveRef.current?.endSession();
  }, [session?.kind]);

  const leaveConfirmed = useCallback(() => {
    setAsking(false);
    liveRef.current?.endSession();
  }, []);

  /* drag the float by its bar (pointer events, so touch drags too) */
  const onBarDown = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== "float") return;
      const el = (e.currentTarget as HTMLElement).closest(".lrd-float");
      if (!el) return;
      const r = el.getBoundingClientRect();
      drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      const move = (ev: PointerEvent) => {
        if (!drag.current) return;
        const x = Math.min(Math.max(ev.clientX - drag.current.dx, 8), window.innerWidth - 120);
        const y = Math.min(Math.max(ev.clientY - drag.current.dy, 8), window.innerHeight - 60);
        setPos({ x, y });
      };
      const up = () => {
        if (drag.current) {
          setPos((p) => {
            if (p) {
              try {
                localStorage.setItem(FLOAT_POS_KEY, JSON.stringify(p));
              } catch {
                /* memory is a nicety, never a blocker */
              }
            }
            return p;
          });
        }
        drag.current = null;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [mode],
  );

  if (!session) return null;

  /* ONE embed element at ONE position in the tree across every window
     mode — the modes restyle the window around it (the shade's hidden body
     is display:none, never a removal), so the iframe never remounts. The
     key carries mountKey: a rejoin is the ONLY deliberate fresh boot. */
  const embedKey = `${session.kind}:${session.domain}:${session.room}:${session.mountKey}`;
  const embed =
    session.kind === "twoway" ? (
      <JitsiRoom key={embedKey} domain={session.domain} room={session.room} onEnded={endFromEmbed} onJoined={joinedFromEmbed} height="100%" guestView />
    ) : (
      <JitsiViewer key={embedKey} domain={session.domain} room={session.room} onEnded={endFromEmbed} onFailed={failFromEmbed} />
    );

  /* item 1 — words, one size per group, aria-labels. The mode controls
     (Shrink/Grow, Undock/Dock) hide in stage mode (the stage IS the size);
     Close is everywhere. */
  const controls = (
    <>
      <button
        type="button"
        className="lrd-ctl lrd-ctl-modes"
        aria-label={mode === "shade" ? "grow the player" : "shrink the player"}
        onClick={() => setMode(mode === "shade" ? "dock" : "shade")}
      >
        {mode === "shade" ? "Grow" : "Shrink"}
      </button>
      {mode === "float" ? (
        <button type="button" className="lrd-ctl lrd-ctl-modes" aria-label="dock the player" onClick={() => setMode("dock")}>
          Dock
        </button>
      ) : (
        <button type="button" className="lrd-ctl lrd-ctl-modes" aria-label="undock the player" onClick={() => setMode("float")}>
          Undock
        </button>
      )}
      <button type="button" className="lrd-ctl" aria-label="close the player" onClick={askOrLeave}>
        Close
      </button>
    </>
  );

  const windowClass = [
    "lrd-window",
    stageMode ? "lrd-stage" : mode === "shade" ? "lrd-shade" : mode === "float" ? "lrd-float" : "lrd-dock",
    grown ? "lrd-grown" : "",
    onAdmin ? "lrd-hidden" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {phase === "left" ? (
        /* rulings A + E — the rejoin card for ALL guests (camera or
           watch-only): the drawn words, the door home, the close control,
           the 11 s self-dismiss. Portaled to body (T-637's trap). */
        createPortal(
          <div className={`lrd-rejoin${onAdmin ? " lrd-hidden" : ""}`} role="status">
            <button type="button" className="lrd-ctl lrd-rejoin-close" aria-label="close the rejoin note" onClick={() => live?.dismiss()}>
              Close
            </button>
            <p className="lrd-rejoin-line">You&rsquo;re welcome to rejoin later.</p>
            <Link href={session.homePath} className="btn btn-sm btn-rose lrd-rejoin-door" onClick={() => live?.dismiss()}>
              {session.homeLabel}
            </Link>
          </div>,
          document.body,
        )
      ) : (
        <div
          className={windowClass}
          style={
            stageMode && rect
              ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
              : mode === "float" && pos
                ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
                : undefined
          }
        >
          {/* item 2 — the phone strip: the full title, "Tap to grow" on one
              line, Close. The Back link is NOT here (it crowds the strip);
              it rides the grown card below. The grow affordance is a real
              button so it keys and reads like one. */}
          <div className="lrd-strip">
            <button type="button" className="lrd-strip-grow" aria-label="grow the player" onClick={() => setGrown(true)}>
              <span className="lrd-live-dot" aria-hidden="true" />
              <span className="lrd-strip-word">{session.title}, live</span>
              <span className="lrd-strip-hint">Tap to grow</span>
            </button>
            <button type="button" className="lrd-ctl" aria-label="close the player" onClick={askOrLeave}>
              Close
            </button>
          </div>
          <div className="lrd-bar" onPointerDown={onBarDown}>
            <span className="lrd-title">{session.title}</span>
            <span className="lrd-controls">{controls}</span>
          </div>
          <div className="lrd-body">
            {embed}
            {/* the same click-through book cover the page draws (the site
                switch's coverUp rides the session) — pointer-events:none,
                so the tap for sound still reaches the iframe */}
            {session.coverUp && (
              <div className="kit-stage-cover">
                <img src={READING_COVER_SRC} alt={COVER_ALT} width="600" height="358" />
              </div>
            )}
            {stageMode && session.chip ? <span className="kit-stage-chip">{session.chip}</span> : null}
          </div>
          <div className="lrd-shade-note">sound on</div>
          <Link href={session.homePath} className="lrd-back">
            {session.homeLabel}
          </Link>
        </div>
      )}
      {/* the amendment (drawn 6a): camera ON + Close asks first. Item 3 —
          maxWidth 520 and the pair on flex:1 + nowrap, so "Leave the
          reading" sits on one line at 1440 AND 390. Escape and a tap
          outside are the way back, by the Sheet's own adoption. */}
      {session.kind === "twoway" &&
        !onAdmin &&
        createPortal(
          <Sheet open={asking} onClose={() => setAsking(false)} maxWidth={520} z="popup">
            <p className="lrd-ask-line">{`Do you want to leave ${session.title}?`}</p>
            <div className="lrd-ask-buttons">
              <button type="button" className="btn btn-sm btn-rose" onClick={leaveConfirmed}>
                {`Leave ${session.title}`}
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAsking(false)}>
                Stay
              </button>
            </div>
          </Sheet>,
          document.body,
        )}
    </>
  );
}
