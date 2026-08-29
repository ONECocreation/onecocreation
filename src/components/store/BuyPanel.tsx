"use client";

import { useState } from "react";
import { payInModal } from "@/lib/btcpay-modal";
import type { StoreItem } from "@/lib/store";

/**
 * The buy moment, in glass (walk facelift 0018.05.15) — honest to the
 * no-coiner: this shelf takes bitcoin, and the words say so before any
 * invoice appears. Centered card, fields evenly spaced, the doors at the
 * bottom center (the Admiral's law).
 */

const glassField: React.CSSProperties = {
  border: "1px solid rgba(139,118,196,.45)", borderRadius: 10, padding: "9px 12px",
  background: "rgba(255,255,255,.92)", fontSize: "1rem", color: "var(--field-ink)",
  fontFamily: "inherit", width: "100%", boxSizing: "border-box",
};

const fieldLabel: React.CSSProperties = {
  display: "block", textAlign: "left", fontSize: ".72rem", letterSpacing: ".08em",
  textTransform: "uppercase", color: "var(--muted, #897f97)",
};

export default function BuyPanel({
  item,
  railLive,
  squareLive = false,
}: {
  item: StoreItem;
  railLive: boolean;
  /** true only when Square is env-configured — an unconfigured site never
   *  renders a trace of this prop (the card option, the rail-picker chips,
   *  the "pick how you'd like to pay" copy all stay dark). */
  squareLive?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [shipName, setShipName] = useState("");
  const [shipAddr, setShipAddr] = useState("");
  const [size, setSize] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [basketNote, setBasketNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const needsShipping = item.fulfillment === "self";
  const gated = item.kind === "digital" || item.kind === "package" || item.kind === "retreat";
  const sizes = item.sizes ?? [];
  const needsSize = sizes.length > 0;

  // the card rail is fiat-only — no invented sats↔fiat rate, so it's only
  // OFFERED when the item actually carries a fiat price (see payments.ts's
  // Square section / the checkout route's honest "not purchasable by card"
  // refusal, which this mirrors on the UI side rather than letting a click
  // round-trip into that error).
  const effective = item.sale ?? item.price;
  const cardAvailable = squareLive && effective.fiat != null;
  const bothAvailable = railLive && cardAvailable;
  const [rail, setRail] = useState<"btcpay" | "square">(railLive ? "btcpay" : "square");
  const anyRailLive = railLive || cardAvailable;

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          size: size ?? undefined,
          discountCode: discountCode.trim() || undefined,
          contact: email ? { email } : undefined,
          shipping: needsShipping ? { name: shipName, address: shipAddr } : undefined,
          rail: rail === "square" ? "card" : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.reason ?? "checkout failed");
        setBusy(false);
        return;
      }
      if (data.paid) {
        window.location.href = `/store/order/${data.orderId}`;
        return;
      }
      const opened = await payInModal(data.payUrl, {
        onPaid: () => window.location.assign(`/store/order/${data.orderId}`),
        onClose: () => window.location.assign(`/store/order/${data.orderId}`),
      });
      if (!opened) window.location.href = data.payUrl;
    } catch {
      setError("checkout unreachable — try again");
      setBusy(false);
    }
  }

  if (item.status === "soldout") {
    return <p style={{ marginTop: 24, fontSize: ".9rem", color: "var(--muted, #897f97)" }}>Sold out — back when the artist restocks.</p>;
  }

  if (!anyRailLive) {
    return (
      <p style={{ marginTop: 24, fontSize: ".85rem", color: "var(--muted, #897f97)" }}>
the shelf opens for checkout very soon — browse with love ✨
      </p>
    );
  }

  return (
    <div
      style={{
        margin: "24px auto 0", maxWidth: 440, textAlign: "center",
        borderRadius: 20, border: "1px solid var(--glass-edge)",
        background: "var(--glass)", backdropFilter: "blur(8px)",
        boxShadow: "0 24px 60px -30px rgba(120,100,160,.55)", padding: "20px 22px",
      }}
    >
      <p style={{ margin: 0, fontSize: ".82rem", color: "var(--muted, #897f97)" }}>
        {bothAvailable
          ? "Pick how you'd like to pay."
          : cardAvailable && !railLive
            ? "Pay by card, through Square's own secure checkout."
            : "Pay in bitcoin — quick as a breath on lightning — and it lands straight with the artist."}
      </p>
      {bothAvailable && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10 }}>
          <button
            type="button"
            className="chip-select"
            aria-pressed={rail === "btcpay"}
            onClick={() => setRail("btcpay")}
            style={{ fontSize: ".82rem" }}
          >
            ⚡ bitcoin
          </button>
          <button
            type="button"
            className="chip-select"
            aria-pressed={rail === "square"}
            onClick={() => setRail("square")}
            style={{ fontSize: ".82rem" }}
          >
            💳 card
          </button>
        </div>
      )}
      {gated && (
        <p style={{ margin: "8px 0 0", fontSize: ".8rem", color: "var(--info)" }}>
          unlocks for your account — your email at checkout becomes it, or sign in first.
        </p>
      )}
      {needsSize && (
        <fieldset style={{ border: 0, padding: 0, margin: "16px 0 0" }}>
          <legend style={{ ...fieldLabel, textAlign: "center", width: "100%", marginBottom: 6 }}>
            size — pick one before buying
          </legend>
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8 }}>
            {sizes.map((s) => (
              /* the shipped selectable pill (cartridge walk step 5) — gold
                 on-state rides aria-pressed */
              <button
                key={s}
                type="button"
                className="chip-select"
                aria-pressed={size === s}
                onClick={() => setSize(s)}
                style={{ fontSize: ".85rem" }}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {/* 1rem fields = 16px, so iOS doesn't zoom-jump on focus */}
        <label style={fieldLabel}>
          email for your receipt {gated ? "(becomes your account)" : "(optional)"}
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
            style={{ ...glassField, marginTop: 3 }} />
        </label>
        <label style={fieldLabel}>
          discount code (optional)
          <input value={discountCode} onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
            style={{ ...glassField, marginTop: 3, textTransform: "uppercase" }} />
        </label>
        {needsShipping && (
          <>
            <label style={fieldLabel}>
              ship to — name
              <input value={shipName} onChange={(e) => setShipName(e.target.value)}
                style={{ ...glassField, marginTop: 3 }} />
            </label>
            <label style={fieldLabel}>
              address
              <textarea value={shipAddr} onChange={(e) => setShipAddr(e.target.value)} rows={3}
                style={{ ...glassField, marginTop: 3, resize: "vertical" }} />
            </label>
            <p style={{ margin: 0, fontSize: ".7rem", color: "var(--muted, #897f97)", textAlign: "left" }}>
              seen by the artist alone · forgotten ~30 days after delivery
            </p>
          </>
        )}
      </div>
      {/* the doors — bottom center, evenly spaced */}
      <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
        <button
          onClick={buy}
          disabled={busy || (needsShipping && (!shipName || !shipAddr)) || (needsSize && !size)}
          className="btn btn-gold btn-sm"
          style={{ opacity: busy || (needsShipping && (!shipName || !shipAddr)) || (needsSize && !size) ? 0.5 : 1 }}
        >
          {busy ? "Opening invoice…" : needsSize && !size ? "Pick a size first" : "Buy now ⚡"}
        </button>
        <button
          onClick={async () => {
            if (needsSize && !size) { setBasketNote("pick a size first"); return; }
            const res = await fetch("/api/cart", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itemId: item.id, size: size ?? undefined }),
            });
            if ((await res.json().catch(() => ({ ok: false }))).ok) {
              setBasketNote("in the basket 🧺");
              window.dispatchEvent(new Event("oc-cart-changed"));
            } else setBasketNote("could not add — try again");
          }}
          className="btn btn-ghost btn-sm"
        >
          Add to basket 🧺
        </button>
      </div>
      {basketNote && <p style={{ margin: "10px 0 0", fontSize: ".8rem", color: "var(--ok)" }}>{basketNote}</p>}
      {error && <p style={{ margin: "10px 0 0", fontSize: ".8rem", color: "var(--err)" }}>{error}</p>}
    </div>
  );
}
