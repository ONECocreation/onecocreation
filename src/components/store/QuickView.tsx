"use client";

import Link from "next/link";
import { useState } from "react";
import Sheet from "@/components/Sheet";

/* eslint-disable @next/next/no-img-element */

/**
 * QUICK VIEW (0018.05.15, after Love's Shine shelf): a popup peek at any
 * item without leaving the shelf — picture, her words, the price, and the
 * same doors, centered. Rides the one <Sheet> primitive now (cartridge
 * walk step 6) — Escape and the tap-outside come with the house.
 */

export interface QuickViewItem {
  id: string;
  title: string;
  blurb: string;
  priceLabel: string;
  img: string | null;
  icon: string;
  href: string;
  doorLabel: string;
  canBasket: boolean;
  /** "not sure?" — service items offer the discovery-call door */
  discoveryNudge?: boolean;
}

export default function QuickView({ item }: { item: QuickViewItem }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function addToBasket() {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id }),
    }).then((r) => r.json()).catch(() => null);
    if (res?.ok) {
      setNote("in the basket 🧺");
      window.dispatchEvent(new Event("oc-cart-changed"));
    } else setNote(res?.reason ?? "could not add — try its page");
  }

  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => { setOpen(true); setNote(null); }}>
        Quick view
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        z="popup"
        scrimStyle={{ backdropFilter: "blur(4px)" }}
        /* re-robed (the Admiral's word, 0018.05.15 — "the back of the card is
           white"): the QuickView now wears the sheet's own --sheet-bg — night
           glass in dark, paper in light — with theme-flipping ink to match */
        sheetStyle={{ borderRadius: 22, boxShadow: "0 24px 70px rgba(5,3,16,.55)", padding: 0,
          maxHeight: "88vh", textAlign: "center", overflow: "hidden" }}
      >
        {item.img ? (
          <img src={item.img} alt={item.title}
            style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", aspectRatio: "16/9", display: "grid", placeItems: "center",
            fontSize: "3rem", background: "linear-gradient(135deg,rgba(243,220,227,.25),rgba(139,118,196,.3))" }}>
            {item.icon}
          </div>
        )}
        <div style={{ padding: "20px 24px 22px" }}>
          <h3 style={{ fontFamily: "var(--font-h3, sans-serif)", fontWeight: 400, fontSize: "1.35rem",
            color: "var(--ink-strong)", margin: 0 }}>{item.title}</h3>
          <p style={{ margin: "8px 0 0", fontSize: ".9rem", color: "var(--ink-body)", whiteSpace: "pre-line",
            display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {item.blurb || "Love is still writing this one's words ✨"}
          </p>
          <p style={{ margin: "12px 0 0", fontFamily: "var(--serif, sans-serif)", fontSize: "1.25rem",
            color: "var(--gold-deep, #B4862B)" }}>{item.priceLabel}</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <Link className="btn btn-sm" href={item.href}>{item.doorLabel}</Link>
            {item.canBasket && (
              <button className="btn btn-ghost btn-sm" onClick={addToBasket}>Add to basket 🧺</button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Close</button>
          </div>
          {item.discoveryNudge && (
            <p style={{ margin: "14px 0 0" }}>
              <Link href="/book/discovery-call" className="btn-quiet" style={{ padding: "0 14px", whiteSpace: "normal", textTransform: "none", letterSpacing: 0, fontSize: ".82rem", display: "inline-block", maxWidth: "100%", lineHeight: 1.5 }}>
                <span style={{ fontSize: "2rem", verticalAlign: "-6px", marginRight: 8 }}>🕊️</span>not sure? set up a discovery call — credited toward your first session
              </Link>
            </p>
          )}
          {note && <p style={{ margin: "10px 0 0", fontSize: ".8rem", color: "var(--ok, #3c6b49)" }}>{note}</p>}
        </div>
      </Sheet>
    </>
  );
}
