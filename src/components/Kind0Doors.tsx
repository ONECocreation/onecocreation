"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { EventTemplate, VerifiedEvent } from "nostr-tools/pure";
import type { Event as NostrEvent } from "nostr-tools";
import { signTemplateViaBunker, startNostrConnectForTemplate } from "@/lib/signer-doors";
import SignerNudge from "@/components/SignerNudge";

/**
 * The signer doors, reused for PUBLISHING — the same three-door model as
 * login, pointed at a kind-0 profile card instead of a challenge:
 *
 * - NIP-07: window.nostr.signEvent — the primary button when present.
 * - NIP-46: bunker paste or a minted nostrconnect:// invite, asking for
 *   sign_event:0 — works on iPhone and any browser.
 * - NIP-55: honest SOON. The Android bounce-back lands on a return URL with
 *   the signed event in the query; wiring a publish leg for that return trip
 *   is real work we haven't done — so the door isn't drawn. Never a fake door.
 *
 * The parent builds the template at sign time (prepare) and owns what
 * happens to the signed event (submit) — same contract as SignerDoors.
 */

/* hydration-safe one-shot read — the useHasSigner pattern */
const noopSubscribe = () => () => {};
function useHasSigner(): boolean | null {
  return useSyncExternalStore(noopSubscribe, () => !!window.nostr, () => null);
}

export default function Kind0Doors({
  prepare,
  submit,
  label = "Sign & publish",
}: {
  /** Build the event to sign — or return a human-readable problem string. */
  prepare: () => EventTemplate | { problem: string };
  /** Take the signed event (verify + publish); resolve an error to show, or
      null when the parent handled it. */
  submit: (event: NostrEvent | VerifiedEvent) => Promise<string | null>;
  label?: string;
}) {
  const hasSigner = useHasSigner();
  const [bunkerInput, setBunkerInput] = useState("");
  const [busy, setBusy] = useState<"idle" | "nip07" | "bunker" | "invite">("idle");
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

  async function handleSigned(event: NostrEvent | VerifiedEvent) {
    const reason = await submit(event);
    if (reason) setError(reason);
  }

  async function signNip07() {
    setError(null);
    const template = prepare();
    if ("problem" in template) {
      setError(template.problem);
      return;
    }
    if (!window.nostr) {
      setError("no signer extension found");
      return;
    }
    setBusy("nip07");
    try {
      const event = (await window.nostr.signEvent({
        kind: template.kind,
        created_at: template.created_at,
        tags: template.tags,
        content: template.content,
      })) as NostrEvent;
      await handleSigned(event);
    } catch {
      setError("signing was declined — nothing sent");
    } finally {
      setBusy("idle");
    }
  }

  async function signBunker() {
    if (!bunkerInput.trim()) {
      setError("paste your bunker:// address (or name@domain) first");
      return;
    }
    setError(null);
    /* surface a build problem BEFORE the bunker round-trip */
    const check = prepare();
    if ("problem" in check) {
      setError(check.problem);
      return;
    }
    setBusy("bunker");
    try {
      const event = await signTemplateViaBunker(
        bunkerInput,
        () => {
          const t = prepare();
          if ("problem" in t) throw new Error(t.problem);
          return t;
        },
        onAuth
      );
      await handleSigned(event);
    } catch (e) {
      setError(e instanceof Error ? e.message : "the bunker didn't answer");
    } finally {
      setBusy("idle");
    }
  }

  function makeInvite() {
    setError(null);
    const check = prepare();
    if ("problem" in check) {
      setError(check.problem);
      return;
    }
    setCopied(false);
    cancelRef.current?.();
    const inv = startNostrConnectForTemplate(
      () => {
        const t = prepare();
        if ("problem" in t) throw new Error(t.problem);
        return t;
      },
      ["sign_event:0"],
      onAuth
    );
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

  return (
    <div className="space-y-3">
      {hasSigner ? (
        <button
          type="button"
          onClick={signNip07}
          disabled={busy !== "idle"}
          className="btn btn-sm" style={{ width: "100%", boxSizing: "border-box" }}
        >
          {busy === "nip07" ? "Waiting for your key…" : label}
        </button>
      ) : (
        hasSigner === false && <SignerNudge />
      )}

      {/* ── NIP-46: remote signer / bunker — iPhone + any browser ────────── */}
      <details style={{ borderRadius: 16, border: "1px solid var(--glass-edge)", background: "var(--glass)", padding: "12px 16px", textAlign: "left" }} open={hasSigner === false}>
        <summary className="btn-quiet" style={{ listStyle: "none", padding: 0 }}>
          {hasSigner ? "no extension? remote signer" : "remote signer · works on iPhone + any browser"}
        </summary>
        <div className="mt-3 space-y-3">
          <p style={{ fontSize: ".8rem", lineHeight: 1.7, color: "var(--ink-body)" }}>
            Your key stays in a signer you already trust — nsec.app, Amber, or
            your own nsecBunker — and signs this profile card over nostr. This
            page never sees the key.
          </p>
          <label style={{ display: "block", fontSize: ".68rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)" }}>
            paste your bunker address
            <input
              value={bunkerInput}
              onChange={(e) => setBunkerInput(e.target.value)}
              placeholder="bunker://… or name@domain"
              autoComplete="off"
              spellCheck={false}
              style={{ marginTop: 6, width: "100%", boxSizing: "border-box", borderRadius: 12, border: "1.5px solid rgba(180,134,43,.5)", background: "rgba(255,255,255,.94)", color: "#4a4458", padding: "10px 14px", fontFamily: "monospace", fontSize: ".85rem" }}
            />
          </label>
          <button
            type="button"
            onClick={signBunker}
            disabled={busy !== "idle"}
            className="btn btn-sm" style={{ width: "100%", boxSizing: "border-box" }}
          >
            {busy === "bunker" ? "Asking your signer…" : "Connect, sign & publish"}
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
                    type="button"
                    onClick={copyInvite}
                    className="btn btn-sm" style={{ flex: 1 }}
                  >
                    {copied ? "Copied ✓" : "Copy invite"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelInvite}
                    className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                  >
                    Never mind
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
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

      {error && <p style={{ margin: 0, fontSize: ".8rem", color: "var(--err, #E7899E)" }}>{error}</p>}
    </div>
  );
}
