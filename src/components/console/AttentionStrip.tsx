"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { OrderRecord } from "@/lib/store";

/**
 * UNDER THE CALENDAR (Admiral, 0018.05.15): the day's specific actions,
 * only when there are any. Sessions close out from their own calendar
 * popups — this strip carries what has no calendar entry: goods to ship
 * or hand over, and give-what-you-can offers waiting on Love's yes.
 */
export default function AttentionStrip() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [attention, setAttention] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/store/orders", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.ok) return;
        setOrders(d.orders ?? []);
        setAttention(d.needsAttention ?? []);
      })
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  async function fulfil(id: string) {
    setBusy(id);
    await fetch("/api/admin/store/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "fulfill" }),
    }).catch(() => {});
    setBusy(null);
    load();
  }

  // a session order lives on the calendar; the strip carries the rest
  const isSession = (o: OrderRecord) => !!o.bookingId || o.lineItems.some((l) => l.bookingId || l.voucher);
  const goods = orders.filter((o) => attention.includes(o.id) && !isSession(o));
  const offers = orders.filter((o) => o.pwycPending).length;

  if (goods.length === 0 && offers === 0) return null;

  return (
    <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12,
      background: "rgba(217,178,78,.12)", border: "1.5px solid rgba(180,134,43,.45)", color: "#7a5a12" }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: ".82rem" }}>⚑ waiting on your hand</p>
      {goods.map((o) => (
        <div key={o.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center",
          justifyContent: "space-between", gap: 8, marginTop: 8, fontSize: ".85rem" }}>
          <span>
            {o.lineItems[0]?.title}
            {o.lineItems.length > 1 && ` +${o.lineItems.length - 1}`}
            {o.lineItems[0]?.size && ` · size ${o.lineItems[0].size}`}
            {o.shipping?.name && <span style={{ opacity: 0.8 }}> · ship to {o.shipping.name}</span>}
            {!o.shipping?.name && o.entitlementSubject && <span style={{ opacity: 0.8 }}> · {o.entitlementSubject}</span>}
          </span>
          <button className="btn btn-sm" onClick={() => fulfil(o.id)} disabled={busy === o.id}>
            {busy === o.id ? "Marking…" : "Mark fulfilled ✓"}
          </button>
        </div>
      ))}
      {offers > 0 && (
        <p style={{ margin: goods.length ? "10px 0 0" : "8px 0 0", fontSize: ".85rem" }}>
          🎁 {offers} give-what-you-can {offers === 1 ? "offer waits" : "offers wait"} on your yes —{" "}
          <Link href="/a/money" style={{ color: "#7a5a12", textDecoration: "underline" }}>the offers desk</Link>
        </p>
      )}
    </div>
  );
}
