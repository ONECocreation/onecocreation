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
      🧺{count > 0 ? ` ${count}` : ""}
    </Link>
  );
}
