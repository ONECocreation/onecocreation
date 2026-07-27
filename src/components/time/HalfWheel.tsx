"use client";

/**
 * THE HALF-WHEEL — the orrery's mobile telling (the admiral's sketch,
 * 2026-07-27, benched to v12 on the horizon drafting table).
 *
 * The ₿ sun docks half-off the right edge; the visible 180° is the sky.
 * Thirteen rings arc across it, each filling bottom-to-top with its unit's
 * progress, each ending in a ball that carries its living count. Tap a ring
 * and its card seats in the sun's face (chevrons step ring to ring); tap
 * the sun and the clock returns. Shown below md; the full wheel keeps
 * desktop duty.
 */

import { useEffect, useRef } from "react";
import { bftDate, bftTime, currentBlockInfo } from "@/lib/bb/bft";

const LAST_SAT_HEIGHT = 6_930_000;

type Ring = {
  label: string;
  mod?: number;
  max?: number;
  kind?: "wall-s" | "wall-m" | "intra";
  thin?: boolean;
};

const RINGS: Ring[] = [
  { label: "second", kind: "wall-s" },
  { label: "minute", kind: "wall-m" },
  { label: "block", kind: "intra" },
  { label: "hour", mod: 6 },
  { label: "day", mod: 144 },
  { label: "week", mod: 1008 },
  { label: "fortnight", mod: 2016 },
  { label: "month", mod: 4032 },
  { label: "moon", mod: 4252 },
  { label: "year", mod: 52416 },
  { label: "olympiad", mod: 210000, thin: true },
  { label: "generation", mod: 1260000, thin: true },
  { label: "last sat", max: LAST_SAT_HEIGHT, thin: true },
];

const REL: Record<string, string> = {
  second: "the fastest hand",
  minute: "= 60 secs",
  block: "= 10 mins",
  hour: "= 6 blocks",
  day: "= 24 hours",
  week: "= 7 days",
  fortnight: "= 2 weeks",
  month: "= 2 fortnights",
  moon: "≈ 29½ days",
  year: "= 13 months",
  olympiad: "= 4 years · a halving",
  generation: "= 6 halvings",
  "last sat": "≈ 5½ generations",
};

/* the whole 360° sky smooshed proportionally into the visible 180° —
   thirteen seats, Capricorn first (the month-seat law) */
const SIGNS = ["CAPRICORN", "AQUARIUS", "PISCES", "ARIES", "TAURUS", "GEMINI",
  "CANCER", "LEO", "VIRGO", "LIBRA", "SCORPIO", "OPHIUCHUS", "SAGITTARIUS"];

/* seconds into the current block: chain-anchored when the tip timestamp is
   known, wall-clock rhythm otherwise */
function intraBlockSeconds(now: Date, tipTs: number | null): number {
  if (tipTs) {
    const s = now.getTime() / 1000 - tipTs;
    return Math.max(0, Math.min(599, s));
  }
  return (now.getTime() / 1000) % 600;
}

function ringProgress(r: Ring, h: number, now: Date, tipTs: number | null): number {
  if (r.kind === "wall-s") return now.getSeconds() / 60 + now.getMilliseconds() / 60000;
  if (r.kind === "wall-m") return now.getMinutes() / 60 + now.getSeconds() / 3600;
  if (r.kind === "intra") return intraBlockSeconds(now, tipTs) / 600;
  if (r.max) return h / r.max;
  return (h % (r.mod as number)) / (r.mod as number);
}

function ringFacts(r: Ring, h: number, now: Date, tipTs: number | null) {
  if (r.kind === "wall-s") return { pos: now.getSeconds(), span: 60, unit: "secs" };
  if (r.kind === "wall-m") return { pos: now.getMinutes(), span: 60, unit: "mins" };
  if (r.kind === "intra") return { pos: Math.floor(intraBlockSeconds(now, tipTs)), span: 600, unit: "secs" };
  if (r.max) return { pos: h, span: r.max, unit: "blocks" };
  return { pos: h % (r.mod as number), span: r.mod as number, unit: "blocks" };
}

/* the count each ball carries — where we ARE, in the ring's own tongue */
function ringBall(r: Ring, h: number, now: Date, tipTs: number | null): number | string {
  switch (r.label) {
    case "second": return now.getSeconds();
    case "minute": return now.getMinutes();
    case "block": return Math.floor(intraBlockSeconds(now, tipTs) / 60);
    case "hour": return h % 6;
    case "day": return Math.floor((h % 144) / 6);
    case "week": return Math.floor((h % 1008) / 144);
    case "fortnight": return Math.floor((h % 2016) / 1008);
    case "month": return Math.floor((Math.floor(h / 144) % 364) / 28) + 1; // month we are IN, 1..13
    case "moon": return Math.floor((h % 4252) / 144);
    case "year": return Math.floor(Math.floor(h / 144) / 364); // the year we are IN — matches 0018
    case "olympiad": return Math.floor((h % 210000) / 52416);
    case "generation": return Math.floor((h % 1260000) / 210000);
    default: return Math.round((h / LAST_SAT_HEIGHT) * 100) + "%"; // road walked, the /time telling
  }
}

