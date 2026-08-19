"use client";

import { useEffect, useState } from "react";
import { bftDate, bftTime, currentBlockInfo, type BlockInfo } from "@/lib/bb/bft";

/**
 * THE PLACEHOLDER FACE (0018.05.26 a₿, TASK-03 Part 3) — interim honest
 * clock for /time while Love's own face is undrawn.
 *
 * The full arcade time experience (the orrery, the half-wheel, the time
 * door, the converters, the strip clock, the flip-clock ring, the birthday
 * checker) MOVED OUT with the transplant — transplant/frens-earth-time/ at
 * the repo root, bound for frens.earth (template-leak cleanup; the arcade
 * experience was never this site's to wear). What stays here is the plain
 * reading: the canonical BFT date + the boxed-star height, LIVE OR DASHES
 * (fleet ruling 0018.05.26 a₿ — no estimate ever renders; when the chain
 * doesn't answer, the dashes say so).
 *
 * DO NOT design the future face here — owner ruling 0018.04.28 ("different
 * worlds, same clock") says this world gets its own telling, and that
 * design is Love's call, not this file's. This clock only keeps the door
 * warm and honest.
 */
export default function TimeClock() {
  const [info, setInfo] = useState<BlockInfo | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = () => currentBlockInfo().then((i) => alive && setInfo(i));
    tick();
    const id = setInterval(tick, 60_000); // the house cadence
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const height = info?.height ?? null;

  return (
    <div className="mt-10 mb-14 w-full text-center" aria-label="Bitcoin Federated Time — live reading">
      {/* the canonical date — live, or dashes (never a modeled number) */}
      <p className="font-mono text-3xl text-neon sm:text-4xl">
        {height != null ? bftDate(height) : "————.——.—— —"}
      </p>
      <p className="mt-2 font-mono text-lg text-white/70">
        {height != null ? bftTime(height) : "——:——"}
      </p>
      {/* the boxed-star height — the canonical block mark (house.css .starbox:
          cyan, info — a time mark, never money) */}
      <p className="mt-4 font-mono text-sm text-white/60">
        <span className="starbox" aria-hidden="true" />{" "}
        {height != null ? height.toLocaleString() : "—"}
      </p>
      {height == null && (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-white/35">
          the chain didn&apos;t answer — no estimate wears this face
        </p>
      )}
    </div>
  );
}
