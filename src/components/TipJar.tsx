"use client";

import { useState } from "react";
import { payInModal } from "@/lib/btcpay-modal";

/**
 * Three jars, one gesture (the Admiral's design): tip Love, tip the house,
 * or pay a session forward for someone who can't. Presets are angel numbers;
 * custom keeps it open. POST /api/tip mints the invoice; BTCPay's checkout
 * (lightning-first) takes it from there.
 */
const JARS = [
  {
    key: "love",
    title: "Tip Love",
    blurb: "A direct thank-you to Love for the work and the field she holds.",
  },
  {
    key: "onecocreation",
    title: "Tip One Cocreation",
    blurb: "Keeps the lights on — the site, the rails, the rooms.",
  },
  {
    key: "payforward",
    title: "Pay It Forward",
    blurb: "Fund a session or membership for someone who can't right now.",
  },
] as const;

const PRESETS = [2_100, 11_111, 111_111];

export default function TipJar() {
  const [jar, setJar] = useState<(typeof JARS)[number]["key"]>("love");
  const [sats, setSats] = useState<number>(11_111);
  const [custom, setCustom] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [note, setNote] = useState("");

  const amount = custom ? Math.floor(Number(custom)) : sats;

  async function give() {
    if (state === "busy") return;
    setState("busy");
    setNote("");
    try {
      const res = await fetch("/api/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: jar, amountSats: amount }),
      });
      const data = (await res.json()) as { ok: boolean; payUrl?: string; reason?: string };
      if (data.ok && data.payUrl) {
        const opened = await payInModal(data.payUrl, {
          onPaid: () => { setState("idle"); setNote("received with love 💛 — thank you"); },
          onClose: () => setState("idle"),
        });
        if (!opened) { window.location.href = data.payUrl; return; }
        setNote("");
        return;
      }
      setState("error");
      setNote(data.reason ?? "Something went sideways — please try again.");
    } catch {
      setState("error");
      setNote("Something went sideways — please try again.");
    }
  }

  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        {JARS.map((j) => (
          <button
            key={j.key}
            type="button"
            onClick={() => setJar(j.key)}
            style={{
              textAlign: "left",
              padding: "16px 18px",
              borderRadius: 18,
              cursor: "pointer",
              background: jar === j.key ? "rgba(217,178,78,.18)" : "var(--ghost-bg)",
              border: jar === j.key ? "1.5px solid var(--gold-deep)" : "1.5px solid rgba(180,134,43,.3)",
            }}
          >
            <div style={{ fontFamily: "var(--font-h3)", fontSize: "1.06rem", color: "var(--ink-strong)" }}>{j.title}</div>
            <div style={{ fontSize: ".85rem", color: "var(--muted)", marginTop: 4 }}>{j.blurb}</div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 18 }}>
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setSats(p);
              setCustom("");
            }}
            style={{
              border: !custom && sats === p ? "1.5px solid var(--gold-deep)" : "1.5px solid rgba(180,134,43,.4)",
              background: !custom && sats === p ? "rgba(217,178,78,.14)" : "transparent",
              color: "var(--gold-deep)",
              borderRadius: 999,
              padding: "9px 17px",
              fontWeight: 700,
              fontSize: ".84rem",
              cursor: "pointer",
            }}
          >
            {p.toLocaleString()} sats
          </button>
        ))}
        <input
          inputMode="numeric"
          placeholder="custom sats"
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ""))}
          aria-label="Custom amount in sats"
          style={{
            width: 130,
            padding: "9px 14px",
            borderRadius: 999,
            border: "1.5px solid rgba(180,134,43,.65)",
            background: "rgba(255,255,255,.92)",
            color: "var(--field-ink)",
            fontSize: ".9rem",
          }}
        />
        <button className="btn btn-gold" type="button" onClick={give} disabled={state === "busy" || !amount}>
          {state === "busy" ? "Opening the jar…" : `Give ⚡ ${amount ? amount.toLocaleString() : "—"} sats`}
        </button>
      </div>
      {state === "error" && <p style={{ color: "var(--muted)", fontSize: ".85rem", marginTop: 10 }}>{note}</p>}
    </div>
  );
}
