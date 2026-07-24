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
  const prev = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      fetch("/api/chain/tip?full=1", { cache: "no-store" })
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
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const { height, estimated, fill } = tip;

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
        <h2 className="mb-3 font-pixel text-lg uppercase text-neon">Watch a block land</h2>
        <p className="mb-4 font-body text-sm text-white/70">
          This strip is live. The bar is the mempool — everyone&apos;s waiting
          payments — filling toward one block&apos;s worth of space. Leave this
          page open: when the next block lands, every planet on the orrery
          above steps forward at once and the height counts one more. That
          moment is the tick of the only clock the whole world agrees on.
        </p>

        <div className={`border-2 border-edge bg-panel p-4 ${breaking ? "block-break" : ""}`}>
          <div className="flex items-baseline justify-between font-mono text-xs text-white/70">
            <span>
              next block filling{" "}
              <b className="text-coin">~{Math.round(fill * 100)}%</b>
            </span>
            <span className="tabular-nums">
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
            aria-valuenow={Math.round(fill * 100)}
            aria-label="Mempool filling toward one block"
          >
            <div
              className="h-full transition-[width] duration-1000"
              style={{
                width: `${Math.round(fill * 100)}%`,
                background: "linear-gradient(90deg, rgba(247,147,26,.55), #f7931a)",
              }}
            />
          </div>
          <p className="mt-2 font-mono text-[10px] text-white/40">
            {landed != null ? (
              <span className="text-neon">
                ★{landed.toLocaleString()} just landed — the clock advanced ten minutes. tick tock.
              </span>
            ) : estimated ? (
              <>~ the network is unreachable right now — the clock keeps counting on the honest estimate, and will snap true when the chain answers.</>
            ) : (
              <>a full bar doesn&apos;t force a block — miners find one every ~10 minutes on average, whenever the numbers allow. that randomness is why the clock&apos;s estimates wear the ~.</>
            )}
          </p>
        </div>
      </section>

      {/* the two converters — your date, any block */}
      <Converters tip={height} tipEstimated={estimated} />
    </>
  );
}
