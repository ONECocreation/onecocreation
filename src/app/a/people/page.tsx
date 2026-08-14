"use client";

import { useEffect, useState } from "react";

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
      <p className="p-6 text-sm text-cyan-300">
        operator session required — <a href="/a" className="underline">sign in at the door</a>
      </p>
    );
  if (people === null) return <p className="p-6 text-sm text-neutral-400">reading the field…</p>;

  const shown = people.filter((p) => p.member.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-2 text-sm">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search members…"
        className="mb-3 w-full max-w-sm border border-neutral-700 bg-black px-3 py-2 text-base sm:text-sm" />
      {people.length === 0 ? (
        <p className="text-neutral-400">No members known yet — signups and purchases land here.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-xs">
            <thead>
              <tr className="text-left text-neutral-400">
                <th className="border-b border-neutral-700 p-2">member</th>
                <th className="border-b border-neutral-700 p-2">door</th>
                <th className="border-b border-neutral-700 p-2">packages held</th>
                <th className="border-b border-neutral-700 p-2">sessions</th>
                <th className="border-b border-neutral-700 p-2">last purchase</th>
                <th className="border-b border-neutral-700 p-2">last sign-in</th>
                <th className="border-b border-neutral-700 p-2">class progress</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={`${p.member}-${p.kind}`} onClick={() => setOpenRow(openRow === p.member ? null : p.member)} style={{ cursor: "pointer" }}>
                  <td className="border-b border-neutral-800 p-2 font-bold">{p.member}</td>
                  <td className="border-b border-neutral-800 p-2">{p.kind}</td>
                  <td className="border-b border-neutral-800 p-2">
                    {p.packages.length ? p.packages.join(", ") : "—"}
                  </td>
                  <td className="border-b border-neutral-800 p-2">{p.sessions || "—"}</td>
                  <td className="border-b border-neutral-800 p-2">
                    {p.lastOrderMs ? new Date(p.lastOrderMs).toLocaleDateString() : "—"}
                  </td>
                  <td className="border-b border-neutral-800 p-2 text-neutral-500">—</td>
                  <td className="border-b border-neutral-800 p-2 text-neutral-500">—</td>
                </tr>
              ))}
            </tbody>
          </table>
          {openRow && (
            <div className="mt-3 border border-neutral-700 p-3">
              <b className="text-xs uppercase text-cyan-300">Merge accounts — {openRow}</b>
              <p className="mt-1 text-xs text-neutral-400">
                Tie this member to their other door (email + key = one soul). Purchases, bookings
                and the member home unify; neither login is destroyed.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)}
                  className="border border-neutral-700 bg-black px-2 py-2 text-base sm:text-sm">
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
                  className="min-h-11 touch-manipulation border border-yellow-500 px-4 py-1 text-xs font-bold text-yellow-400"
                >
                  LINK ACCOUNTS
                </button>
                {mergeNote && <span className="text-xs text-neutral-400">{mergeNote}</span>}
              </div>
            </div>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-neutral-400">
        Last sign-in and class progress are shown honestly as — until their rails exist (session
        tracking · Matrix rooms). The trainer grant and PWYC approvals will live on this desk.
      </p>
    </div>
  );
}
