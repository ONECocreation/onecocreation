"use client";

import { useEffect, useState } from "react";
import { Chip, field } from "@/components/console/glass";
import SquareCatalogDesk from "@/components/console/SquareCatalogDesk";

/**
 * CARD — CARDS (SQUARE) (TASK-136, 0018.06.17 a₿ — the Admiral's picture:
 * "GREEN = everything Square in ONE card"). Everything Square now lives
 * here: the status chip, the paste-keys vault desk (mirrors StripeRailCard
 * + api/admin/store/stripe/route.ts exactly — five fields, save-to-vault,
 * never echoed back), the "test the connection" button, the bitcoin-on-
 * this-location check, and the Square catalog display folded in as a
 * section at the bottom (<SquareCatalogDesk/>, unchanged logic, lighter
 * heading now that it's a subsection).
 *
 * ENV-THEN-VAULT: for each of the five values, an env var set on the
 * deploy always wins and this desk says so ("set on the deploy — takes
 * precedence"); otherwise the pasted vault value is used, live on the very
 * next request — no redeploy. All five are write-only: this desk NEVER
 * shows a saved value back, only "saved ✓ <date>" (same law as Stripe's
 * drawer) — that includes SQUARE_ENVIRONMENT and SQUARE_WEBHOOK_URL, which
 * aren't secret in the usual sense but the brief names all five as secrets
 * to never echo, so the toggle and the URL field follow the same
 * write-only shape as the two true credentials (documented in SUMMARY.md's
 * Seams/decisions).
 */

type FieldName = "access-token" | "location-id" | "environment" | "webhook-signature-key" | "webhook-url";
interface FieldStatus { saved: boolean; at: string | null }

interface SquareDeskStatus {
  ok: boolean;
  configured: boolean;
  source: "env" | "vault" | "unset";
  envSet: Record<string, boolean>;
  vault: Record<string, FieldStatus>;
  defaultWebhookUrl: string;
  squareBitcoin: { checked: boolean; enabled: boolean | null; reason: string } | null;
}

const FIELD_META: Record<FieldName, { envName: string; label: string; placeholder: string; kind: "text" | "toggle" }> = {
  "access-token": { envName: "SQUARE_ACCESS_TOKEN", label: "Access token", placeholder: "EAAA…", kind: "text" },
  "location-id": { envName: "SQUARE_LOCATION_ID", label: "Location ID", placeholder: "L…", kind: "text" },
  environment: { envName: "SQUARE_ENVIRONMENT", label: "Environment", placeholder: "", kind: "toggle" },
  "webhook-signature-key": {
    envName: "SQUARE_WEBHOOK_SIGNATURE_KEY",
    label: "Webhook signature key",
    placeholder: "paste the signing key from the Square webhook subscription",
    kind: "text",
  },
  "webhook-url": { envName: "SQUARE_WEBHOOK_URL", label: "Webhook URL", placeholder: "", kind: "text" },
};

async function saveField(fieldName: FieldName, value: string): Promise<{ ok: boolean; reason?: string }> {
  return fetch("/api/admin/store/square", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field: fieldName, value }),
  }).then((r) => r.json()).catch(() => ({ ok: false, reason: "the vault didn't answer — try again" }));
}

function KeyRow({
  name, envSet, status, defaultValue, onSaved,
}: {
  name: FieldName;
  envSet: boolean;
  status: FieldStatus | null;
  defaultValue?: string;
  onSaved: () => void;
}) {
  const meta = FIELD_META[name];
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const showForm = editing || !status?.saved;

  async function save(v: string) {
    if (!v.trim()) return;
    setBusy(true);
    setNote("");
    const res = await saveField(name, v);
    setBusy(false);
    if (res?.ok) {
      setValue("");
      setEditing(false);
      onSaved();
    } else {
      setNote(res?.reason ?? "the vault didn't answer — try again");
    }
  }

  return (
    <div style={{ margin: "10px 0" }}>
      <label style={{ display: "block", fontSize: ".72rem", letterSpacing: ".06em", textTransform: "uppercase",
        color: "var(--muted)", marginBottom: 4, fontFamily: "monospace" }}>{meta.envName}</label>

      {envSet ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Chip tone="lavender">set on the deploy</Chip>
          <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>takes precedence over the vault</span>
        </div>
      ) : meta.kind === "toggle" ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-sm" disabled={busy} onClick={() => save("sandbox")}>Sandbox</button>
          <button className="btn btn-sm" disabled={busy} onClick={() => save("production")}>Production</button>
          {status?.saved && (
            <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>
              saved <span style={{ color: "var(--gold-deep)" }}>✓</span>{" "}
              {status.at ? new Date(status.at).toLocaleDateString() : ""}
            </span>
          )}
        </div>
      ) : showForm ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type={name === "webhook-url" ? "text" : "password"}
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={defaultValue || meta.placeholder}
            style={{ ...field, flex: "1 1 260px", fontFamily: "monospace" }}
          />
          <button
            className="btn btn-sm"
            onClick={() => save(value.trim() || defaultValue || "")}
            disabled={busy || !(value.trim() || defaultValue)}
          >
            {busy ? "Saving…" : "Save to the vault"}
          </button>
          {status?.saved && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setValue(""); setNote(""); }}>
              Keep the saved one
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "monospace", fontSize: ".9rem" }}>
            •••• saved <span style={{ color: "var(--gold-deep)" }}>✓</span>{" "}
            <span style={{ color: "var(--muted)", fontSize: ".78rem" }}>
              {status?.at ? new Date(status.at).toLocaleDateString() : ""}
            </span>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Replace</button>
        </div>
      )}
      {note && <p style={{ margin: "6px 0 0", fontSize: ".76rem", color: "var(--warn)" }}>{note}</p>}
    </div>
  );
}

