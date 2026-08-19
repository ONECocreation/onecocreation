"use client";

import { useEffect, useRef } from "react";

/* eslint-disable @next/next/no-img-element -- a REAL <img> is the ruled
   mechanism (the transform-driven parallax layer), not a candidate for
   next/image optimization */

/**
 * The parallax image layer (STUDIO P2 — the original platform's signature
 * treatment, rebuilt from the live-captured FACTS, not the
 * background-attachment guess):
 *
 *  - a real <img>, absolutely positioned inside the clipped band, oversized
 *    by the speed's overscan factor (slow 1.10 / medium 1.20 / fast 1.30 —
 *    the travel uses the FULL overscan margin, so speed IS travel: slow
 *    drifts ~10% of the band's height, fast sweeps ~30%);
 *  - Y rides the BAND'S OWN scroll-through progress (0 = entering the
 *    viewport bottom, 1 = exiting the top) measured via
 *    getBoundingClientRect — never raw window.scrollY;
 *  - rAF runs only while IntersectionObserver says the band is on screen;
 *    off-screen the last transform HOLDS (the measured original: held below
 *    the fold, eased through the viewport, held after);
 *  - prefers-reduced-motion: no observer, no rAF — the css base state is a
 *    static centered image.
 *
 * Frame-honest: everything reads img.ownerDocument.defaultView, so inside
 * the studio's preview iframe the math uses the IFRAME's viewport — the
 * canvas shows the real behavior, not the parent window's.
 */
export default function ParallaxImg({ src, speed }: {
  src: string;
  speed: "slow" | "medium" | "fast";
}) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    const band = img?.parentElement;
    if (!img || !band) return;
    const win = img.ownerDocument.defaultView ?? window;
    if (win.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const OVERSCAN = { slow: 1.1, medium: 1.2, fast: 1.3 }[speed];
    let raf = 0;
    let visible = false;

    const paint = () => {
      const r = band.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0,
        (win.innerHeight - r.top) / (win.innerHeight + r.height)));
      const travel = r.height * (OVERSCAN - 1);
      img.style.height = `${r.height * OVERSCAN}px`;
      img.style.top = `${(-r.height * (OVERSCAN - 1)) / 2}px`;
      img.style.transform = `translate3d(-50%, ${(progress - 0.5) * travel}px, 0)`;
      if (visible) raf = win.requestAnimationFrame(paint);
    };

    const io = new win.IntersectionObserver((entries) => {
      for (const e of entries) {
        visible = e.isIntersecting;
        if (visible) {
          win.cancelAnimationFrame(raf);
          raf = win.requestAnimationFrame(paint);
        }
      }
    });
    io.observe(band);
    paint(); /* one off-screen paint so size/hold are right before first sight */
    return () => { io.disconnect(); win.cancelAnimationFrame(raf); };
  }, [src, speed]);

  /* decorative ground — the band's content carries the meaning */
  return <img ref={ref} src={src} alt="" aria-hidden className="oc-parallax-img" />;
}
