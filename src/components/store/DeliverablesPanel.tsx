"use client";

import { useCallback, useEffect, useState } from "react";
import { Chip, SectionHead } from "@/components/console/glass";
import { KIND_WORD } from "@/lib/store-category-words";
import type { ItemKind } from "@/lib/store";

interface DeliverableCheck {
  id: string;
  title: string;
  kind: ItemKind;
  hasDeliverable: boolean;
  label: string | null;
  blobAnswers: boolean | null;
}

async function fetchChecks(): Promise<DeliverableCheck[] | null> {
  try {
    const res = await fetch("/api/admin/store/deliverables", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.ok ? (data.items as DeliverableCheck[]) : null;
  } catch {
    return null;
  }
}

function statusPill(check: DeliverableCheck) {
  if (!check.hasDeliverable) return <Chip tone="rose">missing deliverable</Chip>;
  if (check.blobAnswers === true) return <Chip tone="green">file answers</Chip>;
  return <Chip tone="rose">blob 404</Chip>;
}

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  border: "1px solid rgba(139,118,196,.25)",
  borderRadius: 12,
  padding: "8px 12px",
};

/**
 * TASK-291 (0018.06.25 a₿ · block 967,144) — "need to ensure that all of
 * meditation items have a digital download. i would like to see a test of
 * each of these items." (the Admiral). Mounted on /a/store beneath the
 * shelf: every digital-kind item (plus any other kind carrying a
 * deliverable), a plain status pill, and a Re-check button that asks the
 * server again. This panel never sees `blobPath` — it reads only what
 * `GET /api/admin/store/deliverables` answers (THE LEAK RULE holds
 * server-side, store.ts:57).
 */
export default function DeliverablesPanel() {
  const [checks, setChecks] = useState<DeliverableCheck[] | null>(null);
  const [checking, setChecking] = useState(false);

  // the initial read — no synchronous setState in the effect body itself
  // (page.tsx's own fetchShelf effect follows this same shape)
  useEffect(() => {
    let alive = true;
    async function first() {
      const next = await fetchChecks();
      if (alive) setChecks(next);
    }
    void first();
    return () => {
      alive = false;
    };
  }, []);

  const recheck = useCallback(async () => {
    setChecking(true);
    setChecks(await fetchChecks());
    setChecking(false);
  }, []);

  // denied, unreachable, or an empty shelf so far — the shelf table above
  // already carries the operator-state words; this panel stays quiet
  if (!checks || checks.length === 0) return null;

  return (
    <>
      <SectionHead label="Deliverables" />
      <div style={{ display: "grid", gap: 8 }}>
        {checks.map((c) => (
          <div key={c.id} style={row}>
            <b style={{ fontSize: ".85rem", flex: 1 }}>{c.title}</b>
            <span style={{ fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
              {KIND_WORD[c.kind]}
            </span>
            <span style={{ fontSize: ".76rem", color: "var(--muted)" }}>{c.label ?? "no label"}</span>
            {statusPill(c)}
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={recheck} disabled={checking} style={{ marginTop: 8 }}>
        {checking ? "checking…" : "Re-check"}
      </button>
    </>
  );
}
