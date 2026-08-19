"use client";

import { useState } from "react";
import type { PopupTrigger } from "@/lib/puck-store";
import { SEEDS } from "@/lib/puck-seeds";
import { popupName, popupSlug, popupNameProblem, popupTriggerProblem, NEW_POPUP_TRIGGER } from "@/lib/puck-popups";

/**
 * PopupsPanel (STUDIO P2): the top bar's second popover, beside ▤ pages —
 * the popup registry's room. Popups are full Puck documents at popup:<name>
 * slugs, edited in the same canvas; this panel creates them, opens them,
 * deletes the unprotected ones, and edits WHEN/WHERE each shows
 * ({ enabled, delayMs, oncePerSession, pages } — content, not code; the
 * page list stays operator-editable, Pac's veto flag).
 *
 * Same honesty laws as the pages panel: seed popups show 🔒, and with no
 * KV the controls render disabled under a one-line note.
 */

const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, Menlo, Consolas, monospace";

export default function PopupsPanel({ pages, popups, storeReady, refresh, onClose }: {
  pages: string[];
  popups: Record<string, PopupTrigger>;
  storeReady: boolean;
  refresh: () => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  /* the expanded trigger editor: name + a local working copy of the form */
  const [editing, setEditing] = useState<{ name: string; form: PopupTrigger; pagesText: string } | null>(null);

  /* every known popup: KV popup:* slugs ∪ registry names ∪ seed popups */
  const names = Array.from(new Set([
    ...pages.map(popupName).filter((n): n is string => n !== null),
    ...Object.keys(popups),
    ...Object.keys(SEEDS).map(popupName).filter((n): n is string => n !== null),
  ])).sort();

  async function act(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/puck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await res.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
      if (!res.ok || !d?.ok) {
        setError(d?.reason ?? `the pages API answered ${res.status}`);
        return false;
      }
      return true;
    } catch {
      setError("couldn't reach the pages API — nothing changed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    const name = newName.trim();
    const problem = popupNameProblem(name) ?? (names.includes(name) ? `'${name}' already exists` : null);
    if (problem) { setError(problem); return; }
    if (await act({ action: "popup-create", name })) {
      window.location.assign(`/studio/${popupSlug(name)}`);
    }
  }

  async function saveTrigger() {
    if (!editing) return;
    const pages = editing.pagesText.split(",").map((p) => p.trim()).filter(Boolean);
    const form: PopupTrigger = { ...editing.form, pages };
    const problem = popupTriggerProblem(form);
    if (problem) { setError(problem); return; }
    if (await act({ action: "popup-config", name: editing.name, config: form })) {
      setEditing(null);
      refresh();
    }
  }

  async function remove(name: string) {
    if (!window.confirm(`Delete the popup '${name}'? Its draft, live copy and trigger all go — this can't be undone.`)) return;
    if (await act({ action: "popup-delete", name })) refresh();
  }

  const btn = (on: boolean): React.CSSProperties => ({
    flex: "none", padding: "2px 7px", borderRadius: 6, fontSize: 11, lineHeight: 1.6,
    border: "1px solid rgba(139,118,196,.35)", background: "var(--puck-color-surface-subtle)", fontFamily: SANS,
    color: on ? "var(--puck-color-text)" : "var(--puck-color-text-disabled)", cursor: on ? "pointer" : "not-allowed",
  });
  const off = !storeReady || busy;
  const offNote = "pages store not connected (dev: no KV_REST_API_*) — popup management is off";
  const input: React.CSSProperties = {
    background: "var(--puck-color-surface-subtle)", color: "var(--puck-color-text)", border: "1px solid rgba(139,118,196,.45)",
    borderRadius: 8, padding: "5px 9px", fontSize: 12, fontFamily: MONO, minWidth: 0,
  };
  const check: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--puck-color-text-secondary)" };

  return (
    <div style={{ position: "fixed", left: 12, top: 52, zIndex: 1090, width: 400,
      maxWidth: "calc(100vw - 24px)", maxHeight: "70vh", display: "flex", flexDirection: "column",
      background: "var(--puck-color-surface)", border: "1px solid rgba(139,118,196,.4)", borderRadius: 14,
      padding: "12px 14px", boxShadow: "0 16px 44px rgba(0,0,0,.55)", fontFamily: SANS }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--puck-color-text)" }}>Popups</span>
        <span style={{ flex: 1 }} />
        <button onClick={onClose} title="close" style={{ ...btn(true), border: "none", background: "none", color: "var(--puck-color-text-muted)", fontSize: 13 }}>✕</button>
      </div>

      {!storeReady && (
        <p style={{ margin: "0 0 8px", fontSize: 11.5, lineHeight: 1.5, color: "#EBCB77" /* S2: gold law — decorative, reported */ }}>{offNote}</p>
      )}
      {error && (
        <p style={{ margin: "0 0 8px", fontSize: 11.5, lineHeight: 1.5, color: "#E7899E" /* S2: pinned — needs a ruling */ }}>{error}</p>
      )}

      {/* create — validates the <name> part; opens the new popup's canvas */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !off) void create(); }}
          placeholder="new-popup-name"
          aria-label="new popup name"
          disabled={off}
          title={storeReady ? "lowercase letters, numbers and dashes" : offNote}
          style={{ ...input, flex: 1 }}
        />
        <button onClick={() => void create()} disabled={off} title={storeReady ? "create the popup and open it" : offNote}
          style={{ ...btn(!off), padding: "6px 12px", fontWeight: 700 }}>Create</button>
      </div>

      <div style={{ overflowY: "auto", minHeight: 0 }}>
        {names.length === 0 && (
          <p style={{ margin: 0, fontSize: 12, color: "var(--puck-color-text-muted)" }}>no popups yet</p>
        )}
        {names.map((n) => {
          const t = popups[n] ?? NEW_POPUP_TRIGGER;
          const isSeed = Boolean(SEEDS[popupSlug(n)]);
          if (editing?.name === n) {
            const f = editing.form;
            const set = (patch: Partial<PopupTrigger>) => setEditing({ ...editing, form: { ...f, ...patch } });
            return (
              <div key={n} style={{ padding: "7px 2px", borderTop: "1px solid rgba(139,118,196,.15)",
                display: "flex", flexDirection: "column", gap: 7 }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: "#EBCB77" /* S2: gold law — decorative, reported */ }}>{n}</span>
                <label style={check}>
                  <input type="checkbox" checked={f.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
                  shows on the site
                </label>
                <label style={check}>
                  delay
                  <input type="number" min={0} max={60000} step={100} value={f.delayMs}
                    onChange={(e) => set({ delayMs: Number(e.target.value) })}
                    style={{ ...input, width: 90 }} />
                  ms
                </label>
                <label style={check}>
                  <input type="checkbox" checked={f.oncePerSession} onChange={(e) => set({ oncePerSession: e.target.checked })} />
                  once per session
                </label>
                <label style={{ ...check, alignItems: "flex-start", flexDirection: "column", gap: 4 }}>
                  pages (comma-separated paths)
                  <input value={editing.pagesText}
                    onChange={(e) => setEditing({ ...editing, pagesText: e.target.value })}
                    placeholder="/, /about"
                    style={{ ...input, width: "100%", boxSizing: "border-box" }} />
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => void saveTrigger()} disabled={busy} style={btn(!busy)}>Save</button>
                  <button onClick={() => setEditing(null)} style={btn(true)}>Cancel</button>
                </div>
              </div>
            );
          }
          return (
            <div key={n} style={{ display: "flex", gap: 4, alignItems: "center", padding: "5px 2px",
              borderTop: "1px solid rgba(139,118,196,.15)" }}>
              <a href={`/studio/${popupSlug(n)}`} title={`edit ${popupSlug(n)} in the canvas`}
                style={{ flex: "none", fontFamily: MONO, fontSize: 12, color: "var(--puck-color-text-secondary)", textDecoration: "none" }}>{n}</a>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                fontSize: 10.5, color: t.enabled ? "var(--ok-soft)" : "var(--puck-color-text-muted)" }}
                title={t.enabled ? `shows after ${t.delayMs}ms on: ${t.pages.join(", ") || "(no pages)"}` : "dark — not showing"}>
                {t.enabled ? `● ${t.delayMs}ms · ${t.pages.join(" ") || "no pages"}` : "○ off"}
              </span>
              {isSeed && (
                <span title="seed popup — canon, so it can't be deleted; its trigger stays editable"
                  style={{ flex: "none", fontSize: 10.5, color: "var(--puck-color-text-muted)" }}>🔒</span>
              )}
              <button
                onClick={() => { setError(""); setEditing({ name: n, form: { ...t }, pagesText: t.pages.join(", ") }); }}
                disabled={off}
                title={storeReady ? `edit when/where ${n} shows` : offNote} style={btn(!off)}>⚙</button>
              {!isSeed && (
                <button onClick={() => void remove(n)} disabled={off}
                  title={storeReady ? `delete ${n} (draft, live and trigger)` : offNote}
                  style={{ ...btn(!off), color: off ? "var(--puck-color-text-disabled)" : "#E7899E" /* S2: pinned — needs a ruling */ }}>✕</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
