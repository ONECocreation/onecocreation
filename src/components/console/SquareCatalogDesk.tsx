"use client";

import { useEffect, useState } from "react";
import { Chip, SectionHead } from "@/components/console/glass";
import type { SquareCatalogDisplayItem, SquareCatalogSettings } from "@/lib/square-catalog";

/**
 * SQUARE CATALOG DISPLAY — one-way (Admiral's walk). OUR catalog stays
 * canonical; this desk only enables/refreshes a READ of Pac's own Square
 * Catalog and lists which fetched items to keep an eye on here, admin-side
 * only — nothing here writes a Square item into this store's own catalog
 * or back into Square (see square-catalog.ts's file header for the full
 * one-way rule and why it's one-way, not synced).
 */

function money(amount: number, currency: string): string {
  return `${(amount / 100).toFixed(2)} ${currency}`;
}

export default function SquareCatalogDesk() {
  const [settings, setSettings] = useState<SquareCatalogSettings | null>(null);
  const [configured, setConfigured] = useState(true);
  const [items, setItems] = useState<SquareCatalogDisplayItem[]>([]);
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function refresh(force = false) {
    fetch(`/api/admin/store/square-catalog${force ? "?refresh=1" : ""}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.ok) return;
        setSettings(d.settings);
        setConfigured(Boolean(d.configured));
        setItems(d.items ?? []);
        setReason(d.reason ?? null);
      })
      .catch(() => {});
  }
  useEffect(() => refresh(), []);

  async function save(next: SquareCatalogSettings) {
    setBusy(true);
    const res = await fetch("/api/admin/store/square-catalog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).then((r) => r.json()).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setSettings(res.settings);
      refresh();
    }
  }

  function toggleSelected(id: string) {
    if (!settings) return;
    // empty selectedIds means "show every fetched item" — toggling ONE off
    // from that state has to mean "all but this one," not "only this one,"
    // so an empty list expands to the full set before the flip
    const allIds = items.map((i) => i.id);
    const current = settings.selectedIds.length === 0 ? allIds : settings.selectedIds;
    const has = current.includes(id);
    const next = has ? current.filter((x) => x !== id) : [...current, id];
    // re-checking everything collapses back to the empty "show all" shape
    const selectedIds = next.length === allIds.length ? [] : next;
    save({ ...settings, selectedIds });
  }

  if (!settings) return null;

  return (
    <div>
      <SectionHead label="Square Catalog Display" />
      <p style={{ margin: "0 0 8px", fontSize: ".78rem", color: "var(--muted)" }}>
        Read-only: shows Pac&apos;s existing Square catalog here, admin-side, for a unified view — never
        written back to Square, never duplicated into this store&apos;s own catalog.
      </p>
      {!configured ? (
        <p style={{ fontSize: ".82rem", color: "var(--warn)" }}>
          Square isn&apos;t connected yet — set the SQUARE_* env vars (see the card above / docs/payments-square.md)
          before turning this on.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              className="btn btn-sm"
              disabled={busy}
              onClick={() => save({ ...settings, enabled: !settings.enabled })}
            >
              {settings.enabled ? "Disable display" : "Enable display"}
            </button>
            {settings.enabled && <Chip tone="green">on</Chip>}
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => refresh(true)}>
              Refresh from Square
            </button>
            {reason && <span style={{ fontSize: ".78rem", color: "var(--warn)" }}>{reason}</span>}
          </div>

          {settings.enabled && (
            <>
              <p style={{ margin: "10px 0 6px", fontSize: ".76rem", color: "var(--muted)" }}>
                {settings.selectedIds.length === 0
                  ? "showing every fetched Square item — check any below to switch to an allowlist"
                  : `showing ${settings.selectedIds.length} chosen item${settings.selectedIds.length === 1 ? "" : "s"}`}
              </p>
              {items.length === 0 ? (
                <p style={{ fontSize: ".85rem", color: "var(--muted)" }}>no items found in the Square catalog yet.</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {items.map((it) => {
                    const checked = settings.selectedIds.length === 0 || settings.selectedIds.includes(it.id);
                    return (
                      <li key={it.id} style={{ display: "flex", alignItems: "center", gap: 10,
                        background: "var(--glass)", border: "1px solid rgba(139,118,196,.22)",
                        borderRadius: 12, padding: "8px 14px", marginBottom: 6, fontSize: ".85rem" }}>
                        <input type="checkbox" checked={checked} disabled={busy} onChange={() => toggleSelected(it.id)} />
                        <span style={{ flex: 1 }}>
                          <b>{it.name}</b>{" "}
                          <span style={{ color: "var(--muted)", fontSize: ".78rem" }}>({money(it.amount, it.currency)})</span>
                        </span>
                        <span style={{ fontSize: ".7rem", color: "var(--muted)" }}>via Square</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
