"use client";

import { useEffect, useRef, useState } from "react";
import { field, Sheet } from "@/components/console/glass";
import Button from "@/components/kit/Button";
import Card from "@/components/kit/Card";
import { PAGE_CATALOG, buildDefaultMenu, buildMenu, type MenuItem } from "@/components/NavMenu";
import type { NavChild, NavItem, SiteConfig } from "@/lib/site-config";
import { addPage, addTab, canPlaceUnder, isOpenNavHref, moveRowTo, slotToPlace, type PlaceRef, type RowRef } from "@/lib/nav-edit";

/**
 * NAV EDITOR (TASK-137; rebuilt T-615, round 2 of Love's menu desk).
 *
 * "We are missing the ability to configure the navigation ... The user
 * shouldn't need an AI to set this up" (the Admiral). Round 2 drawing: one
 * card per tab, one row per page, a grip on every row. A row drags into ANY
 * tab, or out to become a tab; every row also has ONE Change control that
 * opens a small sheet (name, where it sits, its place there, take it off the
 * menu) - the sheet is the way on a phone, where a drag does not exist. The
 * three room buttons (Add a page, Start over, Save) are plain round buttons
 * in one row at the TOP, one size and one style with every button below.
 * A live copy of the real bar follows each move. Every move runs through
 * the pure helpers in lib/nav-edit.ts (moveRowTo, slotToPlace). Every change
 * saves itself a moment later (debounced), with a status line at the top;
 * Save stays as a manual retry. Start over asks first (two steps).
 *
 * Switches still win: a page whose feature is OFF renders greyed here with
 * "Hidden on the site: the X switch is off" and never renders public -
 * buildMenu applies the exact same filter on the live site.
 *
 * Self-contained (own fetch/save) under /a/site/menu.
 */

const FEATURE_LABELS: Record<keyof SiteConfig["features"], string> = {
  community: "Community",
  classes: "Classes",
  store: "Store",
  sessions: "Sessions",
  cuts: "ConsciousCuts",
  jars: "Tip jars",
  news: "News & letters",
  // TASK-187 (minimal forced edit — load-bearing: PAGE_CATALOG now carries
  // a `memberships` row and this file's own Record type would fail to
  // compile without it): the label the "hidden by the X switch" note wears.
  memberships: "Memberships",
  // TASK-393 (minimal forced edit — load-bearing, the same shape as the
  // memberships line above): Record<keyof SiteConfig["features"], string>
  // must stay exhaustive, so adding site-config.ts's largeSums member
  // forces a line here too — largeSums gates an OFFER inside home/
  // packages, not a nav route, so no PAGE_CATALOG entry ever names it
  // and featuresFor() below never surfaces this label in practice.
  largeSums: "Large Sums of Money",
  // TASK-518 (minimal forced edit — load-bearing, the same shape as the
  // memberships/largeSums lines above): the total Record fails tsc without
  // a label for site-config.ts's new purchaseLoveNotify member — it gates
  // a letter, not a nav route, so no PAGE_CATALOG entry ever names it and
  // featuresFor() never surfaces this label in practice.
  purchaseLoveNotify: "Purchase letters to Love",
  // T-541a (forced edit, same shape as above): gates routes, not a nav page.
  subscriptions: "Monthly memberships (recurring billing)",
};

/** TASK-187: a route may need more than one switch ON now (PAGE_CATALOG's
    `feature` can be one or several); this editor only reads the list, same
    as buildMenu's own featuresForHref. */
function featuresFor(href: string | undefined): (keyof SiteConfig["features"])[] {
  const f = PAGE_CATALOG.find((p) => p.href === href)?.feature;
  if (!f) return [];
  return Array.isArray(f) ? f : [f];
}

/** hidden-by note, or null when the page is on (or switch-free) */
function hiddenNote(features: SiteConfig["features"], href: string | undefined): string | null {
  const off = featuresFor(href).filter((f) => !features[f]);
  if (off.length === 0) return null;
  return `hidden by the ${off.map((f) => FEATURE_LABELS[f]).join(" + ")} switch${off.length > 1 ? "es" : ""}`;
}

