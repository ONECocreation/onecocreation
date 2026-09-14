"use client";

/**
 * THE COUNTDOWN (TASK-244) — the "starting soon" scene's only client JS:
 * a tiny island ticking once a second from a server-rendered target ISO
 * instant. `mm:ss` under an hour out, `h:mm:ss` beyond it. The target
 * never changes once the scene is on air, so there is nothing here to
 * derive but the clock face — the target itself, or its absence, is
 * FullScene's call (absent = the words "starting soon" alone, this
 * component never renders at all).
 *
 * The initial render (server AND the first client paint) reads the same
 * wall clock, so a shot taken the instant the page loads already shows a
 * real countdown, not a placeholder — `suppressHydrationWarning` covers
 * the one-second seam a slow network can open between the two.
 */

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function Countdown({ target, style }: { target: string; style?: React.CSSProperties }) {
  const [text, setText] = useState<string>(() => formatRemaining(Date.parse(target) - Date.now()));

  useEffect(() => {
    const tick = () => setText(formatRemaining(Date.parse(target) - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <span style={style} suppressHydrationWarning>
      {text}
    </span>
  );
}
