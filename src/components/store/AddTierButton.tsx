"use client";

import { useState } from "react";

/** The tier page's YES — drops the membership package into the basket and
 *  walks to checkout. The gate (sign-in for packages) meets them there.
 *  TASK-147 (0018.06.17 a₿): a failed add used to reset the button and say
 *  NOTHING — now the route's own sentence (or these words) shows beneath. */
export default function AddTierButton({ itemId, label, ghost }: { itemId: string; label: string; ghost?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    }).then((r) => r.json()).catch(() => null);
    if (res?.ok) {
      window.dispatchEvent(new Event("oc-cart-changed"));
      window.location.assign("/cart");
    } else {
      setError(res?.reason ?? "could not add — try again");
      setBusy(false);
    }
  }

  return (
    <>
      <button className={`btn ${ghost ? "btn-ghost" : "btn-gold"}`} style={{ width: "100%", textAlign: "center" }} onClick={add} disabled={busy}>
        {busy ? "Adding…" : label}
      </button>
      {error && (
        <p style={{ margin: "6px 0 0", fontSize: ".8rem", color: "var(--err)", textAlign: "center" }}>
          {error}
        </p>
      )}
    </>
  );
}
