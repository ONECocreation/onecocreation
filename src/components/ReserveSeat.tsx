"use client";

import { useState } from "react";

/** The retreat's gold door — the seat rides the ordinary basket + rail. */
export default function ReserveSeat({ itemId, label }: { itemId: string; label: string }) {
  const [busy, setBusy] = useState(false);

  async function reserve() {
    setBusy(true);
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    }).then((r) => r.json()).catch(() => null);
    if (res?.ok) {
      window.dispatchEvent(new Event("oc-cart-changed"));
      window.location.assign("/cart");
    } else setBusy(false);
  }

  return (
    <button className="btn btn-gold" onClick={reserve} disabled={busy}>
      {busy ? "Adding…" : label}
    </button>
  );
}
