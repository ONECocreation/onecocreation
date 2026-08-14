"use client";

import { useEffect, useRef, useState } from "react";
import { payInModal } from "@/lib/btcpay-modal";
import { bftDateTime, estimateHeight } from "@/lib/bb/bft";
import { cartridge } from "@/brand/cartridge";

/** The moment after the sats land: Love herself says thank you — a living
 *  portrait (muted loop; a still for reduced-motion) over her line. */
function ThankYouFromLove() {
  const vid = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) vid.current?.pause();
  }, []);
  return (
    <div className="reveal in" style={{ margin: "26px auto 4px", maxWidth: 440 }}>
      <video
        ref={vid}
        src={cartridge.thanks.video}
        poster={cartridge.thanks.poster}
        autoPlay muted loop playsInline
        width={148} height={148}
        style={{ display: "block", margin: "0 auto", width: 148, height: 148, objectFit: "cover",
          borderRadius: "50%", border: "2px solid rgba(217,178,78,.55)",
          boxShadow: "0 22px 54px -22px rgba(120,86,180,.6)" }}
      />
      <p style={{ margin: "16px 0 0", fontFamily: "var(--serif, sans-serif)", fontSize: "1.35rem",
        color: "var(--ink-strong)" }}>
        {cartridge.thanks.heading}
      </p>
      <p style={{ margin: "6px auto 0", maxWidth: 380, fontSize: ".9rem", lineHeight: 1.7,
        color: "var(--ink-body)" }}>
        {cartridge.thanks.message}
      </p>
    </div>
  );
}

interface OrderView {
  id: string;
  state: string;
  lineItems: { itemId: string; title: string; qty: number; size?: string }[];
  priceSnapshot: { amount: number; currency: string };
  entitlementSubject?: string;
  createdAtMs: number;
  settledAtMs?: number;
  /** a downloadable exists for this order — label + owner lock, never a path */
  deliverable?: { label: string; locked?: boolean };
}

/** Buyer-honest copy per state — processing is a first-class wait, not a spinner. */
const STATE_COPY: Record<string, { label: string; note: string }> = {
  created: { label: "ORDER OPEN", note: "no invoice yet — hit buy again if you bounced." },
  charge_created: { label: "AWAITING PAYMENT", note: "your invoice is open — pay it and this page updates." },
  processing: {
    label: "ON THE CHAIN",
    note: "payment seen — confirmations take 10–60+ minutes on-chain. Leave this page open or come back; nothing is lost.",
  },
  settled: { label: "PAID ✓", note: "sats landed with the artist. Fulfillment is on its way." },
  fulfilled: { label: "DELIVERED ✓", note: "done and done. 💜" },
  expired: { label: "INVOICE EXPIRED", note: "no harm — invoices time out. Mint a fresh one below; same order." },
  underpaid: { label: "UNDERPAID", note: "the invoice closed short. Mint a fresh invoice below or contact the artist." },
  canceled: { label: "CANCELED", note: "this order is closed." },
  refunded: { label: "REFUNDED", note: "refund issued by the artist." },
  disputed: { label: "IN DISPUTE", note: "the artist is on it." },
};

const IN_FLIGHT = ["created", "charge_created", "processing"];

/** the entitlement subject is an internal key (`handle@space`) — show the
 *  human half, never the "@email" machinery */
const prettySubject = (s: string) => s.replace(/@email$/, "");

