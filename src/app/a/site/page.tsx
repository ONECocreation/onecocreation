"use client";

import { useEffect, useState } from "react";
import { Chip, SectionHead, field } from "@/components/console/glass";
import type { SiteConfig } from "@/lib/site-config";

/**
 * /a/site — THE SWITCHES (TASK-129, cut 0018.06.16 a₿). One card per group:
 * the features Love can hide until they're finished, the payment rails she
 * can turn on and off, and how sessions meet. Legibility doctrine: the state
 * rides IN WORDS next to every toggle ("ON — showing" / "OFF — hidden"),
 * never color alone. Payment toggles name their env vars and say
 * configured/not — a switch can't conjure a rail whose env isn't there, so
 * an unconfigured rail's toggle greys out and says why.
 */

type RailStatus = Record<"btcpay" | "square" | "stripe", { configured: boolean; env: string[] }>;

const FEATURE_ROWS: { key: keyof SiteConfig["features"]; label: string; about: string }[] = [
  { key: "community", label: "Community", about: "the Community door in the nav, the home community section, the 11:11 Live with Love door" },
  { key: "classes", label: "Classes", about: "the Classes & rooms listing inside Community" },
  { key: "store", label: "Store", about: "the Store door in the nav and the shelf itself" },
  { key: "sessions", label: "Sessions", about: "the Sessions door in the nav and booking" },
  { key: "cuts", label: "ConsciousCuts", about: "the ConsciousCuts & Waxing door on the home's Connect row" },
  { key: "jars", label: "Tip jars", about: "the tip jars in the Support section" },
  { key: "news", label: "News & letters", about: "the News & letters door in the nav" },
];

const RAIL_ROWS: { key: keyof SiteConfig["payments"]; label: string; about: string }[] = [
  { key: "btcpay", label: "Bitcoin (BTCPay)", about: "bitcoin / lightning checkout, straight to Love's own node" },
  { key: "square", label: "Card (Square)", about: "card checkout through Square's own hosted page" },
  { key: "stripe", label: "Card (Stripe)", about: "card checkout through Stripe — the adapter isn't built yet; keys live in the Money room's key drawer" },
];

const MEETING_RAILS: { key: SiteConfig["meeting"]["rail"]; label: string; about: string }[] = [
  { key: "jitsi", label: "Jitsi", about: "sessions meet on your own Jitsi — the room opens on this site" },
  { key: "vdo", label: "VDO.Ninja", about: "sessions meet on VDO.Ninja — guest and director links on this site" },
  { key: "static", label: "Zoom / any link", about: "sessions meet at a pasted link" },
];

const row: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
  background: "var(--glass)", border: "1px solid rgba(139,118,196,.22)",
  borderRadius: 12, padding: "10px 14px", marginBottom: 8,
};

