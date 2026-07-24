"use client";

import { useEffect, useRef } from "react";
import { createOrrery } from "@/components/time/orrery/orrery-engine";
import "./orrery.css";

/**
 * THE ORRERY — Act I of the orrery study (studies/clock-study-orrery.html,
 * v24, owner-approved), ported whole: the twelve orbit rings around the
 * pulsing 624-ember sun (THE LIGHT), the 13 sign names curved on the rim,
 * THE WANDERERS' sky band (the real planets at ~mean longitude), the
 * planet-dot chips column riding the dial's
 * left (wrapping back below on small decks), the fact card, the scrub +
 * NOW, the SET THE CLOCK date picker and the ✶ HOUSES / ☿ PLANETS toggles. The
 * spirograph, the tape and the star birth facts stay in the study (owner
 * ruling: "only ship the part 1 — the 1a, 2 and 3 sections are still
 * under development").
 *
 * The markup below is the study's own Act-I section re-expressed as JSX;
 * everything that MOVES — the planets, the chosen ring's orange/blue
 * selection arcs, the month's lit house wedge, the moon's phase, the
 * sun's face, the fact card, the readout — is driven
 * imperatively by the ported engine (orrery-engine.ts) against this
 * skeleton, in one effect-owned rAF loop (a 1 s interval under reduced
 * motion). React owns only the static structure; the engine never touches
 * React state, React never repaints the engine's text — the same
 * react-compiler-safe split as LivingClock (no setState in effect bodies,
 * no ref reads during render).
 *
 * Data: the engine walks THE LADDER every 30 s — and again the instant
 * the tab wakes (visibilitychange / pageshow / online) — this ship's own
 * same-origin seam /api/chain/tip?full=1 first (node-first + public
 * fallback server-side, the pluggable knob), the arcade's time server
 * second (time.pacsarcade.org, CORS open), and the study's
 * genesis-anchored ten-minute model last, wearing the honest ~. Every
 * successful knock re-anchors the whole dial (the sync law).
 */

export default function Orrery() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  /* the engine — created once against the rendered DOM, destroyed on unmount */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const engine = createOrrery(root);
    return () => engine.destroy();
  }, []);

  return (
    <div className="orrery" ref={rootRef}>
      {/* the planet selector rides the left side — a collapsible string of
          planet dots (the engine builds it); on small decks it wraps back
          below the dial as a horizontal string */}
      <div className="orrrow">
        <div
          className="chips chips-side collapsed"
          role="group"
          aria-label="planet selector — choose a ring of the orrery"
        />
        <div className="face orrerybox">
          <svg
            className="orr"
            viewBox="-292 -292 584 584"
            role="img"
            aria-label="orbital rings of bitcoin periods"
          />
        </div>
      </div>
      <div className="factcard" aria-live="polite" />
      <div className="scrubrow">
        <input
          type="range"
          className="scrub"
          min={0}
          max={6930000}
          step={1}
          defaultValue={0}
          aria-label="scrub through block heights"
        />
        <button type="button" className="act nowbtn">
          NOW
        </button>
      </div>
      <div className="readout" />
      <div className="typerow">
        <label htmlFor="orrery-clock-date">SET THE CLOCK</label>
        <input type="date" id="orrery-clock-date" className="clock-date" />
        <span className="note clock-note" />
      </div>
    </div>
  );
}
