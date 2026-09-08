"use client";

import Link from "next/link";
import { useState } from "react";
import type { StoreItem } from "@/lib/store";
import { dollars } from "@/lib/money-words";

/* eslint-disable @next/next/no-img-element */

/**
 * ONE STORE ITEM AS A FLIP CARD (TASK-148, 0018.06.17 a₿ — the Admiral:
 * "the cards on the meditations in /store are not flipping — it extends
 * the card in an unnatural way, it goes outside the box … like the
 * discovery-call session card: it turns over and turns back"). The culprit
 * was the QuickView peek Sheet: its position:fixed is trapped by the
 * .card's backdrop-filter containing block, so the "popup" landed inside
 * the grid cell, stretched the card and spilled over the neighbors (the
 * IAM Worthy shot). That Sheet is retired; the shelf now rides the ONE
 * house flip mechanism — the same `.flip-card` contract (house.css) the
 * session cards on /book turn on. FRONT: picture, name, one-line sub,
 * price. BACK: the short story, price, the doors. Click ANYWHERE turns
 * the card; Enter/Space turns it too; front and back are the same box,
 * so the grid never reflows. The buy/basket doors (GET IT ⚡, ADD TO
 * BASKET) live on the FULL VIEW page only — the card's one door is
 * "Full view →", on both faces.
 */

/** everything the card shows, derived from the item — derive-or-dash */
export function storeCardModel(item: StoreItem): {
  priceLabel: string;
  fiatSecondary: string | null;
  onSale: boolean;
  soldOut: boolean;
  deliverableLabel: string | null;
  img: string | null;
} {
  const effective = item.sale ?? item.price;
  return {
    priceLabel:
      effective.sats != null
        ? `${effective.sats.toLocaleString("en-US")} sats`
        : effective.fiat
          ? dollars(effective.fiat.amount, effective.fiat.currency)
          : "—",
    fiatSecondary:
      effective.sats != null && effective.fiat
        ? dollars(effective.fiat.amount, effective.fiat.currency)
        : null,
    onSale: item.sale != null,
    soldOut: item.status === "soldout",
    deliverableLabel: item.media?.deliverable?.label ?? null,
    img: item.media?.images[0] ?? item.images[0] ?? null,
  };
}

export default function StoreItemCard({
  item,
  icon,
  href,
  delay = 0,
}: {
  item: StoreItem;
  /** placeholder face when the item has no product shot */
  icon: string;
  /** the full-view door — the item's own page, on both faces */
  href: string;
  delay?: number;
}) {
  const [flipped, setFlipped] = useState(false);
  const flip = () => setFlipped((f) => !f);
  const m = storeCardModel(item);

  return (
    /* reveal rides its OWN wrapper (the session card's hard-won note): the
       scroll-observer stamps `in` on the DOM directly, and any className
       React re-writes on state change wipes that stamp — the card vanished
       on every flip. This wrapper's className never changes. */
    <div className="reveal" style={{ transitionDelay: `${delay}s` }}>
    <div className={`flip-card${flipped ? " is-flipped" : ""}`}>
      <div className="flip-inner">

        {/* ══ FRONT — picture, name, one-line sub, price, the doors ══ */}
        <div className="card flip-front" style={{ cursor: "pointer" }}
          onClick={flip} aria-hidden={flipped} inert={flipped}>
          {/* the picture IS the flipper (the session card's pattern): tap it
              or Enter/Space → the card turns */}
          <div role="button" tabIndex={flipped ? -1 : 0} aria-pressed={flipped}
            aria-label={`Turn the card — more about ${item.title}`}
            onClick={(e) => { e.stopPropagation(); flip(); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } }}
            style={{ position: "relative", cursor: "pointer" }}>
            {m.img ? (
              <img className="thumb" src={m.img} alt={item.title} />
            ) : (
              <div className="thumb" style={{ display: "grid", placeItems: "center", fontSize: "2.6rem",
                /* #f3dce3 stays literal — it's the cartridge.ts `blush` brand def, kept as data (S2) */
                background: "linear-gradient(135deg,#f3dce3,var(--lavender-soft))" }}>
                {icon}
              </div>
            )}
          </div>
          <div className="body">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <h3 style={{ fontWeight: 400, fontSize: "1.12rem", margin: 0 }}>{item.title}</h3>
              {m.soldOut && (
                <span style={{ fontSize: ".64rem", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: ".06em", color: "var(--rose)", whiteSpace: "nowrap" }}>sold out</span>
              )}
            </div>
            {/* the one-line sub — the shelf stays level, the story lives on the back */}
            <p style={{ color: "var(--muted)", fontSize: ".88rem", margin: ".4em 0 .2em",
              display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {item.blurb}
            </p>
            {m.deliverableLabel && (
              <p style={{ fontSize: ".72rem", color: "var(--lavender)", margin: "0 0 .2em" }}>
                ✦ includes {m.deliverableLabel}
              </p>
            )}
            <div style={{ margin: "10px 0 14px" }}>
              <span className="price" style={{ fontSize: "1.25rem" }}>{m.priceLabel}</span>
              {m.onSale && (
                <span style={{ marginLeft: 8, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: ".06em", color: "var(--rose)" }}>on sale</span>
              )}
              {m.fiatSecondary && (
                <span style={{ marginLeft: 8, fontSize: ".78rem", color: "var(--muted)" }}>
                  {m.fiatSecondary}
                </span>
              )}
            </div>
            {/* doors: centered at the card's foot; the flip stops at them */}
            <div className="push" onClick={(e) => e.stopPropagation()}
              style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
              <Link className="btn btn-sm" href={href}>Full view →</Link>
              <button className="btn btn-ghost btn-sm" onClick={flip} aria-expanded={flipped}>more info</button>
            </div>
          </div>
        </div>

        {/* ══ BACK — the short story, the price, the doors ══ */}
        <div className="card flip-back" style={{ cursor: "pointer" }}
          onClick={flip} aria-hidden={!flipped} inert={!flipped}>
          <div className="body">
            <h3 style={{ fontWeight: 400, fontSize: "1.12rem", margin: 0, textAlign: "center",
              textWrap: "balance" }}>
              {item.title}
            </h3>
            <p style={{ margin: "4px 0 0", textAlign: "center", fontSize: ".8rem", color: "var(--gold-deep)" }}>
              {m.priceLabel}{m.onSale && <span style={{ color: "var(--rose)" }}> · on sale</span>}
            </p>
            <div className="flip-scroll" style={{ margin: "10px 0 0", paddingRight: 4,
              borderTop: "1px solid var(--glass-edge)" }}>
              <p style={{ margin: "10px 0 0", fontSize: ".88rem", lineHeight: 1.7,
                color: "var(--ink-body)", whiteSpace: "pre-line" }}>
                {item.blurb || "Love is still writing this one's words ✨"}
              </p>
            </div>
            <div onClick={(e) => e.stopPropagation()}
              style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <Link className="btn btn-sm" href={href}>Full view →</Link>
              <button className="btn-quiet" onClick={flip}>flip back</button>
            </div>
          </div>
        </div>

      </div>
    </div>
    </div>
  );
}
