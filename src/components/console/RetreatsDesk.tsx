"use client";

import { useCallback, useEffect, useState } from "react";
import { Chip, SectionHead, field } from "@/components/console/glass";

/**
 * RETREATS & EXCURSIONS (the Admiral's blessing, 0018.05.28): a block of
 * days at a place, sold by the seat. Saving a LIVE retreat blocks its days
 * on the calendar (regular slots vanish) and puts its seat items on the
 * shelf; the public door is /retreats.
 */

interface Retreat {
  id: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  seats: number;
  priceSats: number;
  depositSats?: number;
  blurb: string;
  status: "live" | "hidden";
  createdAtMs: number;
}

const BLANK: Retreat = {
  id: "", title: "", location: "", startDate: "", endDate: "",
  seats: 8, priceSats: 0, blurb: "", status: "hidden", createdAtMs: 0,
};

const fieldLabel: React.CSSProperties = {
  display: "block", fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase",
  color: "var(--muted)", margin: "10px 0 3px",
};

export default function RetreatsDesk() {
  const [retreats, setRetreats] = useState<Retreat[] | null>(null);
  const [draft, setDraft] = useState<Retreat | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/booking")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.ok && setRetreats(d.retreats ?? []))
      .catch(() => setRetreats([]));
  }, []);
  useEffect(load, [load]);

  async function save() {
    if (!draft) return;
    setBusy(true);
    setErr("");
    const res = await fetch("/api/admin/booking", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "retreat", value: draft }),
    }).then((r) => r.json()).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setDraft(null);
      load();
    } else setErr(res?.reason ?? "save failed");
  }

  async function remove(r: Retreat) {
    if (!confirm(`Remove "${r.title}"? Its days unblock and its seat items leave the shelf. Seats already sold keep their orders.`)) return;
    setBusy(true);
    await fetch(`/api/admin/booking?kind=retreat&id=${encodeURIComponent(r.id)}`, { method: "DELETE" }).catch(() => {});
    setBusy(false);
    setDraft(null);
    load();
  }

  if (retreats === null) return null;

  return (
    <div style={{ color: "var(--ink)" }}>
      <SectionHead label="Retreats & Excursions" />
      <p style={{ margin: "0 0 10px", fontSize: ".78rem", color: "var(--muted)" }}>
        A block of days at a place, sold by the seat. A LIVE retreat blocks its days on the calendar
        (regular session slots vanish) and its seats ride the ordinary cart in sats. The public door
        is <a href="/retreats" target="_blank" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>/retreats</a>.
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {retreats.map((r) => (
          <li key={r.id} style={{ background: "var(--glass)", border: "1px solid rgba(139,118,196,.22)",
            borderRadius: 12, padding: "10px 14px", marginBottom: 8, fontSize: ".85rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
              <b>🏜️ {r.title}</b>
              <span style={{ color: "var(--muted)", fontSize: ".78rem" }}>
                {r.location} · {r.startDate} → {r.endDate} · {r.seats} seats ·{" "}
                <span style={{ color: "var(--gold-deep)" }}>{r.priceSats.toLocaleString()} sats</span>
                {r.depositSats != null && ` (deposit ${r.depositSats.toLocaleString()})`}
              </span>
              {r.status === "live" ? <Chip tone="teal">live</Chip> : <Chip tone="grey">hidden</Chip>}
              <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                <a href={`/retreats/${r.id}`} target="_blank"
                  style={{ background: "none", border: 0, fontSize: ".68rem", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: ".05em", color: "var(--muted)", padding: "6px 4px" }}>
                  view ↗
                </a>
                <button onClick={() => { setDraft(r); setErr(""); }}
                  style={{ background: "none", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: ".68rem",
                    fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--gold-deep)", padding: "6px 4px" }}>
                  edit
                </button>
                <button onClick={() => remove(r)} disabled={busy}
                  style={{ background: "none", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: ".68rem",
                    fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--err)", padding: "6px 4px" }}>
                  remove
                </button>
              </span>
            </div>
          </li>
        ))}
        {retreats.length === 0 && (
          <li style={{ color: "var(--muted)", fontSize: ".85rem" }}>no retreats yet — name the first one below ✨</li>
        )}
      </ul>

      {!draft ? (
        <button className="btn btn-gold btn-sm" style={{ marginTop: 10 }} onClick={() => { setDraft(BLANK); setErr(""); }}>
          + New retreat
        </button>
      ) : (
        <div style={{ marginTop: 12, background: "var(--glass)", border: "1px solid rgba(139,118,196,.25)",
          borderRadius: 14, padding: "14px 16px", maxWidth: 640 }}>
          <h4 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.05rem", margin: 0 }}>
            {draft.id ? `Edit — ${draft.title || draft.id}` : "A new retreat"}
          </h4>
          <label style={fieldLabel}>name</label>
          <input value={draft.title} placeholder="Way of the Heart · Sedona"
            onChange={(e) => setDraft({ ...draft, title: e.target.value })} style={{ ...field, width: "100%" }} />
          <label style={fieldLabel}>location</label>
          <input value={draft.location} placeholder="Sedona, Arizona — exact address shared after booking"
            onChange={(e) => setDraft({ ...draft, location: e.target.value })} style={{ ...field, width: "100%" }} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={{ flex: 1, minWidth: 130 }}>
              <label style={fieldLabel}>first day</label>
              <input type="date" value={draft.startDate}
                onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} style={{ ...field, width: "100%" }} />
            </span>
            <span style={{ flex: 1, minWidth: 130 }}>
              <label style={fieldLabel}>last day</label>
              <input type="date" value={draft.endDate}
                onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} style={{ ...field, width: "100%" }} />
            </span>
            <span style={{ width: 90 }}>
              <label style={fieldLabel}>seats</label>
              <input type="number" value={draft.seats || ""}
                onChange={(e) => setDraft({ ...draft, seats: Number(e.target.value) })} style={{ ...field, width: "100%" }} />
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={{ flex: 1, minWidth: 140 }}>
              <label style={fieldLabel}>seat price (sats)</label>
              <input type="number" value={draft.priceSats || ""} placeholder="1111111"
                onChange={(e) => setDraft({ ...draft, priceSats: Number(e.target.value) })} style={{ ...field, width: "100%" }} />
            </span>
            <span style={{ flex: 1, minWidth: 140 }}>
              <label style={fieldLabel}>deposit (sats, optional)</label>
              <input type="number" value={draft.depositSats ?? ""} placeholder="holds a seat"
                onChange={(e) => setDraft({ ...draft, depositSats: e.target.value ? Number(e.target.value) : undefined })}
                style={{ ...field, width: "100%" }} />
            </span>
            <span style={{ minWidth: 140 }}>
              <label style={fieldLabel}>status</label>
              <select value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as Retreat["status"] })}
                style={{ ...field, width: "100%" }}>
                <option value="hidden">○ hidden — still shaping it</option>
                <option value="live">● live — doors open</option>
              </select>
            </span>
          </div>
          <label style={fieldLabel}>the words</label>
          <textarea value={draft.blurb} placeholder="what these days hold…"
            onChange={(e) => setDraft({ ...draft, blurb: e.target.value })}
            style={{ ...field, width: "100%", minHeight: 64, resize: "vertical" }} />
          {err && <p style={{ color: "var(--err)", fontSize: ".8rem", margin: "8px 0 0" }}>{err}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn btn-gold btn-sm" onClick={save} disabled={busy}>
              {busy ? "Saving…" : draft.status === "live" ? "Save & open the doors" : "Save"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>Close</button>
          </div>
          <p style={{ fontSize: ".72rem", color: "var(--muted)", margin: "10px 0 0" }}>
            a deposit seat counts as a held seat — the remainder settles by letter, your hand for now.
          </p>
        </div>
      )}
    </div>
  );
}
