"use client";

import { useState } from "react";
import { SEEDS } from "@/lib/puck-seeds";
import { slugProblem } from "@/lib/puck-slugs";

/**
 * PagesPanel (STUDIO P1 — "a built page is a real page"): the top bar's
 * pages popover, replacing the old window.prompt("new page name") flow.
 * Lists seeds ∪ KV pages in the operator's stored order (seeds hold their
 * canonical order as defaults, new pages append); each row offers rename,
 * duplicate, delete and up/down reorder, with a validated create row on top.
 *
 * Honest states, house law: seed slugs show 🔒 protected (duplicate still
 * offered); with no KV (dev) every control renders disabled under a one-line
 * "pages store not connected" note — nothing pretends to have saved.
 */

const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "var(--font-mono)";

const studioPath = (s: string) => (s === "home" ? "/studio" : `/studio/${s}`);

export default function PagesPanel({ slug, pages, order, storeReady, refresh, flushDraft, onClose }: {
  slug: string;
  pages: string[];
  order: string[] | null;
  storeReady: boolean;
  refresh: () => void;
  flushDraft: () => Promise<void>;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  /* inline name row: which slug is being renamed/duplicated + its draft name */
  const [naming, setNaming] = useState<{ mode: "rename" | "duplicate"; from: string; value: string } | null>(null);

  /* one guard keeps the namespaced lanes (popup: is a later stack) out of
     the pages list; "brand" is the brand board, never a page */
  const kvPages = pages.filter((p) => !p.includes(":") && p !== "brand");
  const seedSlugs = Object.keys(SEEDS);
  const defaults = [...seedSlugs, ...kvPages.filter((p) => !seedSlugs.includes(p))];
  const known = new Set(defaults);
  const ordered = order
    ? [...order.filter((s) => known.has(s)), ...defaults.filter((s) => !order.includes(s))]
    : defaults;

  /* every mutation round-trips the server (the authority); its reason text
     lands verbatim in the panel — no alert(), no fake success */
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
    const problem = slugProblem(name) ?? (known.has(name) ? `'${name}' already exists` : null);
    if (problem) { setError(problem); return; }
    if (await act({ action: "create", slug: name })) {
      window.location.assign(studioPath(name));
    }
  }

  async function commitNaming() {
    if (!naming) return;
    const to = naming.value.trim();
    const problem = slugProblem(to) ?? (known.has(to) ? `'${to}' already exists` : null);
    if (problem) { setError(problem); return; }
    /* renaming the page being edited: flush the pending autosave first so a
       late debounce can't re-create the old slug after the move */
    if (naming.mode === "rename" && naming.from === slug) await flushDraft();
    const ok = await act(
      naming.mode === "rename"
        ? { action: "rename", from: naming.from, to }
        : { action: "duplicate", from: naming.from, to },
    );
    if (!ok) return;
    setNaming(null);
    if (naming.mode === "rename" && naming.from === slug) {
      window.location.assign(studioPath(to));
      return;
    }
    refresh();
  }

  async function remove(target: string) {
    if (!window.confirm(`Delete '${target}'? Its draft and live copies both go — this can't be undone.`)) return;
    if (target === slug) await flushDraft();
    if (!(await act({ action: "delete", from: target }))) return;
    if (target === slug) window.location.assign("/studio");
    else refresh();
  }

  async function move(i: number, dir: -1 | 1) {
    const next = [...ordered];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    if (await act({ action: "reorder", order: next })) refresh();
  }

  const btn = (on: boolean): React.CSSProperties => ({
    flex: "none", padding: "2px 7px", borderRadius: 6, fontSize: 11, lineHeight: 1.6,
    border: "1px solid var(--oc-structural-edge, rgba(139,118,196,.35))", background: "var(--puck-color-surface-subtle)", fontFamily: SANS,
    color: on ? "var(--puck-color-text)" : "var(--puck-color-text-disabled)", cursor: on ? "pointer" : "not-allowed",
  });
  const off = !storeReady || busy;
  const offNote = "pages store not connected (dev: no KV_REST_API_*) — page management is off";

  return (
    <div style={{ position: "fixed", left: 12, top: 52, zIndex: 1090, width: 380,
      maxWidth: "calc(100vw - 24px)", maxHeight: "70vh", display: "flex", flexDirection: "column",
      background: "var(--puck-color-surface)", border: "1px solid var(--oc-popover-edge, rgba(139,118,196,.4))", borderRadius: 14,
      padding: "12px 14px", boxShadow: "var(--oc-popover-shadow, 0 16px 44px rgba(0,0,0,.55))", fontFamily: SANS }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--puck-color-text)" }}>Pages</span>
        <span style={{ flex: 1 }} />
        <button onClick={onClose} title="close" style={{ ...btn(true), border: "none", background: "none", color: "var(--puck-color-text-muted)", fontSize: 13 }}>✕</button>
      </div>

      {!storeReady && (
        <p style={{ margin: "0 0 8px", fontSize: 11.5, lineHeight: 1.5, color: "var(--oc-gold-text, #EBCB77)" /* S2: gold law — the ruling landed (S22 B3): night literal is the fallback, dawn drinks the cartridge's gold ink */ }}>{offNote}</p>
      )}
      {error && (
        <p style={{ margin: "0 0 8px", fontSize: 11.5, lineHeight: 1.5, color: "var(--err)" /* S2: pinned — the ruling landed (S22 B2): the literal WAS night --err, so the pin rides the token */ }}>{error}</p>
      )}

      {/* create — validated inline; the server re-checks and can still 409 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !off) void create(); }}
          placeholder="new-page-name"
          aria-label="new page name"
          disabled={off}
          title={storeReady ? "lowercase letters, numbers and dashes" : offNote}
          style={{ flex: 1, minWidth: 0, background: "var(--puck-color-surface-subtle)", color: "var(--puck-color-text)",
            border: "1px solid var(--oc-input-edge, rgba(139,118,196,.45))", borderRadius: 8,
            padding: "6px 10px", fontSize: 12.5, fontFamily: MONO }}
        />
        <button onClick={() => void create()} disabled={off} title={storeReady ? "create the page and open it" : offNote}
          style={{ ...btn(!off), padding: "6px 12px", fontWeight: 700 }}>Create</button>
      </div>

      <div style={{ overflowY: "auto", minHeight: 0 }}>
        {ordered.map((p, i) => {
          const isSeed = Boolean(SEEDS[p]);
          const isCurrent = p === slug;
          if (naming && naming.from === p) {
            return (
              <div key={p} style={{ display: "flex", gap: 6, alignItems: "center", padding: "5px 2px",
                borderTop: "1px solid rgba(139,118,196,.15)" }}>
                <span style={{ flex: "none", fontSize: 11, color: "var(--puck-color-text-muted)" }}>{naming.mode === "rename" ? "rename" : "copy as"}</span>
                <input
                  value={naming.value}
                  onChange={(e) => setNaming({ ...naming, value: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") void commitNaming(); if (e.key === "Escape") setNaming(null); }}
                  autoFocus
                  aria-label={naming.mode === "rename" ? `rename ${p}` : `duplicate ${p} as`}
                  style={{ flex: 1, minWidth: 0, background: "var(--puck-color-surface-subtle)", color: "var(--puck-color-text)",
                    border: "1px solid var(--oc-input-edge, rgba(139,118,196,.45))", borderRadius: 8,
                    padding: "4px 8px", fontSize: 12, fontFamily: MONO }}
                />
                <button onClick={() => void commitNaming()} disabled={busy} style={btn(!busy)}>Save</button>
                <button onClick={() => setNaming(null)} style={btn(true)}>Cancel</button>
              </div>
            );
          }
          return (
            <div key={p} style={{ display: "flex", gap: 4, alignItems: "center", padding: "5px 2px",
              borderTop: "1px solid rgba(139,118,196,.15)" }}>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis",
                fontFamily: MONO, fontSize: 12, whiteSpace: "nowrap",
                color: isCurrent ? "var(--oc-gold-text, #EBCB77)" /* S2: gold law — the ruling landed (S22 B3) */ : "var(--puck-color-text-secondary)" }}
                title={isCurrent ? "the page you're editing" : studioPath(p)}>
                {isCurrent ? "● " : ""}{p}
              </span>
              {isSeed && (
                <span title="seed page — canon, so it can't be renamed or deleted; duplicate it to make it yours"
                  style={{ flex: "none", fontSize: 10.5, color: "var(--puck-color-text-muted)", whiteSpace: "nowrap" }}>🔒 seed</span>
              )}
              <button onClick={() => void move(i, -1)} disabled={off || i === 0} title={storeReady ? "move up" : offNote} style={btn(!off && i > 0)}>↑</button>
              <button onClick={() => void move(i, 1)} disabled={off || i === ordered.length - 1} title={storeReady ? "move down" : offNote} style={btn(!off && i < ordered.length - 1)}>↓</button>
              {!isSeed && (
                <button onClick={() => { setError(""); setNaming({ mode: "rename", from: p, value: p }); }} disabled={off}
                  title={storeReady ? `rename ${p}` : offNote} style={btn(!off)}>✎</button>
              )}
              <button onClick={() => { setError(""); setNaming({ mode: "duplicate", from: p, value: `${p}-copy` }); }} disabled={off}
                title={storeReady ? `duplicate ${p} into a new draft` : offNote} style={btn(!off)}>⧉</button>
              {!isSeed && (
                <button onClick={() => void remove(p)} disabled={off}
                  title={storeReady ? `delete ${p} (draft and live)` : offNote}
                  style={{ ...btn(!off), color: off ? "var(--puck-color-text-disabled)" : "var(--err)" /* S2: pinned — the ruling landed (S22 B2): the literal WAS night --err */ }}>✕</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
