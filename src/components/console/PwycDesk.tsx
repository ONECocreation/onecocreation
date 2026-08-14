"use client";

import { useEffect, useState } from "react";

/**
 * THE OFFERS DESK (Admiral 0018.05.14): pay-what-you-can offers were PAID
 * up front — this desk is Love's yes/no on each one that came in under the
 * listed price. ACCEPT blesses it (the Pay-It-Forward jar may carry the gap
 * in the books); DECLINE records that the sats go back (refund from the
 * store wallet — manual for now, the ledger row remembers).
 */
interface OrderView {
  id: string;
  state: string;
  createdAtMs: number;
  pwycPending?: boolean;
  contact?: { email?: string };
  entitlementSubject?: string;
  chargeIds: string[];
  events: { type: string; atMs: number }[];
  lineItems: { itemId: string; title: string; qty: number; offerSats?: number; listSats?: number }[];
}

const gapOf = (o: OrderView) =>
  o.lineItems.reduce(
    (n, l) => n + (l.offerSats != null && l.listSats != null && l.offerSats < l.listSats ? l.listSats - l.offerSats : 0),
    0,
  );

export default function PwycDesk() {
  const [all, setAll] = useState<OrderView[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastRefund, setLastRefund] = useState<string | null>(null);

  function refresh() {
    fetch("/api/admin/store/orders")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAll(d.orders ?? []))
      .catch(() => setAll([]));
  }
  useEffect(refresh, []);

  async function decide(id: string, action: "pwyc-accept" | "pwyc-decline") {
    setBusy(id);
    const res = await fetch("/api/admin/store/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    }).then((r) => r.json()).catch(() => null);
    if (res?.refundLink) setLastRefund(res.refundLink);
    setBusy(null);
    refresh();
  }

  if (all === null) return null;
  const orders = all.filter((o) => o.pwycPending);
  // the jar's running story, derived straight from the ledger events
  const carried = all
    .filter((o) => o.events?.some((e) => e.type === "pwyc_accepted"))
    .reduce((n, o) => n + gapOf(o), 0);
  const declined = all.filter((o) => o.events?.some((e) => e.type === "pwyc_declined_refund_owed"));
  const refundsOwed = declined.filter((o) => !o.chargeIds?.some((c) => c.startsWith("refund:"))).length;

  return (
    <div className="mt-8">
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "26px 0 10px" }}>
        <span style={{ borderRadius: 999, padding: "4px 16px", fontSize: ".72rem", fontWeight: 700,
          letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gold-deep, #b4862b)",
          border: "1.5px solid rgba(180,134,43,.45)", background: "rgba(217,178,78,.10)", whiteSpace: "nowrap" }}>
          Give-What-You-Can Offers
        </span>
        <span style={{ flex: 1, height: 1, background: "rgba(180,134,43,.25)" }} />
      </div>
      {orders.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: ".85rem", margin: "4px 0 0" }}>
          no offers waiting — every basket paid the listed price.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {orders.map((o) => {
            const offered = o.lineItems.filter((l) => l.offerSats != null && l.listSats != null && l.offerSats < l.listSats);
            const gap = offered.reduce((n, l) => n + (l.listSats! - l.offerSats!), 0);
            return (
              <li key={o.id} style={{ background: "var(--glass)", border: "1px solid rgba(139,118,196,.22)",
                borderRadius: 12, padding: "10px 14px", marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: ".72rem", color: "var(--muted)" }}>
                  {new Date(o.createdAtMs).toLocaleString()} · {o.entitlementSubject ?? o.contact?.email ?? "anonymous"} · order {o.id.slice(0, 8)} · {o.state}
                </p>
                {offered.map((l) => (
                  <p key={l.itemId} style={{ margin: "4px 0 0", fontSize: ".88rem" }}>
                    <b>{l.title}</b> — offered{" "}
                    <span style={{ color: "var(--gold-deep)", fontFamily: "var(--serif)" }}>{l.offerSats!.toLocaleString()} sats</span>
                    <span style={{ color: "var(--muted)" }}> of {l.listSats!.toLocaleString()} listed</span>
                  </p>
                ))}
                <p style={{ margin: "4px 0 0", fontSize: ".74rem", color: "var(--muted)" }}>
                  the gap: {gap.toLocaleString()} sats — accepted, the Pay-It-Forward jar may carry it.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <button className="btn btn-gold btn-sm" onClick={() => decide(o.id, "pwyc-accept")} disabled={busy === o.id}>
                    Accept with love
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => decide(o.id, "pwyc-decline")} disabled={busy === o.id}>
                    Decline — refund owed
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {lastRefund && (
        <p style={{ margin: "8px 0 0", fontSize: ".76rem", color: "var(--warn)" }}>
          refund minted — the member&apos;s letter carries this claim link:{" "}
          <a href={lastRefund} target="_blank" rel="noreferrer" style={{ textDecoration: "underline", color: "var(--warn)" }}>{lastRefund}</a>
        </p>
      )}
      <p style={{ margin: "10px 0 0", fontSize: ".76rem", color: "var(--muted)" }}>
        🎁 the Pay-It-Forward jar has carried{" "}
        <b style={{ color: "var(--gold-deep)" }}>{carried.toLocaleString()} sats</b> across{" "}
        {all.filter((o) => o.events?.some((e) => e.type === "pwyc_accepted")).length} blessings
        {declined.length > 0 && <> · {declined.length} declined{refundsOwed > 0 ? ` (${refundsOwed} refund${refundsOwed > 1 ? "s" : ""} still to send by hand)` : " — refunds minted"}</>}
        {" — every decision sends a kind letter; a decline on a paid order mints a claim-your-sats link automatically."}
      </p>
    </div>
  );
}
