"use client";

import { useEffect, useState } from "react";
import { Chip, field } from "@/components/console/glass";
import { PAGE_CATALOG, buildDefaultMenu, type MenuItem } from "@/components/NavMenu";
import type { NavChild, NavItem, SiteConfig } from "@/lib/site-config";

/**
 * NAV EDITOR (TASK-137, cut 0018.06.17 a₿) — "We are missing the ability to
 * configure the navigation: rename, choose what pages sit under each
 * header. The user shouldn't need an AI to set this up — this is our gift
 * to the people. They don't need credits." (the Admiral)
 *
 * Rename a label inline, reorder with up/down buttons (no drag library),
 * add a real page from the picker (PAGE_CATALOG — the same table buildMenu
 * uses to filter the public menu), nest a top-level leaf one level under a
 * header, remove a row, or Reset to the switch-driven default. Switches
 * still win: a page whose feature is OFF renders greyed here with "hidden
 * by the <name> switch" and never renders public — buildMenu applies the
 * exact same filter on the live site, so this editor can never promise a
 * door the switches won't actually open.
 *
 * Self-contained (own fetch/save), the same pattern as RetreatsDesk inside
 * /a/booking — SiteRoom just drops <NavEditor /> into its "Menu" section.
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
    ? "hidden — every page under it is off"
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

const rowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
  background: "var(--glass)", border: "1px solid rgba(139,118,196,.22)",
  borderRadius: 10, padding: "8px 12px", marginBottom: 6,
};

const iconBtn: React.CSSProperties = {
  background: "none", border: "1px solid rgba(139,118,196,.35)", borderRadius: 6,
  width: 26, height: 26, cursor: "pointer", fontSize: ".8rem", lineHeight: 1, color: "var(--ink)",
};

export default function NavEditor() {
  const [features, setFeatures] = useState<SiteConfig["features"] | null>(null);
  const [rows, setRows] = useState<NavItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/site", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ok) return;
      const config = data.config as SiteConfig;
      setFeatures(config.features);
      setRows(config.nav?.items?.length ? config.nav.items : menuToNav(buildDefaultMenu(config)));
    })();
  }, []);

  function resetToDefault() {
    if (!features) return;
    setRows(menuToNav(buildDefaultMenu({ features, payments: { btcpay: false, square: false, stripe: false },
      meeting: { rail: "jitsi", jitsiDomain: "", allowStaticLinks: false, vdoRoomPrefix: "", staticUrl: "" } })));
    setNote(null);
  }

  function move<T>(list: T[], i: number, dir: -1 | 1): T[] {
    const j = i + dir;
    if (j < 0 || j >= list.length) return list;
    const next = list.slice();
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  }

  function renameTop(i: number, label: string) {
    if (!rows) return;
    const next = rows.slice();
    next[i] = { ...next[i], label };
    setRows(next);
  }

  function renameChild(i: number, j: number, label: string) {
    if (!rows) return;
    const next = rows.slice();
    const children = (next[i].children ?? []).slice();
    children[j] = { ...children[j], label };
    next[i] = { ...next[i], children };
    setRows(next);
  }

  function removeTop(i: number) {
    if (!rows) return;
    setRows(rows.filter((_, idx) => idx !== i));
  }

  function removeChild(i: number, j: number) {
    if (!rows) return;
    const next = rows.slice();
    next[i] = { ...next[i], children: (next[i].children ?? []).filter((_, idx) => idx !== j) };
    setRows(next);
  }

  function addTopPage(href: string) {
    if (!rows || !href) return;
    setRows([...rows, { id: href, label: labelFor(href), href }]);
  }

  function addChildPage(i: number, href: string) {
    if (!rows || !href) return;
    const next = rows.slice();
    const children = [...(next[i].children ?? []), { id: href, label: labelFor(href), href }];
    next[i] = { ...next[i], children };
    setRows(next);
  }

  /** nest one level: pull a top-level LEAF (no children of its own) out and
      drop it as the last child of the chosen header row */
  function nestUnder(i: number, targetIndex: number) {
    if (!rows) return;
    const leaf = rows[i];
    if (leaf.children?.length || !leaf.href) return; // only a leaf nests
    const withoutLeaf = rows.filter((_, idx) => idx !== i);
    const targetPos = withoutLeaf.indexOf(rows[targetIndex]);
    if (targetPos < 0) return;
    const next = withoutLeaf.slice();
    const target = next[targetPos];
    next[targetPos] = {
      ...target,
      children: [...(target.children ?? []), { id: leaf.href, label: leaf.label, href: leaf.href }],
    };
    setRows(next);
  }

  async function save() {
    if (!rows) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nav: { items: rows } }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeatures(data.config.features);
        setRows(data.config.nav?.items?.length ? data.config.nav.items : menuToNav(buildDefaultMenu(data.config)));
        setNote("saved ✓ the public menu reads this on its next render");
      } else setNote(data.reason ?? "save failed");
    } catch {
      setNote("save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!features || !rows) return <p style={{ fontSize: ".82rem", color: "var(--muted)" }}>reading the menu…</p>;

  const unusedTop = PAGE_CATALOG.filter((p) => !rows.some((r) => r.href === p.href));

  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: ".8rem", color: "var(--muted)", margin: "0 0 10px", maxWidth: 640 }}>
        Rename a door, reorder with the arrows, add a real page from the list, or nest a page one level under a
        header. A page whose switch is off still shows here (greyed) so you can arrange it ahead of time — it
        never shows on the live site until its switch is on.
      </p>

      {rows.map((item, i) => {
        const note1 = rowHidden(features, item);
        return (
          <div key={item.id + i} style={{ marginBottom: 4 }}>
            <div style={{ ...rowStyle, opacity: note1 ? 0.6 : 1 }}>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button type="button" style={iconBtn} disabled={i === 0} onClick={() => setRows(move(rows, i, -1))} aria-label={`move ${item.label} up`}>▲</button>
                <button type="button" style={iconBtn} disabled={i === rows.length - 1} onClick={() => setRows(move(rows, i, 1))} aria-label={`move ${item.label} down`}>▼</button>
              </span>
              <input
                value={item.label}
                onChange={(e) => renameTop(i, e.target.value)}
                style={{ ...field, minWidth: 180, fontWeight: 700 }}
                aria-label={`label for ${item.label}`}
              />
              {item.children?.length ? (
                <Chip tone="lavender">header · {item.children.length} page{item.children.length === 1 ? "" : "s"}</Chip>
              ) : (
                <Chip tone="grey">{item.href}</Chip>
              )}
              {note1 && <Chip tone="grey">{note1}</Chip>}
              {!item.children?.length && item.href && rows.length > 1 && (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    if (!Number.isNaN(idx)) nestUnder(i, idx);
                    e.target.value = "";
                  }}
                  style={{ ...field, fontSize: ".76rem" }}
                  aria-label={`nest ${item.label} under…`}
                >
                  <option value="" disabled>nest under…</option>
                  {rows.map((r, idx) =>
                    idx === i ? null : (
                      <option key={r.id + idx} value={idx}>{r.label}</option>
                    ),
                  )}
                </select>
              )}
              <button type="button" onClick={() => removeTop(i)} style={{ ...iconBtn, width: "auto", padding: "0 8px", color: "var(--err)" }}>
                remove
              </button>
            </div>

            {item.children?.map((child, j) => {
              const note2 = hiddenNote(features, child.href);
              return (
                <div key={child.id + j} style={{ ...rowStyle, marginLeft: 30, opacity: note2 ? 0.6 : 1 }}>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <button type="button" style={iconBtn} disabled={j === 0} onClick={() => setRows((r) => (r ? (() => {
                      const next = r.slice();
                      next[i] = { ...next[i], children: move(next[i].children ?? [], j, -1) };
                      return next;
                    })() : r))} aria-label={`move ${child.label} up`}>▲</button>
                    <button type="button" style={iconBtn} disabled={j === (item.children?.length ?? 1) - 1} onClick={() => setRows((r) => (r ? (() => {
                      const next = r.slice();
                      next[i] = { ...next[i], children: move(next[i].children ?? [], j, 1) };
                      return next;
                    })() : r))} aria-label={`move ${child.label} down`}>▼</button>
                  </span>
                  <input
                    value={child.label}
                    onChange={(e) => renameChild(i, j, e.target.value)}
                    style={{ ...field, minWidth: 180 }}
                    aria-label={`label for ${child.label}`}
                  />
                  <Chip tone="grey">{child.href}</Chip>
                  {note2 && <Chip tone="grey">{note2}</Chip>}
                  <button type="button" onClick={() => removeChild(i, j)} style={{ ...iconBtn, width: "auto", padding: "0 8px", color: "var(--err)" }}>
                    remove
                  </button>
                </div>
              );
            })}

            {item.children !== undefined && (
              <div style={{ ...rowStyle, marginLeft: 30, background: "transparent", border: "1px dashed rgba(139,118,196,.3)" }}>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    addChildPage(i, e.target.value);
                    e.target.value = "";
                  }}
                  style={field}
                  aria-label={`add a page under ${item.label}`}
                >
                  <option value="" disabled>+ add a page under {item.label}…</option>
                  {PAGE_CATALOG.map((p) => (
                    <option key={p.href} value={p.href}>{p.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );
      })}

      <div style={{ ...rowStyle, background: "transparent", border: "1px dashed rgba(139,118,196,.3)" }}>
        <select
          defaultValue=""
          onChange={(e) => {
            addTopPage(e.target.value);
            e.target.value = "";
          }}
          style={field}
          aria-label="add a top-level page"
        >
          <option value="" disabled>+ add a page to the menu…</option>
          {unusedTop.map((p) => (
            <option key={p.href} value={p.href}>{p.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
        <button type="button" className="btn btn-gold btn-sm" disabled={busy} onClick={save} style={busy ? { opacity: 0.5 } : undefined}>
          {busy ? "Saving…" : "Save the menu"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={resetToDefault}>
          Reset to default
        </button>
        {note && <span style={{ fontSize: ".8rem", color: note.startsWith("saved") ? "var(--ok)" : "var(--err)" }}>{note}</span>}
      </div>
    </div>
  );
}
