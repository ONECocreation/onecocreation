"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { VerifiedEvent } from "nostr-tools/pure";
import {
  isAndroid,
  nip55SignUri,
  signViaBunker,
  startNostrConnect,
  type ChallengeKind,
} from "@/lib/signer-doors";

/**
 * The phone doors (spec: Module 6 / S1.5) — NIP-46 (remote signer, iOS +
 * any browser) and NIP-55 (Android signer apps) beside the NIP-07
 * extension. Same challenge, same endpoint, same session: the parent hands
 * us its submit function and keeps its own success navigation. Copy stays
 * honest about what each door needs; where a door can't work we say so —
 * never a fake door.
 */

/* hydration-safe one-shot platform read (the useHasSigner pattern) */
const noopSubscribe = () => () => {};
function useIsAndroid(): boolean | null {
  return useSyncExternalStore(noopSubscribe, () => isAndroid(), () => null);
}

export default function SignerDoors({
  kind,
  submit,
  next,
}: {
  kind: ChallengeKind;
  /** POST the signed challenge; resolve an error message, or null = the
      parent took over (session set, navigation underway). */
  submit: (event: VerifiedEvent) => Promise<string | null>;
  /** Same-origin path the NIP-55 bounce should land back on. */
  next?: string;
}) {
  const android = useIsAndroid();
  const [bunkerInput, setBunkerInput] = useState("");
  const [busy, setBusy] = useState<"idle" | "bunker" | "invite">("idle");
  const [invite, setInvite] = useState<{ uri: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  /* a half-open invite dies with the component */
  useEffect(() => {
    return () => {
      cancelRef.current?.();
    };
  }, []);

  /* nsec.app-style bunkers sometimes want a confirm page first */
  function onAuth(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSigned(event: VerifiedEvent) {
    const reason = await submit(event);
    if (reason) setError(reason);
  }

  async function signBunker() {
    if (!bunkerInput.trim()) {
      setError("paste your bunker:// address (or name@domain) first");
      return;
    }
    setError(null);
    setBusy("bunker");
    try {
      await handleSigned(await signViaBunker(bunkerInput, kind, onAuth));
    } catch (e) {
      setError(e instanceof Error ? e.message : "the bunker didn't answer");
    } finally {
      setBusy("idle");
    }
  }

  function makeInvite() {
    setError(null);
    setCopied(false);
    cancelRef.current?.();
    const inv = startNostrConnect(kind, onAuth);
    cancelRef.current = inv.cancel;
    setInvite({ uri: inv.uri });
    setBusy("invite");
    inv.signed
      .then((event) => handleSigned(event))
      .catch((e) => {
        /* a cancel is the fren's call — only report real failures */
        if (!(e instanceof Error && /abort/i.test(e.message))) {
          setError(e instanceof Error ? e.message : "your signer never answered");
        }
      })
      .finally(() => {
        setBusy("idle");
        setInvite(null);
      });
  }

  function cancelInvite() {
    cancelRef.current?.();
    cancelRef.current = null;
    setInvite(null);
    setBusy("idle");
  }

  async function copyInvite() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.uri);
      setCopied(true);
    } catch {
      setError("couldn't reach the clipboard — long-press the link instead");
    }
  }

  function openSignerApp() {
    setError(null);
    /* challenge minted at tap time — the 5-minute window covers the bounce;
       the console door lands back on the room it was opened from */
    const ret = next ?? (kind === "console" ? window.location.pathname : undefined);
    window.location.href = nip55SignUri(kind, ret);
  }

  return (
    <div className="space-y-3">
      {/* ── NIP-46: remote signer / bunker — iOS + any browser ─────────── */}
      <details style={{ borderRadius: 16, border: "1px solid var(--glass-edge)", background: "var(--glass)", padding: "12px 16px", textAlign: "left" }}>
        <summary className="btn-quiet" style={{ listStyle: "none", padding: 0 }}>remote signer · works on iPhone + any browser</summary>
        <div className="mt-3 space-y-3">
          <p style={{ fontSize: ".8rem", lineHeight: 1.7, color: "var(--ink-body)" }}>
            Your key lives in a signer you already trust — nsec.app, Amber, or
            your own nsecBunker — and answers over nostr. This page never sees
            it. Needs one of those set up first.
          </p>
          <label style={{ display: "block", fontSize: ".68rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)" }}>
            paste your bunker address
            <input
              value={bunkerInput}
              onChange={(e) => setBunkerInput(e.target.value)}
              placeholder="bunker://… or name@domain"
              autoComplete="off"
              spellCheck={false}
              style={{ marginTop: 6, width: "100%", boxSizing: "border-box", borderRadius: 999, border: "1.5px solid rgba(180,134,43,.65)", background: "rgba(255,255,255,.94)", color: "#4a4458", padding: "10px 16px", fontFamily: "monospace", fontSize: ".85rem" }}
            />
          </label>
          <button
            onClick={signBunker}
            disabled={busy !== "idle"}
            className="btn btn-sm" style={{ width: "100%", boxSizing: "border-box" }}
          >
            {busy === "bunker" ? "Asking your signer…" : "Connect & sign"}
          </button>
          <div style={{ borderTop: "1px solid var(--glass-edge)", paddingTop: 12 }}>
            <p style={{ margin: "0 0 8px", fontSize: ".78rem", color: "var(--muted)" }}>
              No bunker address handy? Mint an invite — tap it on this phone,
              or paste it into a signer that speaks nostr connect.
            </p>
            {invite ? (
              <div className="space-y-2">
                <a
                  href={invite.uri}
                  style={{ display: "block", wordBreak: "break-all", borderRadius: 12, border: "1px solid var(--glass-edge)", background: "var(--glass-strong, rgba(22,17,40,.85))", padding: 8, fontFamily: "monospace", fontSize: ".68rem", color: "var(--teal-bright, #8FD0D8)", textDecoration: "underline" }}
                >
                  {invite.uri}
                </a>
                <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--teal-bright, #8FD0D8)" }}>
                  waiting for your signer to answer…
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={copyInvite}
                    className="btn btn-sm" style={{ flex: 1 }}
                  >
                    {copied ? "Copied ✓" : "Copy invite"}
                  </button>
                  <button
                    onClick={cancelInvite}
                    className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                  >
                    Never mind
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={makeInvite}
                disabled={busy !== "idle"}
                className="btn btn-sm" style={{ width: "100%", boxSizing: "border-box" }}
              >
                Mint a connect invite
              </button>
            )}
          </div>
        </div>
      </details>

      {/* ── NIP-55: Android signer apps — honest about where it works ──── */}
      <details style={{ borderRadius: 16, border: "1px solid var(--glass-edge)", background: "var(--glass)", padding: "12px 16px", textAlign: "left" }}>
        <summary className="btn-quiet" style={{ listStyle: "none", padding: 0 }}>Android signer app · Amber-class</summary>
        <div className="mt-3 space-y-3">
          {android === false ? (
            <p style={{ fontSize: ".8rem", lineHeight: 1.7, color: "var(--ink-body)" }}>
              This door is Android-only — the <span className="font-mono">nostrsigner:</span>{" "}
              hand-off is an Android intent, and iPhone browsers have no
              equivalent. On this device, the remote-signer door above is the
              real one.
            </p>
          ) : (
            <>
              <p style={{ fontSize: ".8rem", lineHeight: 1.7, color: "var(--ink-body)" }}>
                Your key lives in a signer app like{" "}
                <a
                  href="https://github.com/greenart7c3/Amber"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--teal-bright, #8FD0D8)", textDecoration: "underline" }}
                >
                  Amber
                </a>
                . Tap below and you&apos;ll bounce to it, read and approve the
                challenge, and bounce straight back signed in.
              </p>
              <button
                onClick={openSignerApp}
                className="btn btn-sm" style={{ width: "100%", boxSizing: "border-box" }}
              >
                Open my signer app
              </button>
              <p style={{ fontSize: ".78rem", color: "var(--muted)" }}>
                Nothing opened? Then no signer app answered — this browser
                can&apos;t check ahead of time. Install Amber first, or use
                the remote-signer door above.
              </p>
            </>
          )}
        </div>
      </details>

      {error && <p style={{ margin: 0, fontSize: ".8rem", color: "var(--err, #E7899E)" }}>{error}</p>}
    </div>
  );
}
