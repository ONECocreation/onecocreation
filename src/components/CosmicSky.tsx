"use client";

import { useEffect, useRef } from "react";

/**
 * THE LIVING SKY (Admiral, 0018.05.15 — "stepping it up", after the
 * animated hero references): a feather-light canvas of twinkling stars
 * with the occasional shooting star, laid over any dark hero. Pure
 * ambience — pointer-events none, ~120 stars, one rAF loop, and it goes
 * still for prefers-reduced-motion.
 */
export default function CosmicSky({ shooting = true }: { shooting?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0;

    interface Star { x: number; y: number; r: number; base: number; tw: number; ph: number }
    interface Meteor { x: number; y: number; vx: number; vy: number; life: number }
    let stars: Star[] = [];
    let meteor: Meteor | null = null;
    let nextMeteorAt = performance.now() + 4000 + Math.random() * 6000;

    function size() {
      const p = canvas!.parentElement;
      if (!p) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = p.clientWidth; h = p.clientHeight;
      canvas!.width = w * dpr; canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`; canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(150, Math.floor((w * h) / 9000));
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.4 + Math.random() * 1.3,
        base: 0.25 + Math.random() * 0.55,
        tw: 0.5 + Math.random() * 1.6,
        ph: Math.random() * Math.PI * 2,
      }));
    }

    function paint(t: number) {
      ctx!.clearRect(0, 0, w, h);
      for (const s of stars) {
        const a = still ? s.base : s.base * (0.55 + 0.45 * Math.sin(t / 1000 * s.tw + s.ph));
        ctx!.globalAlpha = Math.max(0.05, a);
        ctx!.fillStyle = "#F6EFD9";
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      if (!still && shooting) {
        if (!meteor && t > nextMeteorAt) {
          const fromX = w * (0.15 + Math.random() * 0.7);
          meteor = { x: fromX, y: h * 0.08, vx: 3.2 + Math.random() * 2, vy: 1.6 + Math.random(), life: 1 };
          nextMeteorAt = t + 7000 + Math.random() * 9000;
        }
        if (meteor) {
          meteor.x += meteor.vx; meteor.y += meteor.vy; meteor.life -= 0.016;
          const grad = ctx!.createLinearGradient(meteor.x, meteor.y, meteor.x - meteor.vx * 14, meteor.y - meteor.vy * 14);
          grad.addColorStop(0, `rgba(246,239,217,${Math.max(0, meteor.life)})`);
          grad.addColorStop(1, "rgba(246,239,217,0)");
          ctx!.strokeStyle = grad;
          ctx!.lineWidth = 1.6;
          ctx!.beginPath();
          ctx!.moveTo(meteor.x, meteor.y);
          ctx!.lineTo(meteor.x - meteor.vx * 14, meteor.y - meteor.vy * 14);
          ctx!.stroke();
          if (meteor.life <= 0 || meteor.x > w + 30 || meteor.y > h + 30) meteor = null;
        }
      }
      ctx!.globalAlpha = 1;
      if (!still) raf = requestAnimationFrame(paint);
    }

    size();
    raf = requestAnimationFrame(paint);
    const ro = new ResizeObserver(() => { size(); if (still) paint(0); });
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [shooting]);

  return (
    <canvas ref={ref} aria-hidden
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }} />
  );
}
