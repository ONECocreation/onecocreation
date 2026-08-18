"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartridge } from "@/brand/cartridge";

/**
 * THE TWO-BREATH WELCOME (the Admiral's answers, 0018.05.15):
 *  1 · JOIN — email + code, gifts do the talking (Heartfield Commons for
 *      everyone; the free month of Weekly Intuitive is Love's to give
 *      AFTER the discovery call — real people, real classes).
 *  2 · NAMES — an account name (@onecocreation, availability-checked) and
 *      a call-me name. Community names strongly preferred.
 *  3 · YOU'RE IN — three doors. Everything else lives on /me, later.
 * Key folk take the quiet 🔑 door to /login; their claim rail is there.
 */

const glassField: React.CSSProperties = {
  border: "1.5px solid rgba(180,134,43,.65)", borderRadius: 999,
  background: "rgba(255,255,255,.94)", color: "#4a4458",
  padding: "13px 20px", fontSize: "1rem", width: "100%", boxSizing: "border-box",
  textAlign: "center", fontFamily: "inherit",
};

const giftChip: React.CSSProperties = {
  fontSize: ".64rem", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase",
  borderRadius: 999, padding: "5px 12px", background: "rgba(217,178,78,.14)",
  border: "1px solid rgba(217,178,78,.5)", color: "#EBCB77", whiteSpace: "nowrap",
};

