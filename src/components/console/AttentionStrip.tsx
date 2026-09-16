"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { OrderRecord } from "@/lib/store";

/**
 * T-319 (0018.06.26 a₿ — the Admiral: "the mark fullfilled area is kind
 * of a nunsance… section can be minimized", and he's "not sure if that
 * is the best place"). The brief's named decision, option (b) — the one
 * Astra's K48 read recommended: fulfilment lives ONLY in the Money
 * room's order popup (which already carried an identical "Mark
 * fulfilled ✓"), and Home keeps this one compact counted pointer into
 * the order book. The action is not deleted — it moved to the room
 * where the books already are.
 *
 * What stays constant from the original strip (Admiral, 0018.05.15):
 * sessions still close out from their own calendar popups, so the count
 * here carries only what has no calendar entry — goods to ship or hand
 * over, and give-what-you-can offers waiting on Love's yes.
 *
 * Astra's rider on the decision: the three states never blur. Loading
 * is a quiet line; a FAILED load is loud and offers a retry (a failure
 * must never read as "nothing waiting"); only a truly empty book
 * renders nothing at all.
 */

/** pure + exported for the tests: what the pointer counts */
export function attentionCounts(
  orders: OrderRecord[],
  attention: string[],
): { goods: number; offers: number } {
  // a session order lives on the calendar; the count carries the rest
  const isSession = (o: OrderRecord) => !!o.bookingId || o.lineItems.some((l) => l.bookingId || l.voucher);
  const goods = orders.filter((o) => attention.includes(o.id) && !isSession(o)).length;
  const offers = orders.filter((o) => o.pwycPending).length;
  return { goods, offers };
}

type LoadState = "loading" | "failed" | "ready";

export default function AttentionStrip() {
  const [state, setState] = useState<LoadState>("loading");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [attention, setAttention] = useState<string[]>([]);

  const load = useCallback(() => {
    /* the initial state IS "loading", so the effect's first pass needs no
       reset (a synchronous setState here would trip the purity rule);
       the Retry button sets it from its own handler before re-calling */
    fetch("/api/admin/store/orders", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.ok) {
          setState("failed");
          return;
        }
        setOrders(d.orders ?? []);
        setAttention(d.needsAttention ?? []);
        setState("ready");
      })
      .catch(() => setState("failed"));
  }, []);
  useEffect(load, [load]);

  if (state === "loading") {
    return (
      <p style={{ margin: "12px 0 0", fontSize: ".75rem", color: "var(--muted)" }}>
        checking the order book…
      </p>
    );
  }

  if (state === "failed") {
    return (
      <div style={{ marginTop: 16, padding: "10px 16px", borderRadius: 12, fontSize: ".85rem",
        background: "rgba(231,178,195,.14)", border: "1.5px solid rgba(231,178,195,.5)", color: "var(--ink-body)",
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span>⚑ the order book didn&apos;t answer — something may be waiting on your hand.</span>
        <button type="button" className="btn btn-sm" onClick={() => { setState("loading"); load(); }}>Retry</button>
      </div>
    );
  }

  const { goods, offers } = attentionCounts(orders, attention);
  if (goods === 0 && offers === 0) return null;

  return (
    <Link
      href="/a/money"
      style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 10px",
        marginTop: 16, padding: "10px 16px", borderRadius: 12, textDecoration: "none",
        background: "rgba(217,178,78,.12)", border: "1.5px solid rgba(180,134,43,.45)",
        color: "var(--gold-wash-ink, #7a5a12)" }}
    >
      <b style={{ fontSize: ".82rem" }}>⚑ waiting on your hand</b>
      <span style={{ fontSize: ".85rem" }}>
        {goods > 0 && `${goods} to ship or hand over`}
        {goods > 0 && offers > 0 && " · "}
        {offers > 0 && `🎁 ${offers} give-what-you-can ${offers === 1 ? "offer waits" : "offers wait"} on your yes`}
      </span>
      <span style={{ marginLeft: "auto", fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".08em" }}>
        the order book →
      </span>
    </Link>
  );
}
