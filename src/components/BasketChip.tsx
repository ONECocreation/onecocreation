"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** The basket in the nav — count updates on every add (a custom event
 *  keeps it honest without polling). */
export default function BasketChip() {
  const [count, setCount] = useState(0);

  async function refresh() {
    const d = await fetch("/api/cart").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (d?.ok) setCount(d.lines?.reduce((n: number, l: { qty: number }) => n + l.qty, 0) ?? 0);
  }

  useEffect(() => {
    /* the kickoff rides a microtask — a synchronous setState in the effect
       body would cascade a second render (the set-state-in-effect law) */
    void Promise.resolve().then(refresh);
    const h = () => refresh();
    window.addEventListener("oc-cart-changed", h);
    return () => window.removeEventListener("oc-cart-changed", h);
  }, []);

  return (
    /* TASK-135: the count used to trail the icon as plain inline text — no
       badge shape, nothing pinning it to the icon, so it read as a stray
       number floating near the basket rather than a count ON it (the
       Admiral: "looks gross"). The icon box is now the positioning
       context; the badge is absolutely placed on its top-right corner. */
    <Link href="/cart" title="Your basket" style={{ position: "relative", display: "inline-flex", whiteSpace: "nowrap" }}>
      {/* T-121 THE PINK PASS: the 🧺 emoji "feels jank" (Love, Sept 1 00:25) —
          a simple rounded-bag inline SVG in the rose ink. The header never
          theme-flips, so the night rose #E7B2C3 is pinned literal here (the
          house's always-night chrome idiom), not var(--rose) which would
          flip to the dawn rung on a dark bar. */}
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"
        style={{ color: "#E7B2C3" }}>
        <path d="M5.6 8.4h12.8l-1.05 10.3a2.6 2.6 0 0 1-2.6 2.4H9.25a2.6 2.6 0 0 1-2.6-2.4L5.6 8.4Z"
          stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 10.6V7a3 3 0 0 1 6 0v3.6"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {count > 0 && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute", top: -6, right: -8,
            minWidth: 14, height: 14, padding: "0 3px",
            borderRadius: 999, background: "#E7B2C3", color: "#2E0E1D",
            fontSize: "9px", lineHeight: "14px", fontWeight: 700, textAlign: "center",
            boxShadow: "0 0 0 1.5px rgba(14,12,24,.86)",
          }}
        >
          {count}
        </span>
      )}
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {count > 0 ? `${count} item${count === 1 ? "" : "s"} in your basket` : "your basket is empty"}
      </span>
    </Link>
  );
}