function compactNum(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + "M";
  if (n >= 1e4) return Math.round(n / 1e3) + "k";
  return n.toLocaleString();
}

export default function HalfWheel() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let height: number | null = null;
    let estimated = true;
    let tipTs: number | null = null;
    let selected: number | null = null;
    let disposed = false;
    let radii: number[] = [];
    let sunGeom = { cx: 0, cy: 0, sunR: 0 };
    let chevrons: { prev: number[]; next: number[] } | null = null; // [x,y,w,h]

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    async function poll(fresh = false) {
      try {
        const info = await currentBlockInfo(fresh ? { fresh: true } : undefined);
        if (disposed) return;
        height = info.height;
        estimated = info.estimated;
        tipTs = info.tipTimestamp;
        draw();
      } catch {
        /* keep the last reading; the wall keeps the seconds honest */
      }
    }

    function fitPx(ctx: CanvasRenderingContext2D, text: string, maxW: number, px: number, bold: boolean): number {
      while (px > 8) {
        ctx.font = `${bold ? "bold " : ""}${px}px ui-monospace, monospace`;
        if (ctx.measureText(text).width <= maxW) break;
        px -= 1;
      }
      return px;
    }

    function draw() {
      if (!canvas || height === null) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const hg = canvas.clientHeight;
      if (!w || !hg) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hg * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, hg);
      const now = new Date();
      const h = height;

      const cx = w + 6, cy = hg * 0.5;
      const maxR = Math.min(hg * 0.455, cx - 26);
      /* the sun scales with width but YIELDS to the ring band: at wide or
         short aspects it shrinks so the thirteen rings keep ~11px of air */
      const sunR = Math.max(88, Math.min(w * 0.29, maxR - 150));
      sunGeom = { cx, cy, sunR };

      /* stars */
      for (let i = 0; i < 34; i++) {
        const sx = 8 + ((i * 89 + 17) % Math.round(w * 0.55));
        const sy = (i * 53 + 29) % hg;
        ctx.fillStyle = i % 6 ? "rgba(255,255,255,0.25)" : "rgba(61,255,122,0.4)";
        ctx.fillRect(sx, sy, 1, 1);
      }

      /* the sign belt */
      const beltPad = 0.06, beltSpan = Math.PI - beltPad * 2;
      SIGNS.forEach((name, i) => {
        const a = Math.PI / 2 + beltPad + ((i + 0.5) / SIGNS.length) * beltSpan;
        const rad = maxR + 16;
        const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
        if (x > 12 && y > 12 && y < hg - 12) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(a + Math.PI / 2);
          ctx.fillStyle = "rgba(242,233,212,0.34)";
          ctx.font = "8px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.fillText(name, 0, 0);
          ctx.restore();
        }
        const ba = Math.PI / 2 + beltPad + (i / SIGNS.length) * beltSpan;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ba) * (maxR + 6), cy + Math.sin(ba) * (maxR + 6));
        ctx.lineTo(cx + Math.cos(ba) * (maxR + 11), cy + Math.sin(ba) * (maxR + 11));
        ctx.strokeStyle = "rgba(242,233,212,0.22)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      /* rings */
      radii = [];
      RINGS.forEach((r, idx) => {
        const rad = sunR + 12 + (idx / (RINGS.length - 1)) * (maxR - sunR - 18);
        radii.push(rad);
        const p = Math.max(0, Math.min(1, ringProgress(r, h, now, tipTs)));
        const a0 = Math.PI / 2, a1 = Math.PI * 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, a0, a1);
        ctx.strokeStyle = "rgba(242,233,212,0.26)";
        ctx.lineWidth = r.thin ? 1 : 1.5;
        ctx.stroke();
        const sel = selected === idx;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, a0, a0 + p * Math.PI);
        ctx.strokeStyle = sel ? "#ffb01f" : `rgba(61,255,122,${r.thin ? 0.45 : 0.85})`;
        ctx.lineWidth = sel ? 4.5 : r.thin ? 2 : 3.5;
        ctx.lineCap = "round";
        ctx.stroke();
        /* the end-ball */
        const ea = a0 + p * Math.PI;
        const ex = cx + Math.cos(ea) * rad, ey = cy + Math.sin(ea) * rad;
        let ballVal = ringBall(r, h, now, tipTs);
        if (ballVal === 0) ballVal = Math.round(p * 100) + "%"; // zeros say nothing
        const ballTxt = String(ballVal);
        const isWide = ballTxt.length >= 3;
        const br = isWide ? (ballTxt.length >= 6 ? 15 : 11) : r.thin ? 7 : 9;
        ctx.beginPath();
        ctx.arc(ex, ey, br, 0, Math.PI * 2);
        ctx.fillStyle = sel ? "#ffb01f" : "#f2e9d4";
        ctx.fill();
        ctx.strokeStyle = "rgba(5,9,12,0.8)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#141a16";
        ctx.font = `bold ${isWide ? 7.5 : r.thin ? 7.5 : 8.5}px ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ballTxt, ex, ey + 0.5);
        ctx.textBaseline = "alphabetic";
        /* label — steps aside while its own ball passes the lane */
        const la = Math.PI * 1.16;
        const lx = cx + Math.cos(la) * rad, ly = cy + Math.sin(la) * rad;
        if (lx > 16) {
          const alpha = Math.abs(ea - la) < 0.16 ? 0.15 : 0.78;
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(la + Math.PI / 2);
          ctx.fillStyle = `rgba(242,233,212,${alpha})`;
          ctx.font = "10px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.fillText(r.label.toUpperCase(), 0, -6);
          ctx.restore();
        }
      });

      /* corner pills */
      const pill = (x: number, y: number, pw: number, ph: number) => {
        ctx.fillStyle = "rgba(4,8,10,0.82)";
        ctx.strokeStyle = "rgba(255,176,31,0.22)";
        ctx.fillRect(x, y, pw, ph);
        ctx.strokeRect(x + 0.5, y + 0.5, pw - 1, ph - 1);
      };
      const tilde = estimated ? "~" : "";
      ctx.textAlign = "left";
      const dateTxt = `${tilde}${bftDate(h)}`;
      const clockTxt = bftTime(h);
      const datePx = fitPx(ctx, dateTxt, 150, 14, true);
      ctx.font = `bold ${datePx}px ui-monospace, monospace`;
      const dateW = ctx.measureText(dateTxt).width;
      ctx.font = "bold 13px ui-monospace, monospace";
      const timeW = ctx.measureText(clockTxt).width;
      pill(12, 12, Math.max(dateW, timeW) + 18, 46);
      ctx.fillStyle = "#3dff7a";
      ctx.font = `bold ${datePx}px ui-monospace, monospace`;
      ctx.fillText(dateTxt, 21, 30);
      ctx.fillStyle = "#f2e9d4";
      ctx.font = "bold 13px ui-monospace, monospace";
      ctx.fillText(clockTxt, 21, 50);

      const blockTxt = `${tilde}block ${h.toLocaleString()}`;
      const blockPx = fitPx(ctx, blockTxt, w - 60, 17, true);
      ctx.font = `bold ${blockPx}px ui-monospace, monospace`;
      const blockW = ctx.measureText(blockTxt).width;
      pill(12, hg - 44, blockW + 24, 32);
      ctx.shadowColor = "rgba(255,176,31,0.5)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#ffb01f";
      ctx.fillText(blockTxt, 24, hg - 21);
      ctx.shadowBlur = 0;

      /* the sun */
      const grad = ctx.createRadialGradient(cx - sunR * 0.3, cy - sunR * 0.3, sunR * 0.15, cx, cy, sunR);
      grad.addColorStop(0, "#ffd37a");
      grad.addColorStop(0.55, "#ffb01f");
      grad.addColorStop(1, "#ff6600");
      ctx.beginPath();
      ctx.arc(cx, cy, sunR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,211,122,0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();

      /* sun face rows: right-aligned, budgeted by the rim's curve */
      const PAD_R = 8;
      const sunRow = (text: string, y: number, basePx: number, bold: boolean, color: string) => {
        const dy = Math.abs(y - cy);
        if (dy >= sunR - 4) return;
        const rimX = cx - sunR * Math.sqrt(1 - (dy / sunR) ** 2);
        const maxW = w - PAD_R - rimX - 10;
        const px = fitPx(ctx, text, maxW, basePx, bold);
        ctx.font = `${bold ? "bold " : ""}${px}px ui-monospace, monospace`;
        let txt = text;
        while (txt.length > 2 && ctx.measureText(txt).width > maxW) {
          txt = txt.slice(0, -2).replace(/\s+$/, "") + "…";
        }
        ctx.fillStyle = color;
        ctx.textAlign = "right";
        ctx.fillText(txt, w - PAD_R, y);
      };
      const sunRowWrap = (text: string, y: number, basePx: number, bold: boolean, color: string) => {
        const dy = Math.abs(y - cy);
        if (dy >= sunR - 4) return;
        const rimX = cx - sunR * Math.sqrt(1 - (dy / sunR) ** 2);
        const maxW = w - PAD_R - rimX - 10;
        ctx.font = `${bold ? "bold " : ""}${basePx}px ui-monospace, monospace`;
        if (ctx.measureText(text).width <= maxW) {
          sunRow(text, y, basePx, bold, color);
          return;
        }
        const words = text.split(" ");
        let best = 1, bestDiff = Infinity;
        for (let k = 1; k < words.length; k++) {
          const diff = Math.abs(
            ctx.measureText(words.slice(0, k).join(" ")).width -
            ctx.measureText(words.slice(k).join(" ")).width,
          );
          if (diff < bestDiff) { bestDiff = diff; best = k; }
        }
        sunRow(words.slice(0, best).join(" "), y, basePx, bold, color);
        sunRow(words.slice(best).join(" "), y + basePx + 3, basePx, bold, color);
      };

      const ink = "#241300", inkSoft = "rgba(36,19,0,0.9)";
      chevrons = null;
      if (selected === null) {
        sunRow("BITCOIN TIME", cy - sunR * 0.36, 10, false, ink);
        sunRow(clockTxt, cy + 4, 34, true, ink);
        sunRow("6 blocks an hour", cy + 24, 10.5, false, ink);
        sunRow("tap a ring", cy + sunR * 0.44, 10, false, inkSoft);
      } else {
        const r3 = RINGS[selected];
        const f = ringFacts(r3, h, now, tipTs);
        const pct = Math.min(100, (f.pos / f.span) * 100);
        sunRow(r3.label.toUpperCase(), cy - sunR * 0.46, 12, true, ink);
        sunRowWrap(REL[r3.label] || "", cy - sunR * 0.46 + 15, 9.5, false, ink);
        sunRow(pct.toFixed(pct < 10 ? 1 : 0) + "%", cy + 10, 28, true, ink);
        sunRow(`${compactNum(f.pos)} / ${compactNum(f.span)}`, cy + 28, 10, false, ink);
        sunRowWrap(`${compactNum(f.span - f.pos)} ${f.unit} left`, cy + 42, 10, false, ink);
        /* chevrons: step ring to ring without thumb precision (mobile crew law).
           They sit LOW on the disc, clear of the card's last line. */
        const chevY = cy + sunR * 0.74;
        if (chevY < cy + sunR - 12) {
          ctx.font = "bold 18px ui-monospace, monospace";
          ctx.fillStyle = inkSoft;
          ctx.textAlign = "center";
          const cxL = w - sunR * 0.72, cxR = w - PAD_R - 14;
          ctx.fillText("‹", cxL, chevY);
          ctx.fillText("›", cxR, chevY);
          chevrons = { prev: [cxL - 22, chevY - 22, 44, 44], next: [cxR - 22, chevY - 22, 44, 44] };
        }
      }
    }

    function onClick(ev: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
      if (chevrons && selected !== null) {
        const inBox = (b: number[]) => x >= b[0] && x <= b[0] + b[2] && y >= b[1] && y <= b[1] + b[3];
        if (inBox(chevrons.prev)) { selected = (selected + RINGS.length - 1) % RINGS.length; draw(); return; }
        if (inBox(chevrons.next)) { selected = (selected + 1) % RINGS.length; draw(); return; }
      }
      const d = Math.hypot(x - sunGeom.cx, y - sunGeom.cy);
      if (d <= sunGeom.sunR) { selected = null; draw(); return; }
      let best: number | null = null, bestErr = 14;
      radii.forEach((rad, idx) => {
        const err = Math.abs(d - rad);
        if (err < bestErr) { bestErr = err; best = idx; }
      });
      if (best !== null) { selected = best; draw(); }
    }

    canvas.addEventListener("click", onClick);
    const onResize = () => draw();
    window.addEventListener("resize", onResize);

    void poll(true);
    const pollId = window.setInterval(() => void poll(), 60_000);
    const tickId = reduced ? null : window.setInterval(draw, 1000);

    return () => {
      disposed = true;
      canvas.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
      window.clearInterval(pollId);
      if (tickId) window.clearInterval(tickId);
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <canvas
        ref={canvasRef}
        aria-label="The half-wheel: the bitcoin clock's mobile sky. Tap a ring for its reading."
        className="block w-full cursor-pointer touch-manipulation"
        style={{ height: "min(74vh, 700px)", minHeight: "480px" }}
      />
    </div>
  );
}
