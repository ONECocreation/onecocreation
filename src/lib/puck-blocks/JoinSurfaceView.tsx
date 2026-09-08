"use client";

import Link from "next/link";
import SubscribeForm from "@/components/SubscribeForm";
import ContactForm from "@/components/ContactForm";

/**
 * The JoinSurface block's view — the binding itself.
 *
 * TASK-185 Phase B (the Admiral's ruling 2, 0018.06.18 a₿): the bound
 * claim machine (TagClaim) and the embedded doors (SignerDoors + EmailDoor)
 * are RETIRED — the front door owns the whole walk now, and this surface's
 * claim/doors sections RIDE it: one door to /login, where the same sheet
 * signs a soul in and turns into sign-up on its own (email → code → your
 * name; a key → your name). No second door, no forked walk, no arcade skin.
 * The letters + contact doors are untouched (not this lane's machinery).
 *
 * The pitch copy is Love's own quieter voice, handed DOWN through the copy
 * fields (Pac's FREE ruling, 0018.05.26: the kit provides the machinery,
 * each community supplies its own voice).
 */

/* P3-ruled surface copy — used EXACTLY as ruled; not a field, never
   paraphrased, never split.

   RE-SCOPED 0018.05.26 on Pac's ruling ("queued now, etched later") after
   primary-source research: Spaces TOP-LEVEL names are live on mainnet, but
   SUB-NAMES under a community space are alpha and explicitly not
   production-mainnet-safe per the protocol's own maintainers. The previous
   wording promised the anchoring in the present tense. This says what is
   actually true — the name is yours immediately, and the bitcoin etching is
   queued — which is also exactly what the registry's queued/committed state
   machine already does. Restore the present tense only when the protocol
   ships a release that is not labelled alpha.
   See ~/dev/briefings/spaces-protocol-verdict.md */
const PROMISE =
  "private where you need it, secure as a foundation, one branded name you choose under your community — yours the moment you claim it, queued now and etched onto bitcoin through the Spaces protocol. Honest to the block.";

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
/* one door per card, hugging the bottom, full-width (the Admiral's law) */
const door: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  textAlign: "center",
  textDecoration: "none",
};

export default function JoinSurfaceView({
  heading,
  space,
  claim,
  doors,
  forms,
  claimCta,
  claimSubline,
  subscribeCta,
}: {
  heading: string;
  space: string;
  claim: boolean;
  doors: boolean;
  forms: boolean;
  claimCta: string;
  claimSubline: string;
  subscribeCta: string;
}) {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", display: "grid", gap: 28 }}>
      <div style={{ textAlign: "center" }}>
        <h2 className="sec-h">{heading}</h2>
        <p style={{ color: "var(--ink-body)", fontSize: ".98rem", lineHeight: 1.85, margin: "10px 0 0" }}>
          {PROMISE}
        </p>
      </div>

      {claim && (
        <div style={card}>
          <p style={doorHead}>Your name @{space}</p>
          <p style={{ margin: "0 0 14px", fontSize: ".78rem", color: "var(--ink-body)" }}>
            {claimSubline}
          </p>
          {/* the sheet owns sign-up: the same door signs you in and asks
              your name when you're new — nobody hunts for a Sign up */}
          <Link href="/login" className="btn" style={door}>
            {claimCta}
          </Link>
        </div>
      )}

      {doors && (
        <div style={card}>
          <p style={doorHead}>Already a member? — the door</p>
          <p style={{ margin: "0 0 14px", fontSize: ".78rem", color: "var(--ink-body)" }}>
            one short walk — an email code or your key, no passwords.
          </p>
          <Link href="/login" className="btn btn-ghost" style={door}>
            Log in
          </Link>
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
