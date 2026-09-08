"use client";

import { useEffect, useState } from "react";
import { Chip, field } from "@/components/console/glass";

/**
 * CARD — CARDS (TASK-167, 0018.06.17 a₿ · block 966,080 — the Admiral's
 * walk of the Money desk: "Add a header just called Cards, and under it a
 * Square section and a Stripe section... If an item isn't set up, say it's
 * not set up"). ONE card, the same width and frame as the Bitcoin card,
 * folding together what used to be SquareRailCard + StripeRailCard:
 *
 *   SQUARE — the Test-the-connection button FIRST, then the five values as
 *   a per-row checklist: a check (set + verified), an empty box (not set),
 *   or a red mark with the error sentence beside it (set but failing). Every
 *   row says where the value lives in words ("on Vercel" / "in the vault" /
 *   "not set"). Verification is honest per row: the access token + location
 *   ID are proven by the desk's cached Locations call (the name Square
 *   answers with); the environment by which Square host answered; the
 *   webhook key + URL cannot be proven until Square knocks, so those rows
 *   read "waiting for Square's first event…" until the webhook route's KV
 *   markers (square:webhook:last-verified / :last-rejected) say otherwise.
 *   The paste-in vault fields stay, folded under "Set it here instead" —
 *   shown for rows that are not set (and for a FAILING vault row, which
 *   needs a way to be fixed); a row set on Vercel shows no input.
 *
 *   STRIPE — the two-key vault drawer, unchanged in spirit (write-only,
 *   "saved ✓ <date>", never echoed), with the honest line on top: the
 *   Stripe card rail is not built yet (`payments.stripe` is dark), so saved
 *   keys wait in the vault — "not built yet", never "next build".
 *
 * GONE per the same walk: the "Bitcoin on this Square location" check
 * (Square has no bitcoin purchase feature for a merchant's customers — the
 * site's bitcoin rail is BTCPay; the check could never verify) and the
 * "Square catalog display" block (a Pac's Arcade feature — separation law).
 *
 * The row/chip derivations below are PURE and exported — tests pin them
 * from fixture states (the T-148 storeCardModel idiom), the component only
 * renders what they say. Derive-or-dash throughout: no fake checks, no
 * guessed stamps.
 */

// ── the desk routes' shapes (mirrored, never the values themselves) ───────

interface FieldStatus { saved: boolean; at: string | null }

export interface ConnectionVerdict {
  ok: boolean;
  at: string;
  locationName?: string;
  host?: string;
  reason?: string;
}

export interface WebhookMarkers {
  verified: { at?: string; eventType?: string } | null;
  rejected: { at?: string; reason?: string; detail?: string } | null;
}

export interface SquareDeskStatus {
  ok: boolean;
  configured: boolean;
  source: "env" | "vault" | "unset";
  envSet: Record<string, boolean>;
  vault: Record<string, FieldStatus>;
  defaultWebhookUrl: string;
  connection: ConnectionVerdict | null;
  webhook: WebhookMarkers;
}

// ── the checklist derivation — pure, test-pinned ──────────────────────────

export type SquareFieldName = "access-token" | "location-id" | "environment" | "webhook-signature-key" | "webhook-url";

/** check = set + verified · empty = not set · error = set but failing (the
 *  note carries the error sentence) · pending = set but not provable yet */
export type RowMark = "check" | "empty" | "error" | "pending";
export type RowWhere = "on Vercel" | "in the vault" | "not set";

export interface ChecklistRow {
  field: SquareFieldName;
  envName: string;
  mark: RowMark;
  where: RowWhere;
  savedAt: string | null;
  /** the sentence beside the mark — the ERROR SENTENCE when mark is "error" */
  note: string;
  /** the "Set it here instead" foldout: unset rows, plus a failing vault row
   *  (it needs a way to be fixed); a Vercel-set row never shows an input */
  canPaste: boolean;
}

