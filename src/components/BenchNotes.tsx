"use client";

import { useState } from "react";

/**
 * BENCH NOTES (S26 lane 3) — the feedback rail. A small corner box in the
 * studio chrome so whatever the Admiral notices while playing with the
 * bench lands somewhere durable: bench-data/notes.json, on his own machine.
 * Mounted by src/app/studio/layout.tsx ONLY behind the bench gate
 * (NODE_ENV !== "production" && STUDIO_BENCH=1) — in a production build the
 * server never renders this, and its route 404s. Bench-only, zero presence
 * in production behavior.
 */
export default function BenchNotes() {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function drop() {
    if (!note.trim() || state === "saving") return;
    setState("saving");
    try {
      const res = await fetch("/api/studio-bench-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNote("");
      setState("saved");
    } catch {
      /* the note stays in the box — nothing is lost, try again */
      setState("error");
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        bottom: 12,
        zIndex: 9999,
        fontFamily: "ui-monospace, Menlo, Consolas, monospace",
        fontSize: 12,
        color: "#C9C2D9",
      }}
    >
      {open ? (
        <div
          style={{
            width: 260,
            background: "#191423",
            border: "1px solid #3A3348",
            borderRadius: 8,
            padding: 10,
            boxShadow: "0 6px 24px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <strong style={{ color: "#E8E3F2" }}>bench notes</strong>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", color: "#897F97", cursor: "pointer", font: "inherit" }}
            >
              tuck away
            </button>
          </div>
          <p style={{ margin: "6px 0", color: "#897F97", lineHeight: 1.4 }}>
            Notes land in <code>bench-data/notes.json</code> — they never leave this machine.
          </p>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (state !== "saving") setState("idle");
            }}
            rows={4}
            maxLength={2000}
            placeholder="what felt off, what sang…"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "#100D18",
              color: "#E8E3F2",
              border: "1px solid #3A3348",
              borderRadius: 6,
              padding: 6,
              font: "inherit",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <button
              type="button"
              onClick={drop}
              disabled={state === "saving" || !note.trim()}
              style={{
                background: "#2A2338",
                color: "#E8E3F2",
                border: "1px solid #4A4258",
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              {state === "saving" ? "dropping…" : "drop the note"}
            </button>
            {state === "saved" && <span style={{ color: "#7FB285" }}>landed.</span>}
            {state === "error" && (
              <span style={{ color: "#C97B7B" }}>didn&apos;t land — the note is still here, try again</span>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            background: "#191423",
            color: "#C9C2D9",
            border: "1px solid #3A3348",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
            font: "inherit",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          bench notes
        </button>
      )}
    </div>
  );
}
