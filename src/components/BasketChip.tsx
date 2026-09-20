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
    <Link href="/cart" title="Your basket" className="basket-chip" style={{ position: "relative", display: "inline-flex", whiteSpace: "nowrap" }}>
      {/* T-121 → TASK-355 (0018.07.02 a₿, the Admiral's ruling on his site
          walk): Love LIKED the 🧺 emoji — the bag was the Admiral's own
          taste call, not hers, and this redraw is his ruling, not a second
          reversal of Love's ask. He asked for something "like the add to
          basket" wording everywhere, and Love envisioned a woven Red Riding
          Hood basket rather than either the emoji or the bag — an arched
          handle, a couple of weave lines, and (once something's inside) a
          small shape peeking over the rim under the handle. No emoji; the
          store buttons' own "Add to basket 🧺" text is untouched, out of
          this lane's OWNS. The header never theme-flips, so the night rose
          #E7B2C3 is pinned literal here (the house's always-night chrome
          idiom), not var(--rose) which would flip to the dawn rung on a
          dark bar. */}
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"
        style={{ color: "#E7B2C3" }}>
        {/* the arched handle */}
        <path d="M8 10c0-4.4 1.8-7 4-7s4 2.6 4 7"
          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        {count > 0 && (
          /* the filled state: a small shape (a cloth fold) peeking over the
             rim, under the handle's arch — the empty state omits it */
          <path d="M9.4 10c0-1.9 1.1-3.1 2.6-3.1s2.6 1.2 2.6 3.1" fill="currentColor" />
        )}
        {/* the woven basket body — a couple of weave lines at most */}
        <path d="M4.8 10h14.4l-1.2 8.4a2.3 2.3 0 0 1-2.3 2.1H8.3a2.3 2.3 0 0 1-2.3-2.1L4.8 10Z"
          stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M6.2 13.2h11.6M6.7 16.4h10.6"
          stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".6" />
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
          {/* TASK-355: the display caps at 99+ (a truly huge cart is a DATA
              finding, not a render bug — see SUMMARY.md); the screen-reader
              line below keeps the true count regardless. */}
          {count > 99 ? "99+" : count}
        </span>
      )}
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {count > 0 ? `${count} item${count === 1 ? "" : "s"} in your basket` : "your basket is empty"}
      </span>
    </Link>
  );
}
