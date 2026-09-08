"use client";

import { useEffect, useRef, useState } from "react";
import { payInModal } from "@/lib/btcpay-modal";
import { cartridge } from "@/brand/cartridge";
import { dollars } from "@/lib/money-words";
import { bftDateTime, estimateHeightAt } from "@/lib/bb/bft";

/** TASK-173 — a recorded moment wears a stamp, never a dash: the BFT stamp
 *  when the chain tip answers (a calendar projection off the anchored model,
 *  never a rendered block height — the honesty stance of calendar-view.ts),
 *  the civil date otherwise. */
function stampFor(ms: number, tipOk: boolean): string {
  if (tipOk) return bftDateTime(estimateHeightAt(ms));
  return new Date(ms).toISOString().slice(0, 10);
}

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
  const [tipOk, setTipOk] = useState(false);
  const [keyMail, setKeyMail] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const orderRef = useRef<OrderView | null>(null);
  /* TASK-173 — the receipt letter's signed key rides the page URL
     (?key=…); every status poll carries it, and the orders route pours the
     buyer's email session when it verifies (same cookie as the code door). */
  const keyRef = useRef<string | null>(null);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    keyRef.current = new URLSearchParams(window.location.search).get("key");
    let alive = true;
    /* the tip, once: does the chain clock answer? (BFT stamp vs civil date) */
    fetch("/api/chain/tip", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.ok && Number.isFinite(d.height)) setTipOk(true);
      })
      .catch(() => {});
    async function tick() {
      try {
        const k = keyRef.current;
        const res = await fetch(`/api/store/orders/${orderId}${k ? `?key=${encodeURIComponent(k)}` : ""}`, { cache: "no-store" });
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

  /* TASK-173 — the locked state's one extra door: mail the order's email a
     sign-in code via the existing email door (a fresh key also rides every
     receipt letter). */
  const buyerEmail = order?.entitlementSubject?.endsWith("@email")
    ? order.entitlementSubject.slice(0, -"@email".length)
    : null;
  async function emailMyKey() {
    if (!buyerEmail || keyMail === "sending") return;
    setKeyMail("sending");
    try {
      const res = await fetch("/api/auth/email/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: buyerEmail }),
      });
      setKeyMail(res.ok ? "sent" : "failed");
    } catch {
      setKeyMail("failed");
    }
  }

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
            : dollars(order.priceSnapshot.amount, order.priceSnapshot.currency)}
        </p>
        {order.entitlementSubject && (
          <p style={{ margin: "4px 0 0", fontSize: ".8rem", color: "var(--info, #5f4b96)" }}>unlocks for {prettySubject(order.entitlementSubject)}</p>
        )}
        <p style={{ margin: "10px 0 0", fontSize: ".76rem", color: "var(--muted, #897f97)" }}>
          {/* TASK-173 — never dashes when the record carries a time: the BFT
              stamp when the tip answers, the civil date otherwise */}
          placed{" "}
          <span style={{ whiteSpace: "nowrap" }}>
            {order.createdAtMs ? stampFor(order.createdAtMs, tipOk) : "—"}
          </span>
          {order.settledAtMs && (
            <>
              {" "}· paid{" "}
              <span style={{ whiteSpace: "nowrap" }}>{stampFor(order.settledAtMs, tipOk)}</span>
            </>
          )}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: ".68rem", color: "var(--muted, #897f97)", opacity: 0.7 }}>order {order.id}</p>
      </div>
      {/* the paid good itself — gold is right here, this IS the money's worth.
          Locked = the viewer isn't the buying tag (shared link, or signed
          out): an honest lock, never a gold button that would only 403. */}
      {order.deliverable && settledFine && (
        <div style={{ marginTop: 18 }}>
          {order.deliverable.locked ? (
            <div style={{ margin: "0 auto", maxWidth: 440, fontSize: ".88rem", color: "var(--muted, #897f97)" }}>
              <p style={{ margin: 0 }}>
                🔒 unlocks for <b style={{ color: "var(--info, #5f4b96)" }}>{prettySubject(order.entitlementSubject!)}</b> —{" "}
                <a href="/login" style={{ color: "var(--gold-deep, #b4862b)", textDecoration: "underline" }}>sign in</a>{" "}
                with that key to download
              </p>
              {/* TASK-173 — the one extra door: the receipt letter's key by
                  mail, via the existing email sign-in start (never a new
                  auth path). Words, not color: the button SAYS what it does. */}
              {buyerEmail && (
                <p style={{ margin: "10px 0 0" }}>
                  {keyMail === "sent" ? (
                    <>on its way — check your inbox, the letter brings your key ✉️</>
                  ) : keyMail === "failed" ? (
                    <>the letter didn&apos;t send — try again in a moment</>
                  ) : (
                    <button
                      type="button"
                      onClick={emailMyKey}
                      disabled={keyMail === "sending"}
                      className="btn btn-gold btn-sm"
                    >
                      {keyMail === "sending" ? "sending…" : "email me my key ✉️"}
                    </button>
                  )}
                </p>
              )}
            </div>
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
