"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { estimateHeight } from "@/lib/bb/bft";
import type { LivingTip } from "@/components/time/living-clock-engine";
import Converters from "@/components/time/Converters";

/**
 * /time — the room behind the TIME DOOR. One live poll feeds the "watch a
 * block land" strip and the converters' sense of "now"; the paper rides in
 * as server-rendered children above the experiment.
 *
 * DIFFERENT WORLDS, SAME CLOCK (owner ruling 0018.04.28): each site tells
 * the one time its own way — frens.earth's clock is THE ORRERY (the page's
 * hero, mounted by the page itself); the pacman living clock performs at
 * pacsarcade.org/time; DW land will tell it in brass. The pacman hero that
 * used to open this component moved to the arcade for good.
 *
 * ONE data seam (owner ruling 0018.04.22): everything reads the fleet's
 * own /api/chain/tip door — ?full=1 — which walks OUR NODE first,
 * mempool.space as the honest fallback, server-side and pluggable. No
 * client here ever phones a third party. Seam dark → the genesis-anchored
 * ~ estimate; the clock never stops and never fakes a pulse.
 */

/** an honest cold-boot reading — the genesis-anchored ~, before the seam answers */
function estimateTip(): LivingTip {
  return {
    height: estimateHeight(),
    estimated: true,
    fill: 0.02,
    memCount: null,
    tipTimestamp: null,
    diffChange: null,
    diffRemaining: null,
  };
}

