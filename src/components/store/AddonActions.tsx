"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * The add-on strip's doors (Admiral, 0018.05.17): more info, add to basket
 * (stay and keep browsing), buy now. TASK-147 (0018.06.17 a₿): the strip
 * was written before T-129's switches, so it offered one ⚡ door and stayed
 * SILENT on failure. Now the server page hands down the rail truth
 * (`doors`) and the strip speaks: the bitcoin door only when the bitcoin
 * rail is live and the item has a sats price, the card door (the word is
 * CARD, never "cash") only when Square is live and the item has a fiat
 * price, both doors when both, and "not open yet — ask Love" when neither —
 * no dead button ever. A failed click always answers in words underneath.
 */

/** Rail truth handed down from the server page: which doors the strip may
 *  honestly offer, with the price words already formatted there. */
export interface AddonDoors {
  btcpayLive: boolean;
  squareLive: boolean;
  /** "11,111 sats" when the item carries a sats price, else null */
  satsLabel?: string | null;
  /** "$11" when the item carries a fiat price, else null */
  fiatLabel?: string | null;
}

/** Which doors render, with their exact words — pure + exported for
 *  tests/buy-panel.test.ts. No `doors` prop = the pre-T-147 caller contract
 *  (one bitcoin-style door through the basket), kept so an old caller never
 *  loses its button. */
export function addonDoorPlan(doors?: AddonDoors): {
  bitcoin: string | null;
  card: string | null;
  askLove: boolean;
} {
  if (!doors) return { bitcoin: "Buy now ⚡", card: null, askLove: false };
  const bitcoin = doors.btcpayLive && doors.satsLabel ? `GET IT ⚡ ${doors.satsLabel}` : null;
  const card = doors.squareLive && doors.fiatLabel ? `PAY BY CARD ${doors.fiatLabel}` : null;
  return { bitcoin, card, askLove: !bitcoin && !card };
}

export default function AddonActions({ itemId, doors }: { itemId: string; doors?: AddonDoors }) {
  const [state, setState] = useState<"idle" | "busy" | "added">("idle");
  const [error, setError] = useState<string | null>(null);

  const plan = addonDoorPlan(doors);

  async function add(thenCart: boolean) {
    if (state === "busy") return;
    setState("busy");
    setError(null);
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
    } else {
      // never a silent nothing — the route's own sentence, or these words
      setError(res?.reason ?? "could not add — try again");
      setState("idle");
    }
  }

  /** The card door goes STRAIGHT to the single-item checkout on the square
   *  rail (the basket's checkout is sats-first by design — ruling #2 — so a
   *  card buyer never detours through a door that can only refuse them). */
  async function buyByCard() {
    if (state === "busy") return;
    setState("busy");
    setError(null);
    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, rail: "card" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.reason ?? "checkout failed — try again");
        setState("idle");
        return;
      }
      if (data.paid) {
        window.location.assign(`/store/order/${data.orderId}`);
        return;
      }
      window.location.assign(data.payUrl);
    } catch {
      setError("checkout unreachable — try again");
      setState("idle");
    }
  }

  // one gold door, two quiet ones beneath — pushed to the card's foot so
  // all three tiles land their buttons on the same line (Admiral, 0018.05.15);
  // the quiet pair wears the shipped .btn-quiet now (cartridge walk step 5)
  return (
    <div className="push" style={{ display: "flex", flexDirection: "column", alignItems: "center",
      gap: 6, marginTop: 14, width: "100%" }}>
      {plan.askLove ? (
        /* no live rail can sell this item — the words say so and the link
           is a real door (the item page carries the waitlist), never a
           dead button */
        <Link className="btn btn-ghost btn-sm" style={{ width: "100%", maxWidth: 220, textAlign: "center" }}
          href={`/store/${itemId}`}>
          not open yet — ask Love
        </Link>
      ) : (
        <>
          {plan.bitcoin && (
            <button className="btn btn-gold btn-sm" style={{ width: "100%", maxWidth: 220 }}
              onClick={() => add(true)} disabled={state === "busy"}>
              {plan.bitcoin}
            </button>
          )}
          {plan.card && (
            <button className={`btn ${plan.bitcoin ? "btn-ghost" : "btn-gold"} btn-sm`}
              style={{ width: "100%", maxWidth: 220 }}
              onClick={buyByCard} disabled={state === "busy"}>
              {plan.card}
            </button>
          )}
        </>
      )}
      <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
        <Link className="btn-quiet" href={`/store/${itemId}`}>More info</Link>
        <button className="btn-quiet" onClick={() => add(false)} disabled={state === "busy"}>
          {state === "added" ? "In the basket ✓" : "Add to basket 🧺"}
        </button>
      </div>
      {error && (
        <p style={{ margin: "4px 0 0", fontSize: ".8rem", color: "var(--err)", textAlign: "center" }}>
          {error}
        </p>
      )}
    </div>
  );
}