/** A row's own "is this actually hidden on the live site" note — mirrors
    buildMenu()'s rule exactly (NavMenu.tsx): a LEAF is gated by its own
    href, a HEADER (non-empty children) is gated by whether EVERY child is
    hidden — never by its own href. Without this split, "Community" (href
    /classes, gated by `classes`) would read as hidden here even though it
    always survives publicly on Free meditation + 11:11 alone. */
function rowHidden(features: SiteConfig["features"], item: NavItem): string | null {
  const children = item.children ?? [];
  if (children.length === 0) return hiddenNote(features, item.href);
  return children.every((c) => hiddenNote(features, c.href) !== null)
    ? "hidden: every page under it is off"
    : null;
}

function menuToNav(menu: MenuItem[]): NavItem[] {
  return menu.map((m) => ({
    id: m.href,
    label: m.label,
    href: m.href,
    ...(m.subs && m.subs.length
      ? { children: m.subs.map((s): NavChild => ({ id: s.href, label: s.label, href: s.href })) }
      : {}),
  }));
}

function labelFor(href: string): string {
  return PAGE_CATALOG.find((p) => p.href === href)?.label ?? href;
}

type Status = "idle" | "saving" | "saved" | "failed";

/** a row as the editor draws it: its place, its words, what it holds */
interface RowView {
  at: RowRef;
  label: string;
  href?: string;
  /** child rows under a tab (empty for a child or a single page) */
  kids: number;
}

function viewAt(rows: NavItem[], at: RowRef): RowView | null {
  if (at.parent === null) {
    const r = rows[at.index];
    return r ? { at, label: r.label, href: r.href, kids: r.children?.length ?? 0 } : null;
  }
  const c = rows[at.parent]?.children?.[at.index];
  return c ? { at, label: c.label, href: c.href, kids: 0 } : null;
}

function renameAt(rows: NavItem[], at: RowRef, label: string): NavItem[] {
  const next = rows.slice();
  if (at.parent === null) {
    if (!next[at.index]) return rows;
    next[at.index] = { ...next[at.index], label };
    return next;
  }
  const header = next[at.parent];
  const kids = (header?.children ?? []).slice();
  if (!kids[at.index]) return rows;
  kids[at.index] = { ...kids[at.index], label };
  next[at.parent] = { ...header, children: kids };
  return next;
}

function removeAt(rows: NavItem[], at: RowRef): NavItem[] {
  if (at.parent === null) return rows.filter((_, i) => i !== at.index);
  const next = rows.slice();
  const header = next[at.parent];
  const kids = (header.children ?? []).filter((_, i) => i !== at.index);
  if (kids.length > 0) next[at.parent] = { ...header, children: kids };
  else if (header.href) {
    const { children: gone, ...bare } = header;
    void gone;
    next[at.parent] = bare;
  } else return rows.filter((_, i) => i !== at.parent);
  return next;
}

/** the rows already on the menu, as hrefs, so "Add a page" offers the rest */
function hrefsOnMenu(rows: NavItem[]): Set<string> {
  const out = new Set<string>();
  for (const r of rows) {
    if (r.href) out.add(r.href);
    for (const c of r.children ?? []) out.add(c.href);
  }
  return out;
}

/** the plain-words line under a greyed row (no dash, no arrow) */
function hiddenLine(note: string): string {
  if (!note.startsWith("hidden by the ")) return "Hidden on the site: every page under it is off";
  const what = note.slice("hidden by the ".length);
  return `Hidden on the site: the ${what} ${what.endsWith("switches") ? "are" : "is"} off`;
}

/** the live copy of the real bar: exactly what buildMenu would show the
    public for these rows and these switches. A tab opens to show its pages. */
