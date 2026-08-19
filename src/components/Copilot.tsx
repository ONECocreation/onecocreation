"use client";

import { useEffect, useRef, useState } from "react";
import type { Data } from "@puckeditor/core";

/**
 * Number One — the studio copilot, as DOCK CONTENT (UI update, 2026-08-13:
 * "it's a built in tool, not an afterthought slapped in there"). This
 * component renders a full-height panel body — header, conversation, the
 * rails note, input — and PuckEditor owns the dock column, its collapse,
 * and zen. No fixed positioning here anymore.
 *
 * The brains are unchanged: /api/copilot (operator-gated), generated pages
 * drop onto the canvas via onApply, and every AI page passes the rails
 * lint server-side before it ever reaches the canvas.
 */

type Turn = { role: "love" | "n1"; text: string };

export default function Copilot({
  slug,
  currentContent,
  onApply,
}: {
  slug: string;
  currentContent: () => Data;
  onApply: (data: Data) => void;
}) {
  const [ready, setReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [log, setLog] = useState<Turn[]>([
    { role: "n1", text: "Tell me what you'd like on this page — a heading, a few words, a button. I'll build it from your house pieces and drop it on the canvas." },
  ]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/copilot")
      .then((r) => r.json())
      .then((d) => setReady(!!d.ready))
      .catch(() => setReady(false));
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [log, busy]);

  async function send() {
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    setLog((l) => [...l, { role: "love", text: message }]);
    setBusy(true);
    try {
      const live = currentContent();
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, message, content: Array.isArray(live.content) ? live.content : [] }),
      });
      const d = (await res.json()) as { ok: boolean; data?: Data; reason?: string };
      if (d.ok && d.data) {
        onApply(d.data);
        const n = Array.isArray(d.data.content) ? d.data.content.length : 0;
        setLog((l) => [...l, { role: "n1", text: `Done — ${n} block${n === 1 ? "" : "s"} on the canvas, rails-checked. Adjust anything by hand, or tell me another change. Publish when it's ready.` }]);
      } else {
        setLog((l) => [...l, { role: "n1", text: d.reason || "That didn't go through. Try again in a moment." }]);
      }
    } catch {
      setLog((l) => [...l, { role: "n1", text: "Couldn't reach the server. Try again in a moment." }]);
    } finally {
      setBusy(false);
    }
  }

  const mono = "ui-monospace, Menlo, Consolas, monospace";
  const sans = "'Helvetica Neue', Helvetica, Arial, sans-serif";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minWidth: 0, fontFamily: sans }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 12px", borderBottom: "1px solid rgba(139,118,196,.2)", flex: "none" }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: ready === false ? "var(--err)" : "var(--ok)", flex: "none" }} />
        <b style={{ fontSize: 12, color: "var(--ink-strong)" }}>Number One</b>
        <span style={{ fontFamily: mono, fontSize: 9, color: "var(--muted)", letterSpacing: ".08em" }}>· copilot</span>
      </div>

      {ready === false && (
        <div style={{ padding: "9px 12px", background: "rgba(192,57,43,.16)", color: "var(--copilot-user)", fontSize: 11.5, lineHeight: 1.5, flex: "none" }}>
          The AI key on the server is missing or invalid — ask the Admiral to re-add <code>ANTHROPIC_API_KEY</code>.
        </div>
      )}

      {/* conversation */}
      <div ref={logRef} style={{ flex: 1, overflowY: "auto", padding: "10px 10px", display: "flex", flexDirection: "column", gap: 7 }}>
        {log.map((t, i) => (
          <div
            key={i}
            style={{
              alignSelf: t.role === "love" ? "flex-end" : "flex-start",
              maxWidth: "90%",
              padding: "6px 10px", borderRadius: 10, fontSize: 12, lineHeight: 1.5,
              // S2 gold-law hold (0018.05.25 a₿): the love bubble wears
              // decorative gold — money-only family, left literal + reported
              background: t.role === "love" ? "#D9B24E" : "rgba(139,118,196,.16)",
              color: t.role === "love" ? "#2b1f05" : "var(--ink-body)",
            }}
          >
            {t.text}
          </div>
        ))}
        {busy && (
          <div style={{ alignSelf: "flex-start", padding: "6px 10px", borderRadius: 10, fontSize: 12, background: "rgba(139,118,196,.16)", color: "var(--muted)" }}>
            building…
          </div>
        )}
      </div>

      {/* the contract, stated where she works */}
      <div style={{ margin: "0 10px 8px", padding: "6px 9px", border: "1px dashed rgba(139,118,196,.3)", borderRadius: 9, fontFamily: mono, fontSize: 9, color: "var(--muted)", letterSpacing: ".04em", flex: "none" }}>
        builds from your house pieces — <b style={{ color: "var(--teal-bright)", fontWeight: 600 }}>checked by the rails</b> before it lands
      </div>

      {/* input */}
      <div style={{ display: "flex", gap: 6, padding: "9px 10px", borderTop: "1px solid rgba(139,118,196,.2)", flex: "none" }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          placeholder="tell Number One what you want…"
          rows={2}
          style={{
            flex: 1, minWidth: 0, resize: "none", background: "color-mix(in oklab, var(--puck-color-surface) 60%, transparent)", color: "var(--ink-strong)",
            border: "1px solid rgba(139,118,196,.3)", borderRadius: 9, padding: "7px 9px",
            fontSize: 12, fontFamily: "inherit", lineHeight: 1.4,
          }}
        />
        <button
          onClick={send}
          disabled={busy || !draft.trim()}
          style={{
            // S2 gold-law hold (0018.05.25 a₿): decorative gold on Send —
            // money-only family, left literal + reported
            background: "#D9B24E", color: "#2b1f05", border: "none", borderRadius: 9,
            padding: "0 12px", fontWeight: 800, fontSize: 12, alignSelf: "stretch",
            cursor: busy || !draft.trim() ? "default" : "pointer",
            opacity: busy || !draft.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
