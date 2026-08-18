"use client";

import Link from "next/link";
import { useState } from "react";

/* eslint-disable @next/next/no-img-element */

/**
 * ONE SESSION AS A FLIP CARD (Admiral, 0018.06.10 — the peek Sheet is
 * retired): the old quick-view rode position:fixed inside a .card that
 * wears backdrop-filter, which makes the card its containing block — so
 * the "overlay" landed inside the grid cell and spilled over the
 * neighbors (the Admiral's overlap screenshot, booking overlap1.png).
 * Now the card itself turns over — the aceo playground's own 3D recipe
 * (.flip-card contract, house.css). FRONT: photo, name, duration+price,
 * the doors. BACK: the full blurb on dark glass, scrollable if long.
 * Front height rules; the back matches it, so the grid stays level.
 */
export interface ServiceCardData {
  id: string;
  title: string;
  blurb: string;
  durationMin: number;
  usd?: number;
  sats?: number;
  pwyc?: boolean;
  inStore?: boolean;
  img: string;
}

export default function ServiceCard({ svc, delay = 0 }: { svc: ServiceCardData; delay?: number }) {
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const flip = () => setFlipped((f) => !f);

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

  /* the same night glass on both faces — the turn shouldn't change the room */
  const glass: React.CSSProperties = {
    background: "rgba(22,17,40,.95)", border: "1px solid rgba(139,118,196,.35)",
    boxShadow: "0 30px 70px -28px rgba(5,3,16,.8)",
  };
  const priceLine = svc.pwyc ? "give what you can" : svc.usd != null ? `$${svc.usd}` : "";
  /* full details always has a door: the shelf page when stocked, the
     booking page (the session's own full story) otherwise */
  const detailsHref = svc.inStore ? `/store/${svc.id}` : `/book/${svc.id}`;

  return (
    /* reveal rides its OWN wrapper: the scroll-observer stamps `in` on the
       DOM directly, and any className React re-writes on state change wipes
       that stamp — the card vanished on every flip (Love's iPad, the
       Admiral's Brave). This wrapper's className never changes. */
    <div className="reveal" style={{ transitionDelay: `${delay}s` }}>
    <div className={`flip-card${flipped ? " is-flipped" : ""}`}>
      <div className="flip-inner">

        {/* ══ FRONT — photo, name, duration+price, the doors ══ */}
        <div className="card flip-front" style={{ ...glass, cursor: "pointer" }}
          onClick={flip} aria-hidden={flipped} inert={flipped}>
          {/* the picture IS the flipper (Admiral's spec): tap it → the card turns */}
          <div role="button" tabIndex={flipped ? -1 : 0} aria-pressed={flipped}
            aria-label={`Turn the card — more about ${svc.title}`}
            onClick={(e) => { e.stopPropagation(); flip(); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } }}
            style={{ position: "relative", cursor: "pointer" }}>
            <img className="thumb" src={svc.img} alt={svc.title}
              style={{ aspectRatio: "16/10", objectFit: "cover", objectPosition: "center 25%" }} />
            <div aria-hidden style={{ position: "absolute", inset: 0,
              background: "linear-gradient(180deg, transparent 40%, rgba(22,17,40,.92) 100%)" }} />
            <h3 style={{ position: "absolute", left: 20, right: 20, bottom: 10, margin: 0,
              fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.45rem", color: "var(--ink-strong)",
              textShadow: "0 2px 14px rgba(5,3,16,.8)", textWrap: "balance" }}>
              {svc.title}
            </h3>
          </div>
          <div className="body" style={{ padding: "16px 22px 22px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: ".74rem", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)" }}>
                {svc.durationMin} minutes
              </span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--serif)", fontSize: "1.25rem", color: "#EBCB77" }}>
                {priceLine}
              </span>
            </div>
            {svc.sats != null && !svc.pwyc && (
              <p style={{ margin: "2px 0 0", textAlign: "right", fontSize: ".76rem", fontWeight: 700, color: "rgba(235,203,119,.75)" }}>
                ⚡ ≈ {svc.sats.toLocaleString("en-US")} sats
              </p>
            )}
            <div className="push" onClick={(e) => e.stopPropagation()}
              style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
              <Link className="btn btn-sm" href={`/book/${svc.id}`}>Book ⚡</Link>
              <button className="btn btn-ghost btn-sm" onClick={flip} aria-expanded={flipped}>more info</button>
              <Link className="btn-quiet btn-quiet--accent" href={detailsHref}>full details</Link>
            </div>
          </div>
        </div>

        {/* ══ BACK — the full story on dark glass, scrolls if long ══ */}
        <div className="card flip-back" style={glass} aria-hidden={!flipped} inert={!flipped}>
          <div className="body" style={{ padding: "20px 22px 20px" }}>
            <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.3rem",
              color: "var(--ink-strong)", margin: 0, textAlign: "center", textWrap: "balance" }}>
              {svc.title}
            </h3>
            <p style={{ margin: "4px 0 0", textAlign: "center", fontSize: ".74rem", letterSpacing: ".1em",
              textTransform: "uppercase", color: "var(--muted)" }}>
              {svc.durationMin} minutes{priceLine && <> · <span style={{ color: "#EBCB77" }}>{priceLine}</span></>}
            </p>
            <div className="flip-scroll" style={{ margin: "12px 0 0", paddingRight: 4,
              borderTop: "1px solid rgba(139,118,196,.3)" }}>
              <p style={{ margin: "12px 0 0", fontSize: ".9rem", lineHeight: 1.8, color: "var(--ink-body)",
                whiteSpace: "pre-line" }}>
                {svc.blurb || "Full description coming — Love is writing it."}
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <Link className="btn btn-sm" href={`/book/${svc.id}`}>Book ⚡</Link>
              {svc.inStore && (
                <button className="btn-quiet btn-quiet--accent" onClick={addToBasket} disabled={busy}>
                  {busy ? "adding…" : "add to basket 🧺"}
                </button>
              )}
              <Link className="btn-quiet btn-quiet--accent" href={detailsHref}>full details</Link>
              <button className="btn-quiet" onClick={flip}>flip back</button>
            </div>
          </div>
        </div>

      </div>
    </div>
    </div>
  );
}