const SQUARE_FIELD_ORDER: { name: SquareFieldName; envName: string }[] = [
  { name: "access-token", envName: "SQUARE_ACCESS_TOKEN" },
  { name: "location-id", envName: "SQUARE_LOCATION_ID" },
  { name: "environment", envName: "SQUARE_ENVIRONMENT" },
  { name: "webhook-signature-key", envName: "SQUARE_WEBHOOK_SIGNATURE_KEY" },
  { name: "webhook-url", envName: "SQUARE_WEBHOOK_URL" },
];

/** the webhook route's own fix-it sentence (api/store/webhook/square) */
export const WEBHOOK_REJECT_SENTENCE =
  "signature did not match: check SQUARE_WEBHOOK_URL character for character";

const day = (iso: string | null | undefined): string => (iso ? iso.slice(0, 10) : "");

export function deriveSquareRows(
  d: Pick<SquareDeskStatus, "envSet" | "vault" | "connection" | "webhook">,
): ChecklistRow[] {
  return SQUARE_FIELD_ORDER.map(({ name, envName }) => {
    const where: RowWhere = d.envSet[name] ? "on Vercel" : d.vault[name]?.saved ? "in the vault" : "not set";
    const set = where !== "not set";
    const savedAt = d.vault[name]?.at ?? null;
    let mark: RowMark = "empty";
    let note = "not set";
    let canPaste = !set;

    if (name === "access-token" || name === "location-id") {
      if (set) {
        if (d.connection?.ok) {
          mark = "check";
          note = `verified ${day(d.connection.at)} — Square answers as ${d.connection.locationName ?? "your location"}`;
        } else if (d.connection) {
          mark = "error";
          note = d.connection.reason ?? "the connection test failed";
          if (where === "on Vercel") note += " — fix it on Vercel, then redeploy";
        } else {
          mark = "pending";
          note = "set — the token and the location ID prove together; set both, then test";
        }
      }
    } else if (name === "environment") {
      if (set) {
        if (d.connection?.ok) {
          mark = "check";
          const host = d.connection.host ?? "";
          note = `verified — ${host} answered (${host === "connect.squareup.com" ? "production" : "sandbox"})`;
        } else if (d.connection) {
          mark = "pending";
          note = "set — the connection test above couldn't prove it this time";
        } else {
          mark = "pending";
          note = "set — proven together with the access token test";
        }
      } else {
        note = "not set — the house assumes sandbox";
      }
    } else {
      // the webhook pair — provable only by Square's own knock
      if (set) {
        const v = d.webhook.verified;
        const r = d.webhook.rejected;
        const vAt = v?.at ? Date.parse(v.at) : -1;
        const rAt = r?.at ? Date.parse(r.at) : -1;
        if (rAt >= 0 && rAt > vAt) {
          mark = "error";
          note = (r?.reason ?? WEBHOOK_REJECT_SENTENCE) + (r?.detail ? ` — ${r.detail}` : "");
        } else if (vAt >= 0) {
          mark = "check";
          note = `verified ${day(v?.at)} — last event ${v?.eventType ?? "—"}`;
        } else {
          mark = "pending";
          note = "waiting for Square's first event — send a test event from Webhooks → Subscriptions";
        }
      }
    }

    // a failing VAULT value must offer the way to fix it; a failing Vercel
    // value can only be fixed on Vercel (the note already says so)
    if (mark === "error" && where === "in the vault") canPaste = true;

    return { field: name, envName, mark, where, savedAt, note, canPaste };
  });
}

export interface ChipWords {
  tone: "green" | "grey" | "rose" | "lavender";
  words: string;
}

/** ONE chip in words per section: "live" / "not set up" / "partly set up ·
 *  N of 5" — and "needs a fix" when something set is failing, because
 *  "partly set up · 5 of 5" would be a lie of omission. */
