"use client";

import { createContext, useContext, useEffect, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { Puck, Render, Drawer, createUsePuck, useGetPuck, type Config, type Data } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import type { BrandTokens } from "@frens-earth/puck-config/tokens";
import type { PuckPageData } from "@onecocreation/page-store";
import { lintPage, type Finding } from "@frens-earth/plugin-rails";
import { createChangelog, type ChangeOrigin, type Changelog } from "@frens-earth/puck-changelog";
import { ChangelogBridge, useApplyData } from "@frens-earth/puck-changelog/react";
import { ViewportBar, ArtboardRail, CanvasZoomer, ZoomControls, FrameScrollbarStyles, useCanvasZoom, type CanvasZoomApi } from "@frens-earth/puck-config/responsive";
import { createPresence, type PresenceClient } from "@frens-earth/presence";
import { createNostrTransport } from "@frens-earth/presence/nostr";
import { loadIdentity, saveIdentity, colorFor, newSessionId } from "@frens-earth/presence";
import { usePresence, PresenceBridge, PresenceChips, PresenceHalos } from "@frens-earth/presence/react";
import PagesPanel from "@/components/style/PagesPanel";
import PopupsPanel from "@/components/style/PopupsPanel";
import type { PopupTrigger } from "@/lib/puck-store";
import { BuilderMarkerContext, operatorDisplayName } from "@/components/style/BuilderMarker";

/**
 * PuckEditor — the page designer (Style), wearing the MOCKUP CHROME (UI
 * update, Admiral 2026-08-13). Puck's compositional API lets us own the
 * layout with zero core patches:
 *
 *   ┌ top bar: STYLE · page · brand · guidelines · zoom · zen · publish ┐
 *   │ LIBRARY   │        canvas        │  STYLE   │  NUMBER ONE          │
 *   │ (blocks + │   (Puck.Preview)     │ (fields) │  (docked copilot)    │
 *   │  outline) │                      │          │                      │
 *   └───────────┴──────────────────────┴──────────┴──────────────────────┘
 *
 * Every side panel collapses to a slim vertical tab («»); ⛶ zen folds all
 * three — the site is the star. Panel state persists per browser.
 * All the rails stay: draft autosave, client lint chip + findings panel,
 * server-authoritative publish (422 opens findings), copilot rails-checked.
 *
 * TASK-97 PROP-LIFT (cut 0018.06.10 a₿): this component is brand-neutral —
 * puck-config, the seed library, the brand tokens and the Copilot all
 * arrive as PROPS, wired by the style page's client bridge
 * (src/components/style/StyleEditor.tsx), so a second StylePac tenant
 * can feed it its own cartridge without forking the editor.
 *
 * TASK-175 (naming ruling, Admiral 0018.06.17 a₿, block 966094): the badge
 * reads STYLE — "the studio" names only StudioPac, the VDO.Ninja go-live
 * fork. The `oc-studio*` localStorage keys and `.oc-studio` / `--studio-*`
 * CSS identifiers are code names and stay (module law).
 */

type LiveState = "idle" | "publishing" | "live" | "error";
type PanelKey = "lib" | "fields" | "cop";
const PANELS_LS = "oc-studio-panels";

export default function PuckEditor({ slug, data, config, seeds, tokens, Copilot, operator }: {
  slug: string;
  data: Data;
  config: Config;
  seeds: Record<string, PuckPageData>;
  tokens: BrandTokens;
  Copilot: ComponentType<{ slug: string; currentContent: () => Data; onApply: (data: Data) => void }>;
  /** TASK-342: the signed-in operator (hex pubkey or email seat, ground
   *  fact 2) — provided to `BuilderMarkerContext` below so the canvas's
   *  session-aware blocks (MeSwitch/LoginDoor) can name whoever is
   *  looking. Never reaches the live site: only this route ever renders
   *  `<PuckEditor>` with a real operator. */
  operator: string;
}) {
  const [liveData, setLiveData] = useState<Data>(data);
  const liveRef = useRef<Data>(data);
  /* the ref mirrors the state AFTER commit (the refs law: no ref writes
     during render) — every reader (publish/save gestures, the copilot's
     currentContent door, the mount lint) is post-commit, so an effect-sync
     is the same freshness they always saw */
  useEffect(() => { liveRef.current = liveData; });

  /* the change-log substrate (Phase 2 step 1): every edit becomes a patch
     record; undo/redo ride Puck's own history, the bridge restores OUR
     panels alongside it, and copilot applies are one undoable step */
  const [changelog] = useState<Changelog>(() => createChangelog(data));
  const applyRef = useRef<((next: Data, origin?: ChangeOrigin) => void) | null>(null);

  const [preview, setPreview] = useState(false);
  /* TASK-233: the overlay's LIVE side — the published copy read back from
     the store when the overlay opens (and re-read after a publish lands).
     liveDoc === null with liveKnown means "never published" (honest state,
     dashes); liveKnown === false means the read failed. */
  const [liveDoc, setLiveDoc] = useState<Data | null>(null);
  const [liveKnown, setLiveKnown] = useState(false);
  /* the 422 rails hold, in her words (which page, why) — null on every
     other error shape so the status pill stays honest about what it knows */
  const [heldNote, setHeldNote] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [live, setLive] = useState<LiveState>("idle");
  const [pages, setPages] = useState<string[]>([]);
  const [pageOrder, setPageOrder] = useState<string[] | null>(null);
  const [pagesReady, setPagesReady] = useState(true);
  const [showPages, setShowPages] = useState(false);
  const [popupTriggers, setPopupTriggers] = useState<Record<string, PopupTrigger>>({});
  const [showPopups, setShowPopups] = useState(false);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [showFindings, setShowFindings] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<PanelKey, boolean>>({ lib: false, fields: false, cop: false });
  const [matrix, setMatrix] = useState(false);
  const [presence, setPresence] = useState<PresenceClient | null>(null);
  const [wideChrome, setWideChrome] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1440px)");
    const apply = () => setWideChrome(mq.matches);
    /* the initial apply + first-visit panel collapse ride a microtask — a
       synchronous setState in the effect body would cascade a second render
       (the set-state-in-effect law); the change listener is untouched */
    void Promise.resolve().then(() => {
      apply();
      if (!mq.matches && localStorage.getItem(PANELS_LS) === null) {
        /* narrow chrome, first visit: canvas first — open panels via their tabs */
        setCollapsed((c) => ({ ...c, fields: true, cop: true }));
      }
    });
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

  /* the page switcher + pages panel share one list; the panel calls this
     again after every create/rename/delete/duplicate/reorder */
  function refreshPages() {
    fetch("/api/puck").then((r) => r.json()).then((d) => {
      setPages(Array.isArray(d.pages) ? d.pages : []);
      setPageOrder(Array.isArray(d.order) ? d.order : null);
      setPagesReady(d.store !== false);
      if (d.popups && typeof d.popups === "object") setPopupTriggers(d.popups);
    }).catch(() => {});
  }

  useEffect(() => {
    refreshPages();
    /* the saved-layout restore rides a microtask — a synchronous setState in
       the effect body would cascade a second render (the set-state-in-effect
       law) */
    void Promise.resolve().then(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(PANELS_LS) ?? "");
        if (saved && typeof saved === "object") setCollapsed((c) => ({ ...c, ...saved }));
        if (localStorage.getItem("oc-studio-matrix") === "1") setMatrix(true);
      } catch { /* first visit */ }
    });
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
      const pal = Object.fromEntries(tokens.palette.map((p) => [p.key, p.value]));
      const dawn = Object.fromEntries(
        tokens.palette.flatMap((p) => {
          const d = (p as { varianted?: Record<string, string> }).varianted?.dawn;
          return d ? [[p.key, d]] : [];
        }),
      );
      setFindings(lintPage(next as never, { tokens, lane, palette: pal, paletteDawn: dawn }));
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

  /* the overlay's Live side reads the published copy from the store (the
     route's {draft, live} pair) — fresh on every open, and after a publish
     lands so the "live now" half never shows a stale page */
  function refreshLiveDoc() {
    fetch(`/api/puck?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setLiveDoc(d && d.live ? (d.live as Data) : null);
        setLiveKnown(Boolean(d && d.ok));
      })
      .catch(() => setLiveKnown(false));
  }
  useEffect(() => {
    if (!preview) return;
    refreshLiveDoc();
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- slug is the dep that matters; refreshLiveDoc re-reads it fresh */
  }, [preview, slug]);

  async function publishLive() {
    setLive("publishing");
    setHeldNote(null);
    try {
      const res = await fetch("/api/puck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, data: liveRef.current, publish: true }),
      });
      if (res.ok) { setLive("live"); setDirty(false); setLiveDoc(liveRef.current); setLiveKnown(true); }
      else if (res.status === 422) {
        const d = await res.json().catch(() => null);
        if (Array.isArray(d?.findings)) {
          setFindings(d.findings);
          setShowFindings(true);
          /* the hold must be SEEN: the preview overlay covers the findings
             panel and the status pill, so the hold closes it — she lands
             back in the editor with the guidelines list already open */
          setPreview(false);
          const errs = d.findings.filter((f: Finding) => f.severity === "error").length;
          /* the rails hold, in her words: which page, why, and nothing was lost */
          setHeldNote(`"${slug}" stayed a draft — ${errs || 1} ${errs === 1 ? "thing" : "things"} to fix in the brand guidelines (the list is open). The page on the site didn't change.`);
        }
        setLive("error");
      } else setLive("error");
    } catch { setLive("error"); }
  }

  async function publishAll() {
    if (!window.confirm("Publish every page to the live site now?\n\nEach page is checked against your brand guidelines first — a page that doesn't pass stays a draft, and I'll tell you which.")) return;
    setLive("publishing");
    setHeldNote(null);
    try {
      const res = await fetch("/api/puck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishAll: true }),
      });
      const d = await res.json();
      if (res.ok) {
        setLive("live"); setDirty(false);
        const n = (d.published || []).length;
        const blocked: { slug: string; errors: number }[] = Array.isArray(d.blocked) ? d.blocked : [];
        if ((d.published || []).includes(slug)) refreshLiveDoc();
        const held = blocked.length
          ? `\n\n${blocked.length} ${blocked.length === 1 ? "page stayed" : "pages stayed"} as ${blocked.length === 1 ? "a draft" : "drafts"} — the brand guidelines found things to fix: ${blocked.map((b) => `"${b.slug}" (${b.errors} to fix)`).join(", ")}.`
          : "";
        window.alert(n
          ? `Done — ${n} ${n === 1 ? "page is" : "pages are"} live on the site now.${held}`
          : `Nothing went live.${held || "\n\nThere were no saved drafts to publish."}`);
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
    window.location.assign(t === "home" ? "/style" : `/style/${t}`);
  }

  /* flush any pending debounced autosave right now — used before navigating
     away (brand board) and before the pages panel renames/deletes the page
     being edited, so a late save can't resurrect the old slug */
  async function flushDraft() {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
      await saveDraft(liveRef.current);
    }
  }

  /* → the brand board: flush any pending draft save first, remember where
     we were so "back to Style" returns here */
  async function goBrandBoard() {
    try { sessionStorage.setItem("oc-last-slug", slug); } catch { /* private mode */ }
    await flushDraft();
    window.location.assign("/style/brand");
  }

  const pill: React.CSSProperties = {
    padding: "var(--oc-density-tiny-pad-y) var(--oc-space-6)", /* 5px 12px — tiny pad-y holds the 5px, the ladder the 12px */
    borderRadius: 999, fontSize: "var(--oc-density-small-font)" /* 12px */, fontWeight: 700,
    letterSpacing: ".03em", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", whiteSpace: "nowrap",
  };
  const GOLD = "var(--gold-deep, #D9B24E)"; /* S2: fallback repaired to the token's night value (integrator ruling 0018.05.25 a₿). The D2-ruled "Publish to live" button keeps this EXACTLY — the ruling is sacred; S33 touches only the unruled Preview button below */
  const errCount = findings.filter((f) => f.severity === "error").length;
  const warnCount = findings.length - errCount;
  /* "brand" is RESERVED: /style/brand is the brand board, never a page;
     popup: slugs stay out of the switcher (gate ruling 0018.05.25 a₿ —
     popups belong to the ◱ popups panel only) EXCEPT the one being edited,
     so the control still names what you're on */
  const switcherOptions = Array.from(new Set(["home", "practice", slug, ...Object.keys(seeds), ...pages]))
    .filter((p) => p !== "brand" && (!p.includes(":") || p === slug));


  return (
    /* TASK-342: the ONLY place `BuilderMarkerContext` is ever provided —
       every render of MeSwitch/LoginDoor's Puck block that is NOT a
       descendant of this tree (every live-site render) reads the
       context's `null` default and shows nothing (ground fact 1 + the
       correctness backbone described in BuilderMarker.tsx). `CanvasArea`
       (and its `<Puck.Preview />` iframe) renders inside this same React
       tree via `<Puck>`'s own children, not a second render root — see
       ground fact 1's ThemePane portal proof for why a Context above it
       still spans the boundary. */
    <BuilderMarkerContext.Provider value={operatorDisplayName(operator)}>
    <div className="oc-studio" style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100%" /* TASK-327 seam (pre-allowed, one line): was the viewport-unit height — the route layout now carries the shared header + room strip above; the editor fills the body region its parent allocates instead of the whole viewport */, overflow: "hidden", background: "var(--ground)" /* S2: pinned — the ruling landed (S21 dawn table A6): the literal WAS night --ground byte-for-byte, so the pin rides the token; night identical, dawn takes the cartridge's designed ground */ }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "var(--oc-space-4)", padding: "var(--oc-space-4) var(--oc-space-6)",
          background: "var(--puck-color-surface)", borderBottom: "1px solid var(--puck-color-interactive-inverse-active)", flex: "none",
          fontFamily: "var(--font-body)", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", /* S24: the ruling closed — the cartridge's --font-mono carries the stack */ fontWeight: 800, letterSpacing: ".22em", color: "var(--puck-color-text)", fontSize: 13, whiteSpace: "nowrap" }}>
            ■ <i style={{ fontStyle: "normal", color: "var(--oc-gold-text, var(--gold-2))" /* S2: gold law — decorative, reported; S21 dawn twin #8A6410 via token (B3) */ }}>STYLE</i>
          </span>

          {/* page switcher — LEGIBILITY DOCTRINE: solid night panel, full
              ink at 13px on the CLOSED control; options solid-dark too
              (the old rgba pill + #000 options were mid-on-mid) */}
          <select
            value={switcherOptions.includes(slug) ? slug : "home"}
            onChange={(e) => goToPage(e.target.value)}
            style={{ ...pill, fontSize: 13, background: "var(--puck-color-surface-subtle)", color: "var(--puck-color-text)",
              border: "1px solid var(--oc-input-edge, rgba(139,118,196,.45))", paddingRight: "var(--oc-space-4)", cursor: "pointer" }}
            title="Switch page"
          >
            {switcherOptions.map((p) => <option key={p} value={p} style={{ background: "var(--puck-color-surface-subtle)", color: "var(--puck-color-text)" }}>{p === "practice" ? "✎ practice (sandbox)" : p}</option>)}
          </select>
          {/* STUDIO P1: page management lives in the pages panel now (create /
              rename / duplicate / delete / reorder) — no more window.prompt */}
          <button
            onClick={() => { setShowPages((v) => !v); setShowPopups(false); /* one popover at a time (gate 0018.05.25 a₿) */ }}
            title="pages — create, rename, duplicate, delete, reorder"
            style={{ ...pill, background: showPages ? "var(--oc-gold-active-bg, rgba(217,178,78,.18))" : "var(--puck-color-interactive-neutral-hover)", color: showPages ? "var(--oc-gold-text, var(--gold-2))" /* S2: gold law — decorative, reported; S21 dawn twins via tokens (B3/E3) */ : "var(--puck-color-text)" }}
          >▤ pages</button>
          {/* STUDIO P2: the popup registry's room — same popover idiom */}
          <button
            onClick={() => { setShowPopups((v) => !v); setShowPages(false); /* one popover at a time (gate 0018.05.25 a₿) */ }}
            title="popups — create, edit when/where they show, delete"
            style={{ ...pill, background: showPopups ? "var(--oc-gold-active-bg, rgba(217,178,78,.18))" : "var(--puck-color-interactive-neutral-hover)", color: showPopups ? "var(--oc-gold-text, var(--gold-2))" /* S2: gold law — decorative, reported; S21 dawn twins via tokens (B3/E3) */ : "var(--puck-color-text)" }}
          >◱ popups</button>

          <button
            onClick={() => { void goBrandBoard(); }}
            title="the brand board — palette, type ladder, gradients, both skins"
            style={{ ...pill, background: "var(--puck-color-interactive-neutral-hover)", color: "var(--puck-color-text)" }}
          >🎨 Brand</button>
          <button
            onClick={() => setShowFindings((v) => !v)}
            title="brand guidelines — checked as you edit"
            style={{ ...pill,
              background: errCount ? "var(--oc-err-pill-bg, rgba(231,137,158,.18))" : findings.length ? "var(--oc-warn-pill-bg, rgba(235,203,119,.15))" : "var(--oc-ok-pill-bg, rgba(127,185,143,.14))",
              color: errCount ? "var(--err)" /* S2: pinned — the ruling landed (S21 dawn table B2): the literal WAS night --err byte-for-byte; the token flips to the cartridge's dawn #A34E6C */ : findings.length ? "var(--oc-warn-text, var(--gold-2))" /* S2: gold law — decorative, reported; S21 dawn twin var(--warn) (F2) */ : "var(--oc-ok-text, var(--ok-soft))" /* S21 dawn twin var(--ok) (B4/F3) */ }}
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
            style={{ ...pill, background: matrix ? "var(--oc-gold-active-bg, rgba(217,178,78,.18))" : "var(--puck-color-interactive-neutral-hover)", color: matrix ? "var(--oc-gold-text, var(--gold-2))" /* S2: gold law — decorative, reported; S21 dawn twins via tokens (B3/E3) */ : "var(--puck-color-text)" }}
          >▦ matrix</button>
          <button onClick={zen} title="fold every panel — just the site" style={{ ...pill, background: "var(--puck-color-interactive-neutral-hover)", color: "var(--puck-color-text)" }}>⛶ zen</button>

          <span style={{ flex: 1 }} />
          <PresenceChips client={presence} />

          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--puck-color-text-muted)", whiteSpace: "nowrap" }}>
            {live === "publishing" ? "publishing…"
              : live === "error" ? <span style={{ color: "var(--err)" /* S2: pinned — the ruling landed (S21 dawn table B2): the literal WAS night --err byte-for-byte; the token flips at dawn */ }}>{heldNote ?? "publish didn't go through — try again"}</span>
              : dirty ? (draftSaved ? "● draft saved · not live" : "editing…")
              : live === "live" ? (
                <a href={liveUrl} target="_blank" rel="noreferrer" style={{ color: "var(--oc-ok-text, var(--ok-soft))" /* S21 dawn twin var(--ok) (B4) */, textDecoration: "none" }}>
                  ● live at {liveUrl} ↗
                </a>
              ) : "● draft"}
          </span>
          <button onClick={() => setPreview(true)} style={{ ...pill, background: `linear-gradient(135deg, var(--gold-2), var(--gold, #D9B24E))`, color: "var(--gold-ink)" /* S2: gold law — decorative, reported; S33 family 6: the deep end rides --gold (was --gold-deep via GOLD) — night byte-value-identical (#D9B24E either way); at dawn the designed deep gold left the gold ink a hair under the bar (4.22). The D2-ruled publish button keeps GOLD untouched */ }} title="look before it goes live — what's on the site now vs your draft, in both skins; publishing lives there">Preview & publish</button>
        </div>

        {/* ══ panes: library · canvas · style · Number One ══ */}
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <Panel k="lib" side="left" label="Library" width={230} collapsed={collapsed} wideChrome={wideChrome} onToggle={togglePanel}>
            <div style={{ flex: 1, overflowY: "auto", paddingTop: 30 }}>
              {/* SEARCH INSERT: type to filter the library; matches render
                  as a flat draggable Drawer, the stock view hides (display
                  none keeps Puck.Components mounted) */}
              <div style={{ padding: "var(--oc-space-1) var(--oc-space-5) var(--oc-space-4)" }}>
                <input
                  value={libQuery}
                  onChange={(e) => setLibQuery(e.target.value)}
                  placeholder="What would you like to insert?"
                  aria-label="search blocks to insert"
                  title="search blocks to insert"
                  style={{ width: "100%", boxSizing: "border-box", background: "var(--puck-color-surface-subtle)",
                    color: "var(--puck-color-text)", border: "1px solid var(--oc-input-edge, rgba(139,118,196,.45))",
                    borderRadius: 8, padding: "var(--oc-density-small-pad-y) var(--oc-space-5)", fontSize: 13, fontFamily: "var(--font-body)" }}
                />
              </div>
              {libQuery.trim() !== "" && <SearchDrawer query={libQuery} config={config} />}
              <div style={{ display: libQuery.trim() !== "" ? "none" : undefined }}>
                <Puck.Components />
              </div>
              <Puck.Outline />
            </div>
          </Panel>

          <div style={{ flex: 1, minWidth: 0, overflow: "hidden", background: "var(--studio-mat)", display: "flex", flexDirection: "column" }}>
            {matrix && (
              <div style={{ flex: "none", padding: "var(--oc-space-5) var(--oc-space-6) var(--oc-space-0)" }}>
                <ArtboardRail tokens={tokens} height={320} log={changelog} />
              </div>
            )}
            <CanvasArea columnRef={canvasColRef} />
          </div>

          <Panel k="fields" side="right" label="Style" width={280} collapsed={collapsed} wideChrome={wideChrome} onToggle={togglePanel}>
            <div style={{ flex: 1, overflowY: "auto", paddingTop: 30 }}>
              <Puck.Fields />
            </div>
          </Panel>

          <Panel k="cop" side="right" label="Number One" width={300} collapsed={collapsed} wideChrome={wideChrome} onToggle={togglePanel}>
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

      {/* the pages panel (STUDIO P1) — doesn't need Puck's store, so it
          floats beside the preview overlay, fixed-position like findings */}
      {showPages && (
        <PagesPanel
          slug={slug}
          pages={pages}
          order={pageOrder}
          storeReady={pagesReady}
          refresh={refreshPages}
          flushDraft={flushDraft}
          onClose={() => setShowPages(false)}
        />
      )}
      {showPopups && (
        <PopupsPanel
          pages={pages}
          popups={popupTriggers}
          storeReady={pagesReady}
          refresh={refreshPages}
          onClose={() => setShowPopups(false)}
        />
      )}

      {/* both-skins preview overlay (TASK-233): Live → Draft before/after
          per theme. Each pane is a ThemePane — a real nested document whose
          root wears the production theme attribute, so the cartridge's own
          html[data-oc-theme] rules paint it (no twin selector list here).
          The Live half is the store's published copy, re-read on open; the
          Draft half is the working data — what publishing changes. */}
      {preview && (
        <div className="oc-preview-shell">
          <div className="oc-preview-bar">
            <strong style={{ fontSize: 13 }}>Look before you publish — live now vs your draft, both skins</strong>
            <span style={{ flex: 1 }} />
          <PresenceChips client={presence} />
            <button onClick={publishAll} style={{ ...pill, background: "var(--oc-gold-active-bg, rgba(217,178,78,.18))", color: "var(--oc-gold-text, var(--gold-2))" /* S2: gold law — decorative, reported; S21 dawn twins via tokens (B3/E3) */ }} title="publish every page to the live site — each page is checked against your brand guidelines first; a page that doesn't pass stays a draft">Publish every page</button>
            <button onClick={publishLive} style={{ ...pill, background: GOLD, color: "#fff" /* D2 RULED (0018.06.01): white ink on gold stands in BOTH themes — the money-button brand moment; do not "fix" */ }} title="put this page on the live site (the brand guidelines check it first — the draft is never lost)">Publish this page</button>
            <button onClick={() => setPreview(false)} style={{ ...pill, background: "rgba(139,118,196,.22)", color: "var(--puck-color-text)" }}>← Back to editing</button>
          </div>
          <div className="oc-preview-panes">
            <ThemePane theme="light" label="Light" config={config} draft={liveData} live={liveDoc} liveKnown={liveKnown} />
            <ThemePane theme="dark" label="Dark" config={config} draft={liveData} live={liveDoc} liveKnown={liveKnown} />
          </div>
        </div>
      )}
    </div>
    </BuilderMarkerContext.Provider>
  );
}

