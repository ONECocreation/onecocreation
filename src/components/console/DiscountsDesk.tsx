"use client";

import { useEffect, useState } from "react";
import { Chip, SectionHead, field } from "@/components/console/glass";

export default function DiscountsDesk() {
  type Code = { code: string; kind: "percent" | "flat"; value: number; enabled: boolean; expiresAt?: string };
  const [codes, setCodes] = useState<Code[] | null>(null);
  const [draft, setDraft] = useState<Code>({ code: "", kind: "percent", value: 100, enabled: true });
  const [busy, setBusy] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);

  const expired = (c: Code) =>
    !!c.expiresAt && Date.now() > Date.parse(`${c.expiresAt}T23:59:59.999Z`);
  const active = (c: Code) => c.enabled && !expired(c);

  useEffect(() => {
    fetch("/api/admin/discounts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCodes(d?.codes ?? []))
      .catch(() => setCodes([]));
  }, []);

  async function save(next: Code[]) {
    setBusy(true);
    const res = await fetch("/api/admin/discounts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codes: next }),
    });
    const d = await res.json().catch(() => null);
    if (d?.ok) setCodes(d.codes);
    setBusy(false);
  }

  if (codes === null) return null;
  return (
    <div>
      <SectionHead label="Discount codes" />
      <p style={{ margin: "0 0 10px", fontSize: ".78rem", color: "var(--muted)" }}>
        Store-level — the code reprices before any invoice; a 100% code marks the order paid with no
        invoice at all. A code with an expiry works through that whole day, then refuses on its own.
      </p>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".78rem",
        color: "var(--muted)", marginBottom: 10, cursor: "pointer", userSelect: "none" }}>
        <input type="checkbox" checked={activeOnly} onChange={() => setActiveOnly((v) => !v)} />
        active codes only
      </label>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {codes.filter((c) => !activeOnly || active(c)).map((c) => (
          <li key={c.code} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10,
            background: "var(--glass)", border: "1px solid rgba(139,118,196,.22)",
            borderRadius: 12, padding: "8px 14px", marginBottom: 8, fontSize: ".85rem" }}>
            <b style={{ letterSpacing: ".08em" }}>{c.code}</b>
            <span style={{ color: "var(--muted)" }}>
              {c.kind === "percent" ? `${c.value}% off` : `${c.value.toLocaleString()} sats off`}
            </span>
            {expired(c) ? (
              <Chip tone="rose">expired {c.expiresAt}</Chip>
            ) : c.enabled ? (
              <Chip tone="green">on{c.expiresAt ? ` · til ${c.expiresAt}` : ""}</Chip>
            ) : (
              <Chip tone="grey">off</Chip>
            )}
            <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
              <button
                disabled={busy}
                onClick={() => save(codes.map((x) => (x.code === c.code ? { ...x, enabled: !x.enabled } : x)))}
                style={{ background: "none", border: 0, cursor: "pointer", fontFamily: "inherit", padding: "6px 4px",
                  fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em",
                  color: "var(--gold-deep)" }}
              >
                {c.enabled ? "turn off" : "turn on"}
              </button>
              <button
                disabled={busy}
                onClick={() => confirm(`Remove code ${c.code}?`) && save(codes.filter((x) => x.code !== c.code))}
                style={{ background: "none", border: 0, cursor: "pointer", fontFamily: "inherit", padding: "6px 4px",
                  fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em",
                  color: "var(--err)" }}
              >
                remove
              </button>
            </span>
          </li>
        ))}
        {codes.length === 0 && <li style={{ color: "var(--muted)", fontSize: ".85rem" }}>no codes yet</li>}
      </ul>
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <input
          value={draft.code}
          onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
          placeholder="CODE"
          style={{ ...field, width: 130, textTransform: "uppercase" }}
        />
        <select
          value={draft.kind}
          onChange={(e) => setDraft({ ...draft, kind: e.target.value as Code["kind"] })}
          style={field}
        >
          <option value="percent">% off</option>
          <option value="flat">sats off</option>
        </select>
        <input
          value={String(draft.value)}
          onChange={(e) => setDraft({ ...draft, value: Number(e.target.value.replace(/[^0-9]/g, "")) || 0 })}
          style={{ ...field, width: 90 }}
        />
        <input
          type="date"
          title="expires (optional)"
          value={draft.expiresAt ?? ""}
          onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value || undefined })}
          style={field}
        />
        <button
          className="btn btn-gold btn-sm"
          disabled={busy || !draft.code}
          onClick={() => {
            save([...codes.filter((x) => x.code !== draft.code), draft]);
            setDraft({ code: "", kind: "percent", value: 100, enabled: true });
          }}
        >
          + Add code
        </button>
      </div>
    </div>
  );
}
