"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * The member-home cards every signed-in soul gets (the Admiral's ask):
 * purchases + the quick doors. Mounted in the Purchases tab of `/me`'s
 * `MeSwitch`, for BOTH member kinds (TASK-352, OC UI kit lane 4 — RULED,
 * Build item 6: an email member used to get its own smaller purchases
 * card; this file's StateChip extras are now a real, named superset for
 * them too). The Calendar tab sits one tab over, mounting `MemberCalendar`
 * directly — not this file's concern.
 *
 * TASK-365 (0018.07.02 a₿, block 967,927): the quick-doors row's own
 * per-classroom loop (three links, all → /classes, zero new information)
 * is gone — the static "Community & Classes" door already covers it; the
 * Admiral's own "this is just a community" ruling is the reason not to
 * invent new per-room doors here instead.
 */
interface MemberOrder {
  id: string;
  state: string;
  title: string;
  bookingId: string | null;
}

/* house glass — the old paper-era rgba(255,255,255,.55) washed out on the
   dark ground (me-1 screenshot, Admiral 0018.05.15) */
const card: React.CSSProperties = {
  padding: "22px 24px",
  borderRadius: 20,
  border: "1px solid var(--glass-edge)",
  background: "var(--glass)",
  backdropFilter: "blur(9px)",
  boxShadow: "0 26px 60px -30px rgba(5,3,16,.7)",
  marginTop: 20,
};

/* order states as glanceable chips (Admiral, 0018.05.15) — the admin desks'
   status read, member-side: green is done, gold is in flight, rose needs eyes */
const STATE_CHIP: Record<string, { label: string; ink: string; edge: string }> = {
  settled: { label: "paid ✓", ink: "var(--ok, #7fb98f)", edge: "rgba(78,138,95,.45)" },
  fulfilled: { label: "delivered ✓", ink: "var(--ok, #7fb98f)", edge: "rgba(78,138,95,.45)" },
  created: { label: "open", ink: "var(--muted, #9a8fae)", edge: "rgba(137,127,151,.45)" },
  charge_created: { label: "awaiting payment", ink: "var(--warn, #EBCB77)", edge: "rgba(217,178,78,.45)" },
  processing: { label: "on the chain", ink: "var(--warn, #EBCB77)", edge: "rgba(217,178,78,.45)" },
  underpaid: { label: "underpaid", ink: "var(--warn, #EBCB77)", edge: "rgba(217,178,78,.45)" },
  expired: { label: "expired", ink: "var(--muted, #9a8fae)", edge: "rgba(137,127,151,.45)" },
  canceled: { label: "canceled", ink: "var(--muted, #9a8fae)", edge: "rgba(137,127,151,.45)" },
  refunded: { label: "refunded", ink: "var(--info, #9d86d9)", edge: "rgba(139,118,196,.45)" },
  disputed: { label: "in dispute", ink: "var(--err, #E7899E)", edge: "rgba(197,110,139,.45)" },
};

function StateChip({ state }: { state: string }) {
  const c = STATE_CHIP[state] ?? { label: state, ink: "var(--muted, #9a8fae)", edge: "rgba(137,127,151,.45)" };
  return (
    <span style={{ borderRadius: 999, padding: "3px 10px", fontSize: ".62rem", fontWeight: 700,
      letterSpacing: ".07em", textTransform: "uppercase", whiteSpace: "nowrap",
      color: c.ink, border: `1px solid ${c.edge}` }}>
      {c.label}
    </span>
  );
}

export default function MemberQuickCards() {
  const [orders, setOrders] = useState<MemberOrder[] | null>(null);

  useEffect(() => {
    fetch("/api/member/orders")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ok?: boolean; orders?: MemberOrder[] } | null) => setOrders(d?.orders ?? []))
      .catch(() => setOrders([]));
  }, []);

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={card}>
        <h2 style={{ fontFamily: "var(--font-h2)", fontWeight: 400, fontSize: "1.2rem", margin: 0, color: "var(--ink-strong)" }}>
          Your purchases
        </h2>
        {orders === null ? (
          <p style={{ color: "var(--muted)", fontSize: ".88rem", marginTop: 10 }}>reading…</p>
        ) : orders.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: ".88rem", marginTop: 10 }}>
            Nothing yet — your sessions and offerings will gather here.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
            {orders.map((o) => (
              <li key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                padding: "10px 0", borderTop: "1px solid rgba(139,118,196,.2)" }}>
                <Link href={`/store/order/${o.id}`} style={{ color: "var(--ink-strong)", fontWeight: 700, textDecoration: "none", flex: 1, minWidth: 140 }}>
                  {o.title}
                </Link>
                <StateChip state={o.state} />
                {o.bookingId && (
                  <Link href={`/book/receipt/${o.bookingId}`} style={{ fontSize: ".72rem", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: ".05em", color: "var(--gold-deep)", textDecoration: "none" }}>
                    receipt
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={card}>
        <h2 style={{ fontFamily: "var(--font-h2)", fontWeight: 400, fontSize: "1.2rem", margin: 0, color: "var(--ink-strong)" }}>
          Quick doors
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px,100%), 1fr))", gap: 10, marginTop: 14 }}>
          <Link className="kit-btn kit-btn-second kit-btn-sm" href="/memberships">Memberships</Link>
          <Link className="kit-btn kit-btn-second kit-btn-sm" href="/book">Book a Session</Link>
          <Link className="kit-btn kit-btn-second kit-btn-sm" href="/store">The Store</Link>
          <Link className="kit-btn kit-btn-second kit-btn-sm" href="/classes">Community & Classes</Link>
        </div>
        <p style={{ color: "var(--muted)", fontSize: ".78rem", marginTop: 14 }}>
          Your calendar lives one tab over — the sessions you&apos;ve booked ride the grid there.
        </p>
      </div>
    </div>
  );
}