export default function OrderStatus({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderView | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const orderRef = useRef<OrderView | null>(null);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const res = await fetch(`/api/store/orders/${orderId}`, { cache: "no-store" });
        if (!alive) return;
        if (res.status === 404) {
          setMissing(true);
          return;
        }
        const data = await res.json();
        if (alive && data.ok) setOrder(data.order);
      } catch {
        /* keep last known — honestly stale beats fake fresh */
      }
    }
    void tick();
    const t = setInterval(() => {
      const o = orderRef.current;
      if (!o || IN_FLIGHT.includes(o.state)) void tick();
    }, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [orderId]);

  async function recharge() {
    setBusy(true);
    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const opened = await payInModal(data.payUrl, {
          onPaid: () => window.location.reload(),
          onClose: () => setBusy(false),
        });
        if (!opened) window.location.href = data.payUrl;
        else setBusy(false);
      } else setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  if (missing) return <p style={{ marginTop: 32, fontSize: ".9rem", color: "var(--muted, #897f97)", textAlign: "center" }}>No such order.</p>;
  if (!order) return <p style={{ marginTop: 32, fontSize: ".9rem", color: "var(--muted, #897f97)", textAlign: "center" }}>reading the order…</p>;

  const copy = STATE_COPY[order.state] ?? { label: order.state.toUpperCase(), note: "" };
  const canRecharge = ["expired", "underpaid"].includes(order.state);
  const settledFine = ["settled", "fulfilled"].includes(order.state);

  return (
    <div style={{ marginTop: 20, textAlign: "center" }}>
      <p style={{ margin: 0, textTransform: "uppercase", fontWeight: 700,
        /* paid is a CELEBRATION (Admiral, 0018.05.15) — big and gold, not a small green whisper */
        ...(settledFine
          ? { fontSize: "1.35rem", letterSpacing: ".24em", color: "var(--gold-2, #ebcb77)",
              textShadow: "0 0 22px rgba(235,203,119,.4)" }
          : { fontSize: ".78rem", letterSpacing: ".2em", color: "var(--gold-deep, #b4862b)" }) }}>
        {copy.label}
      </p>
      <p style={{ margin: "4px auto 0", fontSize: ".88rem", color: "var(--muted, #897f97)", maxWidth: 460 }}>{copy.note}</p>
      {settledFine && <ThankYouFromLove />}
      <div style={{
        margin: "20px auto 0", maxWidth: 440,
        borderRadius: 20, border: "1px solid var(--glass-edge)",
        background: "var(--glass)", backdropFilter: "blur(8px)",
        boxShadow: "0 24px 60px -30px rgba(120,100,160,.55)", padding: "20px 22px",
      }}>
        {order.lineItems.map((li) => (
          <p key={li.itemId} style={{ margin: 0, fontFamily: "var(--font-h3, sans-serif)", fontSize: "1.1rem", color: "var(--ink-strong)" }}>
            {li.title}
            {li.qty > 1 && ` × ${li.qty}`}
            {li.size && <span style={{ fontSize: ".85rem", color: "var(--muted, #897f97)" }}> · size {li.size}</span>}
          </p>
        ))}
        <p style={{ margin: "6px 0 0", fontFamily: "var(--serif, sans-serif)", fontSize: "1.3rem", color: "var(--gold-deep, #b4862b)" }}>
          {order.priceSnapshot.currency === "SATS"
            ? `${order.priceSnapshot.amount.toLocaleString("en-US")} sats`
            : `${(order.priceSnapshot.amount / 100).toFixed(2)} ${order.priceSnapshot.currency}`}
        </p>
        {order.entitlementSubject && (
          <p style={{ margin: "4px 0 0", fontSize: ".8rem", color: "var(--info, #5f4b96)" }}>unlocks for {prettySubject(order.entitlementSubject)}</p>
        )}
        <p style={{ margin: "10px 0 0", fontSize: ".76rem", color: "var(--muted, #897f97)" }}>
          placed ~{bftDateTime(estimateHeight(order.createdAtMs))}
          {order.settledAtMs && <> · paid ~{bftDateTime(estimateHeight(order.settledAtMs))}</>}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: ".68rem", color: "var(--muted, #897f97)", opacity: 0.7 }}>order {order.id}</p>
      </div>
      {/* the paid good itself — gold is right here, this IS the money's worth.
          Locked = the viewer isn't the buying tag (shared link, or signed
          out): an honest lock, never a gold button that would only 403. */}
      {order.deliverable && settledFine && (
        <div style={{ marginTop: 18 }}>
          {order.deliverable.locked ? (
            <p style={{ margin: "0 auto", maxWidth: 440, fontSize: ".88rem", color: "var(--muted, #897f97)" }}>
              🔒 unlocks for <b style={{ color: "var(--info, #5f4b96)" }}>{prettySubject(order.entitlementSubject!)}</b> —{" "}
              <a href="/login" style={{ color: "var(--gold-deep, #b4862b)", textDecoration: "underline" }}>sign in</a>{" "}
              with that key to download
            </p>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <a href={`/api/store/download/${order.id}`} className="btn btn-gold btn-sm">
                  ⬇ Download — {order.deliverable.label}
                </a>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: ".76rem", color: "var(--muted, #897f97)" }}>
                this link is yours — your receipt email leads back to this page.
              </p>
            </>
          )}
        </div>
      )}
      {canRecharge && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
          <button onClick={recharge} disabled={busy} className="btn btn-gold btn-sm">
            {busy ? "Minting…" : "Mint a fresh invoice ⚡"}
          </button>
        </div>
      )}
    </div>
  );
}
