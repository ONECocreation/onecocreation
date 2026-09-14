"use client";

import { useLayoutEffect, useRef, useState } from "react";
import FullScene from "@/components/studio-overlay/FullScene";
import type { OverlayTokens } from "@/components/studio-overlay/OverlayStage";
import { cartridge } from "@/brand/cartridge";
import { domainForSpace, SPACE_NAME } from "@/lib/identity-config";
import type { StudioSceneId } from "@/lib/studio/scenes";

/**
 * SCENE FRAME (TASK-251, 0018.06.23 a₿) — the Heart Field Stage's own
 * 16:9 box for one of Love's full-frame scenes (starting soon / be right
 * back / thank you), the SAME opaque picture `/studio/overlay` shows OBS,
 * now rendered INLINE in the room page instead of only riding a VDO
 * `&website=` browser-source push. `FullScene` itself is a fixed
 * 1920×1080 canvas (the overlay route's own frame); this leaf measures its
 * OWN wrapper's width with a `ResizeObserver`, scales a 1920×1080 inner
 * box down to fit (`transform: scale(width/1920)`, top-left origin, so the
 * math is one division), and hands `FullScene` `fixed={false}` so it draws
 * `position: absolute` inside that box rather than `position: fixed` over
 * the whole page — without this a viewer would see the scene's night
 * ground swallow the entire room page, not just its own 16:9 frame.
 *
 * `useLayoutEffect` (not `useEffect`) measures BEFORE the browser paints,
 * so the very first frame already carries the right scale — no flash of
 * an unscaled or zero-scaled canvas.
 *
 * The mark/nebula/book/tokens/membershipsWords below are the exact
 * derivation `/studio/overlay`'s own page.tsx already performs (no overlay
 * token rides here — this route is public, gated only by the room's own
 * sign-in door upstream) — `showTitle`/`startsAt`/`afterHoursLine` are the
 * three studio-doc fields the room page threads down alongside the scene
 * id itself (the room page's own read, never a second one).
 */

export interface SceneFrameProps {
  scene: Extract<StudioSceneId, "starting" | "brb" | "ending">;
  /** derive-or-dash applied here — the same fallback `/studio/overlay`'s
   *  page.tsx performs (`doc.showTitle || cartridge.copy.productName`) */
  showTitle: string;
  /** the "starting soon" scene's countdown target, ISO — "" = no clock */
  startsAt: string;
  /** the "thank you" scene's after-hours line — "" = omitted */
  afterHoursLine: string;
}

const TOKENS: OverlayTokens = {
  rose: cartridge.palette.rose,
  gold: cartridge.palette.gold,
  cream: cartridge.palette.cream,
  space: cartridge.palette.space,
  teal: "var(--teal-bright, #8FD0D8)",
  displayFont: cartridge.fonts.display,
};

export default function SceneFrame({ scene, showTitle, startsAt, afterHoursLine }: SceneFrameProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / 1920);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="cl-scene-frame" style={{ background: TOKENS.space }}>
      <div style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <FullScene
          scene={scene}
          showTitle={showTitle || cartridge.copy.productName}
          mark={cartridge.logo.mark}
          nebula={cartridge.hero.nebula}
          book="/images/reading-book.webp"
          startsAt={startsAt}
          afterHoursLine={afterHoursLine}
          membershipsWords={`${domainForSpace(SPACE_NAME)}/memberships`}
          tokens={TOKENS}
          fixed={false}
        />
      </div>
    </div>
  );
}