export default function SiteRoom() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [rails, setRails] = useState<RailStatus | null>(null);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/site", { cache: "no-store" });
      if (res.status === 401) return setDenied(true);
      const data = await res.json();
      if (data.ok) {
        setConfig(data.config);
        setRails(data.rails);
      }
    })();
  }, []);

  async function save() {
    if (!config) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          features: config.features,
          payments: config.payments,
          meeting: config.meeting,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setConfig(data.config);
        setRails(data.rails);
        setNote("saved ✓ the site reads the switches on its next render");
      } else setNote(data.reason ?? "save failed");
    } catch {
      setNote("save failed");
    } finally {
      setBusy(false);
    }
  }

  if (denied)
    return (
      <p className="p-6 text-sm" style={{ color: "var(--muted)" }}>
        operator session required — <a href="/a" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>sign in at the door</a>
      </p>
    );
  if (!config || !rails) return <p className="p-6 text-sm" style={{ color: "var(--muted)" }}>reading the switches…</p>;

  const toggle = (on: boolean, disabled: boolean, label: string, onFlip: () => void) => (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      disabled={disabled}
      onClick={onFlip}
      className={`btn btn-sm ${on ? "btn-on" : "btn-ghost"}`}
      style={disabled ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
    >
      {on ? "ON" : "OFF"}
    </button>
  );

  return (
    <div className="p-6" style={{ maxWidth: 860 }}>
      <h1 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 4px" }}>The Switches</h1>
      <p style={{ fontSize: ".82rem", color: "var(--muted)", margin: "0 0 6px", maxWidth: 640 }}>
        Hide what isn&apos;t finished, turn the payment types on and off. A rail is live only when its
        switch is ON <em>and</em> its keys are configured — the words under each toggle say which.
      </p>

      {/* ── the features ── */}
      <SectionHead label="Features — what the site shows" />
      {FEATURE_ROWS.map((r) => {
        const on = config.features[r.key];
        return (
          <div key={r.key} style={row}>
            {toggle(on, false, `${r.label} — currently ${on ? "on" : "off"}`, () =>
              setConfig({ ...config, features: { ...config.features, [r.key]: !on } }))}
            <div style={{ flex: 1, minWidth: 220 }}>
              <b style={{ fontSize: ".9rem" }}>{r.label}</b>
              <span style={{ fontSize: ".78rem", color: "var(--muted)" }}> — {on ? "showing" : "hidden"}: {r.about}</span>
            </div>
            <Chip tone={on ? "green" : "grey"}>{on ? "ON — showing" : "OFF — hidden"}</Chip>
          </div>
        );
      })}

      {/* ── the payment rails ── */}
      <SectionHead label="Payments — which rails can take money" />
      {RAIL_ROWS.map((r) => {
        const on = config.payments[r.key];
        const status = rails[r.key];
        const disabled = !status.configured;
        return (
          <div key={r.key} style={{ ...row, opacity: disabled ? 0.72 : 1 }}>
            {toggle(on && status.configured, disabled, `${r.label} — currently ${on ? "on" : "off"}`, () =>
              setConfig({ ...config, payments: { ...config.payments, [r.key]: !on } }))}
            <div style={{ flex: 1, minWidth: 220 }}>
              <b style={{ fontSize: ".9rem" }}>{r.label}</b>
              <span style={{ fontSize: ".78rem", color: "var(--muted)" }}> — {r.about}</span>
              <div style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 3 }}>
                {status.env.length > 0 ? (
                  <>
                    env: {status.env.map((n) => <code key={n} style={{ marginRight: 8 }}>{n}</code>)}
                    — {status.configured ? "configured ✓" : "not configured — the toggle stays dark until these are set"}
                  </>
                ) : (
                  "no env — keys are pasted in the Money room's Stripe drawer; the rail itself ships separately"
                )}
              </div>
            </div>
            <Chip tone={!status.configured ? "grey" : on ? "green" : "gold"}>
              {!status.configured ? "not configured" : on ? "ON — live" : "OFF — hidden"}
            </Chip>
          </div>
        );
      })}

      {/* ── how sessions meet ── */}
      <SectionHead label="Meetings — how sessions open" />
      <div style={row}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <b style={{ fontSize: ".9rem" }}>The meeting rail</b>
          <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>
            {" "}— new services default to this: {MEETING_RAILS.find((m) => m.key === config.meeting.rail)?.about}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {MEETING_RAILS.map((m) => (
            <button
              key={m.key}
              type="button"
              aria-pressed={config.meeting.rail === m.key}
              onClick={() => setConfig({ ...config, meeting: { ...config.meeting, rail: m.key } })}
              className={`btn btn-sm ${config.meeting.rail === m.key ? "btn-on" : "btn-ghost"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <Chip tone="lavender">rail: {config.meeting.rail}</Chip>
      </div>
      <div style={row}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <b style={{ fontSize: ".9rem" }}>Jitsi domain</b>
          <span style={{ fontSize: ".78rem", color: "var(--muted)" }}> — where the Jitsi rooms open; prefilled with this site&apos;s own</span>
        </div>
        <input
          value={config.meeting.jitsiDomain}
          onChange={(e) => setConfig({ ...config, meeting: { ...config.meeting, jitsiDomain: e.target.value } })}
          style={{ ...field, minWidth: 260 }}
          aria-label="Jitsi domain"
        />
      </div>
      <div style={row}>
        {toggle(config.meeting.allowStaticLinks, false,
          `Zoom / any link — currently ${config.meeting.allowStaticLinks ? "allowed" : "hidden"}`, () =>
            setConfig({ ...config, meeting: { ...config.meeting, allowStaticLinks: !config.meeting.allowStaticLinks } }))}
        <div style={{ flex: 1, minWidth: 220 }}>
          <b style={{ fontSize: ".9rem" }}>Zoom / any link</b>
          <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>
            {" "}— {config.meeting.allowStaticLinks ? "allowed" : "hidden"}: lets a service carry any pasted meeting link in the booking room
          </span>
        </div>
        <Chip tone={config.meeting.allowStaticLinks ? "green" : "grey"}>
          {config.meeting.allowStaticLinks ? "ON — allowed" : "OFF — hidden"}
        </Chip>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
        <button type="button" className="btn btn-gold btn-sm" disabled={busy} onClick={save}
          style={busy ? { opacity: 0.5 } : undefined}>
          {busy ? "Saving…" : "Save the switches"}
        </button>
        {note && <span style={{ fontSize: ".8rem", color: note.startsWith("saved") ? "var(--ok)" : "var(--err)" }}>{note}</span>}
      </div>
    </div>
  );
}
