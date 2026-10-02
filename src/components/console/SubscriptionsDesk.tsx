"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/kit/Card";
import Button from "@/components/kit/Button";
import { Chip, SectionHead } from "@/components/console/glass";
import { getDeskRows, getPlans, savePlanMapCall, type DeskRow } from "@/lib/subscription-client";
import { deskChip, deskStatus, deskTone, type UiStatus } from "@/lib/subscription-ui";

interface PlanVar { id: string; name: string }
interface PlanRow { planId: string; name: string; variations: PlanVar[] }
interface PlanMapState { tiers: Record<string, Record<string, string | undefined> | undefined>; open: string[] }

const TIER_ROWS: { tier: string; name: string }[] = [
  { tier: "A", name: "Weekly Intuitive" },
  { tier: "B", name: "Observer" },
  { tier: "C", name: "Evening Star" },
];
const VARIANT_ROWS: { variant: string; label: string }[] = [
  { variant: "standard", label: "Regular monthly price" },
  { variant: "A", label: "Offer A" },
  { variant: "B", label: "Offer B" },
  { variant: "C", label: "Offer C" },
];

/** The saved map -> the request body, only ids that are set. */
export function mapBody(map: PlanMapState): PlanMapState {
  const tiers: PlanMapState["tiers"] = {};
  for (const [t, row] of Object.entries(map.tiers)) {
    const clean: Record<string, string> = {};
    for (const [v, id] of Object.entries(row ?? {})) if (id) clean[v] = id;
    if (Object.keys(clean).length) tiers[t] = clean;
  }
  return { tiers, open: map.open.length ? map.open : ["standard"] };
}

/** Money desk: who is subscribed, and which Square plan each tier and offer uses. Subscriptions card, operator only. */
export default function SubscriptionsDesk() {
  const [rows, setRows] = useState<DeskRow[] | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [plans, setPlans] = useState<PlanRow[] | null>(null);
  const [env, setEnv] = useState<string | null>(null);
  const [map, setMap] = useState<PlanMapState>({ tiers: {}, open: ["standard"] });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    getDeskRows(fetch).then((r) => { if (r?.ok) { setRows(r.rows ?? []); setEnabled((r as { enabled?: boolean }).enabled ?? false); } else setRows([]); });
    getPlans(fetch).then((r) => {
      const j = r as unknown as { ok: boolean; environment?: string; map?: PlanMapState; plans?: PlanRow[] } | null;
      if (j?.ok) { setPlans(j.plans ?? []); setEnv(j.environment ?? null); if (j.map) setMap(j.map); } else setPlans([]);
    });
  }, []);
  useEffect(load, [load]);

  async function save() {
    setBusy(true);
    setNote(null);
    const r = await savePlanMapCall(fetch, mapBody(map));
    setBusy(false);
    setNote(r?.ok ? { ok: true, text: "Saved." } : { ok: false, text: r?.reason ?? "Could not save. Try again." });
  }
  const setVar = (tier: string, variant: string, id: string) =>
    setMap((m) => ({ ...m, tiers: { ...m.tiers, [tier]: { ...(m.tiers[tier] ?? {}), [variant]: id || undefined } } }));
  const setOpen = (variant: string, open: boolean) =>
    setMap((m) => ({ ...m, open: open ? Array.from(new Set([...m.open, variant])) : m.open.filter((v) => v !== variant) }));

  if (rows === null) return null;
  const options = (plans ?? []).flatMap((p) => p.variations.map((v) => ({ id: v.id, label: `${p.name}: ${v.name}` })));

  return (
    <div className="mt-8">
      <SectionHead label="Subscriptions" />
      <Card>
        <p className="kit-note" style={{ marginBottom: 12 }}>
          {enabled ? "Monthly memberships are on." : "Monthly memberships are off. Members see the one-time purchase."}
          {env ? ` Square is in ${env} mode.` : ""}
        </p>
        <h3 className="kit-h2">Members</h3>
        {rows.length === 0 ? (
          <p className="kit-note">No subscribers yet.</p>
        ) : (
          <ul className="kit-rows kit-rows-stackable" aria-label="Subscribers">
            {rows.map((r, i) => (
              <li key={`${r.subject}-${i}`}>
                <div>
                  <b>{r.subject}</b>
                  <Chip tone={deskTone(deskStatus(r.status as UiStatus))}>{deskChip(r.status as UiStatus, r.chargedThroughMs, r.expiresAtMs, r.canceledAtMs)}</Chip>
                </div>
                <span className="kit-rows-end">{r.tierName}</span>
              </li>
            ))}
          </ul>
        )}

        <h3 className="kit-h2" style={{ marginTop: 24 }}>Plans</h3>
        {plans !== null && options.length === 0 ? (
          <p className="kit-note">Square lists no subscription plans yet.</p>
        ) : (
          <ul className="kit-rows kit-rows-stackable" aria-label="Plan map">
            {TIER_ROWS.flatMap((t) => VARIANT_ROWS.map((v) => {
              const id = `plan-${t.tier}-${v.variant}`;
              return (
                <li key={id}>
                  <div>
                    <b><label htmlFor={id}>{t.name}</label></b>
                    <em>{v.label}</em>
                  </div>
                  <span className="kit-rows-end">
                    <select id={id} className="kit-field-input" value={map.tiers[t.tier]?.[v.variant] ?? ""} onChange={(e) => setVar(t.tier, v.variant, e.target.value)}>
                      <option value="">Not set</option>
                      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </span>
                </li>
              );
            }))}
          </ul>
        )}

        <h3 className="kit-h2" style={{ marginTop: 24 }}>Offers members can pick</h3>
        <ul className="kit-rows kit-rows-stackable" aria-label="Open offers">
          {VARIANT_ROWS.filter((v) => v.variant !== "standard").map((v) => {
            const id = `open-${v.variant}`;
            return (
              <li key={id}>
                <div>
                  <b><label htmlFor={id}>{v.label}</label></b>
                  <em>First-time members only</em>
                </div>
                <span className="kit-rows-end">
                  <select id={id} className="kit-field-input" value={map.open.includes(v.variant) ? "open" : "closed"} onChange={(e) => setOpen(v.variant, e.target.value === "open")}>
                    <option value="closed">Closed</option>
                    <option value="open">Open</option>
                  </select>
                </span>
              </li>
            );
          })}
          <li>
            <div>{note && <em className={note.ok ? "kit-note-ok" : "kit-note-err"} role="status">{note.text}</em>}</div>
            <span className="kit-rows-end"><Button sm disabled={busy} onClick={save}>{busy ? "Saving..." : "Save plans"}</Button></span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
