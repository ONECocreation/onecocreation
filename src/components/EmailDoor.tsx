"use client";

import { useState } from "react";

/**
 * The email door (the Admiral's ask): sign in with just an inbox — a code
 * arrives, you enter it, you're home. Lives beside the key door on /login;
 * keys stay the sovereign path, this one is for reach.
 */
export default function EmailDoor({ bare = false }: { bare?: boolean }) {
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/auth/email/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string };
      if (data.ok) {
        setStep("code");
        setNote("Check your inbox — a six-digit code is on its way.");
      } else {
        setNote(data.reason ?? "Something went sideways — try again.");
      }
    } catch {
      setNote("Something went sideways — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string };
      if (data.ok) {
        setStep("done");
        setNote("You're in — welcome home.");
        setTimeout(() => window.location.assign("/me"), 900);
      } else {
        setNote(data.reason ?? "That code didn't match — try again.");
      }
    } catch {
      setNote("Something went sideways — try again.");
    } finally {
      setBusy(false);
    }
  }

  /* paper pill, dark ink — the house input law (Admiral, 0018.05.15) */
  const inputStyle: React.CSSProperties = {
    flex: "1 1 200px",
    padding: "12px 16px",
    borderRadius: 999,
    border: "1.5px solid rgba(180,134,43,.65)",
    background: "rgba(255,255,255,.94)",
    color: "#4a4458",
    fontSize: ".95rem",
  };

  return (
    <div
      style={
        bare
          ? undefined
          : {
              marginTop: 26,
              padding: "22px 24px",
              borderRadius: 20,
              border: "1.5px solid rgba(139,118,196,.35)",
              background: "rgba(255,255,255,.5)",
            }
      }
    >
      {!bare && (
        <h2 style={{ fontFamily: "var(--font-h2)", fontWeight: 400, fontSize: "1.2rem", margin: 0 }}>
          Prefer email? Sign in with a code.
        </h2>
      )}
      <p style={{ color: "var(--muted)", fontSize: ".88rem", margin: "6px 0 14px" }}>
        No keys needed — we send a six-digit code to your inbox and you&apos;re in.
      </p>

      {step === "email" && (
        <form onSubmit={start} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            aria-label="Email address"
            style={inputStyle}
          />
          <button className="btn btn-gold" type="submit" disabled={busy}>
            {busy ? "Sending…" : "Email me a code"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={verify} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            inputMode="numeric"
            pattern="\d{6}"
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
            placeholder="6-digit code"
            aria-label="Sign-in code"
            style={{ ...inputStyle, letterSpacing: ".3em", flex: "0 1 170px" }}
          />
          <button className="btn btn-gold" type="submit" disabled={busy || code.length !== 6}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setStep("email");
              setCode("");
              setNote("");
            }}
          >
            different email
          </button>
        </form>
      )}

      {note && (
        <p style={{ color: step === "done" ? "var(--rose)" : "var(--muted)", fontSize: ".88rem", marginTop: 12 }}>
          {note}
        </p>
      )}
    </div>
  );
}