export default function WelcomeFlow() {
  const [step, setStep] = useState<"join" | "code" | "names" | "in">("join");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [callMe, setCallMe] = useState("");
  const [avail, setAvail] = useState<"idle" | "checking" | "free" | "taken" | "bad">("idle");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  // already signed in? skip straight to names (or the doors)
  useEffect(() => {
    fetch("/api/me/letters", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.signedIn && d.email) {
          fetch("/api/member/profile")
            .then((r) => (r.ok ? r.json() : null))
            .then((p) => {
              if (!p?.ok) return setStep("names");
              setAccountName(p.accountName ?? "");
              setCallMe(p.displayName ?? "");
              setStep(p.accountName ? "in" : "names");
            })
            .catch(() => setStep("names"));
        }
      })
      .catch(() => {});
  }, []);

  // live tag availability, gently debounced
  useEffect(() => {
    if (step !== "names") return;
    const want = accountName.trim().toLowerCase();
    if (!want) { setAvail("idle"); return; }
    if (!/^[a-z0-9][a-z0-9_-]{1,23}$/.test(want)) { setAvail("bad"); return; }
    setAvail("checking");
    const t = setTimeout(() => {
      fetch(`/api/frens/availability?handle=${encodeURIComponent(want)}`)
        .then((r) => r.json())
        .then((d) => setAvail(d.available ? "free" : "taken"))
        .catch(() => setAvail("idle"));
    }, 350);
    return () => clearTimeout(t);
  }, [accountName, step]);

  async function start() {
    setBusy(true); setNote("");
    const res = await fetch("/api/auth/email/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    }).then((r) => r.json()).catch(() => null);
    setBusy(false);
    if (res?.ok) setStep("code");
    else setNote(res?.reason ?? "that didn't take — check the email and try again");
  }

  async function verify() {
    setBusy(true); setNote("");
    const res = await fetch("/api/auth/email/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), code: code.trim() }),
    }).then((r) => r.json()).catch(() => null);
    setBusy(false);
    if (res?.ok) setStep("names");
    else setNote(res?.reason ?? "that code didn't sing — try again");
  }

  async function saveNames() {
    if (avail !== "free" && accountName) { setNote("that name is taken — try another"); return; }
    if (!accountName) { setNote("pick your community name — it's how the circle knows you 💛"); return; }
    setBusy(true); setNote("");
    const res = await fetch("/api/member/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountName: accountName.trim(), displayName: (callMe || accountName).trim() }),
    }).then((r) => r.json()).catch(() => null);
    setBusy(false);
    if (res?.ok) setStep("in");
    else setNote(res?.reason ?? "that didn't save — try again");
  }

  const shell: React.CSSProperties = {
    maxWidth: 420, margin: "0 auto", textAlign: "center",
    background: "var(--glass)", backdropFilter: "blur(9px)", borderRadius: 30,
    border: "1px solid var(--glass-edge)", padding: "34px 28px 30px",
    boxShadow: "0 30px 70px -28px rgba(5,3,16,.8)",
  };

  return (
    <div style={shell}>
      {step === "join" && (
        <>
          <div className="constellation" aria-hidden style={{ margin: "0 0 6px" }}>{cartridge.constellation}</div>
          <h1 className="stack-hero" style={{ fontSize: "1.6rem" }}>
            <span className="sh-ink">JOIN</span>
            <span className="sh-teal">THE FIELD</span>
          </h1>
          <p style={{ fontSize: ".85rem", color: "var(--muted)", margin: "10px 0 0" }}>free · takes one breath</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", margin: "14px 0 4px" }}>
            <span style={giftChip}>🕊️ discovery call — credited</span>
            <span style={giftChip}>🗓️ the booking calendar</span>
            <span style={giftChip}>💗 Heartfield Commons</span>
          </div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
            placeholder="your@email.com" style={{ ...glassField, margin: "16px 0 12px" }} />
          {note && <p style={{ margin: "0 0 10px", fontSize: ".8rem", color: "#E7B2C3" }}>{note}</p>}
          <button className="btn btn-shimmer" onClick={start} disabled={busy || !email.includes("@")}>
            {busy ? "Sending your code…" : "YES! — join free"}
          </button>
          <p style={{ marginTop: 16 }}>
            <Link href="/login" style={{ fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: ".08em", color: "var(--muted)", textDecoration: "none" }}>
              🔑 I have a nostr key instead
            </Link>
          </p>
          <p style={{ margin: "18px 0 0", fontSize: ".68rem", color: "var(--muted)" }}>
            one email, no password — a six-digit code signs you in anywhere.
          </p>
        </>
      )}

      {step === "code" && (
        <>
          <p style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: ".66rem",
            letterSpacing: ".2em", color: "var(--muted)", margin: "0 0 10px" }}>CHECK YOUR EMAIL ✉️</p>
          <h1 className="stack-hero" style={{ fontSize: "1.4rem" }}>
            <span className="sh-ink">SIX LITTLE</span>
            <span className="sh-teal">DIGITS</span>
          </h1>
          <p style={{ fontSize: ".82rem", color: "var(--muted)", margin: "10px 0 0" }}>
            sent to <b style={{ color: "var(--ink-strong)" }}>{email}</b>
          </p>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
            inputMode="numeric" placeholder="••••••"
            style={{ ...glassField, margin: "16px 0 12px", letterSpacing: ".4em", fontSize: "1.3rem" }} />
          {note && <p style={{ margin: "0 0 10px", fontSize: ".8rem", color: "#E7B2C3" }}>{note}</p>}
          <button className="btn" onClick={verify} disabled={busy || code.length !== 6}>
            {busy ? "Opening the door…" : "Step in ✨"}
          </button>
          <p style={{ marginTop: 14 }}>
            <button onClick={() => { setStep("join"); setCode(""); }} style={{ background: "none", border: 0,
              cursor: "pointer", fontFamily: "inherit", fontSize: ".7rem", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)" }}>
              ← different email
            </button>
          </p>
        </>
      )}

      {step === "names" && (
        <>
          <p style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: ".66rem",
            letterSpacing: ".2em", color: "var(--muted)", margin: "0 0 10px" }}>LAST STEP</p>
          <h1 className="stack-hero" style={{ fontSize: "1.4rem" }}>
            <span className="sh-ink">WHAT DO WE</span>
            <span className="sh-teal">CALL YOU?</span>
          </h1>
          {/* two names, each said plainly (Love's own ask, mid-claim as firefair, 0018.05.15) */}
          <p style={{ margin: "18px 0 6px", fontSize: ".68rem", fontWeight: 700, letterSpacing: ".08em",
            textTransform: "uppercase", color: "var(--muted)", textAlign: "left" }}>
            community name — how those in the field see you
          </p>
          <div style={{ position: "relative", margin: "0 0 4px" }}>
            <input value={accountName}
              onChange={(e) => setAccountName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              placeholder="your community name" style={{ ...glassField, textAlign: "right", paddingRight: 150 }} />
            <span style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)",
              color: "#897F97", fontSize: ".9rem", pointerEvents: "none" }}>@onecocreation</span>
          </div>
          <p style={{ margin: "0 0 10px", fontSize: ".74rem", fontWeight: 700, minHeight: "1.2em",
            color: avail === "free" ? "#7fb98f" : avail === "taken" || avail === "bad" ? "#E7B2C3" : "var(--muted)" }}>
            {avail === "free" ? "✓ name available" : avail === "taken" ? "already claimed — try another"
              : avail === "bad" ? "letters, numbers, - and _ only" : avail === "checking" ? "listening…" : " "}
          </p>
          <p style={{ margin: "0 0 6px", fontSize: ".68rem", fontWeight: 700, letterSpacing: ".08em",
            textTransform: "uppercase", color: "var(--muted)", textAlign: "left" }}>
            who you want to be known as
          </p>
          <input value={callMe} onChange={(e) => setCallMe(e.target.value)}
            placeholder={`call me… ${accountName ? `(or just "${accountName}")` : ""}`}
            style={{ ...glassField, marginBottom: 12 }} maxLength={48} />
          {note && <p style={{ margin: "0 0 10px", fontSize: ".8rem", color: "#E7B2C3" }}>{note}</p>}
          <button className="btn" onClick={saveNames} disabled={busy}>
            {busy ? "Weaving you in…" : "Claim it 💫"}
          </button>
        </>
      )}

      {step === "in" && (
        <>
          <div className="constellation" aria-hidden style={{ margin: "0 0 6px" }}>{cartridge.constellation}</div>
          <h1 className="stack-hero" style={{ fontSize: "1.6rem" }}>
            <span className="sh-ink">YOU&apos;RE</span>
            <span className="sh-teal">✨ IN ✨</span>
          </h1>
          <p style={{ fontSize: ".9rem", margin: "10px 0 4px" }}>
            welcome home{callMe ? <>, <b style={{ color: "#EBCB77" }}>{callMe}</b></> : ""} — your doors are open.
          </p>
          <div style={{ display: "grid", gap: 10, margin: "18px 0 0", textAlign: "left" }}>
            {[
              { icon: "🕊️", t: "Book your discovery call", w: "credited toward your first session", href: "/book/discovery-call" },
              { icon: "💗", t: "Step into Heartfield Commons", w: "the free circle, open to every member", href: "/classes" },
              { icon: "🌙", t: "Wander the store", w: "meditations, sessions, wares", href: "/store" },
            ].map((d) => (
              <Link key={d.t} href={d.href} style={{ display: "flex", alignItems: "center", gap: 12,
                textDecoration: "none", color: "var(--ink-body)", borderRadius: 16, padding: "13px 16px",
                background: "rgba(255,255,255,.05)", border: "1px solid var(--glass-edge)", fontSize: ".85rem" }}>
                <span style={{ fontSize: "1.2rem" }}>{d.icon}</span>
                <span style={{ flex: 1 }}>
                  <b style={{ display: "block", fontFamily: "var(--font-h3)", fontWeight: 400, color: "var(--ink-strong)" }}>{d.t}</b>
                  <span style={{ fontSize: ".72rem", color: "var(--muted)" }}>{d.w}</span>
                </span>
                <span style={{ fontSize: ".66rem", fontWeight: 700, textTransform: "uppercase", color: "#EBCB77" }}>go</span>
              </Link>
            ))}
          </div>
          <p style={{ margin: "18px 0 0", fontSize: ".68rem", color: "var(--muted)" }}>
            after your call, Love may open a month of the Weekly Intuitive for you 💛 · finish your
            constellation anytime on <Link href="/me" style={{ color: "#EBCB77" }}>your page</Link>
          </p>
        </>
      )}
    </div>
  );
}
