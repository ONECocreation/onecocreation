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
    <Link href="/cart" title="Your basket" style={{ whiteSpace: "nowrap" }}>
      {/* T-121 THE PINK PASS: the 🧺 emoji "feels jank" (Love, Sept 1 00:25) —
          a simple rounded-bag inline SVG in the rose ink. The header never
          theme-flips, so the night rose #E7B2C3 is pinned literal here (the
          house's always-night chrome idiom), not var(--rose) which would
          flip to the dawn rung on a dark bar. */}
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"
        style={{ verticalAlign: "-3px", color: "#E7B2C3" }}>
        <path d="M5.6 8.4h12.8l-1.05 10.3a2.6 2.6 0 0 1-2.6 2.4H9.25a2.6 2.6 0 0 1-2.6-2.4L5.6 8.4Z"
          stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 10.6V7a3 3 0 0 1 6 0v3.6"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {count > 0 ? ` ${count}` : ""}
    </Link>
  );
}