/* ── TASK-233: one theme pane of the preview overlay. The pane is a REAL
   nested document (a srcdoc iframe) whose root carries the same theme
   attributes the live site's <html> carries — data-oc-theme="light" for
   the light pane, nothing for the dark one (the cartridge is dark-first),
   plus the host's font classes and cartridge pick. The cartridge's own
   html[data-oc-theme="light"] rules (and every descendant repaint, and the
   palette's dawn layer) then paint the pane DIRECTLY: the pane DERIVES
   from production truth instead of riding the old .oc-pv-light twin
   selector list, which only ever carried the token blocks and silently
   skipped the section repaints. The host document's styles are mirrored
   in (the same trick Puck's canvas iframe plays), kept in sync while the
   overlay is open. */
const PV_MIRROR = "data-oc-pv-mirror";

function mirrorHostStyles(doc: Document) {
  const sources = Array.from(document.head.querySelectorAll("style, link[rel='stylesheet']"));
  const seen = new Set<number>();
  sources.forEach((el, i) => {
    seen.add(i);
    const kind = el instanceof HTMLStyleElement ? "style" : "link";
    let mirror = doc.head.querySelector(`[${PV_MIRROR}="${i}"]`) as HTMLElement | null;
    if (mirror && mirror.getAttribute(`${PV_MIRROR}-kind`) !== kind) { mirror.remove(); mirror = null; }
    if (kind === "style") {
      if (!mirror) {
        mirror = doc.createElement("style");
        mirror.setAttribute(PV_MIRROR, String(i));
        mirror.setAttribute(`${PV_MIRROR}-kind`, "style");
        doc.head.appendChild(mirror);
      }
      if (mirror.textContent !== el.textContent) mirror.textContent = el.textContent;
    } else if (!mirror) {
      /* clone the link itself (href = the RESOLVED absolute URL): it
         re-fetches from the HTTP cache, and relative urls inside the sheet
         (next/font's ../media/*.woff2) resolve against the sheet's own
         URL — inlining the cssText would strand them against the srcdoc
         document's base */
      const link = doc.createElement("link");
      link.rel = "stylesheet";
      link.href = (el as HTMLLinkElement).href;
      link.setAttribute(PV_MIRROR, String(i));
      link.setAttribute(`${PV_MIRROR}-kind`, "link");
      mirror = link;
      doc.head.appendChild(mirror);
    }
  });
  /* drop mirrors whose source vanished (HMR swaps), then re-append in the
     host's order so the cascade matches byte for byte */
  Array.from(doc.head.querySelectorAll(`[${PV_MIRROR}]`)).forEach((m) => {
    if (!seen.has(Number(m.getAttribute(PV_MIRROR)))) m.remove();
  });
  sources.forEach((_, i) => {
    const m = doc.head.querySelector(`[${PV_MIRROR}="${i}"]`);
    if (m) doc.head.appendChild(m);
  });
}

