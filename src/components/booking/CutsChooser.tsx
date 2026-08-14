"use client";

import { useEffect, useState } from "react";
import SlotPicker from "@/components/booking/SlotPicker";

/**
 * THE CUTS DOOR (Admiral, 0018.05.17): location first — where the mobile
 * studio drives — then the session, then the times. The location fields
 * persist to sessionStorage so checkout meets them pre-filled.
 */
const SESSIONS = [
  { id: "silent-haircut-women", icon: "✂️", title: "Silent Haircut — Women" },
  { id: "silent-haircut-men", icon: "✂️", title: "Silent Haircut — Men" },
  { id: "soul-conversation", icon: "💫", title: "Soul Conversation — the silent work, no cut" },
];

export const LOC_KEY = "oc-inperson-loc";

export default function CutsChooser() {
  const [city, setCity] = useState("");
  const [stateReg, setStateReg] = useState("");
  const [zip, setZip] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(LOC_KEY) ?? "{}") as { city?: string; state?: string; zip?: string };
      if (saved.city) setCity(saved.city);
      if (saved.state) setStateReg(saved.state);
      if (saved.zip) setZip(saved.zip);
    } catch { /* fresh visit */ }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(LOC_KEY, JSON.stringify({ city, state: stateReg, zip }));
    } catch { /* private mode — checkout still asks */ }
  }, [city, stateReg, zip]);

  const field: React.CSSProperties = {
    padding: "11px 16px",
    borderRadius: 999,
    border: "1.5px solid rgba(139,118,196,.4)",
    background: "rgba(255,255,255,.7)",
    color: "inherit",
    fontSize: ".92rem",
  };

  return (
    <div>
      {/* 1 · WHERE — the studio comes to you */}
      <div className="card" style={{ padding: "18px 22px", marginBottom: 18 }}>
        <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.1rem", margin: "0 0 4px" }}>
          1 · Where are you?
        </h3>
        <p style={{ color: "var(--muted)", fontSize: ".85rem", margin: "0 0 12px" }}>
          The studio travels — your area tells Love where to drive. The exact spot is confirmed with her before the day.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="city" autoFocus
            style={{ ...field, flex: "1 1 160px", minWidth: 0 }} />
          <input value={stateReg} onChange={(e) => setStateReg(e.target.value)} placeholder="state"
            style={{ ...field, width: 90 }} />
          <input value={zip} onChange={(e) => setZip(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))} placeholder="zip" inputMode="numeric"
            style={{ ...field, width: 110 }} />
        </div>
      </div>

      {/* 2 · WHICH session */}
      <div className="card" style={{ padding: "18px 22px", marginBottom: 18 }}>
        <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.1rem", margin: "0 0 12px" }}>
          2 · Which session?
        </h3>
        <div style={{ display: "grid", gap: 10 }}>
          {SESSIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setPicked(s.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                padding: "12px 16px", borderRadius: 14, cursor: "pointer", fontSize: ".95rem",
                background: picked === s.id ? "rgba(217,178,78,.16)" : "rgba(255,255,255,.6)",
                border: picked === s.id ? "1.5px solid var(--gold-deep)" : "1.5px solid rgba(139,118,196,.35)",
                color: "inherit", fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: "1.3rem" }}>{s.icon}</span>
              <span>{s.title}</span>
              {picked === s.id && <span style={{ marginLeft: "auto", color: "var(--gold-deep)", fontWeight: 700 }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* 3 · WHEN — the picker (dates first, then times) */}
      {picked ? (
        <div className="card" style={{ padding: "18px 22px" }}>
          <h3 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.1rem", margin: 0 }}>
            3 · Pick your time
          </h3>
          <SlotPicker key={picked} serviceId={picked} inPerson />
        </div>
      ) : (
        <p style={{ color: "var(--muted)", fontSize: ".88rem", textAlign: "center" }}>
          pick a session and the open times appear here ✨
        </p>
      )}
    </div>
  );
}
