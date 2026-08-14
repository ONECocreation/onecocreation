"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * One session on the home shelf (Admiral, 0018.05.14): the row stays calm —
 * name, price, BOOK — and "More info" unfolds the full description with the
 * three doors: book a time, add to basket, the item's own page.
 * Service ids match their store items, so the basket rail just works.
 */
export interface ServiceRowData {
  id: string;
  title: string;
  blurb: string;
  durationMin: number;
  usd?: number;
  sats?: number;
  pwyc?: boolean;
  /** a store item wears this id too — opens the basket + details doors */
  inStore?: boolean;
}

const ICON: [RegExp, string][] = [
  [/discovery/i, "🕊️"],
  [/soul/i, "💫"],
  [/haircut|cut|wax/i, "✂️"],
];
const iconFor = (id: string) => ICON.find(([re]) => re.test(id))?.[1] ?? "✨";

export default function ServiceRow({ svc }: { svc: ServiceRowData }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function addToBasket() {
    setBusy(true);
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: svc.id }),
    }).then((r) => r.json()).catch(() => null);
    if (res?.ok) {
      window.dispatchEvent(new Event("oc-cart-changed"));
      window.location.assign("/cart");
    } else setBusy(false);
  }

  return (
    <div className="svc" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", fontSize: "1.4rem", background: "linear-gradient(135deg,#f3dce3,#cbbbea)" }}>
          {iconFor(svc.id)}
        </div>
        <div className="meta">
          <h4>{svc.title}</h4>
          <p>{svc.durationMin} minutes</p>
        </div>
        <div style={{ textAlign: "right" }}>
          {svc.pwyc ? (
            <div className="pr">give what you can</div>
          ) : (
            <>
              {svc.usd != null && <div className="pr">${svc.usd}</div>}
              {svc.sats != null && <div className="sats">⚡ ≈ {svc.sats.toLocaleString("en-US")} sats</div>}
            </>
          )}
        </div>
        <button
          className="btn btn-ghost btn-sm"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Less info" : "More info"}
        </button>
        <Link className="btn btn-gold btn-sm" href={`/book/${svc.id}`}>Book ⚡</Link>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid rgba(139,118,196,.25)", marginTop: 14, paddingTop: 14 }}>
          <p style={{ color: "var(--ink-body)", fontSize: ".92rem", whiteSpace: "pre-line", margin: "0 0 14px" }}>
            {svc.blurb || "Full description coming — Love is writing it."}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="btn btn-gold btn-sm" href={`/book/${svc.id}`}>Book a time</Link>
            {svc.inStore && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={addToBasket} disabled={busy}>
                  {busy ? "Adding…" : "Add to basket 🧺"}
                </button>
                <Link className="btn btn-ghost btn-sm" href={`/store/${svc.id}`}>Full details →</Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
