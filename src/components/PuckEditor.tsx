"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Puck, Render, Drawer, createUsePuck, useGetPuck, type Data } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import { config } from "@/lib/puck-config";
import Copilot from "@/components/Copilot";
import { lintPage, type Finding } from "@pacsarcade/plugin-rails";
import { createChangelog, type ChangeOrigin, type Changelog } from "@pacsarcade/puck-changelog";
import { ChangelogBridge, useApplyData } from "@pacsarcade/puck-changelog/react";
import { ViewportBar, ArtboardRail, CanvasZoomer, ZoomControls, FrameScrollbarStyles, useCanvasZoom, type CanvasZoomApi } from "@pacsarcade/puck-config/responsive";
import { createPresence, type PresenceClient } from "@pacsarcade/presence";
import { createNostrTransport } from "@pacsarcade/presence/nostr";
import { loadIdentity, saveIdentity, colorFor, newSessionId } from "@pacsarcade/presence";
import { usePresence, PresenceBridge, PresenceChips, PresenceHalos } from "@pacsarcade/presence/react";
import { SEEDS } from "@/lib/puck-seeds";
import { ONECOCREATION } from "@/brand/tokens";

/**
 * PuckEditor — the studio, wearing the MOCKUP CHROME (UI update, Admiral
 * 2026-08-13). Puck's compositional API lets us own the layout with zero
 * core patches:
 *
 *   ┌ top bar: STUDIO · page · brand · guidelines · zoom · zen · publish ┐
 *   │ LIBRARY   │        canvas        │  STYLE   │  NUMBER ONE          │
 *   │ (blocks + │   (Puck.Preview)     │ (fields) │  (docked copilot)    │
 *   │  outline) │                      │          │                      │
 *   └───────────┴──────────────────────┴──────────┴──────────────────────┘
 *
 * Every side panel collapses to a slim vertical tab («»); ⛶ zen folds all
 * three — the site is the star. Panel state persists per browser.
 * All the rails stay: draft autosave, client lint chip + findings panel,
 * server-authoritative publish (422 opens findings), copilot rails-checked.
 */

type LiveState = "idle" | "publishing" | "live" | "error";
type PanelKey = "lib" | "fields" | "cop";
const PANELS_LS = "oc-studio-panels";

const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, Menlo, Consolas, monospace";

