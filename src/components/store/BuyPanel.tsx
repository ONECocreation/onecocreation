"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { payInModal } from "@/lib/btcpay-modal";
import type { Price, StoreItem } from "@/lib/store";
import { dollars, priceWords, type MoneyPrefer } from "@/lib/money-words";
import { readMemberPrefer, saveMemberPrefer, useMoneyPrefer } from "@/lib/money-preference";
import { readSession } from "@/lib/session-read";
import SubscribeForm from "@/components/SubscribeForm";

/**
 * The buy moment, in glass (walk facelift 0018.05.15) — honest to the
 * no-coiner: this shelf takes bitcoin, and the words say so before any
 * invoice appears. Centered card, fields evenly spaced, the doors at the
 * bottom center (the Admiral's law).
 */

/**
 * TASK-147 (0018.06.17 a₿) — THE HONEST DOOR WORDS: the button says WHICH
 * rail and WHAT price in words, never a bare "Buy now ⚡" that could be
 * either rail (the bolt on a card charge was a lie of omission). The word
 * is CARD, never "cash" (Love's law). Derive-or-dash: no price → "—".
 * Pure + exported for tests/buy-panel.test.ts.
 */
export function buyDoorLabel(
  rail: "btcpay" | "square",
  price: { sats?: number; fiat?: { amount: number; currency: string } },
): string {
  if (rail === "square") {
    return `PAY BY CARD ${price.fiat ? dollars(price.fiat.amount, price.fiat.currency) : "—"}`;
  }
  return price.sats != null
    ? `GET IT ⚡ ${price.sats.toLocaleString("en-US")} sats`
    : `GET IT ⚡ ${price.fiat ? dollars(price.fiat.amount, price.fiat.currency) : "—"}`;
}

/**
 * TASK-177 (0018.06.18 a₿) — the gated line KNOWS the visitor. Signed in
 * (the same /api/frens/session read the header's FrenBadge makes, wrapped
 * in lib/session-read.ts): no email field, no second ceremony — the line
 * says whose account. A guest keeps TASK-173's basket-rule words VERBATIM.
 * Pure + exported for tests/item-page.test.ts.
 */
export function gatedLine(memberName: string | null): string {
  return memberName
    ? `yours on this account · ${memberName} · the moment payment settles`
    : "your download opens on the receipt page, and a receipt letter brings the door too — sign in, or your email below becomes your account, and it’s yours the moment payment settles.";
}

/** the quantity stepper's honest door: the button carries the LINE total
 *  (unit × qty) so the words match the charge — never a unit price on a
 *  qty>1 door */
export function scalePrice(price: Price, qty: number): Price {
  if (qty <= 1) return price;
  return {
    sats: price.sats != null ? price.sats * qty : undefined,
    fiat: price.fiat ? { amount: price.fiat.amount * qty, currency: price.fiat.currency } : undefined,
  };
}

/**
 * TASK-186 (0018.06.18 a₿) — THE RAIL FOLLOWS THE CHOICE: the "$ · sats"
 * toggle picks the words AND the default pay door (fiat → card, sats →
 * bitcoin), while both doors stay reachable (the rail chips never leave).
 * A denomination whose rail can't sell it keeps the OTHER door — the toggle
 * never strands the buyer on a dead rail. Pure + pinned in
 * tests/money-preference.test.ts.
 */
