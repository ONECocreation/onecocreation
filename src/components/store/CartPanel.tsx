"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { payInModal } from "@/lib/btcpay-modal";

/* eslint-disable @next/next/no-img-element */
import CartTimePicker from "./CartTimePicker";

interface Line {
  itemId: string;
  qty: number;
  size?: string;
  title: string;
  kind: string;
  sats: number | null;
  listSats: number | null;
  offerSats: number | null;
  giftTo: string | null;
  image: string | null;
  physical: boolean;
  gated: boolean;
  inPerson: boolean;
  slot: { startUtc: string; endUtc: string; holdId: string; holdUntilMs: number } | null;
  serviceGift?: boolean;
  artistTz?: string;
}

const lineKey = (l: Line) => l.slot?.holdId ?? `${l.itemId}-${l.size ?? ""}`;

function holdLeft(untilMs: number): string {
  const ms = untilMs - Date.now();
  if (ms <= 0) return "lapsed";
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** The basket page (v1.5): goods + HELD SESSIONS (72h countdown), per-line
 *  pay-what-you-can offers, discount on the TOTAL, fields only when the
 *  contents need them, one checkout. */
interface ExpiredHold {
  itemId: string;
  title: string;
}

export default function CartPanel() {
  const [lines, setLines] = useState<Line[] | null>(null);
  const [totalSats, setTotalSats] = useState(0);
  const [expired, setExpired] = useState<ExpiredHold[]>([]);
  const [email, setEmail] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [shipName, setShipName] = useState("");
  const [shipAddr, setShipAddr] = useState("");
  const [city, setCity] = useState("");
  const [stateReg, setStateReg] = useState("");
  const [zip, setZip] = useState("");
  const [offerOpen, setOfferOpen] = useState<string | null>(null); // lineKey
  const [offerInput, setOfferInput] = useState("");
  const [giftOpen, setGiftOpen] = useState<string | null>(null); // lineKey
  const [giftInput, setGiftInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const d = await fetch("/api/cart").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (d?.ok) {
      setLines(d.lines ?? []);
      setTotalSats(d.totalSats ?? 0);
      // synced both ways — a lapse notice clears once it's no longer live,
      // same as re-adding or navigating away and back
      setExpired(Array.isArray(d.expired) && d.expired.length ? d.expired : []);
    } else setLines([]);
  }
  useEffect(() => {
    refresh();
    const t = setInterval(() => setLines((l) => (l ? [...l] : l)), 60_000); // countdown breathes
    return () => clearInterval(t);
  }, []);

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json()).catch(() => null);
    if (res && !res.ok) setError(res.reason ?? "that didn't take");
    window.dispatchEvent(new Event("oc-cart-changed"));
    refresh();
  }

  async function setQty(l: Line, qty: number) {
    if (l.slot) {
      if (qty <= 0) await post({ itemId: l.itemId, holdId: l.slot.holdId, remove: true });
      return; // a held time is one-of-a-kind — no quantities
    }
    await post(qty <= 0
      ? { itemId: l.itemId, size: l.size, remove: true }
      : { itemId: l.itemId, size: l.size, qty });
  }

  async function applyOffer(l: Line) {
    const sats = parseInt(offerInput.replace(/[^0-9]/g, ""), 10);
    if (!Number.isInteger(sats)) return;
    setError(null);
    await post({ itemId: l.itemId, holdId: l.slot?.holdId, size: l.size, offerSats: sats });
    setOfferOpen(null);
    setOfferInput("");
  }

  async function clearOffer(l: Line) {
    await post({ itemId: l.itemId, holdId: l.slot?.holdId, size: l.size, offerSats: null });
    setOfferOpen(null);
  }

  async function applyGift(l: Line) {
    const to = giftInput.trim();
    if (!to) return;
    await post({ itemId: l.itemId, holdId: l.slot?.holdId, size: l.size, giftTo: to });
    setGiftOpen(null);
    setGiftInput("");
  }

  async function clearGift(l: Line) {
    await post({ itemId: l.itemId, holdId: l.slot?.holdId, size: l.size, giftTo: null });
    setGiftOpen(null);
  }

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/cart/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountCode: discountCode.trim() || undefined,
          contact: email ? { email } : undefined,
          shipping: needsShipping ? { name: shipName, address: shipAddr } : undefined,
          location: hasInPerson ? { city, state: stateReg, zip } : undefined,
          name: shipName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.reason ?? "checkout failed");
        setBusy(false);
        return;
      }
      window.dispatchEvent(new Event("oc-cart-changed"));
      if (data.paid) {
        window.location.href = `/store/order/${data.orderId}`;
        return;
      }
      // the invoice opens OVER the basket — nobody leaves the site
      // checkout already minted the order and emptied the basket — closing
      // the invoice must land on the ORDER (it holds the re-mint door),
      // never back on a bare cart (the Admiral's vanish, 0018.05.15)
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

  /* the lapse story (Admiral, 0018.05.11): a gentle line, plus the door
   *  straight back to booking — the exact slot is gone, but re-holding a
   *  fresh one is one tap away. */
  const expiredNotice = expired.length > 0 && (
    <div style={{ margin: "0 0 16px", display: "grid", gap: 8 }}>
      {expired.map((e) => (
        <p key={e.itemId} style={{
          margin: 0, fontSize: ".82rem", color: "#7a5a12", textAlign: "center",
          display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 8,
        }}>
          <span>the hold on <b>{e.title}</b> has ended — re-add it to your basket if you&apos;d still like it.</span>
          <Link className="btn btn-ghost btn-sm" href={`/book/${e.itemId}`}>Re-add it ⚡</Link>
        </p>
      ))}
    </div>
  );

  if (lines === null) return <p style={{ fontSize: ".9rem", color: "var(--muted, #897f97)", textAlign: "center" }}>opening the basket…</p>;
  if (lines.length === 0)
    return (
      <div style={{ textAlign: "center" }}>
        {expiredNotice}
        <p style={{ fontSize: ".95rem", color: "var(--muted, #897f97)" }}>Your basket is empty.</p>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
          <Link className="btn" href="/store">Visit the store</Link>
        </div>
      </div>
    );

  const needsShipping = lines.some((l) => l.physical);
  const gated = lines.some((l) => l.gated);
  const hasInPerson = lines.some((l) => l.inPerson);
  const hasSession = lines.some((l) => l.slot);
  /* time before money (Admiral, 0018.05.15): a session in the basket picks
     its slot BEFORE any invoice — gifts stay timeless (the voucher rail) */
  const needsTime = lines.some((l) => l.kind === "service" && !l.slot && !l.serviceGift && !l.giftTo);
  const anyOffer = lines.some((l) => l.offerSats != null && l.listSats != null && l.offerSats < l.listSats);

  // inputs are always lit paper — their ink stays dark in both themes
  const glassField: React.CSSProperties = {
    border: "1px solid rgba(139,118,196,.45)", borderRadius: 10, padding: "9px 12px",
    background: "rgba(255,255,255,.92)", fontSize: "1rem", color: "#4a4458",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };
  const fieldLabel: React.CSSProperties = {
    display: "block", textAlign: "left", fontSize: ".72rem", letterSpacing: ".08em",
    textTransform: "uppercase", color: "var(--muted, #897f97)",
  };
  const tinyBtn = (gold: boolean): React.CSSProperties => ({
    borderRadius: 999, padding: "6px 14px", fontSize: ".76rem", fontWeight: 700, cursor: "pointer",
    border: gold ? "1.5px solid rgba(217,178,78,.6)" : "1.5px solid rgba(139,118,196,.5)",
    background: gold ? "rgba(217,178,78,.18)" : "var(--ghost-bg)",
    color: gold ? "#EBCB77" : "var(--ghost-ink)", fontFamily: "inherit",
  });
  /* the quiet links ride .btn-quiet now (cartridge walk step 5) — one
     override keeps the basket's lowercase intimate voice */
  const softLink: React.CSSProperties = { textTransform: "none", letterSpacing: 0, padding: 0 };

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", fontSize: ".9rem" }}>
      {expiredNotice}
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
        {lines.map((l) => (
          <li key={lineKey(l)} style={{
            borderRadius: 18, border: "1px solid var(--glass-edge)",
            background: "var(--glass)", backdropFilter: "blur(8px)",
            boxShadow: "0 18px 44px -28px rgba(120,100,160,.45)", padding: "14px 16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {l.image && <img src={l.image} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover" }} />}
              <div style={{ flex: 1, minWidth: 160 }}>
                <b style={{ color: "var(--ink-strong)" }}>{l.title}</b>
                {l.size && <span style={{ color: "var(--muted, #897f97)" }}> · {l.size}</span>}
                {l.slot && (
                  <p style={{ margin: "2px 0 0", fontSize: ".78rem", color: "var(--ink-body)" }}>
                    {new Intl.DateTimeFormat(undefined, {
                      weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                    }).format(new Date(l.slot.startUtc))}
                    <span style={{ color: "#3c6b49" }}> · held for you — {holdLeft(l.slot.holdUntilMs)} left</span>
                  </p>
                )}
                <p style={{ margin: "2px 0 0", fontSize: ".82rem", fontFamily: "var(--serif, sans-serif)", color: "var(--gold-deep, #b4862b)" }}>
                  {l.offerSats != null ? (
                    <>
                      your offer: {l.offerSats.toLocaleString()} sats
                      {l.listSats != null && <span style={{ color: "var(--muted, #897f97)", fontFamily: "inherit" }}> (listed {l.listSats.toLocaleString()})</span>}
                    </>
                  ) : (
                    <>{l.sats?.toLocaleString()} sats{!l.slot && l.qty > 1 ? " each" : ""}</>
                  )}
                </p>
              </div>
              {!l.slot && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => setQty(l, l.qty - 1)} style={{ ...tinyBtn(false), width: 34, padding: "6px 0", textAlign: "center" }}>−</button>
                  <span style={{ width: 22, textAlign: "center" }}>{l.qty}</span>
                  <button onClick={() => setQty(l, l.qty + 1)} style={{ ...tinyBtn(false), width: 34, padding: "6px 0", textAlign: "center" }}>+</button>
                </div>
              )}
              <button onClick={() => setQty(l, 0)} className="btn-quiet" style={softLink}>remove</button>
            </div>
            {l.kind === "service" && !l.slot && !l.serviceGift && !l.giftTo && (
              <div style={{ marginTop: 10 }}>
                <CartTimePicker serviceId={l.itemId} title={l.title} onDone={refresh} />
                <p style={{ margin: "6px 0 0", fontSize: ".72rem", color: "var(--muted, #897f97)" }}>
                  your session needs its moment — choose it before checkout
                </p>
              </div>
            )}

            {/* gift to another one (Admiral 0018.05.17) — the line travels
                to a different soul; Love delivers with love */}
            <div style={{ marginTop: 8, fontSize: ".78rem" }}>
              {giftOpen === lineKey(l) ? (
                <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <input
                    value={giftInput}
                    onChange={(e) => setGiftInput(e.target.value)}
                    placeholder="their email or @tag"
                    style={{ ...glassField, width: 210 }}
                  />
                  <button onClick={() => applyGift(l)} style={tinyBtn(true)}>make it a gift</button>
                  <button onClick={() => setGiftOpen(null)} style={tinyBtn(false)}>never mind</button>
                </span>
              ) : l.giftTo ? (
                <span style={{ color: "var(--ink-body)" }}>
                  🎁 a gift for <b>{l.giftTo}</b>{" "}
                  <button onClick={() => clearGift(l)} className="btn-quiet" style={softLink}>undo</button>
                </span>
              ) : (
                <button onClick={() => { setGiftOpen(lineKey(l)); setGiftInput(""); }} className="btn-quiet" style={softLink}>
                  🎁 gift this to another one
                </button>
              )}
            </div>

            {/* pay what you can — every line may carry an offer (0018.05.14) */}
            <div style={{ marginTop: 6, fontSize: ".78rem" }}>
              {offerOpen === lineKey(l) ? (
                <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <input
                    value={offerInput}
                    onChange={(e) => setOfferInput(e.target.value)}
                    inputMode="numeric"
                    placeholder="sats you can give"
                    style={{ ...glassField, width: 160 }}
                  />
                  <button onClick={() => applyOffer(l)} style={tinyBtn(true)}>offer</button>
                  <button onClick={() => setOfferOpen(null)} style={tinyBtn(false)}>never mind</button>
                </span>
              ) : l.offerSats != null ? (
                <button onClick={() => clearOffer(l)} className="btn-quiet" style={softLink}>
                  remove offer — pay the listed price
                </button>
              ) : (
                <button onClick={() => { setOfferOpen(lineKey(l)); setOfferInput(""); }} className="btn-quiet" style={softLink}>
                  pay what you can — make an offer
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div style={{ textAlign: "center" }}>
        <p style={{ margin: "18px 0 0", fontSize: "1.05rem" }}>
          Total:{" "}
          <b style={{ fontFamily: "var(--serif, sans-serif)", color: "var(--gold-deep, #b4862b)", fontSize: "1.2rem" }}>
            {totalSats.toLocaleString()} sats
          </b>
        </p>
        {anyOffer && (
          <p style={{ margin: "6px auto 0", fontSize: ".78rem", color: "var(--muted, #897f97)", maxWidth: 480 }}>
            offers below the listed price are received with love — Love looks at each one, and if it can&apos;t be
            carried this time, your sats come straight back.
          </p>
        )}
        {gated && (
          <p style={{ margin: "6px auto 0", fontSize: ".78rem", color: "#5f4b96", maxWidth: 480 }}>
            part of this basket unlocks for your account — sign in, or just add your email below: it becomes your account.
          </p>
        )}
        {hasSession && (
          <p style={{ margin: "6px auto 0", fontSize: ".78rem", color: "var(--muted, #897f97)", maxWidth: 480 }}>
            your held times stay yours through checkout — the countdown is the promise.
          </p>
        )}
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <label style={fieldLabel}>
          email for your receipt {gated || hasSession ? "" : "(optional)"}
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
          </>
        )}
        {hasInPerson && (
          <div>
            <p style={{ ...fieldLabel, margin: "0 0 3px" }}>an in-person session rides in this basket — where does the studio drive?</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="city"
                style={{ ...glassField, flex: 2, minWidth: 120, width: "auto" }} />
              <input value={stateReg} onChange={(e) => setStateReg(e.target.value)} placeholder="state"
                style={{ ...glassField, flex: 1, minWidth: 70, width: "auto" }} />
              <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="zip"
                style={{ ...glassField, flex: 1, minWidth: 80, width: "auto" }} />
            </div>
          </div>
        )}
      </div>

      {/* the door — bottom center (the Admiral's law) */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
        <button
          onClick={checkout}
          disabled={busy || needsTime || (needsShipping && (!shipName || !shipAddr)) || (hasInPerson && (!city || !stateReg || !zip))}
          className="btn btn-gold btn-shimmer"
          style={{ opacity: busy || needsTime || (needsShipping && (!shipName || !shipAddr)) || (hasInPerson && (!city || !stateReg || !zip)) ? 0.5 : 1 }}
        >
          {busy ? "Opening invoice…" : needsTime ? "Choose your time first ⏰" : "Checkout ⚡"}
        </button>
      </div>
      {error && <p style={{ margin: "10px 0 0", fontSize: ".8rem", color: "#a34e6c", textAlign: "center" }}>{error}</p>}
    </div>
  );
}
