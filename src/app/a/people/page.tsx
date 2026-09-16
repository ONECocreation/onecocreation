"use client";

import { useEffect, useState } from "react";
import { glassCard, field } from "@/components/console/glass";

interface Person {
  member: string;
  kind: "email" | "key";
  packages: string[];
  sessions: number;
  lastOrderMs: number | null;
}

const subjectOf = (p: Person) => (p.kind === "email" ? `${p.member}@email` : p.member);

/** PEOPLE — who's in the field: purchases held, sessions booked. Sign-in
 *  tracking and class progress land with their rails (shown honestly as —). */
export default function PeopleRoom() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [denied, setDenied] = useState(false);
  const [q, setQ] = useState("");
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");
  const [mergeNote, setMergeNote] = useState("");

  useEffect(() => {
    fetch("/api/admin/people")
      .then((r) => {
        if (r.status === 401) setDenied(true);
        return r.ok ? r.json() : null;
      })
      .then((d) => setPeople(d?.people ?? []))
      .catch(() => setPeople([]));
  }, []);

  if (denied)
    return (
      <p className="p-6 text-sm" style={{ color: "var(--muted)" }}>
        operator session required — <a href="/a" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>sign in at the door</a>
      </p>
    );
  if (people === null) return <p className="p-6 text-sm" style={{ color: "var(--muted)" }}>reading the field…</p>;

  const shown = people.filter((p) => p.member.toLowerCase().includes(q.toLowerCase()));

  const td: React.CSSProperties = {
    background: "var(--glass)", padding: "8px 10px", verticalAlign: "middle",
    borderTop: "1px solid rgba(255,255,255,.9)", borderBottom: "1px solid rgba(139,118,196,.16)",
  };

  return (
    <div className="p-6 text-sm" style={{ color: "var(--ink)" }}>
      <label htmlFor="people-search" style={{ display: "block", margin: "0 0 4px 2px", fontSize: ".72rem", color: "var(--muted)" }}>
        Search members
      </label>
      <input id="people-search" aria-label="Search members" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search members…"
        className="mb-3 w-full max-w-sm console-field" style={field} />
      {people.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No members known yet — signups and purchases land here.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]" style={{ borderCollapse: "separate", borderSpacing: "0 6px", fontSize: ".82rem" }}>
            <thead>
              <tr>
                {["member", "door", "packages held", "sessions", "last purchase", "last sign-in", "class progress"].map((h) => (
                  <th key={h} style={{ fontSize: ".6rem", letterSpacing: ".1em", textTransform: "uppercase",
                    color: "var(--muted)", textAlign: "left", padding: "0 10px", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={`${p.member}-${p.kind}`} onClick={() => setOpenRow(openRow === p.member ? null : p.member)} style={{ cursor: "pointer" }}>
                  <td style={{ ...td, borderRadius: "12px 0 0 12px", borderLeft: "1px solid rgba(139,118,196,.16)", fontWeight: 700, color: "var(--ink-strong)" }}>{p.member}</td>
                  <td style={td}>{p.kind}</td>
                  <td style={td}>
                    {p.packages.length ? p.packages.join(", ") : "—"}
                  </td>
                  <td style={td}>{p.sessions || "—"}</td>
                  <td style={td}>
                    {p.lastOrderMs ? new Date(p.lastOrderMs).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ ...td, color: "var(--muted)" }}>—</td>
                  <td style={{ ...td, borderRadius: "0 12px 12px 0", borderRight: "1px solid rgba(139,118,196,.16)", color: "var(--muted)" }}>—</td>
                </tr>
              ))}
            </tbody>
          </table>
          {openRow && (
            <div className="mt-3" style={glassCard}>
              <b style={{ fontSize: ".75rem", textTransform: "uppercase", color: "var(--info)" }}>Merge accounts — {openRow}</b>
              <p className="mt-1" style={{ fontSize: ".75rem", color: "var(--muted)" }}>
                Tie this member to their other door (email + key = one soul). Purchases, bookings
                and the member home unify; neither login is destroyed.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)} className="console-field" style={field}>
                  <option value="">merge with…</option>
                  {shown.filter((x) => x.member !== openRow).map((x) => (
                    <option key={subjectOf(x)} value={subjectOf(x)}>{x.member} ({x.kind})</option>
                  ))}
                </select>
                <button
                  disabled={!mergeTarget}
                  onClick={async () => {
                    const me = shown.find((x) => x.member === openRow);
                    if (!me) return;
                    const res = await fetch("/api/admin/people/merge", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ a: subjectOf(me), b: mergeTarget }),
                    });
                    setMergeNote((await res.json().catch(() => ({ ok: false }))).ok
                      ? "linked ✓ — both doors now see one member"
                      : "link failed");
                  }}
                  className="btn btn-sm"
                >
                  LINK ACCOUNTS
                </button>
                {mergeNote && <span style={{ fontSize: ".75rem", color: "var(--muted)" }}>{mergeNote}</span>}
              </div>
            </div>
          )}
        </div>
      )}
      <p className="mt-3" style={{ fontSize: ".75rem", color: "var(--muted)" }}>
        Last sign-in and class progress are shown honestly as — until their rails exist (session
        tracking · Matrix rooms). The trainer grant and PWYC approvals will live on this desk.
      </p>
    </div>
  );
}
