"use client";

import { useState } from "react";

/** The tier page's YES — drops the membership package into the basket and
 *  walks to checkout. The gate (sign-in for packages) meets them there. */
export default function AddTierButton({ itemId, label, ghost }: { itemId: string; label: string; ghost?: boolean }) {
  const [busy, setBusy] = useState(false);

  async function add() {
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
    <button className={`btn ${ghost ? "btn-ghost" : "btn-gold"}`} style={{ width: "100%", textAlign: "center" }} onClick={add} disabled={busy}>
      {busy ? "Adding…" : label}
    </button>
  );
}
