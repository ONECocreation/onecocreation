"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ROOMS } from "@/lib/matrix-rooms";

/**
 * The member-home cards every signed-in soul gets (the Admiral's ask):
 * purchases + the quick doors, including the Matrix classrooms. Shown to
 * key members above their control room and inside the email member's home.
 * The community CALENDAR tab lands here next (nostr calendar + .ics sync).
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

  const classes = ROOMS.filter((r) => r.kind === "class");

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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <Link className="btn btn-ghost btn-sm" href="/memberships">Memberships</Link>
          <Link className="btn btn-ghost btn-sm" href="/book">Book a Session</Link>
          <Link className="btn btn-ghost btn-sm" href="/store">The Store</Link>
          <Link className="btn btn-ghost btn-sm" href="/classes">Community & Classes</Link>
        </div>
        {classes.length > 0 && (
          <>
            <p style={{ color: "var(--muted)", fontSize: ".82rem", margin: "14px 0 6px" }}>
              Matrix classrooms (open with your tier):
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {classes.map((r) => (
                <Link key={r.id} className="btn btn-ghost btn-sm" href="/classes">
                  {r.title}
                </Link>
              ))}
            </div>
          </>
        )}
        <p style={{ color: "var(--muted)", fontSize: ".78rem", marginTop: 14 }}>
          The community calendar lands here next — nostr events plus a sync feed for your own
          calendar.
        </p>
      </div>
    </div>
  );
}