export function squareChip(rows: ChecklistRow[], connection: ConnectionVerdict | null): ChipWords {
  const setCount = rows.filter((r) => r.where !== "not set").length;
  if (setCount === 0) return { tone: "grey", words: "not set up" };
  const failing = rows.some((r) => r.mark === "error");
  if (setCount === SQUARE_FIELD_ORDER.length && connection?.ok && !failing) return { tone: "green", words: "live" };
  if (failing) {
    return setCount === SQUARE_FIELD_ORDER.length
      ? { tone: "rose", words: "needs a fix" }
      : { tone: "rose", words: `partly set up · ${setCount} of 5 — needs a fix` };
  }
  return { tone: "lavender", words: `partly set up · ${setCount} of 5` };
}

/** Stripe's chip can never say "live" honestly — the rail is not built. */
export function stripeChip(savedCount: number): ChipWords {
  if (savedCount <= 0) return { tone: "grey", words: "not set up" };
  if (savedCount === 1) return { tone: "lavender", words: "partly set up · 1 of 2" };
  return { tone: "lavender", words: "keys saved — not built yet" };
}

// ── rendering ─────────────────────────────────────────────────────────────

/** the mark — the WORDS beside it always carry the meaning; the glyph and
 *  its color only ever repeat them (no color-only meaning) */
function Mark({ mark }: { mark: RowMark }) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 15, height: 15, borderRadius: 4, flex: "0 0 auto",
    fontSize: ".7rem", fontWeight: 700, lineHeight: 1, transform: "translateY(2px)",
  };
  if (mark === "check")
    return <span aria-label="verified" style={{ ...base, color: "var(--ok)", border: "1.5px solid var(--ok)" }}>✓</span>;
  if (mark === "error")
    return <span aria-label="failing" style={{ ...base, color: "var(--err)", border: "1.5px solid var(--err)" }}>✕</span>;
  if (mark === "pending")
    return <span aria-label="waiting" style={{ ...base, border: "1.5px dashed var(--muted)" }} />;
  return <span aria-label="not set" style={{ ...base, border: "1.5px solid var(--muted)" }} />;
}

async function saveSquareField(fieldName: SquareFieldName, value: string): Promise<{ ok: boolean; reason?: string }> {
  return fetch("/api/admin/store/square", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field: fieldName, value }),
  }).then((r) => r.json()).catch(() => ({ ok: false, reason: "the vault didn't answer — try again" }));
}

const SQUARE_PLACEHOLDER: Record<SquareFieldName, string> = {
  "access-token": "EAAA…",
  "location-id": "L…",
  environment: "",
  "webhook-signature-key": "paste the signing key from the Square webhook subscription",
  "webhook-url": "",
};

/** the folded paste-in form ("Set it here instead") — write-only, the saved
 *  value is never shown back, same vault law as the old drawer */
function SquareVaultForm({
  name, defaultValue, onSaved,
}: {
  name: SquareFieldName;
  defaultValue?: string;
  onSaved: () => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function save(v: string) {
    if (!v.trim()) return;
    setBusy(true);
    setNote("");
    const res = await saveSquareField(name, v);
    setBusy(false);
    if (res?.ok) {
      setValue("");
      onSaved();
    } else {
      setNote(res?.reason ?? "the vault didn't answer — try again");
    }
  }

  return (
    <div style={{ marginTop: 6 }}>
      {name === "environment" ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-sm" disabled={busy} onClick={() => save("sandbox")}>Sandbox</button>
          <button className="btn btn-sm" disabled={busy} onClick={() => save("production")}>Production</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type={name === "webhook-url" ? "text" : "password"}
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={defaultValue || SQUARE_PLACEHOLDER[name]}
            style={{ ...field, flex: "1 1 260px", fontFamily: "monospace" }}
          />
          <button
            className="btn btn-sm"
            onClick={() => save(value.trim() || defaultValue || "")}
            disabled={busy || !(value.trim() || defaultValue)}
          >
            {busy ? "Saving…" : "Save to the vault"}
          </button>
        </div>
      )}
      {note && <p style={{ margin: "6px 0 0", fontSize: ".76rem", color: "var(--warn)" }}>{note}</p>}
    </div>
  );
}

