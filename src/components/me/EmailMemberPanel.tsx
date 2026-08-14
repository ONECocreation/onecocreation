"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ConstellationCard from "@/components/me/ConstellationCard";

/**
 * The email member's home (dual-path ruling, 0018.05.15): no keys demanded —
 * a name of their choosing, their purchases, and the quick doors. Key
 * members keep the full MePanel; adding a key later is the account-link
 * design on Love's checklist.
 */
interface MemberOrder {
  id: string;
  state: string;
  createdAtMs: number;
  title: string;
  amount: { amount: number; currency: string };
  bookingId: string | null;
}

export default function EmailMemberPanel() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saved, setSaved] = useState(false);
  const [orders, setOrders] = useState<MemberOrder[] | null>(null);

  useEffect(() => {
    fetch("/api/member/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ok?: boolean; email?: string; displayName?: string } | null) => {
        if (d?.ok) {
          setEmail(d.email ?? "");
          setDisplayName(d.displayName ?? "");
        }
      })
      .catch(() => {});
    fetch("/api/member/orders")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ok?: boolean; orders?: MemberOrder[] } | null) => setOrders(d?.orders ?? []))
      .catch(() => setOrders([]));
  }, []);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/member/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    if ((await res.json().catch(() => ({ ok: false }))).ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  const card: React.CSSProperties = {
    padding: "22px 24px",
    borderRadius: 20,
    border: "1.5px solid rgba(139,118,196,.35)",
    background: "rgba(255,255,255,.55)",
    marginTop: 20,
  };

  return (
    <div>
      <div style={card}>
        <h2 style={{ fontFamily: "var(--font-h2)", fontWeight: 400, fontSize: "1.2rem", margin: 0 }}>
          {displayName ? `Welcome, ${displayName}` : "Welcome, beautiful soul"}
        </h2>
        <ConstellationCard />
        <p style={{ color: "var(--muted)", fontSize: ".88rem", margin: "6px 0 14px" }}>
          Signed in with {email || "your email"} · What would you like to be called?
        </p>
        <form onSubmit={saveName} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="your name"
            aria-label="Display name"
            maxLength={48}
            style={{
              flex: "1 1 200px",
              padding: "12px 16px",
              borderRadius: 999,
              border: "1.5px solid rgba(180,134,43,.5)",
              background: "transparent",
              color: "inherit",
              fontSize: ".95rem",
            }}
          />
          <button className="btn btn-gold" type="submit">
            {saved ? "Saved ✓" : "Save"}
          </button>
        </form>
      </div>

      <div style={card}>
        <h2 style={{ fontFamily: "var(--font-h2)", fontWeight: 400, fontSize: "1.2rem", margin: 0 }}>
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
              <li key={o.id} style={{ padding: "10px 0", borderTop: "1px solid rgba(139,118,196,.2)" }}>
                <b>{o.title}</b> · {o.state}
                {/* every purchase gets OUR receipt door — bookings to the booking
                    receipt, everything else to the order page (never BTCPay) */}
                {" "}
                · <Link href={o.bookingId ? `/book/receipt/${o.bookingId}` : `/store/order/${o.id}`} style={{ color: "var(--gold-deep)" }}>receipt</Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={card}>
        <h2 style={{ fontFamily: "var(--font-h2)", fontWeight: 400, fontSize: "1.2rem", margin: 0 }}>
          Quick doors
        </h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <Link className="btn btn-ghost btn-sm" href="/memberships">Memberships</Link>
          <Link className="btn btn-ghost btn-sm" href="/book">Book a Session</Link>
          <Link className="btn btn-ghost btn-sm" href="/store">The Store</Link>
          <Link className="btn btn-ghost btn-sm" href="/classes">Community & Classes</Link>
        </div>
      </div>
    </div>
  );
}
