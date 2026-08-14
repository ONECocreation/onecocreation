"use client";

import { useEffect, useState } from "react";
import { Chip, field } from "@/components/console/glass";

/**
 * CARD RAIL — STRIPE (Love's own RTFM, Admiral 0018.05.23): the drawer where
 * she pastes her two Stripe keys herself, with the walk written out below in
 * plain steps. Values go straight to the vault and are never echoed back —
 * the desk only ever says "saved ✓ <date>". The card rail itself (the
 * payment adapter that spends these keys) ships next build; this card makes
 * that flip a zero-conversation moment.
 */

type FieldName = "secret-key" | "webhook-secret";
interface FieldStatus { saved: boolean; at: string | null }

const WEBHOOK_URL = "https://onecocreation-adminpacmans-projects.vercel.app/api/store/webhook/stripe";

function KeyRow({
  name, label, placeholder, status, onSaved,
}: {
  name: FieldName;
  label: string;
  placeholder: string;
  status: FieldStatus | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const showForm = editing || !status?.saved;

  async function save() {
    if (!value.trim()) return;
    setBusy(true);
    setNote("");
    const res = await fetch("/api/admin/store/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: name, value }),
    }).then((r) => r.json()).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setValue("");
      setEditing(false);
      setNote("");
      onSaved();
    } else {
      setNote(res?.reason ?? "the vault didn't answer — try again");
    }
  }

  return (
    <div style={{ margin: "10px 0" }}>
      <label style={{ display: "block", fontSize: ".72rem", letterSpacing: ".06em", textTransform: "uppercase",
        color: "var(--muted)", marginBottom: 4 }}>{label}</label>
      {showForm ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="password"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            style={{ ...field, flex: "1 1 220px", fontFamily: "monospace" }}
          />
          <button className="btn btn-gold btn-sm" onClick={save} disabled={busy || !value.trim()}>
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

export default function StripeRailCard() {
  const [status, setStatus] = useState<Record<string, FieldStatus> | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  function refresh() {
    fetch("/api/admin/store/stripe", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => (d?.ok ? setStatus(d.status ?? {}) : setReason(d?.reason ?? "unreachable")))
      .catch(() => setReason("unreachable"));
  }
  useEffect(refresh, []);

  const bothSaved = !!status?.["secret-key"]?.saved && !!status?.["webhook-secret"]?.saved;

  const step: React.CSSProperties = { margin: "0 0 10px", fontSize: ".85rem", lineHeight: 1.65 };

  return (
    <div style={{ background: "var(--glass)", border: "1px solid rgba(255,255,255,.9)", borderRadius: 18,
      padding: "14px 16px", marginTop: 12, boxShadow: "0 18px 44px -28px rgba(120,100,160,.45)", maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: ".95rem" }}>Card rail — Stripe</b>
        {bothSaved
          ? <Chip tone="gold">keys in the vault — rail ships next build</Chip>
          : <Chip tone="grey">two keys to paste</Chip>}
      </div>
      <p style={{ margin: "6px 0 4px", fontSize: ".78rem", color: "var(--muted)" }}>
        Paste your two Stripe keys here and the house keeps them in the vault — never shown
        again, never in an email. Cards go live the moment the card rail ships (next build);
        nothing else for you to do after this.
      </p>

      {reason ? (
        <p style={{ fontSize: ".82rem", color: "var(--warn)" }}>the vault didn&apos;t answer: {reason}</p>
      ) : (
        <>
          <KeyRow name="secret-key" label="Restricted API key" placeholder="rk_live_… (or sk_…)"
            status={status?.["secret-key"] ?? null} onSaved={refresh} />
          <KeyRow name="webhook-secret" label="Webhook signing secret" placeholder="whsec_…"
            status={status?.["webhook-secret"] ?? null} onSaved={refresh} />
        </>
      )}

      <details style={{ marginTop: 10, borderTop: "1px solid rgba(139,118,196,.18)", paddingTop: 10 }}>
        <summary style={{ cursor: "pointer", fontSize: ".82rem", color: "var(--gold-deep)", fontWeight: 600 }}>
          The walk, step by step — five minutes, all yours 💛
        </summary>
        <ol style={{ margin: "10px 0 0", paddingLeft: 20 }}>
          <li style={step}>
            Open <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer"
              style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>dashboard.stripe.com</a>{" "}
            and sign in to your Stripe account.
          </li>
          <li style={step}>
            Go to <b>Developers → API keys</b> and press <b>Create restricted key</b>. Name it{" "}
            <b>&ldquo;One Cocreation site&rdquo;</b>, and give it <b>Checkout Sessions</b> permission —{" "}
            <b>Write</b> (read comes along with it). Everything else can stay &ldquo;None&rdquo;; the site
            only ever asks Stripe to open a checkout.
          </li>
          <li style={step}>
            Copy the new key (it starts <b style={{ fontFamily: "monospace" }}>rk_</b>) and paste it into the
            first box above. Save — the vault holds it from here.
          </li>
          <li style={step}>
            Go to <b>Developers → Webhooks</b> and press <b>Add endpoint</b>. The endpoint URL is:{" "}
            <span style={{ fontFamily: "monospace", fontSize: ".78rem", wordBreak: "break-all",
              display: "inline-block", background: "rgba(139,118,196,.1)", borderRadius: 6, padding: "2px 6px" }}>
              {WEBHOOK_URL}
            </span>{" "}
            — and pick just one event to listen for: <b style={{ fontFamily: "monospace" }}>checkout.session.completed</b>{" "}
            (that&apos;s Stripe telling the house &ldquo;this card payment finished&rdquo;).
          </li>
          <li style={step}>
            On the new endpoint&apos;s page, reveal the <b>Signing secret</b> (starts{" "}
            <b style={{ fontFamily: "monospace" }}>whsec_</b>), copy it, and paste it into the second box above. Save.
          </li>
          <li style={step}>
            Done, beautiful. Cards go live the moment the site&apos;s card rail ships (next build) —
            the keys will be waiting right here in the vault, and this card will say so.
          </li>
        </ol>
      </details>
    </div>
  );
}