export default function SquareRailCard() {
  const [data, setData] = useState<SquareDeskStatus | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [bitcoinBusy, setBitcoinBusy] = useState(false);

  function refresh(bitcoinForce = false) {
    fetch(`/api/admin/store/square${bitcoinForce ? "?refresh=1" : ""}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) {
          setData(d);
          setReason(null);
        } else {
          setReason(d?.reason ?? "unreachable");
        }
      })
      .catch(() => setReason("unreachable"));
  }
  useEffect(() => refresh(), []);

  async function testConnection() {
    setTestBusy(true);
    setTestResult(null);
    const res = await fetch("/api/admin/store/square", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test" }),
    }).then((r) => r.json()).catch(() => null);
    setTestBusy(false);
    setTestResult(res?.ok ? { ok: true, text: res.message } : { ok: false, text: res?.reason ?? "the desk didn't answer — try again" });
  }

  async function recheckBitcoin() {
    setBitcoinBusy(true);
    refresh(true);
    setBitcoinBusy(false);
  }

  const statusLine = !data
    ? ""
    : data.source === "env"
      ? "configured from env"
      : data.source === "vault"
        ? "configured from the vault"
        : "not configured";

  return (
    <div style={{ background: "var(--glass)", border: "1px solid rgba(255,255,255,.9)", borderRadius: 18,
      padding: "14px 16px", marginTop: 12, boxShadow: "0 18px 44px -28px rgba(120,100,160,.45)", maxWidth: 680 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: ".95rem" }}>Cards (Square)</b>
        {data?.configured
          ? <Chip tone="green">live — hosted checkout</Chip>
          : <Chip tone="grey">not connected</Chip>}
        {data && <span style={{ fontSize: ".76rem", color: "var(--muted)" }}>{statusLine}</span>}
      </div>

      <p style={{ margin: "6px 0 10px", fontSize: ".78rem", color: "var(--muted)" }}>
        Paste your five Square values here and the house keeps them in the vault — never shown again,
        never in an email. Env vars, if you set them on the deploy, take precedence. Saved keys go live
        at once; no redeploy needed.
      </p>

      {reason ? (
        <p style={{ fontSize: ".82rem", color: "var(--warn)" }}>the desk didn&apos;t answer: {reason}</p>
      ) : !data ? null : (
        <>
          <KeyRow name="access-token" envSet={data.envSet["access-token"]} status={data.vault["access-token"] ?? null} onSaved={() => refresh()} />
          <KeyRow name="location-id" envSet={data.envSet["location-id"]} status={data.vault["location-id"] ?? null} onSaved={() => refresh()} />
          <KeyRow name="environment" envSet={data.envSet["environment"]} status={data.vault["environment"] ?? null} onSaved={() => refresh()} />
          <KeyRow name="webhook-signature-key" envSet={data.envSet["webhook-signature-key"]} status={data.vault["webhook-signature-key"] ?? null} onSaved={() => refresh()} />
          <KeyRow
            name="webhook-url"
            envSet={data.envSet["webhook-url"]}
            status={data.vault["webhook-url"] ?? null}
            defaultValue={data.defaultWebhookUrl}
            onSaved={() => refresh()}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <button className="btn btn-sm" disabled={testBusy || !data.configured} onClick={testConnection}>
              {testBusy ? "Testing…" : "Test the connection"}
            </button>
            {!data.configured && (
              <span style={{ fontSize: ".76rem", color: "var(--muted)" }}>paste the access token + location ID first</span>
            )}
          </div>
          {testResult && (
            <p style={{ margin: "6px 0 0", fontSize: ".82rem", color: testResult.ok ? "var(--ok)" : "var(--warn)" }}>
              {testResult.ok ? "✓ " : ""}{testResult.text}
            </p>
          )}

          {data.configured && (
            <div style={{ marginTop: 12, borderTop: "1px solid rgba(139,118,196,.18)", paddingTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <b style={{ fontSize: ".82rem" }}>Bitcoin on this Square location</b>
                {data.squareBitcoin?.enabled === true && <Chip tone="green">enabled</Chip>}
                {data.squareBitcoin?.enabled === false && <Chip tone="grey">not enabled</Chip>}
                {data.squareBitcoin?.enabled == null && <Chip tone="lavender">unverified</Chip>}
                <button className="btn btn-ghost btn-sm" disabled={bitcoinBusy} onClick={recheckBitcoin}>Recheck</button>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: ".76rem", color: "var(--muted)" }}>
                {data.squareBitcoin?.reason ?? "checking…"}
              </p>
            </div>
          )}

          <SquareCatalogDesk />
        </>
      )}
    </div>
  );
}
