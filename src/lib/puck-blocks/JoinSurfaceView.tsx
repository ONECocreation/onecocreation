"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { VerifiedEvent } from "nostr-tools/pure";
import TagClaim from "@/components/TagClaim";
import SignerDoors from "@/components/SignerDoors";
import EmailDoor from "@/components/EmailDoor";
import SubscribeForm from "@/components/SubscribeForm";
import ContactForm from "@/components/ContactForm";
import { applyFrenSession } from "@/hooks/useFrenSession";

/**
 * The JoinSurface block's view — the binding itself. Every interactive
 * piece is the existing machinery, unmodified; this file only composes
 * them and supplies the two things a binding must own: the ruled promise
 * sentence (verbatim, one unsplit string) and the parent contract the
 * Doors were designed to be handed (SignerDoors' submit).
 *
 * The pitch copy is Love's own quieter voice, handed DOWN into the
 * machinery through its copy props (Pac's FREE ruling, 0018.05.26: the
 * kit provides the machinery, each community supplies its own voice —
 * frens.earth's wording stays the components' default, untouched).
 */

/* P3-ruled surface copy — used EXACTLY as ruled; not a field, never
   paraphrased, never split. */
const PROMISE =
  "private where you need it, secure as a foundation, one branded name you choose under your community — bitcoin-backed by the Spaces protocol, honest to the block.";

/* hydration-safe one-shot signer read — the machinery's own pattern
   (SignerDoors.useIsAndroid / Kind0Doors.useHasSigner) */
const noopSubscribe = () => () => {};
function useHasSigner(): boolean | null {
  return useSyncExternalStore(noopSubscribe, () => !!window.nostr, () => null);
}

/* The parent contract SignerDoors is built to receive: POST the signed
   login challenge, apply the session, move on. Mirrors LoginPanel's
   submit minus its new-key WELCOME state — that deeper hand-off stays
   LoginPanel's (// coordinator): an unrecognized key gets the server's
   honest reason here, and the claim machine sits one panel up. */
async function submitLogin(event: VerifiedEvent): Promise<string | null> {
  try {
    const res = await fetch("/api/frens/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; reason?: string; handle?: string; space?: string; npub?: string | null }
      | null;
    if (!res.ok || !data?.ok) {
      return data?.reason ?? `the server hiccuped (HTTP ${res.status}) — your signature was fine; tell the operator`;
    }
    /* one store, no stale chip — the same helper LoginPanel calls */
    applyFrenSession({ handle: data.handle!, space: data.space!, npub: data.npub ?? null });
    window.dispatchEvent(new Event("oc-cart-changed"));
    window.location.assign("/me");
    return null;
  } catch {
    return "couldn't reach the server — check your connection and try again";
  }
}

/* the house glass card grammar (the Panel block's own recipe) */
const card: React.CSSProperties = {
  background: "var(--glass)",
  backdropFilter: "blur(7px)",
  borderRadius: 28,
  border: "1px solid var(--glass-edge)",
  padding: "24px 22px",
};
const doorHead: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: ".72rem",
  fontWeight: 700,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "var(--muted)",
};

export default function JoinSurfaceView({
  heading,
  space,
  nip05Domain,
  claim,
  doors,
  forms,
  claimCta,
  claimSubline,
  subscribeCta,
}: {
  heading: string;
  space: string;
  nip05Domain: string;
  claim: boolean;
  doors: boolean;
  forms: boolean;
  claimCta: string;
  claimSubline: string;
  subscribeCta: string;
}) {
  /* live-or-dashes: null until the browser answers, never a guessed state */
  const hasSigner = useHasSigner();
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", display: "grid", gap: 28 }}>
      <div style={{ textAlign: "center" }}>
        <h2 className="sec-h">{heading}</h2>
        <p style={{ color: "var(--ink-body)", fontSize: ".98rem", lineHeight: 1.85, margin: "10px 0 0" }}>
          {PROMISE}
        </p>
      </div>

      {claim && (
        <TagClaim
          space={space}
          nip05Domain={nip05Domain}
          claimCta={claimCta}
          claimSubline={claimSubline}
        />
      )}

      {doors && (
        <div style={card}>
          <p style={doorHead}>Already hold a key? — the doors</p>
          {/* the one connection state the panel shows, live-or-dashes */}
          <p style={{ margin: "0 0 14px", fontSize: ".78rem", color: "var(--ink-body)" }}>
            signer extension on this browser:{" "}
            <b style={{ color: "var(--ink-strong)" }}>
              {hasSigner === null ? "—" : hasSigner ? "detected" : "not detected"}
            </b>
          </p>
          <SignerDoors kind="login" submit={submitLogin} />
          <div style={{ marginTop: 16 }}>
            <EmailDoor bare />
          </div>
          <p style={{ margin: "14px 0 0", fontSize: ".76rem", color: "var(--muted)" }}>
            the full sign-in front door lives at{" "}
            <Link href="/login" style={{ color: "var(--teal-bright, #8FD0D8)" }}>
              /login
            </Link>
          </p>
        </div>
      )}

      {forms && (
        <div style={{ ...card, display: "grid", gap: 22 }}>
          <div style={{ textAlign: "center" }}>
            <p style={doorHead}>The letters</p>
            <SubscribeForm source="join" cta={subscribeCta} />
          </div>
          <div>
            <p style={{ ...doorHead, textAlign: "center" }}>Write to Love</p>
            <ContactForm />
          </div>
        </div>
      )}
    </div>
  );
}
