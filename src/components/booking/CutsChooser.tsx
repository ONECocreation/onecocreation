"use client";

import { useEffect, useState } from "react";
import SlotPicker from "@/components/booking/SlotPicker";

/**
 * THE CUTS DOOR (Admiral, 0018.05.17): location first — where the mobile
 * studio drives — then the session, then the times. The location fields
 * persist to sessionStorage so checkout meets them pre-filled.
 *
 * TASK-126 (0018.06.16 a₿): Love no longer offers the silent cuts — those
 * two choices are gone. The chooser keeps working with what remains;
 * nothing here would render from an empty list.
 *
 * TASK-165 (0018.06.17 a₿ · block 966,080 — the T-152 seam, ruled B):
 * the console skin is retired for the house booking idiom — the SAME one
 * SlotPicker wears right below (night glass panels, lit-paper fields with
 * dark ink in BOTH themes — the house input law — and the chip-select
 * pressed law for the picked session: lavender, never gold, gold is
 * curated to money). NO logic change: same state, same sessionStorage
 * writes, same SlotPicker hand-off.
 */
const SESSIONS = [
  { id: "soul-conversation", icon: "💫", title: "Soul Conversation — the silent work, no cut" },
];

export const LOC_KEY = "oc-inperson-loc";

export default function CutsChooser() {
  const [city, setCity] = useState("");
  const [stateReg, setStateReg] = useState("");
  const [zip, setZip] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    /* the restore rides a microtask — a synchronous setState in the effect
       body would cascade a second render (the set-state-in-effect law) */
    void Promise.resolve().then(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(LOC_KEY) ?? "{}") as { city?: string; state?: string; zip?: string };
        if (saved.city) setCity(saved.city);
        if (saved.state) setStateReg(saved.state);
        if (saved.zip) setZip(saved.zip);
      } catch { /* fresh visit */ }
    });
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(LOC_KEY, JSON.stringify({ city, state: stateReg, zip }));
    } catch { /* private mode — checkout still asks */ }
  }, [city, stateReg, zip]);

  /* the night glass panel — SlotPicker's own recipe, byte-for-byte */
  const panel: React.CSSProperties = {
    borderRadius: 20,
    border: "1px solid var(--glass-edge)",
    background: "var(--glass)",
    backdropFilter: "blur(8px)",
    boxShadow: "0 24px 60px -30px rgba(120,100,160,.55)",
    padding: "18px 22px",
  };

  /* the house input law: lit paper, dark ink, in BOTH themes (the
     --field-bg/--field-ink pair) — never inherit the night's light ink */
  const field: React.CSSProperties = {
    padding: "11px 16px",
    borderRadius: 999,
    border: "1.5px solid rgba(139,118,196,.45)",
    background: "var(--field-bg)",
    color: "var(--field-ink, #4a4458)",
    fontSize: ".92rem",
    fontFamily: "inherit",
  };

  return (
    <div>
      {/* 1 · WHERE — the studio comes to you */}
      <div style={{ ...panel, marginBottom: 18 }}>
        <h3 style={{ fontFamily: "var(--font-h3, sans-serif)", fontWeight: 400, fontSize: "1.1rem", color: "var(--ink-strong)", margin: "0 0 4px" }}>
          1 · Where are you?
        </h3>
        <p style={{ color: "var(--muted, #897f97)", fontSize: ".85rem", margin: "0 0 12px" }}>
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

      {/* 2 · WHICH session — the house chip law: the picked choice wears
          the pressed state (lavender, aria-pressed), never gold; the ✓
          says it in a mark, not in color alone */}
      <div style={{ ...panel, marginBottom: 18 }}>
        <h3 style={{ fontFamily: "var(--font-h3, sans-serif)", fontWeight: 400, fontSize: "1.1rem", color: "var(--ink-strong)", margin: "0 0 12px" }}>
          2 · Which session?
        </h3>
        <div style={{ display: "grid", gap: 10 }}>
          {SESSIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="chip-select"
              onClick={() => setPicked(s.id)}
              aria-pressed={picked === s.id}
              style={{
                display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                width: "100%", padding: "12px 16px", borderRadius: 14, fontSize: ".95rem",
              }}
            >
              <span style={{ fontSize: "1.3rem" }}>{s.icon}</span>
              <span>{s.title}</span>
              {picked === s.id && <span style={{ marginLeft: "auto", fontWeight: 700 }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* 3 · WHEN — the picker (dates first, then times) */}
      {picked ? (
        <div style={panel}>
          <h3 style={{ fontFamily: "var(--font-h3, sans-serif)", fontWeight: 400, fontSize: "1.1rem", color: "var(--ink-strong)", margin: 0 }}>
            3 · Pick your time
          </h3>
          <SlotPicker key={picked} serviceId={picked} inPerson />
        </div>
      ) : (
        /* ink-body, not muted: this line sits directly on the shelf veil's
           rose wash — T-152 measured muted at 3.5:1 there, ink-body 7.2:1
           (contrast law ≥ 4.5:1) */
        <p className="center" style={{ color: "var(--ink-body)", fontSize: ".88rem" }}>
          pick a session and the open times appear here ✨
        </p>
      )}
    </div>
  );
}