export function railForPrefer(
  prefer: MoneyPrefer,
  avail: { btcpay: boolean; square: boolean },
): "btcpay" | "square" {
  if (prefer === "fiat") return avail.square ? "square" : "btcpay";
  return avail.btcpay ? "btcpay" : "square";
}

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
  // TASK-177 — the panel knows you are signed in (the header's own session
  // read): no email field for a member, the gated line names the account
  const [memberName, setMemberName] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const needsShipping = item.fulfillment === "self";
  // TASK-177 — the ShinePages template's quantity stepper rides the WARES
  // (the shippable goods); digital/package/service keep their own doors
  const showQty = item.kind === "self" || item.kind === "fourthwall";
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
  /* the visitor's own tap on a rail chip is the last word; until then the
     rail follows the money word (the Admiral's ruling: fiat → card, sats →
     bitcoin, by DEFAULT — on first paint too, not only after a toggle) */
  const railTouched = useRef(false);

  /* TASK-186 — the visitor's denomination word. The "$ · sats" toggle below
     flips every price on the page (MONEY_EVENT) and remembers it; a signed-in
     member's saved word wins over the cookie and is written back on flip. */
  const [prefer, setPrefer] = useMoneyPrefer({ btc: railLive, card: squareLive });
  const [memberPrefKnown, setMemberPrefKnown] = useState(false);
  useEffect(() => {
    let live = true;
    readSession()
      .then((s) => { if (live && s) setMemberName(s.name); })
      .catch(() => {});
    readMemberPrefer()
      .then((m) => {
        if (!live || !m.signedIn) return;
        setMemberPrefKnown(true);
        if (m.prefer) setPrefer(m.prefer); // signed in wins — and the browser learns the word
      })
      .catch(() => {});
    return () => { live = false; };
    // setPrefer's identity is stable enough here — it only closes over setState
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (railTouched.current) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the default rail derives from the remembered word once it resolves (a microtask after first paint); a tapped chip stops this
    setRail(railForPrefer(prefer, { btcpay: railLive, square: cardAvailable }));
  }, [prefer, railLive, cardAvailable]);

  /** the toggle's one tap: remember it (browser + the member's profile when
   *  signed in), and let the pay door's default rail follow the choice */
  function choosePrefer(p: MoneyPrefer) {
    railTouched.current = false;
    setPrefer(p);
    setRail(railForPrefer(p, { btcpay: railLive, square: cardAvailable }));
    if (memberPrefKnown) void saveMemberPrefer(p);
  }

  /* TASK-145 (0018.06.17 a₿) — the price in words above the doors, DISPLAY
     ONLY: USD is shown whenever the item carries it AND the card rail could
     actually charge it (T-157's law: no fiat echo on a dark rail). A sale
     strikes the regular price through, in words ("· on sale", never color
     alone). Nothing here opens, closes, or reprices a rail.
     TASK-186: the words ride THE ONE DISPLAY LAW (priceWords) under the
     visitor's preferred denomination. One honest exception stays: bitcoin
     only + a fiat-priced item shows the fiat alone — that rail can still
     take a fiat-denominated invoice (never an "or", the card rail is dark). */
  const displayWords = (p: StoreItem["price"]): { primary: string; secondary: string | null } | null => {
    const w = priceWords(p, { btc: railLive, card: cardAvailable }, prefer);
    if (w.primary !== "—") return w;
    if (railLive && p.fiat) return { primary: dollars(p.fiat.amount, p.fiat.currency), secondary: null };
    return null;
  };
  const shown = displayWords(effective);
  const struck = item.sale ? displayWords(item.price) : null;

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
          qty: showQty && qty > 1 ? qty : undefined,
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
    /* TASK-129 (0018.06.16 a₿) — THE SWITCHES: no live rail (switch OFF or
       env dark) → the waitlist form, never a pay button — same doctrine as
       the Packages cards. TASK-147: the words say it plainly first — "not
       open yet — ask Love" — and the form is a real door, never a dead one. */
    return (
      <div style={{ marginTop: 24 }}>
        <p style={{ margin: "0 0 10px", fontSize: ".85rem", color: "var(--muted, #897f97)" }}>
          not open yet — <Link href="/support" style={{ color: "inherit", textDecoration: "underline" }}>ask Love</Link>.
          Leave your email and the door finds you the moment the shelf opens:
        </p>
        <SubscribeForm
          source={`waitlist-store-${item.id}`}
          cta="I'm interested — add me to the list. Checkout coming soon."
        />
      </div>
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
            onClick={() => { railTouched.current = true; setRail("btcpay"); }}
            style={{ fontSize: ".82rem" }}
          >
            ⚡ bitcoin
          </button>
          <button
            type="button"
            className="chip-select"
            aria-pressed={rail === "square"}
            onClick={() => { railTouched.current = true; setRail("square"); }}
            style={{ fontSize: ".82rem" }}
          >
            💳 card
          </button>
        </div>
      )}
      {gated && (
        <p style={{ margin: "8px 0 0", fontSize: ".8rem", color: "var(--info)" }}>
          {/* TASK-173's guest words, verbatim — TASK-177: signed in, the
              panel names the account instead (gatedLine) */}
          {gatedLine(memberName)}
        </p>
      )}
      {shown && (
        <div style={{ margin: "12px 0 0" }}>
          <p style={{ margin: 0, fontSize: "1.05rem", color: "var(--ink-strong, #2d2440)" }}>
            {struck && <s style={{ marginRight: 8, color: "var(--muted, #897f97)" }}>{struck.primary}</s>}
            {shown.primary}
            {shown.secondary && (
              <span style={{ marginLeft: 8, fontSize: ".78rem", color: "var(--muted, #897f97)" }}>
                {shown.secondary}
              </span>
            )}
            {showQty && qty > 1 && <span style={{ fontSize: ".78rem", color: "var(--muted, #897f97)" }}> each</span>}
            {item.sale && <span style={{ fontSize: ".78rem", color: "var(--rose, #b64f6b)" }}> · on sale</span>}
          </p>
          {/* TASK-186 — the customer's choice at checkout: "$ · sats", one tap
              flips every price on the page and the pay door's words + default
              rail follow (both doors stay reachable below) */}
          {bothAvailable && effective.sats != null && effective.fiat != null && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8 }}
              role="group" aria-label="show prices in">
              <button
                type="button"
                className="chip-select"
                aria-pressed={prefer === "fiat"}
                onClick={() => choosePrefer("fiat")}
                style={{ fontSize: ".82rem" }}
              >
                $
              </button>
              <button
                type="button"
                className="chip-select"
                aria-pressed={prefer === "sats"}
                onClick={() => choosePrefer("sats")}
                style={{ fontSize: ".82rem" }}
              >
                ⚡ sats
              </button>
            </div>
          )}
        </div>
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
        {/* TASK-177 — signed in, the account is already known: no email
            field at all (the receipt letter finds the member's own door) */}
        {!memberName && (
          <label style={fieldLabel}>
            email for your receipt {gated ? "(it becomes your account if you are not signed in)" : "(optional)"}
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
              style={{ ...glassField, marginTop: 3 }} />
          </label>
        )}
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
      {/* TASK-177 — the template's quantity stepper for the wares, beside
          the doors; the 1..21 clamp is the basket's own law (/api/cart) */}
      {showQty && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
          <span style={{ ...fieldLabel, margin: 0 }}>quantity</span>
          <button type="button" className="chip-select" aria-label="one less"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            style={{ fontSize: ".95rem", padding: "4px 14px" }}>−</button>
          <span aria-live="polite" style={{ minWidth: 22, textAlign: "center", fontSize: "1rem" }}>{qty}</span>
          <button type="button" className="chip-select" aria-label="one more"
            onClick={() => setQty((q) => Math.min(21, q + 1))}
            style={{ fontSize: ".95rem", padding: "4px 14px" }}>+</button>
        </div>
      )}
      {/* the doors — bottom center, evenly spaced */}
      <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
        <button
          onClick={buy}
          disabled={busy || (needsShipping && (!shipName || !shipAddr)) || (needsSize && !size)}
          className="btn btn-gold btn-sm"
          style={{ opacity: busy || (needsShipping && (!shipName || !shipAddr)) || (needsSize && !size) ? 0.5 : 1 }}
        >
          {busy ? "Opening checkout…" : needsSize && !size ? "Pick a size first" : buyDoorLabel(rail, showQty ? scalePrice(effective, qty) : effective)}
        </button>
        <button
          onClick={async () => {
            if (needsSize && !size) { setBasketNote("pick a size first"); return; }
            const res = await fetch("/api/cart", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itemId: item.id, size: size ?? undefined, qty: showQty ? qty : undefined }),
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
