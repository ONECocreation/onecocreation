"use client";

import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SignerDoors from "@/components/SignerDoors";

/**
 * The admin door — same trust model as everything else here: the operator IS
 * a key. Sign a fresh challenge with an allowlisted key (OPERATOR_NPUBS) and
 * the admin side opens. No password, nothing stored, nothing to leak.
 * Mobile parity (Module 6): the same challenge signs through a remote
 * signer or an Android signer app — the artist's shelf works from a phone.
 */
export default function OperatorGate({ configured }: { configured: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* One submit path for every door — extension, bunker, Android signer. */
  async function submitConsole(event: unknown): Promise<string | null> {
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      });
      let data: { ok?: boolean; reason?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        /* non-JSON = the server fell over, not the key */
      }
      if (!res.ok || !data?.ok) {
        return (
          data?.reason ?? `the server hiccuped (HTTP ${res.status}) — your key is fine; check the deployment env`
        );
      }
      window.location.reload();
      return null;
    } catch {
      return "couldn't reach the server — check your connection and try again";
    }
  }

  async function verify() {
    setError(null);
    if (!window.nostr) {
      setError("no signer extension in this browser — use the phone doors below, or install nos2x / Alby");
      return;
    }
    setBusy(true);
    /* signer rejection = the operator's call; a server fault = ours. Never
       blame the key for a 500 (the SEAT_SECRET lesson). */
    let event;
    try {
      event = await window.nostr.signEvent({
        kind: 22242,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: `PACS-CONSOLE-${Date.now()}`,
      });
    } catch {
      setError("signing was declined — nothing sent");
      setBusy(false);
      return;
    }
    const reason = await submitConsole(event);
    if (reason) setError(reason);
    setBusy(false);
  }

  return (
    <main className="mgmt-ground">
      <SiteHeader />
      <div className="mgmt-wrap mgmt-body" style={{ maxWidth: 640 }}>
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md p-8 text-center" style={{ background: "var(--panel, #1b1530)", /* was rgba(255,255,255,.6) glass — composited to a grey no ink was measured against (Admiral's sighting, studio-feedback1) */ border: "1.5px solid rgba(139,118,196,.35)", borderRadius: 20 }}>
          <p className="mgmt-eyebrow mb-4">Operators</p>
          <h1 className="mgmt-title mb-4">Operator sign-in</h1>
          <p className="mb-6 font-body text-sm text-white/85">
            This area is for site operators. Sign in with your operator key &mdash;
            one click if your signer extension is installed.
          </p>
          {configured ? (
            <>
              <button
                onClick={verify}
                disabled={busy}
                className="btn min-h-11 w-full touch-manipulation"
              >
                {busy ? "Reading your signature…" : "Verify operator key"}
              </button>
              <details className="mt-4 text-left">
                <summary className="cursor-pointer list-none rounded-lg border px-4 py-2.5 text-center font-body text-xs uppercase tracking-wider"
                  style={{ borderColor: "rgba(139,118,196,.45)", color: "var(--ink, #E9E2F2)", letterSpacing: ".08em" }}>
                  Other ways to sign in</summary>
                <div className="mt-3">
                  <SignerDoors kind="console" submit={submitConsole} />
                </div>
              </details>
              {/* the email seat (Love's door, 0018.05.15) — no key ceremony,
                  just her ordinary sign-in; the gate recognizes the address */}
              <p className="mt-5" style={{ fontSize: ".78rem", color: "var(--muted)" }}>
                Prefer email?{" "}
                <a href="/login" style={{ color: "var(--gold-deep, #D9B24E)", textDecoration: "underline" }}>
                  Sign in with your email
                </a>{" "}
                &mdash; then come back here and you&apos;re in.
              </p>
            </>
          ) : (
            <p
              className="console-card p-4 font-pixel text-[10px] uppercase leading-relaxed text-cyan"
              data-accent="cyan"
            >
              NO OPERATOR KEYS CONFIGURED — SET{" "}
              <span className="text-white/80">OPERATOR_NPUBS</span> IN THE DEPLOYMENT ENV
              (COMMA-SEPARATED NPUBS), THEN RELOAD
            </p>
          )}
          {error && (
            <p className="mt-4 font-pixel text-[10px] uppercase text-ghost">{error}</p>
          )}
        </div>
      </div>
      </div>
      <SiteFooter />
    </main>
  );
}