function BarPreview({ config, rows }: { config: SiteConfig; rows: NavItem[] }) {
  const menu: MenuItem[] = buildMenu({ ...config, nav: { items: rows } });
  const [open, setOpen] = useState<string | null>(null);
  const shown = menu.find((m) => m.label === open && m.subs) ?? menu.find((m) => m.subs) ?? null;
  return (
    <div className="menued-preview" aria-label="How the top of the site looks">
      <div className="menued-preview-bar">
        {menu.map((m) => (
          <Button
            key={m.label}
            variant="quiet"
            className="menued-preview-tab"
            aria-pressed={shown?.label === m.label}
            onClick={() => setOpen(m.label)}
          >
            {m.label}
          </Button>
        ))}
      </div>
      {shown?.subs && (
        <div className="menued-preview-subs">
          {shown.subs.map((s) => (
            <span key={s.href + s.label}>{s.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** the Change sheet: name, where it sits, its place there, take it off */
function ChangeSheet({
  rows, view, onClose, onApply, onRemove,
}: {
  rows: NavItem[];
  view: RowView;
  onClose: () => void;
  onApply: (name: string, place: PlaceRef) => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(view.label);
  const [where, setWhere] = useState<number | null>(view.at.parent);
  // "Its place there": a final index in the chosen level, counted without this row
  const [pos, setPos] = useState<number>(view.at.index);
  const places = rows
    .map((r, i) => ({ r, i }))
    .filter(({ i }) => canPlaceUnder(rows, view.at, i));
  const level: { label: string }[] = (where === null ? rows : rows[where]?.children ?? [])
    .filter((_, idx) => !(where === view.at.parent && idx === view.at.index))
    .map((x) => ({ label: x.label }));
  const posIndex = Math.min(pos, level.length);
  return (
    <Sheet open onClose={onClose} maxWidth={400}>
      <div className="menued-sheet">
        <p className="menued-label">The menu</p>
        <h2>{view.label}</h2>
        <label htmlFor="menued-name">Name on the menu</label>
        <input id="menued-name" className="console-field" style={field} value={name} maxLength={60}
          onChange={(e) => setName(e.target.value)} />
        <label htmlFor="menued-where">Where it sits</label>
        <select id="menued-where" className="console-field" style={field}
          value={where === null ? "top" : String(where)}
          onChange={(e) => { setWhere(e.target.value === "top" ? null : Number(e.target.value)); setPos(99); }}>
          <option value="top">A tab of its own</option>
          {places.map(({ r, i }) => (
            <option key={r.id + i} value={i}>Under {r.label}</option>
          ))}
        </select>
        <label htmlFor="menued-place">Its place there</label>
        <select id="menued-place" className="console-field" style={field} value={posIndex}
          onChange={(e) => setPos(Number(e.target.value))}>
          <option value={0}>First</option>
          {level.map((x, k) => (
            <option key={k} value={k + 1}>{k + 1 === level.length ? `Last, after ${x.label}` : `After ${x.label}`}</option>
          ))}
        </select>
        <Button variant="second" className="kit-pill" onClick={() => onApply(name.trim() || view.label, { parent: where, index: posIndex })}>Done</Button>
        <Button variant="second" className="kit-pill" onClick={onRemove}>Take it off the menu</Button>
        <Button variant="second" className="kit-pill" onClick={onClose}>Never mind</Button>
      </div>
    </Sheet>
  );
}


/** the Tab sheet: a column's name, the page it opens, its place among the tabs */
function TabSheet({
  rows, index, onClose, onApply, onRemove,
}: {
  rows: NavItem[];
  index: number;
  onClose: () => void;
  onApply: (name: string, href: string, pos: number) => void;
  onRemove: () => void;
}) {
  const tab = rows[index];
  const [name, setName] = useState(tab.label);
  const [href, setHref] = useState(tab.href ?? "");
  const [pos, setPos] = useState(index);
  const others = rows.filter((_, i) => i !== index);
  return (
    <Sheet open onClose={onClose} maxWidth={400}>
      <div className="menued-sheet">
        <p className="menued-label">The tab</p>
        <h2>{tab.label}</h2>
        <label htmlFor="menub-tname">Name on the menu</label>
        <input id="menub-tname" className="console-field" style={field} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="menub-topens">The page it opens</label>
        <select id="menub-topens" className="console-field" style={field} value={href} onChange={(e) => setHref(e.target.value)}>
          <option value="">None, a heading only</option>
          {PAGE_CATALOG.map((p) => (<option key={p.href} value={p.href}>{p.label}</option>))}
        </select>
        <label htmlFor="menub-tplace">Its place among the tabs</label>
        <select id="menub-tplace" className="console-field" style={field} value={pos} onChange={(e) => setPos(Number(e.target.value))}>
          <option value={0}>First</option>
          {others.map((x, k) => (
            <option key={k} value={k + 1}>{k + 1 === others.length ? `Last, after ${x.label}` : `After ${x.label}`}</option>
          ))}
        </select>
        <Button variant="second" className="kit-pill" onClick={() => onApply(name.trim() || tab.label, href, pos)}>Done</Button>
        <Button variant="second" className="kit-pill" onClick={onRemove}>Take the tab off the menu</Button>
        <Button variant="second" className="kit-pill" onClick={onClose}>Never mind</Button>
      </div>
    </Sheet>
  );
}

/** Add a tab: its name, and optionally the page it opens (none = a heading only) */
function AddTabSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string, href: string) => void }) {
  const [name, setName] = useState("");
  const [href, setHref] = useState("");
  return (
    <Sheet open onClose={onClose} maxWidth={400}>
      <div className="menued-sheet">
        <p className="menued-label">The menu</p>
        <h2>Add a tab</h2>
        <label htmlFor="menub-newtab">Name of the tab</label>
        <input id="menub-newtab" className="console-field" style={field} value={name} maxLength={60} placeholder="For example, Gifts" onChange={(e) => setName(e.target.value)} />
        <label htmlFor="menub-newopens">The page it opens (optional)</label>
        <select id="menub-newopens" className="console-field" style={field} value={href} onChange={(e) => setHref(e.target.value)}>
          <option value="">None, a heading only</option>
          {PAGE_CATALOG.map((p) => (<option key={p.href} value={p.href}>{p.label}</option>))}
        </select>
        <p>The new tab lands at the end of the bar. A heading only opens nothing: drag pages into it, and it shows on the site once it holds one.</p>
        <Button variant="second" className="kit-pill" disabled={!name.trim()} onClick={() => onAdd(name, href)}>Add the tab</Button>
        <Button variant="second" className="kit-pill" onClick={onClose}>Never mind</Button>
      </div>
    </Sheet>
  );
}

/** Add a page: a page of this site, or ANY link (another site, or a page coming later) */
function AddPageSheet({
  rows, offered, onClose, onAdd,
}: {
  rows: NavItem[];
  offered: typeof PAGE_CATALOG;
  onClose: () => void;
  onAdd: (name: string, href: string, parent: number | null) => void;
}) {
  const [mode, setMode] = useState<"site" | "link">("site");
  const [href, setHref] = useState(offered[0]?.href ?? "");
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [parent, setParent] = useState<number | null>(null);
  const linkOk = isOpenNavHref(link.trim());
  const ready = mode === "site" ? !!href : !!name.trim() && linkOk;
  return (
    <Sheet open onClose={onClose} maxWidth={400}>
      <div className="menued-sheet">
        <p className="menued-label">The menu</p>
        <h2>Add a page</h2>
        <div className="menub-choice" role="group" aria-label="What kind of page">
          <Button variant="second" className="kit-pill" aria-pressed={mode === "site"} onClick={() => setMode("site")}>A page on the site</Button>
          <Button variant="second" className="kit-pill" aria-pressed={mode === "link"} onClick={() => setMode("link")}>Any link</Button>
        </div>
        {mode === "site" ? (
          offered.length === 0 ? (
            <p>Every page of the site is already on the menu. Use Any link for something else.</p>
          ) : (
            <>
              <label htmlFor="menued-add">Page</label>
              <select id="menued-add" className="console-field" style={field} value={href} onChange={(e) => setHref(e.target.value)}>
                {offered.map((p) => (<option key={p.href} value={p.href}>{p.label}</option>))}
              </select>
            </>
          )
        ) : (
          <>
            <label htmlFor="menub-linkname">Name on the menu</label>
            <input id="menub-linkname" className="console-field" style={field} value={name} maxLength={60} placeholder="For example, Love's Travels" onChange={(e) => setName(e.target.value)} />
            <label htmlFor="menub-linkurl">The link</label>
            <input id="menub-linkurl" className="console-field" style={field} value={link} maxLength={300} inputMode="url" placeholder="https://..." onChange={(e) => setLink(e.target.value)} />
            <p data-state={link && !linkOk ? "bad" : "ok"}>
              {link && !linkOk
                ? "That link needs to start with https:// or with a slash, like /travels."
                : "Another site opens in a new tab. A page coming later: type its path, like /travels."}
            </p>
          </>
        )}
        <label htmlFor="menub-where">Where it goes</label>
        <select id="menub-where" className="console-field" style={field} value={parent === null ? "top" : String(parent)}
          onChange={(e) => setParent(e.target.value === "top" ? null : Number(e.target.value))}>
          <option value="top">A tab of its own</option>
          {rows.map((r, i) => (<option key={r.id + i} value={i}>Under {r.label}</option>))}
        </select>
        <Button variant="second" className="kit-pill" disabled={!ready} onClick={() => {
          if (mode === "site") onAdd(labelFor(href), href, parent);
          else onAdd(name, link.trim(), parent);
        }}>Add it</Button>
        <Button variant="second" className="kit-pill" onClick={onClose}>Never mind</Button>
      </div>
    </Sheet>
  );
}

function hostOf(href: string): string {
  try { return new URL(href).host; } catch { return href; }
}

export default function NavEditor() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [rows, setRows] = useState<NavItem[] | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [reason, setReason] = useState<string | null>(null);
  const [sheet, setSheet] = useState<
    | { kind: "change"; at: RowRef }
    | { kind: "tab"; index: number }
    | { kind: "addtab" }
    | { kind: "add" }
    | { kind: "reset" }
    | null
  >(null);

  /* ── auto save: every change schedules one save a moment later; one save
     in flight at a time, the newest rows always win ── */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<NavItem[] | null>(null);
  const inflight = useRef(false);
  const again = useRef(false);

  async function save() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (!latest.current) return;
    if (inflight.current) { again.current = true; return; }
    inflight.current = true;
    setStatus("saving");
    setReason(null);
    const sent = latest.current;
    try {
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nav: { items: sent } }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setConfig(data.config as SiteConfig);
        setStatus("saved");
      } else {
        setReason(data?.reason ?? "the site would not take it");
        setStatus("failed");
      }
    } catch {
      setReason("the connection dropped");
      setStatus("failed");
    } finally {
      inflight.current = false;
      if (again.current) { again.current = false; void save(); }
    }
  }

  /** every edit goes through here: new rows, then a save a moment later */
  function change(next: NavItem[]) {
    setRows(next);
    latest.current = next;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void save(); }, 700);
  }

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/site", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ok) return;
      const c = data.config as SiteConfig;
      setConfig(c);
      setRows(c.nav?.items?.length ? c.nav.items : menuToNav(buildDefaultMenu(c)));
    })();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  /* ── drag (desktop): a grip starts it. A card drops before/after another
     card, or into a column's open area; a column's header takes a tab (or a
     card pulled out into a tab of its own) before/after; dragging a whole
     column by its grip reorders the tabs. The helpers decide what is legal. ── */
  const [dragging, setDragging] = useState<RowRef | null>(null);
  const [drop, setDrop] = useState<{ key: string; mode: "before" | "after" | "into" } | null>(null);

  function overCard(e: React.DragEvent, at: RowRef) {
    if (!dragging || !rows || at.parent === null) return;
    if (!canPlaceUnder(rows, dragging, at.parent)) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0.5;
    setDrop({ key: `c:${at.parent}:${at.index}`, mode: y < 0.5 ? "before" : "after" });
  }
  function overHead(e: React.DragEvent, i: number) {
    if (!dragging) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0.5;
    setDrop({ key: `h:${i}`, mode: x < 0.5 ? "before" : "after" });
  }
  function overBody(e: React.DragEvent, i: number) {
    if (!dragging || !rows || !canPlaceUnder(rows, dragging, i)) return;
    e.preventDefault();
    setDrop({ key: `b:${i}`, mode: "into" });
  }
  function land(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (rows && dragging && drop) {
      const [kind, a, b] = drop.key.split(":");
      let to: PlaceRef | null = null;
      if (kind === "c") to = slotToPlace(dragging, { parent: Number(a), index: Number(b) + (drop.mode === "after" ? 1 : 0) });
      else if (kind === "h") to = slotToPlace(dragging, { parent: null, index: Number(a) + (drop.mode === "after" ? 1 : 0) });
      else if (kind === "b") to = { parent: Number(a), index: rows[Number(a)]?.children?.length ?? 0 };
      if (to) {
        const next = moveRowTo(rows, dragging, to);
        if (next !== rows) change(next);
      }
    }
    setDragging(null);
    setDrop(null);
  }
  function grip(at: RowRef, label: string, what: string) {
    return (
      <span
        className="menued-grip"
        draggable
        aria-hidden="true"
        title={`Drag ${label} to move ${what}`}
        onDragStart={(e) => {
          setDragging(at);
          e.dataTransfer.effectAllowed = "move";
          try {
            e.dataTransfer.setData("text/plain", "menu row");
            const box = (e.currentTarget as HTMLElement).closest("[data-drag-box]");
            if (box) e.dataTransfer.setDragImage(box, 24, 20);
          } catch { /* some drivers deny it; the state knows */ }
        }}
        onDragEnd={() => { setDragging(null); setDrop(null); }}
      >
        ⠿
      </span>
    );
  }

  if (!config || !rows) return <p style={{ fontSize: ".82rem", color: "var(--muted)" }}>reading the menu…</p>;
  const features = config.features;

  const offered = PAGE_CATALOG.filter((p) => !hrefsOnMenu(rows).has(p.href));
  const changeView = sheet?.kind === "change" ? viewAt(rows, sheet.at) : null;

  const statusWords =
    status === "saving" ? "Saving..."
    : status === "saved" ? "Saved. The site shows this menu."
    : status === "failed" ? `Not saved: ${reason ?? "the site would not take it"}. Press Save to try again.`
    : "Every change saves itself.";

  return (
    <div style={{ marginBottom: 12 }}>
      <div className="menued-bar-actions">
        <Button id="menub-addtab" variant="second" className="kit-pill" onClick={() => setSheet({ kind: "addtab" })}>Add a tab</Button>
        <Button id="menub-addpage" variant="second" className="kit-pill" onClick={() => setSheet({ kind: "add" })}>Add a page</Button>
        <Button variant="second" className="kit-pill" onClick={() => setSheet({ kind: "reset" })}>Start over</Button>
        <Button variant="second" className="kit-pill" disabled={status === "saving"} onClick={() => { latest.current = rows; void save(); }}>Save</Button>
      </div>
      <p className="menued-status" data-state={status} role="status" aria-live="polite">{statusWords}</p>

      <p className="menued-label">How it looks</p>
      <BarPreview config={config} rows={rows} />

      <p className="menued-label">Arrange it</p>
      <div className="menub" data-testid="menu-board">
        {rows.map((item, i) => {
          const topNote = rowHidden(features, item);
          const kids = item.children ?? [];
          const dragCol = dragging?.parent === null && dragging.index === i;
          const head = drop?.key === `h:${i}` && !dragCol ? drop.mode : undefined;
          const into = drop?.key === `b:${i}`;
          const sub = topNote ? hiddenLine(topNote)
            : kids.length > 0 ? `${kids.length} page${kids.length === 1 ? "" : "s"} under it`
            : item.href ? "A single page" : "A heading only";
          return (
            <Card key={item.id + i} body={false} data-drag-box="" className={`menub-col${dragCol ? " is-dragging" : ""}${into ? " is-into" : ""}`}
              onDragOver={(e) => overBody(e, i)} onDrop={land}>
              <div className={`menub-head${topNote ? " is-dim" : ""}`} data-drop={head}
                onDragOver={(e) => overHead(e, i)} onDrop={land}>
                {grip({ parent: null, index: i }, item.label, "this tab")}
                <span className="menub-text">
                  <span className="menued-name">{item.label}</span>
                  <span className="menued-sub">{sub}</span>
                </span>
                <Button variant="second" className="kit-pill" aria-label={`Change the ${item.label} tab`} onClick={() => setSheet({ kind: "tab", index: i })}>Tab</Button>
              </div>
              <ul className="kit-rows menued-rows menub-cards">
                {kids.map((c, j) => {
                  const n = hiddenNote(features, c.href);
                  const at = { parent: i, index: j };
                  const isDrag = dragging?.parent === i && dragging.index === j;
                  const mark = drop?.key === `c:${i}:${j}` && !isDrag ? drop.mode : undefined;
                  const outside = c.href.startsWith("https://");
                  const csub = n ? hiddenLine(n) : outside ? `Another site: ${hostOf(c.href)}` : "";
                  return (
                    <li key={`${i}:${j}`} data-row="" data-drag-box=""
                      className={`menued-row menub-card${n ? " is-dim" : ""}${isDrag ? " is-dragging" : ""}`}
                      data-drop={mark} onDragOver={(e) => overCard(e, at)} onDrop={land}>
                      {grip(at, c.label, "this page")}
                      <span className="menub-text">
                        <span className="menued-name">{c.label}</span>
                        {csub && <span className="menued-sub">{csub}</span>}
                      </span>
                      <Button variant="second" className="kit-pill" aria-label={`Change ${c.label}`} onClick={() => setSheet({ kind: "change", at })}>Change</Button>
                    </li>
                  );
                })}
              </ul>
              <p className="menub-hold">
                {kids.length > 0 ? "Drop a page here"
                  : item.href ? "A single page. Drop one here for a list."
                  : "Drop a page here. Hidden until it has one."}
              </p>
            </Card>
          );
        })}
      </div>

      {sheet?.kind === "change" && changeView && (
        <ChangeSheet
          key={`${sheet.at.parent}:${sheet.at.index}`}
          rows={rows}
          view={changeView}
          onClose={() => setSheet(null)}
          onApply={(name, place) => {
            let next = renameAt(rows, changeView.at, name);
            const samePlace = place.parent === changeView.at.parent && place.index === changeView.at.index;
            if (!samePlace) next = moveRowTo(next, changeView.at, place);
            if (next !== rows) change(next);
            setSheet(null);
          }}
          onRemove={() => { change(removeAt(rows, changeView.at)); setSheet(null); }}
        />
      )}

      {sheet?.kind === "tab" && rows[sheet.index] && (
        <TabSheet
          key={`tab:${sheet.index}`}
          rows={rows}
          index={sheet.index}
          onClose={() => setSheet(null)}
          onApply={(name, href, pos) => {
            const tab = rows[sheet.index];
            const mine = { ...tab, label: name } as NavItem;
            if (href) mine.href = href; else delete mine.href;
            if (!mine.href && !(mine.children ?? []).length) mine.children = [];
            const rest = rows.filter((_, i) => i !== sheet.index);
            rest.splice(Math.max(0, Math.min(rest.length, pos)), 0, mine);
            change(rest);
            setSheet(null);
          }}
          onRemove={() => { change(rows.filter((_, i) => i !== sheet.index)); setSheet(null); }}
        />
      )}

      {sheet?.kind === "addtab" && (
        <AddTabSheet onClose={() => setSheet(null)} onAdd={(name, href) => { change(addTab(rows, name, href || undefined)); setSheet(null); }} />
      )}

      {sheet?.kind === "add" && (
        <AddPageSheet rows={rows} offered={offered} onClose={() => setSheet(null)}
          onAdd={(name, href, parent) => { change(addPage(rows, name, href, parent)); setSheet(null); }} />
      )}

      {sheet?.kind === "reset" && (
        <Sheet open onClose={() => setSheet(null)} maxWidth={400}>
          <div className="menued-sheet">
            <p className="menued-label">The menu</p>
            <h2>Start over?</h2>
            <p>This puts the built-in menu back and saves it. Your own names and places go.</p>
            <Button variant="second" className="kit-pill" onClick={() => { change(menuToNav(buildDefaultMenu(config))); setSheet(null); }}>Yes, start over</Button>
            <Button variant="second" className="kit-pill" onClick={() => setSheet(null)}>Never mind</Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
