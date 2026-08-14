"use client";

import { useEffect } from "react";

/**
 * THE ALIVE LAYER (the Admiral's ask, 0018.05.15 — "the page should feel
 * alive", after Love's own Shine build): every element wearing .reveal
 * fades and rises into place as it scrolls into view. One observer for the
 * whole site; new nodes from client navigations are caught by a mutation
 * watcher. prefers-reduced-motion is honored in the CSS, not here.
 */
export default function AliveEffects() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -36px" },
    );
    const watch = () =>
      document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
    watch();
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });

    // ── the breathing backgrounds (Admiral, 0018.05.15): .scrollzoom
    // layers swell toward the viewer as their band crosses the viewport
    // center — the galaxy leans in as you travel through it. ──
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ticking = false;
    const zoom = () => {
      ticking = false;
      const vh = window.innerHeight;
      document.querySelectorAll<HTMLElement>(".scrollzoom").forEach((el) => {
        const host = el.parentElement ?? el;
        const r = host.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const mid = r.top + r.height / 2;
        const prog = Math.max(0, 1 - Math.abs(mid - vh / 2) / (vh / 2 + r.height / 2));
        el.style.transform = `scale(${(1.02 + prog * 0.1).toFixed(4)})`;
      });
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(zoom);
      }
    };
    if (!still) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      zoom();
    }

    return () => {
      io.disconnect();
      mo.disconnect();
      if (!still) {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      }
    };
  }, []);
  return null;
}
