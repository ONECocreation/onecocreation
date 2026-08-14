"use client";

import Link from "next/link";
import { useState } from "react";

/** The add-on strip's three doors (Admiral, 0018.05.17): more info, add to
 *  basket (stay and keep browsing), buy now (straight to checkout). */
export default function AddonActions({ itemId }: { itemId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "added">("idle");

  async function add(thenCart: boolean) {
    if (state === "busy") return;
    setState("busy");
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    }).then((r) => r.json()).catch(() => null);
    if (res?.ok) {
      window.dispatchEvent(new Event("oc-cart-changed"));
      if (thenCart) {
        window.location.assign("/cart");
        return;
      }
      setState("added");
      setTimeout(() => setState("idle"), 2200);
    } else setState("idle");
  }

  // one gold door, two quiet ones beneath — pushed to the card's foot so
  // all three tiles land their buttons on the same line (Admiral, 0018.05.15);
  // the quiet pair wears the shipped .btn-quiet now (cartridge walk step 5)
  return (
    <div className="push" style={{ display: "flex", flexDirection: "column", alignItems: "center",
      gap: 6, marginTop: 14, width: "100%" }}>
      <button className="btn btn-gold btn-sm" style={{ width: "100%", maxWidth: 220 }}
        onClick={() => add(true)} disabled={state === "busy"}>
        Buy now ⚡
      </button>
      <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
        <Link className="btn-quiet" href={`/store/${itemId}`}>More info</Link>
        <button className="btn-quiet" onClick={() => add(false)} disabled={state === "busy"}>
          {state === "added" ? "In the basket ✓" : "Add to basket 🧺"}
        </button>
      </div>
    </div>
  );
}