function SquareRow({
  row, defaultWebhookUrl, onSaved,
}: {
  row: ChecklistRow;
  defaultWebhookUrl?: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: "8px 0", borderBottom: "1px solid rgba(139,118,196,.14)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
        <Mark mark={row.mark} />
        <code style={{ fontSize: ".72rem", letterSpacing: ".06em" }}>{row.envName}</code>
        <span style={{ fontSize: ".76rem", color: "var(--muted)" }}>
          {row.where}
          {row.where === "in the vault" && row.savedAt ? ` · saved ${day(row.savedAt)}` : ""}
        </span>
      </div>
      <div style={{ marginLeft: 23, fontSize: ".78rem", color: row.mark === "error" ? "var(--err)" : "var(--muted)" }}>
        {row.note}
      </div>
      {row.canPaste && (
        <div style={{ marginLeft: 23, marginTop: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen((o) => !o)}>
            {open ? "Keep it unset for now" : "Set it here instead"}
          </button>
          {open && (
            <SquareVaultForm
              name={row.field}
              defaultValue={row.field === "webhook-url" ? defaultWebhookUrl : undefined}
              onSaved={() => { setOpen(false); onSaved(); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SquareSection() {
  const [data, setData] = useState<SquareDeskStatus | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  function refresh() {
    fetch("/api/admin/store/square", { cache: "no-store" })
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
    setTestResult(res?.ok
      ? { ok: true, text: res.message }
      : { ok: false, text: res?.reason ?? "the desk didn't answer — try again" });
    refresh(); // the button's verdict is the checklist's verdict — one cache
  }

  const rows = data ? deriveSquareRows(data) : [];
  const chip = data ? squareChip(rows, data.connection) : null;
  const sourceLine = !data
    ? ""
    : data.source === "env"
      ? "the five values live on Vercel"
      : data.source === "vault"
        ? "values from the vault — live at once, no redeploy"
        : "";

  const step: React.CSSProperties = { margin: "0 0 10px", fontSize: ".85rem", lineHeight: 1.65 };

  return (
    <section aria-label="Square" style={{ marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: ".88rem" }}>Square</b>
        {chip && <Chip tone={chip.tone}>{chip.words}</Chip>}
        {sourceLine && <span style={{ fontSize: ".76rem", color: "var(--muted)" }}>{sourceLine}</span>}
      </div>

      {reason ? (
        <p style={{ fontSize: ".82rem", color: "var(--warn)" }}>the desk didn&apos;t answer: {reason}</p>
      ) : !data ? null : (
        <>
          {/* the Admiral: "the vercel items underneath the test button" —
              the button comes FIRST, the checklist under it */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <button className="btn btn-sm" disabled={testBusy || !data.configured} onClick={testConnection}>
              {testBusy ? "Testing…" : "Test the connection"}
            </button>
            {!data.configured && (
              <span style={{ fontSize: ".76rem", color: "var(--muted)" }}>set the access token + location ID first</span>
            )}
          </div>
          {testResult && (
            <p style={{ margin: "6px 0 0", fontSize: ".82rem", color: testResult.ok ? "var(--ok)" : "var(--warn)" }}>
              {testResult.ok ? "✓ " : ""}{testResult.text}
            </p>
          )}

          <div style={{ marginTop: 6 }}>
            {rows.map((row) => (
              <SquareRow key={row.field} row={row} defaultWebhookUrl={data.defaultWebhookUrl} onSaved={refresh} />
            ))}
          </div>

          <details style={{ marginTop: 10, borderTop: "1px solid rgba(139,118,196,.18)", paddingTop: 10 }}>
            <summary style={{ cursor: "pointer", fontSize: ".82rem", color: "var(--gold-deep)", fontWeight: 600 }}>
              How to set this up
            </summary>
            <ol style={{ margin: "10px 0 0", paddingLeft: 20 }}>
              <li style={step}>
                Open the{" "}
                <a href="https://developer.squareup.com/apps" target="_blank" rel="noreferrer"
                  style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>Square developer dashboard</a>{" "}
                → your application → <b>Production</b> → <b>Credentials</b> — copy the <b>Access token</b>.
              </li>
              <li style={step}>
                Still in the dashboard: <b>Locations</b> — copy the <b>Location ID</b>.
              </li>
              <li style={step}>
                <b>Webhooks → Subscriptions</b> → add a subscription: URL{" "}
                <span style={{ fontFamily: "monospace", fontSize: ".78rem", wordBreak: "break-all",
                  display: "inline-block", background: "rgba(139,118,196,.1)", borderRadius: 6, padding: "2px 6px" }}>
                  {data.defaultWebhookUrl}
                </span>
                , API version <b style={{ fontFamily: "monospace" }}>2024-01-18</b>, events{" "}
                <b style={{ fontFamily: "monospace" }}>payment.updated</b> and{" "}
                <b style={{ fontFamily: "monospace" }}>order.updated</b> (add{" "}
                <b style={{ fontFamily: "monospace" }}>payment.created</b> and{" "}
                <b style={{ fontFamily: "monospace" }}>order.fulfillment.updated</b> too) — then copy the{" "}
                <b>Signature key</b>.
              </li>
              <li style={step}>
                Put the five values on <b>Vercel → Settings → Environment Variables → Production</b>, then{" "}
                <b>redeploy</b> — or paste them here instead (the vault rows above go live at once, no redeploy).
              </li>
              <li style={step}>
                Back here: press <b>Test the connection</b>, then send a test event from{" "}
                <b>Webhooks → Subscriptions</b> so the two webhook rows can prove themselves.
              </li>
            </ol>
          </details>
        </>
      )}
    </section>
  );
}

// ── Stripe — the two-key drawer, folded into the same card ────────────────

type StripeFieldName = "secret-key" | "webhook-secret";

const STRIPE_FIELDS: { name: StripeFieldName; label: string; placeholder: string }[] = [
  { name: "secret-key", label: "Restricted API key", placeholder: "rk_live_… (or sk_…)" },
  { name: "webhook-secret", label: "Webhook signing secret", placeholder: "whsec_…" },
];

function StripeRow({
  name, label, placeholder, status, onSaved,
}: {
  name: StripeFieldName;
  label: string;
  placeholder: string;
  status: FieldStatus | null;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const saved = !!status?.saved;

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
      setOpen(false);
      onSaved();
    } else {
      setNote(res?.reason ?? "the vault didn't answer — try again");
    }
  }

  return (
    <div style={{ padding: "8px 0", borderBottom: "1px solid rgba(139,118,196,.14)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
        <Mark mark={saved ? "check" : "empty"} />
        <span style={{ fontSize: ".82rem" }}>{label}</span>
        <span style={{ fontSize: ".76rem", color: "var(--muted)" }}>
          {saved ? `in the vault · saved ${day(status?.at)}` : "not set"}
        </span>
      </div>
      <div style={{ marginLeft: 23, fontSize: ".78rem", color: "var(--muted)" }}>
        {saved ? "saved — never shown back, never in an email" : "not set — the rail will need it once built"}
      </div>
      <div style={{ marginLeft: 23, marginTop: 4 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : saved ? "Replace it" : "Set it here instead"}
        </button>
        {open && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
            <input
              type="password"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              style={{ ...field, flex: "1 1 220px", fontFamily: "monospace" }}
            />
            <button className="btn btn-sm" onClick={save} disabled={busy || !value.trim()}>
              {busy ? "Saving…" : "Save to the vault"}
            </button>
          </div>
        )}
      </div>
      {note && <p style={{ margin: "6px 0 0 23px", fontSize: ".76rem", color: "var(--warn)" }}>{note}</p>}
    </div>
  );
}

function StripeSection() {
  const [status, setStatus] = useState<Record<string, FieldStatus> | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  // the webhook URL in the walk is derived from the site's own origin —
  // never a hardcoded deploy host. Read when the walk is first opened (an
  // event, not a render read — the purity law), dashed until then.
  const [origin, setOrigin] = useState("");

  function refresh() {
    fetch("/api/admin/store/stripe", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => (d?.ok ? setStatus(d.status ?? {}) : setReason(d?.reason ?? "unreachable")))
      .catch(() => setReason("unreachable"));
  }
  useEffect(() => {
    refresh();
  }, []);

  const savedCount = STRIPE_FIELDS.filter((f) => status?.[f.name]?.saved).length;
  const chip = status ? stripeChip(savedCount) : null;

  const step: React.CSSProperties = { margin: "0 0 10px", fontSize: ".85rem", lineHeight: 1.65 };

  return (
    <section aria-label="Stripe" style={{ marginTop: 14, borderTop: "1px solid rgba(139,118,196,.18)", paddingTop: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: ".88rem" }}>Stripe</b>
        {chip && <Chip tone={chip.tone}>{chip.words}</Chip>}
      </div>
      <p style={{ margin: "6px 0 4px", fontSize: ".78rem", color: "var(--muted)" }}>
        The Stripe card rail is <b>not built yet</b> — keys you save wait in the vault, and nothing
        charges until the rail ships.
      </p>

      {reason ? (
        <p style={{ fontSize: ".82rem", color: "var(--warn)" }}>the vault didn&apos;t answer: {reason}</p>
      ) : !status ? null : (
        <>
          {STRIPE_FIELDS.map((f) => (
            <StripeRow key={f.name} name={f.name} label={f.label} placeholder={f.placeholder}
              status={status?.[f.name] ?? null} onSaved={refresh} />
          ))}

          <details style={{ marginTop: 10, borderTop: "1px solid rgba(139,118,196,.18)", paddingTop: 10 }}
            onToggle={() => setOrigin((o) => o || window.location.origin)}>
            <summary style={{ cursor: "pointer", fontSize: ".82rem", color: "var(--gold-deep)", fontWeight: 600 }}>
              How to set this up
            </summary>
            <ol style={{ margin: "10px 0 0", paddingLeft: 20 }}>
              <li style={step}>
                Open <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer"
                  style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>dashboard.stripe.com</a>{" "}
                → <b>Developers → API keys</b> → <b>Create restricted key</b>. Name it{" "}
                <b>&ldquo;One Cocreation site&rdquo;</b> and give it <b>Checkout Sessions</b> — <b>Write</b>.
                Copy the key (it starts <b style={{ fontFamily: "monospace" }}>rk_</b>) and paste it above.
              </li>
              <li style={step}>
                <b>Developers → Webhooks</b> → <b>Add endpoint</b>: URL{" "}
                <span style={{ fontFamily: "monospace", fontSize: ".78rem", wordBreak: "break-all",
                  display: "inline-block", background: "rgba(139,118,196,.1)", borderRadius: 6, padding: "2px 6px" }}>
                  {origin ? `${origin}/api/store/webhook/stripe` : "—"}
                </span>{" "}
                listening for <b style={{ fontFamily: "monospace" }}>checkout.session.completed</b>, then reveal
                the <b>Signing secret</b> (starts <b style={{ fontFamily: "monospace" }}>whsec_</b>) and paste it above.
              </li>
              <li style={step}>
                That&apos;s all there is to do — the Stripe card rail itself is <b>not built yet</b>, so the
                keys simply wait in the vault until it ships.
              </li>
            </ol>
          </details>
        </>
      )}
    </section>
  );
}

export default function CardsRailCard() {
  return (
    <div style={{ background: "var(--glass)", border: "1px solid rgba(255,255,255,.9)", borderRadius: 18,
      padding: "14px 16px", marginTop: 12, boxShadow: "0 18px 44px -28px rgba(120,100,160,.45)", maxWidth: 680 }}>
      <b style={{ fontSize: ".95rem" }}>Cards</b>
      <SquareSection />
      <StripeSection />
    </div>
  );
}
