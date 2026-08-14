"use client";

import { useEffect, useMemo, useState } from "react";
import DiscountsDesk from "@/components/console/DiscountsDesk";
import PwycDesk from "@/components/console/PwycDesk";
import StripeRailCard from "@/components/console/StripeRailCard";
import { Chip, SectionHead, field, overlay, sheet } from "@/components/console/glass";
import { bftDateTime, estimateHeight } from "@/lib/bb/bft";
import type { OrderRecord } from "@/lib/store";

/**
 * MONEY JARS — the whole ledger, one calm page (the blessed mockup,
 * 0018.05.28): jars as a living scoreboard read straight from BTCPay,
 * the rails, offers waiting on Love's yes, discount codes with their
 * lifetimes, and the order book as a filterable table with the exports
 * folded into its own toolbar. Tap a row for the order's popup.
 */

interface TipRecord { id: string; jar: string; sats: number; status: string; createdMs: number }
interface Ledger {
  tips?: TipRecord[];
  totals: Record<string, { settledSats: number; count: number }>;
}

const JARS: { key: string; label: string }[] = [
  { key: "onecocreation", label: "🌟 One Cocreation" },
  { key: "love", label: "💛 Tips — Love" },
  { key: "payforward", label: "🎁 Pay It Forward" },
];

/** one synodic month — the site's native rhythm */
const MOON_MS = 29.530588853 * 24 * 3600 * 1000;
const WEEK_MS = 7 * 24 * 3600 * 1000;

const railCard: React.CSSProperties = {
  background: "var(--glass)",
  border: "1px solid rgba(139,118,196,.25)",
  borderRadius: 14,
  padding: "12px 16px",
  fontSize: ".85rem",
};