export default function PuckEditor({ slug, data }: { slug: string; data: Data }) {
  const [liveData, setLiveData] = useState<Data>(data);
  const liveRef = useRef<Data>(data);
  liveRef.current = liveData;

  /* the change-log substrate (Phase 2 step 1): every edit becomes a patch
     record; undo/redo ride Puck's own history, the bridge restores OUR
     panels alongside it, and copilot applies are one undoable step */
  const [changelog] = useState<Changelog>(() => createChangelog(data));
  const applyRef = useRef<((next: Data, origin?: ChangeOrigin) => void) | null>(null);

  const [preview, setPreview] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [live, setLive] = useState<LiveState>("idle");
  const [pages, setPages] = useState<string[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [showFindings, setShowFindings] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<PanelKey, boolean>>({ lib: false, fields: false, cop: false });
  const [matrix, setMatrix] = useState(false);
  const [presence, setPresence] = useState<PresenceClient | null>(null);
  const [wideChrome, setWideChrome] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1440px)");
    const apply = () => setWideChrome(mq.matches);
    apply();
    if (!mq.matches && localStorage.getItem(PANELS_LS) === null) {
      /* narrow chrome, first visit: canvas first — open panels via their tabs */
      setCollapsed((c) => ({ ...c, fields: true, cop: true }));
    }
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const saveTimer = useRef<number | null>(null);
  /* the canvas column — measured by useCanvasZoom (via StudioZoomProvider);
     lives at editor level so the top-bar zoom pills and the canvas share
     one zoom state (ZOOM LIFT, brand-board batch 2026-08-14) */
  const canvasColRef = useRef<HTMLDivElement>(null);
  const [libQuery, setLibQuery] = useState("");

  const liveUrl = `/p/${slug}`;
  const lane = slug === "practice" || slug.startsWith("u/") ? "play" : "brand";

  useEffect(() => {
    fetch("/api/puck").then((r) => r.json()).then((d) => setPages(Array.isArray(d.pages) ? d.pages : [])).catch(() => {});
    try {
      const saved = JSON.parse(localStorage.getItem(PANELS_LS) ?? "");
      if (saved && typeof saved === "object") setCollapsed((c) => ({ ...c, ...saved }));
      if (localStorage.getItem("oc-studio-matrix") === "1") setMatrix(true);
    } catch { /* first visit */ }
    /* presence: fail-soft — any error leaves the studio exactly as it was */
    let cancelled = false;
    let client: PresenceClient | null = null;
    fetch("/api/presence")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.ok) return;
        const stored = loadIdentity();
        const identity = stored ?? {
          sessionId: newSessionId(),
          name: d.nameHint || "operator",
          color: "",
        };
        if (!identity.color) identity.color = colorFor(identity.sessionId);
        if (!stored) saveIdentity(identity);
        const transport = createNostrTransport({ relays: d.relays, roomId: d.roomId, roomKey: d.roomKey });
        client = createPresence(transport, { identity });
        setPresence(client);
      })
      .catch(() => { /* relay/door down — studio unaffected */ });
    return () => { cancelled = true; client?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function setPanels(next: Record<PanelKey, boolean>) {
    setCollapsed(next);
    try { localStorage.setItem(PANELS_LS, JSON.stringify(next)); } catch { /* private mode */ }
  }
  const togglePanel = (k: PanelKey) => {
    const next = { ...collapsed, [k]: !collapsed[k] };
    /* narrow chrome: Style and Number One overlay the canvas — one at a time */
    if (!wideChrome && !next[k] && (k === "fields" || k === "cop")) {
      if (k === "fields") next.cop = true;
      if (k === "cop") next.fields = true;
    }
    setPanels(next);
  };
  function zen() {
    const anyOpen = Object.values(collapsed).some((v) => !v);
    setPanels({ lib: anyOpen, fields: anyOpen, cop: anyOpen });
  }

  /* the rails, running quietly as she edits (server is the authority at publish) */
  function runLint(next: Data) {
    try {
      const pal = Object.fromEntries(ONECOCREATION.palette.map((p) => [p.key, p.value]));
      const dawn = Object.fromEntries(
        ONECOCREATION.palette.flatMap((p) => {
          const d = (p as { varianted?: Record<string, string> }).varianted?.dawn;
          return d ? [[p.key, d]] : [];
        }),
      );
      setFindings(lintPage(next as never, { tokens: ONECOCREATION, lane, palette: pal, paletteDawn: dawn }));
    } catch { /* lint must never break editing */ }
  }
  useEffect(() => { runLint(liveRef.current); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  async function saveDraft(next: Data) {
    try {
      const res = await fetch("/api/puck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, data: next }),
      });
      if (res.ok) setDraftSaved(true);
    } catch { /* transient — next edit retries */ }
  }

  function onChange(next: Data) {
    setLiveData(next);
    setDirty(true);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => { saveDraft(next); runLint(next); }, 1000);
  }

  function applyGenerated(next: Data) {
    if (applyRef.current) {
      /* one dispatched setData = one undoable step; Puck's onChange then
         fires our save/lint path as with any hand edit */
      applyRef.current(next, "copilot");
    } else {
      setLiveData(next);
      setDirty(true);
      saveDraft(next);
      runLint(next);
    }
  }

  async function publishLive() {
    setLive("publishing");
    try {
      const res = await fetch("/api/puck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, data: liveRef.current, publish: true }),
      });
      if (res.ok) { setLive("live"); setDirty(false); }
      else if (res.status === 422) {
        const d = await res.json().catch(() => null);
        if (Array.isArray(d?.findings)) { setFindings(d.findings); setShowFindings(true); }
        setLive("error");
      } else setLive("error");
    } catch { setLive("error"); }
  }

  async function publishAll() {
    if (!window.confirm("Publish every staged page to the live site now?")) return;
    setLive("publishing");
    try {
      const res = await fetch("/api/puck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishAll: true }),
      });
      const d = await res.json();
      if (res.ok) {
        setLive("live"); setDirty(false);
        const blocked = Array.isArray(d.blocked) && d.blocked.length
          ? ` ${d.blocked.length} page(s) held by the rails: ${d.blocked.map((b: { slug: string }) => b.slug).join(", ")}.`
          : "";
        window.alert(`Published ${(d.published || []).length} page(s) to live.${blocked}`);
      } else setLive("error");
    } catch { setLive("error"); }
  }

  function goToPage(target: string) {
    const t = target.trim().replace(/^\/+|\/+$/g, "");
    if (!t || t === slug) return;
    if (t === "brand") {
      window.alert("'brand' is the brand board — pick another name");
      return;
    }
    window.location.assign(t === "home" ? "/studio" : `/studio/${t}`);
  }

  /* → the brand board: flush any pending draft save first, remember where
     we were so "back to studio" returns here */
  async function goBrandBoard() {
    try { sessionStorage.setItem("oc-last-slug", slug); } catch { /* private mode */ }
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
      await saveDraft(liveRef.current);
    }
    window.location.assign("/studio/brand");
  }

  const pill: React.CSSProperties = {
    padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
    letterSpacing: ".03em", border: "none", cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap",
  };
  const GOLD = "var(--gold-deep, #b4862b)";
  const errCount = findings.filter((f) => f.severity === "error").length;
  const warnCount = findings.length - errCount;
  /* "brand" is RESERVED: /studio/brand is the brand board, never a page */
  const switcherOptions = Array.from(new Set(["home", "practice", slug, ...Object.keys(SEEDS), ...pages]))
    .filter((p) => p !== "brand");

  /* one side panel: content when open, slim vertical tab when collapsed */
  function Panel({ k, side, label, width, children }: {
    k: PanelKey; side: "left" | "right"; label: string; width: number; children: React.ReactNode;
  }) {
    const isOpen = !collapsed[k];
    /* narrow chrome: right-side panels float over the canvas so the page
       keeps its width (the Admiral's portrait-monitor law) */
    const overlay = !wideChrome && side === "right" && isOpen;
    return (
      <div style={{
        width: isOpen && !overlay ? width : 30, flex: "none", display: "flex", flexDirection: "column",
        background: "#12101f", minWidth: 0, position: "relative", transition: "width .2s ease",
        borderLeft: side === "right" ? "1px solid rgba(139,118,196,.25)" : "none",
        borderRight: side === "left" ? "1px solid rgba(139,118,196,.25)" : "none",
      }}>
        {overlay && (
          <div style={{ position: "absolute", right: 30, top: 0, bottom: 0, width,
            zIndex: 30, background: "#12101f", display: "flex", flexDirection: "column",
            borderLeft: "1px solid rgba(139,118,196,.35)", boxShadow: "-14px 0 34px rgba(0,0,0,.45)" }}>
            {children}
          </div>
        )}
        <button
          onClick={() => togglePanel(k)}
          title={isOpen ? `collapse ${label}` : `open ${label}`}
          data-oc-panel-tab={k}
          style={{ position: "absolute", top: 8, right: isOpen ? 6 : 5, zIndex: 6, width: 18, height: 18,
            borderRadius: 5, border: "1px solid rgba(139,118,196,.3)", background: "#1b1530",
            color: "#9a8fae", fontSize: 10, lineHeight: 1, cursor: "pointer", padding: 0 }}
        >
          {isOpen ? (side === "left" ? "«" : "»") : (side === "left" ? "»" : "«")}
        </button>
        {isOpen && !overlay ? children : !isOpen ? (
          <button onClick={() => togglePanel(k)}
            style={{ background: "none", border: "none", cursor: "pointer", marginTop: 44,
              writingMode: "vertical-rl", fontFamily: MONO, fontSize: 10, letterSpacing: ".3em",
              color: "#9a8fae", textTransform: "uppercase", padding: 0 }}>
            {label}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="oc-studio" style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh", overflow: "hidden", background: "#141021" }}>
      <Puck config={config} data={liveData} onChange={onChange} onPublish={publishLive} onAction={changelog.onAction} height="100%">
        <ChangelogBridge
          log={changelog}
          captureViewState={() => ({ collapsed, showFindings })}
          restoreViewState={(vs) => {
            const v = vs as { collapsed?: Record<PanelKey, boolean>; showFindings?: boolean } | undefined;
            if (v?.collapsed) setPanels(v.collapsed);
            if (typeof v?.showFindings === "boolean") setShowFindings(v.showFindings);
          }}
        />
        <CopilotApplyBridge log={changelog} applyRef={applyRef} />
        <PresenceBridge client={presence} slug={slug} log={changelog} dirty={dirty || undefined} />
        <PresenceHalos client={presence} slug={slug} />
        <PresenceBanner client={presence} slug={slug} />

        <StudioZoomProvider columnRef={canvasColRef}>
        {/* ══ top bar ══ */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
          background: "#12101f", borderBottom: "1px solid rgba(139,118,196,.3)", flex: "none",
          fontFamily: SANS, flexWrap: "wrap" }}>
          <span style={{ fontFamily: MONO, fontWeight: 800, letterSpacing: ".22em", color: "#F4ECFF", fontSize: 13, whiteSpace: "nowrap" }}>
            ■ <i style={{ fontStyle: "normal", color: "#EBCB77" }}>STUDIO</i>
          </span>

          {/* page switcher — LEGIBILITY DOCTRINE: solid night panel, full
              ink at 13px on the CLOSED control; options solid-dark too
              (the old rgba pill + #000 options were mid-on-mid) */}
          <select
            value={switcherOptions.includes(slug) ? slug : "home"}
            onChange={(e) => { if (e.target.value === "__new") { const s = window.prompt("New page name (letters, dashes):"); if (s) goToPage(s); } else goToPage(e.target.value); }}
            style={{ ...pill, fontSize: 13, background: "#1b1530", color: "#F4ECFF",
              border: "1px solid rgba(139,118,196,.45)", paddingRight: 8, cursor: "pointer" }}
            title="Switch page"
          >
            {switcherOptions.map((p) => <option key={p} value={p} style={{ background: "#1b1530", color: "#F4ECFF" }}>{p === "practice" ? "✎ practice (sandbox)" : p}</option>)}
            <option value="__new" style={{ background: "#1b1530", color: "#F4ECFF" }}>＋ new page…</option>
          </select>
          <button
            onClick={() => { const p = window.prompt("New page name (letters, dashes):"); if (p) goToPage(p); }}
            title="create a new page"
            style={{ ...pill, background: "rgba(139,118,196,.2)", color: "#F4ECFF", padding: "5px 9px" }}
          >+</button>

          <button
            onClick={() => { void goBrandBoard(); }}
            title="the brand board — palette, type ladder, gradients, both skins"
            style={{ ...pill, background: "rgba(139,118,196,.2)", color: "#F4ECFF" }}
          >🎨 Brand</button>
          <button
            onClick={() => setShowFindings((v) => !v)}
            title="brand guidelines — checked as you edit"
            style={{ ...pill,
              background: errCount ? "rgba(231,137,158,.18)" : findings.length ? "rgba(235,203,119,.15)" : "rgba(127,185,143,.14)",
              color: errCount ? "#E7899E" : findings.length ? "#EBCB77" : "#9ee0ad" }}
          >
            {errCount ? `${errCount} to fix`
              : warnCount ? `⚠ ${warnCount} warning${warnCount === 1 ? "" : "s"}`
              : "guidelines ✓"}
          </button>
          <UndoRedoPills pill={pill} />
          <ViewportBar compact />
          <ZoomPills />
          <button
            onClick={() => setMatrix((v) => { const n = !v; try { localStorage.setItem("oc-studio-matrix", n ? "1" : "0"); } catch { /* private mode */ } return n; })}
            title="see every breakpoint at once — click an artboard to edit that size"
            style={{ ...pill, background: matrix ? "rgba(217,178,78,.18)" : "rgba(139,118,196,.2)", color: matrix ? "#EBCB77" : "#F4ECFF" }}
          >▦ matrix</button>
          <button onClick={zen} title="fold every panel — just the site" style={{ ...pill, background: "rgba(139,118,196,.2)", color: "#F4ECFF" }}>⛶ zen</button>

          <span style={{ flex: 1 }} />
          <PresenceChips client={presence} />

          <span style={{ fontFamily: MONO, fontSize: 10.5, color: "#9a8fae", whiteSpace: "nowrap" }}>
            {live === "publishing" ? "publishing…"
              : live === "error" ? <span style={{ color: "#E7899E" }}>publish held — see rails</span>
              : dirty ? (draftSaved ? "● draft saved · not live" : "editing…")
              : live === "live" ? (
                <a href={liveUrl} target="_blank" rel="noreferrer" style={{ color: "#9ee0ad", textDecoration: "none" }}>
                  ● live at {liveUrl} ↗
                </a>
              ) : "● draft"}
          </span>
          <button onClick={() => setPreview(true)} style={{ ...pill, background: `linear-gradient(135deg, #EBCB77, ${GOLD})`, color: "#3a2a06" }} title="see it in both skins — publishing lives there (look before it goes live)">Preview & publish</button>
        </div>

        {/* ══ panes: library · canvas · style · Number One ══ */}
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <Panel k="lib" side="left" label="Library" width={230}>
            <div style={{ flex: 1, overflowY: "auto", paddingTop: 30 }}>
              {/* SEARCH INSERT: type to filter the library; matches render
                  as a flat draggable Drawer, the stock view hides (display
                  none keeps Puck.Components mounted) */}
              <div style={{ padding: "2px 10px 8px" }}>
                <input
                  value={libQuery}
                  onChange={(e) => setLibQuery(e.target.value)}
                  placeholder="What would you like to insert?"
                  aria-label="search blocks to insert"
                  title="search blocks to insert"
                  style={{ width: "100%", boxSizing: "border-box", background: "#1b1530",
                    color: "#F4ECFF", border: "1px solid rgba(139,118,196,.45)",
                    borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: SANS }}
                />
              </div>
              {libQuery.trim() !== "" && <SearchDrawer query={libQuery} />}
              <div style={{ display: libQuery.trim() !== "" ? "none" : undefined }}>
                <Puck.Components />
              </div>
              <Puck.Outline />
            </div>
          </Panel>

          <div style={{ flex: 1, minWidth: 0, overflow: "hidden", background: "#0f0c1d", display: "flex", flexDirection: "column" }}>
            {matrix && (
              <div style={{ flex: "none", padding: "10px 12px 0" }}>
                <ArtboardRail tokens={ONECOCREATION} height={320} log={changelog} />
              </div>
            )}
            <CanvasArea columnRef={canvasColRef} />
          </div>

          <Panel k="fields" side="right" label="Style" width={280}>
            <div style={{ flex: 1, overflowY: "auto", paddingTop: 30 }}>
              <Puck.Fields />
            </div>
          </Panel>

          <Panel k="cop" side="right" label="Number One" width={300}>
            <div style={{ flex: 1, minHeight: 0, paddingTop: 26, display: "flex", flexDirection: "column" }}>
              <Copilot slug={slug} currentContent={() => liveRef.current} onApply={applyGenerated} />
            </div>
          </Panel>
        </div>
        </StudioZoomProvider>

        {/* findings panel — INSIDE <Puck> now so click-to-focus can reach
            the store (useGetPuck); position:fixed keeps it floating */}
        {showFindings && findings.length > 0 && (
          <FindingsPanel findings={findings} errCount={errCount} />
        )}
      </Puck>

      {/* both-skins preview overlay */}
      {preview && (
        <div className="oc-preview-shell">
          <div className="oc-preview-bar">
            <strong style={{ fontSize: 13 }}>Preview — this draft in both skins</strong>
            <span style={{ flex: 1 }} />
          <PresenceChips client={presence} />
            <button onClick={publishAll} style={{ ...pill, background: "rgba(217,178,78,.18)", color: "#EBCB77" }} title="push every staged page live (each is rails-checked)">Publish all</button>
            <button onClick={publishLive} style={{ ...pill, background: GOLD, color: "#fff" }}>Publish to live</button>
            <button onClick={() => setPreview(false)} style={{ ...pill, background: "rgba(139,118,196,.22)", color: "#F4ECFF" }}>← Back to editing</button>
          </div>
          <div className="oc-preview-panes">
            <div className="oc-preview-pane oc-pv-light">
              <div className="oc-pv-label">Light</div>
              <div className="oc-pv-body"><Render config={config} data={liveData} /></div>
            </div>
            <div className="oc-preview-pane oc-pv-dark">
              <div className="oc-pv-label">Dark</div>
              <div className="oc-pv-body"><Render config={config} data={liveData} /></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* must render inside <Puck>: hands the changelog-aware apply fn up to the
   editor shell so Number One's pages land as one undoable step */
function CopilotApplyBridge({ log, applyRef }: {
  log: Changelog;
  applyRef: React.MutableRefObject<((next: Data, origin?: ChangeOrigin) => void) | null>;
}) {
  const apply = useApplyData(log);
  applyRef.current = apply;
  return null;
}

const usePuckStore = createUsePuck();

/* undo / redo riding Puck's own history (hotkeys ctrl+Z / shift+Z already work) */
function UndoRedoPills({ pill }: { pill: React.CSSProperties }) {
  const history = usePuckStore((s) => s.history);
  const dim = (on: boolean): React.CSSProperties => ({
    ...pill,
    background: "rgba(139,118,196,.2)",
    color: on ? "#F4ECFF" : "#5d5470",
    cursor: on ? "pointer" : "default",
  });
  return (
    <>
      <button onClick={() => history.hasPast && history.back()} disabled={!history.hasPast}
        title="undo (ctrl+Z)" style={dim(history.hasPast)}>↩</button>
      <button onClick={() => history.hasFuture && history.forward()} disabled={!history.hasFuture}
        title="redo (ctrl+shift+Z)" style={dim(history.hasFuture)}>↪</button>
    </>
  );
}

/* same-page awareness: presence knows, saves are still last-writer-wins —
   the banner says so plainly (awareness, not locks; the crew is two). */
function PresenceBanner({ client, slug }: { client: PresenceClient | null; slug: string }) {
  const { peers } = usePresence(client);
  const clashers = peers.filter((p) => p.slug === slug);
  if (!clashers.length) return null;
  const who = clashers.map((p) => p.name).join(", ");
  const unsaved = clashers.some((p) => p.dirty);
  return (
    <div style={{ position: "fixed", left: "50%", top: 52, transform: "translateX(-50%)", zIndex: 1080,
      background: "#221a38", border: "1px solid rgba(235,203,119,.5)", borderRadius: 10,
      padding: "7px 14px", fontSize: 12.5, color: "#EBCB77",
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", boxShadow: "0 8px 24px rgba(0,0,0,.4)" }}>
      {who} {clashers.length > 1 ? "are" : "is"} also editing this page{unsaved ? " (with unsaved changes)" : ""} —
      saves are last-writer-wins; coordinate or take turns.
    </div>
  );
}

const useStudioPuck = createUsePuck();

/* ── ZOOM LIFT (brand-board batch 2026-08-14): one zoom state, owned above
   both consumers — the top-bar pills and the canvas mat. The provider must
   render inside <Puck> (it reads the viewport width from the store). */
const ZoomCtx = createContext<CanvasZoomApi | null>(null);

function StudioZoomProvider({ columnRef, children }: {
  columnRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  const vpWidth = useStudioPuck((st) => {
    const w = st.appState.ui.viewports?.current?.width;
    return typeof w === "number" ? w : 1280;
  });
  const zoomApi = useCanvasZoom(vpWidth, columnRef);
  return <ZoomCtx.Provider value={zoomApi}>{children}</ZoomCtx.Provider>;
}

/* the zoom cluster in the top bar's tools run (Fit · 50 · 75 · 100 · %) */
function ZoomPills() {
  const zoomApi = useContext(ZoomCtx);
  return zoomApi ? <ZoomControls zoomApi={zoomApi} /> : null;
}

/* the canvas mat: zoomable, iframe is the ONLY scroller, house scrollbars
   injected in-frame; must render inside <Puck>. The floating bottom-left
   zoom pill moved to the top bar (ZoomPills). */
function CanvasArea({ columnRef }: { columnRef: React.RefObject<HTMLDivElement | null> }) {
  const vpWidth = useStudioPuck((st) => {
    const w = st.appState.ui.viewports?.current?.width;
    return typeof w === "number" ? w : 1280;
  });
  const zoomApi = useContext(ZoomCtx);
  return (
    <div ref={columnRef} style={{ flex: 1, minHeight: 0, position: "relative" }}>
      <CanvasZoomer viewportWidth={vpWidth} zoom={zoomApi?.zoom ?? 1} onZoom={zoomApi?.setZoom}>
        <Puck.Preview />
      </CanvasZoomer>
      <FrameScrollbarStyles />
    </div>
  );
}

/* ── SEARCH INSERT: a flat, draggable Drawer of every visible block whose
   key or label matches the query (case-insensitive). Must render inside
   <Puck> — Drawer.Item rides the editor's drag context. */
function SearchDrawer({ query }: { query: string }) {
  const q = query.trim().toLowerCase();
  const cats = (config.categories ?? {}) as Record<
    string,
    { components?: readonly string[]; visible?: boolean }
  >;
  const visible = new Set<string>();
  for (const cat of Object.values(cats)) {
    if (cat.visible === false) continue;
    for (const c of cat.components ?? []) visible.add(c);
  }
  const comps = config.components as Record<string, { label?: string }>;
  const matches = Array.from(visible).filter((key) => {
    const label = comps[key]?.label ?? key;
    return key.toLowerCase().includes(q) || label.toLowerCase().includes(q);
  });
  if (matches.length === 0) {
    return (
      <p style={{ padding: "4px 12px 10px", fontSize: 12.5, color: "#9a8fae", fontFamily: SANS }}>
        no blocks match &ldquo;{query.trim()}&rdquo;
      </p>
    );
  }
  return (
    <div style={{ padding: "0 10px 10px" }}>
      <Drawer>
        {matches.map((key) => (
          <Drawer.Item key={key} name={key} label={comps[key]?.label ?? key} />
        ))}
      </Drawer>
    </div>
  );
}

/* ── the guidelines panel — inside <Puck> so a row click can FOCUS the
   offending block: select it in the store, then scroll the canvas iframe
   to it. Rows without a blockId (page-level findings) stay inert. */
function FindingsPanel({ findings, errCount }: { findings: Finding[]; errCount: number }) {
  const getPuck = useGetPuck();

  function focusFinding(f: Finding) {
    if (!f.blockId) return;
    const puck = getPuck();
    const selector = puck.getSelectorForId(f.blockId);
    if (!selector) return;
    puck.dispatch({
      type: "setUi",
      ui: { itemSelector: { index: selector.index, zone: selector.zone } },
    });
    try {
      const frame = document.querySelector<HTMLIFrameElement>("iframe#preview-frame");
      frame?.contentDocument
        ?.querySelector(`[data-puck-component="${CSS.escape(f.blockId)}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch { /* cross-origin or frame mid-remount — selection still landed */ }
  }

  return (
    <div style={{ position: "fixed", left: "50%", top: 52, transform: "translateX(-50%)",
      zIndex: 1090, width: 480, maxWidth: "calc(100vw - 32px)", maxHeight: "50vh", overflowY: "auto",
      background: "#12101f", border: "1px solid rgba(139,118,196,.4)", borderRadius: 14,
      padding: "12px 14px", boxShadow: "0 16px 44px rgba(0,0,0,.55)", fontFamily: SANS }}>
      <style>{`.oc-finding-row[data-focusable="1"]:hover{background:rgba(139,118,196,.14);border-radius:8px}`}</style>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#F4ECFF", marginBottom: 8 }}>
        Brand guidelines — {errCount} to fix before this page can go live, {findings.length - errCount} suggestions
      </div>
      {findings.map((f, i) => {
        const focusable = Boolean(f.blockId);
        return (
          <div
            key={i}
            className="oc-finding-row"
            data-focusable={focusable ? "1" : undefined}
            role={focusable ? "button" : undefined}
            tabIndex={focusable ? 0 : undefined}
            title={focusable ? "click to select this block on the canvas" : undefined}
            onClick={focusable ? () => focusFinding(f) : undefined}
            onKeyDown={focusable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); focusFinding(f); } } : undefined}
            style={{ display: "flex", gap: 8, padding: "6px 4px",
              borderTop: "1px solid rgba(139,118,196,.15)", fontSize: 12, lineHeight: 1.45,
              cursor: focusable ? "pointer" : "default", alignItems: "flex-start" }}
          >
            <span style={{ flex: "none", fontWeight: 800, color: f.severity === "error" ? "#E7899E" : "#EBCB77" }}>
              {f.severity === "error" ? "✕" : "⚠"}
            </span>
            <span style={{ color: "#D9D2E4", flex: 1 }}>
              {f.blockType && <b style={{ color: "#F4ECFF" }}>{f.blockType}: </b>}{f.message}
            </span>
            {focusable && (
              <span aria-hidden style={{ flex: "none", color: "#9a8fae", fontWeight: 800 }}>›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