function ThemePane({ theme, label, config, draft, live, liveKnown }: {
  theme: "light" | "dark";
  label: string;
  config: Config;
  draft: Data;
  live: Data | null;
  liveKnown: boolean;
}) {
  const observerRef = useRef<MutationObserver | null>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  useEffect(() => () => observerRef.current?.disconnect(), []);

  /* onLoad (a React prop, attached at commit — no race) rather than an
     effect: a fresh iframe's initial about:blank already reads
     readyState "complete", so an effect-side check can stamp the WRONG
     document moments before the srcdoc navigation replaces it. The
     #oc-pv-root guard makes the real document the only one we touch. */
  function onFrameLoad(e: React.SyntheticEvent<HTMLIFrameElement>) {
    const doc = e.currentTarget.contentDocument;
    if (!doc || !doc.getElementById("oc-pv-root")) return;
    /* stamp the frame's root with the production theme chain BEFORE the
       content portals in — the first paint is already the pane's theme */
    doc.documentElement.className = document.documentElement.className;
    const cartridge = document.documentElement.getAttribute("data-oc-cartridge");
    if (cartridge) doc.documentElement.setAttribute("data-oc-cartridge", cartridge);
    if (theme === "light") doc.documentElement.setAttribute("data-oc-theme", "light");
    mirrorHostStyles(doc);
    observerRef.current?.disconnect();
    observerRef.current = new MutationObserver(() => mirrorHostStyles(doc));
    observerRef.current.observe(document.head, { childList: true, characterData: true, subtree: true });
    setMount(doc.getElementById("oc-pv-root"));
  }

  /* in-frame furniture: the Live/Draft chips. Pinned near-solid night +
     gold ink like the J1-ruled pane label above — they float over one
     always-dawn or always-night render and can never theme-flip cleanly */
  const stateChip: React.CSSProperties = {
    position: "sticky", top: 0, zIndex: 2, padding: "6px 12px",
    fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 700,
    background: "rgba(20, 16, 33, 0.85)", color: "var(--gold)", backdropFilter: "blur(4px)",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  };
  const emptyNote: React.CSSProperties = {
    padding: "28px 22px", fontSize: 14, lineHeight: 1.5,
    color: "var(--muted)", fontFamily: "var(--font-body)",
  };

  return (
    <div className="oc-preview-pane">
      <div className="oc-pv-label">{label}</div>
      <iframe
        onLoad={onFrameLoad}
        title={`${label} — live now vs your draft`}
        srcDoc='<!DOCTYPE html><html><head></head><body><div id="oc-pv-root"></div></body></html>'
        style={{ flex: 1, width: "100%", minHeight: 0, border: 0, display: "block" }}
      />
      {mount && createPortal(
        <div style={{ paddingBottom: 60 }}>
          <div style={stateChip}>Live on the site now</div>
          {!liveKnown ? (
            <p style={emptyNote}>— the live copy couldn&rsquo;t be read just now; your draft below is still safe.</p>
          ) : live === null ? (
            <p style={emptyNote}>— this page has never been published. Publishing puts it on the site for the first time.</p>
          ) : (
            /* <main> — the exact wrapper the published route gives Render
               (src/app/p/[slug]/page.tsx), so the cartridge's
               html[data-oc-theme] main section repaints match here too */
            <main><Render config={config} data={live} /></main>
          )}
          <div style={stateChip}>Your draft — what &ldquo;Publish this page&rdquo; puts live</div>
          <main><Render config={config} data={draft} /></main>
        </div>,
        mount,
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
  /* hand the apply fn up AFTER commit (the refs law: no ref writes during
     render) — its only reader is the copilot's onApply gesture, post-commit */
  useEffect(() => { applyRef.current = apply; });
  return null;
}

const usePuckStore = createUsePuck();

/* undo / redo riding Puck's own history (hotkeys ctrl+Z / shift+Z already work) */
function UndoRedoPills({ pill }: { pill: React.CSSProperties }) {
  const history = usePuckStore((s) => s.history);
  const dim = (on: boolean): React.CSSProperties => ({
    ...pill,
    background: "var(--puck-color-interactive-neutral-hover)", /* rgba(139,118,196,.2) — puck-theme holds it verbatim */
    color: on ? "var(--puck-color-text)" : "var(--puck-color-text-disabled)",
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
      background: "var(--puck-color-surface-muted)", border: "1px solid var(--oc-toast-edge, rgba(235,203,119,.5))", borderRadius: 10,
      padding: "var(--oc-density-small-pad-y) var(--oc-space-7)", fontSize: 12.5, color: "var(--oc-gold-text, var(--gold-2))" /* S2: gold law — decorative, reported; S21 dawn twins via tokens (B3/E5) */,
      fontFamily: "var(--font-body)", boxShadow: "var(--oc-toast-shadow, 0 8px 24px rgba(0,0,0,.4))" }}>
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
   <Puck> — Drawer.Item rides the editor's drag context. The config arrives
   by prop (TASK-97 prop-lift) — no module-level brand import. */
function SearchDrawer({ query, config }: { query: string; config: Config }) {
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
      <p style={{ padding: "var(--oc-space-2) var(--oc-space-6) var(--oc-space-5)", fontSize: 12.5, color: "var(--puck-color-text-muted)", fontFamily: "var(--font-body)" }}>
        no blocks match &ldquo;{query.trim()}&rdquo;
      </p>
    );
  }
  return (
    <div style={{ padding: "var(--oc-space-0) var(--oc-space-5) var(--oc-space-5)" }}>
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
      zIndex: 1090, width: 480, maxWidth: "calc(100vw - var(--oc-space-11))", maxHeight: "50vh", overflowY: "auto",
      background: "var(--puck-color-surface)", border: "1px solid var(--oc-popover-edge, rgba(139,118,196,.4))", borderRadius: 14,
      padding: "var(--oc-space-6) var(--oc-space-7)", boxShadow: "var(--oc-popover-shadow, 0 16px 44px rgba(0,0,0,.55))", fontFamily: "var(--font-body)" }}>
      <style>{`.oc-finding-row[data-focusable="1"]:hover{background:var(--puck-color-interactive-subtle);border-radius:8px}`}</style>
      <div style={{ fontSize: "var(--oc-density-small-font)", fontWeight: 700, color: "var(--puck-color-text)", marginBottom: "var(--oc-space-4)" }}>
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
            style={{ display: "flex", gap: "var(--oc-space-4)", padding: "var(--oc-space-3) var(--oc-space-2)",
              borderTop: "1px solid rgba(139,118,196,.15)", fontSize: "var(--oc-density-small-font)", lineHeight: 1.45,
              cursor: focusable ? "pointer" : "default", alignItems: "flex-start" }}
          >
            <span style={{ flex: "none", fontWeight: 800, color: f.severity === "error" ? "var(--err)" /* S2: pinned — the ruling landed (S21 dawn table B2): the literal WAS night --err byte-for-byte; the token flips at dawn */ : "var(--oc-gold-text, var(--gold-2))" /* S2: gold law — decorative, reported; S21 dawn twin #8A6410 via token (B3) */ }}>
              {f.severity === "error" ? "✕" : "⚠"}
            </span>
            <span style={{ color: "var(--puck-color-text-secondary)", flex: 1 }}>
              {f.blockType && <b style={{ color: "var(--puck-color-text)" }}>{f.blockType}: </b>}{f.message}
            </span>
            {focusable && (
              <span aria-hidden style={{ flex: "none", color: "var(--puck-color-text-muted)", fontWeight: 800 }}>›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* one side panel: content when open, slim vertical tab when collapsed —
   MODULE-LEVEL so re-renders never remount children (the alt-box focus-
   stutter: an inline component remounts on every keystroke) */
function Panel({ k, side, label, width, children, collapsed, wideChrome, onToggle }: {
  k: PanelKey; side: "left" | "right"; label: string; width: number; children: React.ReactNode;
  collapsed: Record<PanelKey, boolean>; wideChrome: boolean; onToggle: (k: PanelKey) => void;
}) {
    const isOpen = !collapsed[k];
    /* narrow chrome: right-side panels float over the canvas so the page
       keeps its width (the Admiral's portrait-monitor law) */
    const overlay = !wideChrome && side === "right" && isOpen;
    return (
      <div style={{
        width: isOpen && !overlay ? width : 30, flex: "none", display: "flex", flexDirection: "column",
        background: "var(--puck-color-surface)", minWidth: 0, position: "relative", transition: "width .2s ease",
        borderLeft: side === "right" ? "1px solid var(--puck-color-highlight)" : "none",
        borderRight: side === "left" ? "1px solid var(--puck-color-highlight)" : "none",
      }}>
        {overlay && (
          <div style={{ position: "absolute", right: 30, top: 0, bottom: 0, width,
            zIndex: 30, background: "var(--puck-color-surface)", display: "flex", flexDirection: "column",
            borderLeft: "1px solid var(--oc-structural-edge, var(--glass-night-edge))" /* S22 — a D9 application (the site was never a table row, but the value+role IS the D9 rung: lav .35 structural edge → matched .45 at dawn); the S18 night pin stands as the fallback */, boxShadow: "var(--oc-drawer-shadow, -14px 0 34px rgba(0,0,0,.45))" }}>
            {children}
          </div>
        )}
        <button
          onClick={() => onToggle(k)}
          title={isOpen ? `collapse ${label}` : `open ${label}`}
          data-oc-panel-tab={k}
          style={{ position: "absolute", top: "var(--oc-space-4)", right: isOpen ? "var(--oc-space-3)" : 5, zIndex: 6, width: 18, height: 18,
            borderRadius: 5, border: "1px solid var(--puck-color-interactive-inverse-active)", background: "var(--puck-color-surface-subtle)",
            color: "var(--puck-color-text-muted)", fontSize: "var(--oc-density-tiny-font)", lineHeight: 1, cursor: "pointer", padding: "var(--oc-space-0)" }}
        >
          {isOpen ? (side === "left" ? "«" : "»") : (side === "left" ? "»" : "«")}
        </button>
        {isOpen && !overlay ? children : !isOpen ? (
          <button onClick={() => onToggle(k)}
            style={{ background: "none", border: "none", cursor: "pointer", marginTop: 44,
              writingMode: "vertical-rl", fontFamily: "var(--font-mono)", fontSize: "var(--oc-density-tiny-font)", letterSpacing: ".3em",
              color: "var(--puck-color-text-muted)", textTransform: "uppercase", padding: "var(--oc-space-0)" }}>
            {label}
          </button>
        ) : null}
      </div>
    );
  }