export default function TimeDoor({ children }: { children?: ReactNode }) {
  const [tip, setTip] = useState<LivingTip>(estimateTip);
  const [breaking, setBreaking] = useState(false);
  const [landed, setLanded] = useState<number | null>(null); // last block seen landing, for the strip
  /* the RAW mempool vsize (vB) — kept beside the clamped fill so the strip
     can say how DEEP the queue runs when it holds more than one block */
  const [memVsize, setMemVsize] = useState<number | null>(null);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      /* the 10 s deadline: a request left hanging across a laptop sleep or
         a network change must never out-live the poll that sent it */
      fetch("/api/chain/tip?full=1", { cache: "no-store", signal: AbortSignal.timeout(10_000) })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!alive) return;
          if (d?.ok && Number.isFinite(d.height) && d.height > 0) {
            /* only a NEW REAL block pulses — an ~estimate never fakes a break */
            if (prev.current != null && d.height > prev.current) {
              setBreaking(true);
              setLanded(d.height);
              setTimeout(() => alive && setBreaking(false), 4000);
            }
            prev.current = d.height;
            if (typeof d.mempoolVsize === "number") setMemVsize(d.mempoolVsize);
            setTip((t) => ({
              height: d.height,
              estimated: false,
              /* offline / missing fill → hold the last reading */
              fill:
                typeof d.mempoolVsize === "number"
                  ? Math.max(0.02, Math.min(1, d.mempoolVsize / 1_000_000))
                  : t.fill,
              memCount: typeof d.mempoolCount === "number" ? d.mempoolCount : t.memCount,
              tipTimestamp: typeof d.tipTimestamp === "number" ? d.tipTimestamp : null,
              diffChange: typeof d.difficultyChange === "number" ? d.difficultyChange : null,
              diffRemaining: typeof d.difficultyRemaining === "number" ? d.difficultyRemaining : null,
            }));
          } else {
            /* the seam is dark — the honest ~ carries; fill holds its last reading */
            setTip((t) => ({ ...estimateTip(), fill: t.fill, memCount: null }));
          }
        })
        .catch(() => {
          if (alive) setTip((t) => ({ ...estimateTip(), fill: t.fill, memCount: null }));
        });
    };
    tick();
    const id = setInterval(tick, 30_000);
    /* the wake law, all three doors: hidden tabs get their timers suspended —
       re-knock the instant the page is looked at again (tab switch back,
       bfcache restore, the network returning) */
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, []);

  const { height, estimated, fill, memCount } = tip;

  /* THE HONESTY FIX (owner order): fill is mempoolVsize vs ONE block's
     ~1M vB, clamped to 1 — so with a deep mempool (tens of blocks' worth,
     the normal weather now) the bar pins at 100% and "filling ~X%" reads
     like a stuck lie. The math is CORRECT — the next block IS full — so
     the copy tells that truth instead of a percentage. */
  const nextBlockFull = !estimated && fill >= 1;
  const queueDepth = memVsize != null ? memVsize / 1_000_000 : null;

  return (
    <>
      {/* ═══ THE PAPER (server-rendered) — the clock itself is the page's
          hero, THE ORRERY, mounted above this component ═══ */}
      {children}

      {/* ═══ THE EXPERIMENT ═══ */}
      <section className="mb-6" aria-label="The experiment">
        <p className="mb-2 font-pixel text-[10px] uppercase tracking-widest text-white/40">
          PART TWO ▸ THE EXPERIMENT
        </p>
        <h2 className="mb-3 text-balance font-pixel text-lg uppercase text-neon">
          Watch a block land
        </h2>
        <p className="mb-4 text-pretty font-body text-sm text-white/70">
          This strip is live. The bar is the mempool — everyone&apos;s waiting
          payments — filling toward one block&apos;s worth of space. Leave this
          page open: when the next block lands, every planet on the orrery
          above steps forward at once and the height counts one more. That
          moment is the tick of the only clock the whole world agrees on.
        </p>

        <div className={`border-2 border-edge bg-panel p-4 ${breaking ? "block-break" : ""}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 font-mono text-xs text-white/70">
            <span>
              {nextBlockFull ? (
                /* the queue holds more than one block — say THAT, not a
                   pinned percentage (the owner's honesty order) */
                <>
                  <b className="text-coin">next block is full</b>
                  {memCount != null && (
                    <> · {memCount.toLocaleString()} payments waiting</>
                  )}
                </>
              ) : (
                <>
                  next block filling{" "}
                  <b className="text-coin whitespace-nowrap">~{Math.round(fill * 100)}%</b>
                </>
              )}
            </span>
            <span className="whitespace-nowrap tabular-nums">
              tip ★{estimated ? "~" : ""}
              {height?.toLocaleString() ?? "—"}
            </span>
          </div>
          {/* the fill bar — the same signal as the badge's orange ring */}
          <div
            className="mt-2 h-3 border border-edge bg-void"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(Math.min(fill, 1) * 100)}
            aria-label="Mempool filling toward one block"
          >
            <div
              className="h-full transition-[width] duration-1000"
              style={{
                width: `${Math.round(Math.min(fill, 1) * 100)}%`,
                background: "linear-gradient(90deg, rgba(247,147,26,.55), #f7931a)",
              }}
            />
          </div>
          <p className="mt-2 text-pretty font-mono text-[10px] text-white/40">
            {landed != null ? (
              <span className="text-neon">
                ★{landed.toLocaleString()} just landed — the clock advanced ten minutes. tick tock.
              </span>
            ) : estimated ? (
              <>~ the network is unreachable right now — the clock keeps counting on the honest estimate, and will snap true when the chain answers.</>
            ) : nextBlockFull ? (
              <>
                the queue runs <span className="whitespace-nowrap">~{queueDepth != null ? Math.round(queueDepth).toLocaleString() : "many"} blocks</span> deep
                — the next block is already spoken for. a full bar doesn&apos;t force a block:
                miners find one every <span className="whitespace-nowrap">~10 minutes</span> on
                average. that randomness is why the clock&apos;s estimates wear the ~.
              </>
            ) : (
              <>a full bar doesn&apos;t force a block — miners find one every <span className="whitespace-nowrap">~10 minutes</span> on average, whenever the numbers allow. that randomness is why the clock&apos;s estimates wear the ~.</>
            )}
          </p>
        </div>
      </section>

      {/* the two converters — your date, any block */}
      <Converters tip={height} tipEstimated={estimated} />
    </>
  );
}