function ymd(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function stateTone(state: string): "green" | "gold" | "rose" | "grey" {
  if (state === "fulfilled") return "green";
  if (state === "settled") return "gold";
  if (state === "refunded" || state === "disputed" || state === "canceled") return "rose";
  return "grey";
}

function orderSats(o: OrderRecord): string {
  return o.priceSnapshot.currency === "SATS"
    ? `${o.priceSnapshot.amount.toLocaleString("en-US")}`
    : `${(o.priceSnapshot.amount / 100).toFixed(2)} ${o.priceSnapshot.currency}`;
}

/** a session order carries a booking or a voucher; everything else is goods */
function orderKind(o: OrderRecord): "sessions" | "goods" {
  return o.lineItems.some((l) => l.bookingId || l.voucher) || o.bookingId ? "sessions" : "goods";
}

export default function MoneyRoom() {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [denied, setDenied] = useState(false);
  const [railBtcpay, setRailBtcpay] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [window_, setWindow_] = useState<"moon" | "week" | "all">("moon");
  const [kind, setKind] = useState<"all" | "sessions" | "goods" | "tips">("all");
  const [detail, setDetail] = useState<OrderRecord | null>(null);
  const [busy, setBusy] = useState(false);

  function loadOrders() {
    fetch("/api/admin/store/orders", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.ok && setOrders(d.orders ?? []))
      .catch(() => {});
  }

  useEffect(() => {
    fetch("/api/admin/tips")
      .then((r) => {
        if (r.status === 401) setDenied(true);
        return r.ok ? r.json() : null;
      })
      .then((d) => d?.ok && setLedger(d))
      .catch(() => {});
    fetch("/api/admin/store", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.ok && setRailBtcpay(Boolean(d.rails?.btcpay)))
      .catch(() => {});
    loadOrders();
  }, []);

  /** per-jar: this-moon count + 7 spark buckets over the last moon, settled only */
  const jarPulse = useMemo(() => {
    const out: Record<string, { thisMoon: number; spark: number[] }> = {};
    const now = Date.now();
    for (const { key } of JARS) {
      const settled = (ledger?.tips ?? []).filter(
        (t) => t.jar === key && t.status === "settled" && t.createdMs >= now - MOON_MS,
      );
      const spark = Array.from({ length: 7 }, () => 0);
      for (const t of settled) {
        const slice = Math.min(6, Math.floor(((t.createdMs - (now - MOON_MS)) / MOON_MS) * 7));
        spark[slice] += t.sats;
      }
      out[key] = { thisMoon: settled.length, spark };
    }
    return out;
  }, [ledger]);

  const cutoff = window_ === "all" ? 0 : Date.now() - (window_ === "moon" ? MOON_MS : WEEK_MS);
  const shown = orders.filter(
    (o) => o.createdAtMs >= cutoff && (kind === "all" || (kind !== "tips" && orderKind(o) === kind)),
  );

  const exportHref = (format: "csv" | "quickbooks") => {
    const from = cutoff ? ymd(cutoff) : "";
    const type = kind === "all" ? "all" : kind === "sessions" ? "services" : kind;
    return `/api/admin/reports?from=${from}&to=&type=${type}&format=${format}`;
  };

  async function fulfil(o: OrderRecord) {
    setBusy(true);
    await fetch("/api/admin/store/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: o.id, action: "fulfill" }),
    }).catch(() => {});
    setBusy(false);
    setDetail(null);
    loadOrders();
  }

  if (denied)
    return (
      <p className="p-6 text-sm" style={{ color: "var(--muted)" }}>
        operator session required — <a href="/a" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>sign in at the door</a>
      </p>
    );

  return (
    <div className="p-2 text-sm" style={{ color: "var(--ink)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 10px" }}>
        <span style={{ borderRadius: 999, padding: "4px 16px", fontSize: ".72rem", fontWeight: 700,
          letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gold-deep, #b4862b)",
          border: "1.5px solid rgba(180,134,43,.45)", background: "rgba(217,178,78,.10)", whiteSpace: "nowrap" }}>
          The Jars
        </span>
        <span style={{ flex: 1, height: 1, background: "rgba(180,134,43,.25)" }} />
        <span style={{ fontSize: ".72rem", color: "var(--muted)" }}>read live from BTCPay</span>
      </div>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))" }}>
        {JARS.map(({ key, label }) => {
          const t = ledger?.totals?.[key];
          const pulse = jarPulse[key];
          const max = Math.max(1, ...(pulse?.spark ?? [1]));
          return (
            <div key={key} style={{ background: "var(--glass)", border: "1px solid rgba(255,255,255,.9)",
              borderRadius: 18, padding: "14px 16px", boxShadow: "0 18px 44px -28px rgba(120,100,160,.45)" }}>
              <b style={{ fontSize: ".85rem" }}>{label}</b>
              <div style={{ fontFamily: "var(--serif)", fontSize: "1.65rem", color: "var(--gold-deep)", lineHeight: 1.15 }}>
                {(t?.settledSats ?? 0).toLocaleString("en-US")} <span style={{ fontSize: ".9rem" }}>sats</span>
              </div>
              <div style={{ fontSize: ".72rem", color: "var(--muted)" }}>
                {t?.count ?? 0} gifts{pulse?.thisMoon ? ` · ${pulse.thisMoon} this moon` : ""}
                {key === "payforward" && (
                  <span title="Love passes this jar onward — the doors live on /support">
                    {" "}· flows onward 🦁🌳🐘
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 24, marginTop: 8 }}
                title="the last moon, in seven slices">
                {(pulse?.spark ?? []).map((v, i) => (
                  <span key={i} style={{ flex: 1, borderRadius: "2px 2px 0 0", opacity: 0.75,
                    height: `${Math.max(8, Math.round((v / max) * 100))}%`,
                    background: v > 0 ? "linear-gradient(180deg,#ebcb77,#b4862b)" : "rgba(139,118,196,.18)" }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ margin: "8px 0 0", fontSize: ".72rem", color: "var(--muted)" }}>
        Tips break out per artist once trainers land — every jar keeps its own line in the books.
      </p>

      <SectionHead label="Money Rails" />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <span style={railCard}>
          <b>BTCPay</b>{" "}
          {railBtcpay == null ? null : railBtcpay ? <Chip tone="green">live</Chip> : <Chip tone="grey">not connected</Chip>}
          <span style={{ color: "var(--muted)" }}> · {railBtcpay ? "sats straight to Love" : "set BTCPAY_* env and redeploy"}</span>
        </span>
        <span style={{ ...railCard, opacity: 0.7 }}><b>Square</b> <Chip tone="grey">soon</Chip></span>
        <span style={{ ...railCard, opacity: 0.7 }}><b>Stripe</b> <Chip tone="grey">keys desk below</Chip></span>
      </div>

      {/* Love's own key drawer + RTFM — storage and instructions only; the
          card rail that spends these keys ships next build (0018.05.23) */}
      <StripeRailCard />

      <PwycDesk />
      <DiscountsDesk />

      <SectionHead label="The Order Book" />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} style={field}>
          <option value="all">everything</option>
          <option value="sessions">sessions</option>
          <option value="goods">goods</option>
          <option value="tips">tips (export only)</option>
        </select>
        <select value={window_} onChange={(e) => setWindow_(e.target.value as typeof window_)} style={field}>
          <option value="moon">this moon</option>
          <option value="week">this week</option>
          <option value="all">all time</option>
        </select>
        <span style={{ flex: 1 }} />
        <a className="btn btn-gold btn-sm" href={exportHref("csv")} download>Download CSV ⚡</a>
        <a className="btn btn-ghost btn-sm" href={exportHref("quickbooks")} download>QuickBooks</a>
      </div>
      {kind === "tips" ? (
        <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>
          tips live in the jars above — the download buttons carry them into the books.
        </p>
      ) : shown.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>nothing in this window — an honest empty book.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px", fontSize: ".82rem" }}>
          <thead>
            <tr>
              {["~When (BFT)", "What", "Who", "Sats", "State"].map((h) => (
                <th key={h} style={{ fontSize: ".6rem", letterSpacing: ".1em", textTransform: "uppercase",
                  color: "var(--muted)", textAlign: "left", padding: "0 10px", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((o) => {
              const td: React.CSSProperties = {
                background: "var(--glass)", padding: "8px 10px", verticalAlign: "middle",
                borderTop: "1px solid rgba(255,255,255,.9)", borderBottom: "1px solid rgba(139,118,196,.16)",
                cursor: "pointer",
              };
              return (
                <tr key={o.id} onClick={() => setDetail(o)} title="tap for the order's popup">
                  <td style={{ ...td, borderRadius: "12px 0 0 12px", borderLeft: "1px solid rgba(139,118,196,.16)",
                    whiteSpace: "nowrap", color: "var(--muted)" }}>
                    {bftDateTime(estimateHeight(o.createdAtMs)).split(" ")[0]}
                  </td>
                  <td style={td}>
                    {o.lineItems[0]?.title}
                    {o.lineItems.length > 1 && <span style={{ color: "var(--muted)" }}> +{o.lineItems.length - 1}</span>}
                    {o.lineItems[0]?.size && <span style={{ color: "var(--muted)" }}> · {o.lineItems[0].size}</span>}
                  </td>
                  <td style={{ ...td, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {o.entitlementSubject ?? o.contact?.email ?? "guest"}
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap", fontFamily: "var(--serif)", color: "var(--gold-deep)" }}>
                    {orderSats(o)}
                  </td>
                  <td style={{ ...td, borderRadius: "0 12px 12px 0", borderRight: "1px solid rgba(139,118,196,.16)" }}>
                    <Chip tone={stateTone(o.state)}>{o.state}</Chip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ── the order's popup — same grammar as the calendar's ── */}
      {detail && (
        <div style={overlay} onClick={() => setDetail(null)}>
          <div style={sheet} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.25rem", marginBottom: 4 }}>
              Order {detail.id.slice(0, 8)}
            </h3>
            <p style={{ fontSize: ".82rem", color: "var(--muted)", margin: "0 0 10px" }}>
              ~{bftDateTime(estimateHeight(detail.createdAtMs))} · {new Date(detail.createdAtMs).toLocaleString()}
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 10px" }}>
              {detail.lineItems.map((l, i) => (
                <li key={i} style={{ padding: "6px 0", borderBottom: "1px solid rgba(139,118,196,.18)", fontSize: ".88rem" }}>
                  <b>{l.title}</b>
                  {l.qty > 1 && ` × ${l.qty}`}
                  {l.size && <span style={{ color: "var(--muted)" }}> · size {l.size}</span>}
                  {l.giftTo && <span style={{ color: "var(--muted)" }}> · 🎁 for {l.giftTo}</span>}
                  {l.offerSats != null && l.listSats != null && l.offerSats < l.listSats && (
                    <span style={{ color: "var(--warn)" }}> · offered {l.offerSats.toLocaleString()} of {l.listSats.toLocaleString()}</span>
                  )}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: ".92rem", margin: "0 0 4px" }}>
              <span style={{ fontFamily: "var(--serif)", color: "var(--gold-deep)", fontSize: "1.05rem" }}>
                {orderSats(detail)}{detail.priceSnapshot.currency === "SATS" ? " sats" : ""}
              </span>{" "}
              <Chip tone={stateTone(detail.state)}>{detail.state}</Chip>
            </p>
            {(detail.entitlementSubject || detail.contact?.email) && (
              <p style={{ fontSize: ".82rem", color: "var(--muted)", margin: "0 0 4px" }}>
                for <b style={{ color: "var(--ink)" }}>{detail.entitlementSubject ?? detail.contact?.email}</b>
              </p>
            )}
            {detail.shipping?.name && (
              <p style={{ fontSize: ".82rem", color: "var(--muted)", margin: "0 0 4px" }}>
                ships to {detail.shipping.name}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {detail.state === "settled" && (
                <button className="btn btn-gold btn-sm" onClick={() => fulfil(detail)} disabled={busy}>
                  {busy ? "Marking…" : "Mark fulfilled ✓"}
                </button>
              )}
              <a className="btn btn-ghost btn-sm" href={`/store/order/${detail.id}`} target="_blank" rel="noreferrer">
                Open order page →
              </a>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
