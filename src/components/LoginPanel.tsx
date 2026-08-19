"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { nip19 } from "nostr-tools";
import SigningExplainer from "@/components/SigningExplainer";
import SignerNudge from "@/components/SignerNudge";
import SignerDoors from "@/components/SignerDoors";
import EmailDoor from "@/components/EmailDoor";
import useFrenSession, { applyFrenSession } from "@/hooks/useFrenSession";
import { useBrand, type DoorAccent } from "@/lib/brand";

/* one-shot environment read, hydration-safe and lint-clean */
const noopSubscribe = () => () => {};
function useHasSigner(): boolean | null {
  return useSyncExternalStore(noopSubscribe, () => !!window.nostr, () => null);
}

/* the contract's door accents mapped onto house ink (Admiral, 0018.05.15) */
const ACCENT_INK: Record<DoorAccent, string> = {
  cyan: "var(--info, #9d86d9)",
  pink: "var(--rose, #E7B2C3)",
  coin: "var(--gold-2, #ebcb77)",
  neon: "var(--ok, #7fb98f)",
};

const pillInput: React.CSSProperties = {
  flex: "1 1 200px",
  padding: "12px 16px",
  borderRadius: 999,
  border: "1.5px solid rgba(180,134,43,.5)",
  background: "transparent",
  color: "inherit",
  fontSize: ".95rem",
};

const tabBase: React.CSSProperties = {
  flex: 1,
  borderRadius: 999,
  padding: "9px 18px",
  fontSize: ".74rem",
  fontWeight: 700,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  cursor: "pointer",
};

/**
 * The front door (redesigned per the Admiral's signin-experience1 markup):
 * ONE card, two ways in — key or email — switched by a toggle that makes
 * going back and forth painless. A key the board doesn't know isn't an
 * error anymore: it flips the card into the WELCOME state, asks what they
 * wish to be called, claims their free @tag and walks them straight onto
 * the welcome path.
 */
export default function LoginPanel() {
  const router = useRouter();
  const hasSigner = useHasSigner();
  // email leads for EVERYONE (Admiral, 0018.05.15) — the easy door first,
  // the key path one tap away
  const [door, setDoor] = useState<"key" | "email">("email");
  const doorChosen = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fren: existing, signOut } = useFrenSession();
  const { copy, doors } = useBrand();

  /* the WELCOME state — an unrecognized key parks here, never in an error */
  const [newKey, setNewKey] = useState<string | null>(null);
  const [wish, setWish] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimNote, setClaimNote] = useState<string | null>(null);
  const [avail, setAvail] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const [availReason, setAvailReason] = useState<string | null>(null);
  const lastEvent = useRef<unknown>(null);
  const availTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* the name answers as they type — debounced against the availability API */
  function wishChanged(v: string) {
    const name = v.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setWish(name);
    setClaimNote(null);
    if (availTimer.current) clearTimeout(availTimer.current);
    if (name.length < 3) { setAvail("idle"); return; }
    setAvail("checking");
    availTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/frens/availability?handle=${encodeURIComponent(name)}`);
        const d = (await res.json()) as { handle?: string; available?: boolean; reason?: string | null };
        if (d.handle !== name && (d.handle == null || !name.startsWith(d.handle))) return; // a newer keystroke owns the field
        setAvail(d.available ? "free" : "taken");
        setAvailReason(d.reason ?? null);
      } catch { setAvail("idle"); }
    }, 350);
  }

  /* One submit path for EVERY door — extension, bunker, Android signer app.
     Returns the error to show, or null after taking over navigation. */
  async function submitLogin(event: unknown, destination = "/me"): Promise<string | null> {
    lastEvent.current = event;
    try {
      const res = await fetch("/api/frens/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      });
      let data: { ok?: boolean; reason?: string; handle?: string; space?: string; npub?: string | null } | null = null;
      try {
        data = await res.json();
      } catch {
        /* non-JSON = the server fell over, not the fren */
      }
      if (!res.ok || !data?.ok) {
        const reason = data?.reason ?? `the server hiccuped (HTTP ${res.status}) — your signature was fine; tell the operator`;
        // a GOOD key with no tag = a new fren at the door, not a failure
        const pubkey = (event as { pubkey?: string } | null)?.pubkey;
        if (/doesn't own a tag/i.test(reason) && pubkey) {
          setNewKey(pubkey);
          setClaimNote(null);
          return null;
        }
        return reason;
      }
      /* flip the whole header without a hard nav — one store, no stale chip */
      applyFrenSession({ handle: data.handle!, space: data.space!, npub: data.npub ?? null });
      // the basket follows its soul through the door (merge happens server-side)
      window.dispatchEvent(new Event("oc-cart-changed"));
      router.push(destination);
      return null;
    } catch {
      return "couldn't reach the server — check your connection and try again";
    }
  }

  async function signIn() {
    setError(null);
    if (!window.nostr) {
      setError("no signer extension found — see the gear-up note below");
      return;
    }
    setBusy(true);
    /* Two failure worlds, two honest messages: a signer rejection is the
       FREN's call; a server fault is OURS. */
    let event;
    try {
      event = await window.nostr.signEvent({
        kind: 22242,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: `PACS-LOGIN-${Date.now()}`,
      });
    } catch {
      setError("signing was declined — nothing sent");
      setBusy(false);
      return;
    }
    const reason = await submitLogin(event);
    if (reason) setError(reason);
    setBusy(false);
  }

  /* the new fren names themself → claim + session in ONE atomic call (the
     signed event rides along as proof of key), then straight to the profile
     step — no lookup in between, so storage lag can't strand them */
  async function claimAndEnter(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey || claimBusy) return;
    setClaimBusy(true);
    setClaimNote(null);
    try {
      const npub = nip19.npubEncode(newKey);
      const res = await fetch("/api/frens/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: wish.trim(), npub, event: lastEvent.current }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; reason?: string; session?: { handle: string; space: string; npub: string } }
        | null;
      if (!res.ok || !data?.ok) {
        setClaimNote(data?.reason ?? "that name couldn't be claimed — try another");
        return;
      }
      if (data.session) {
        applyFrenSession(data.session);
        window.dispatchEvent(new Event("oc-cart-changed"));
        router.push("/welcome?step=face");
        return;
      }
      // no session in the answer (stale challenge?) — one honest fallback
      const reason = await submitLogin(lastEvent.current, "/welcome?step=face");
      if (reason) setClaimNote(reason);
    } catch {
      setClaimNote("couldn't reach the server — try again");
    } finally {
      setClaimBusy(false);
    }
  }

  /* the house glass shell (Admiral, 0018.05.15) — same grammar as /welcome;
     the arcade's square bg-panel ceremony robe retired on this brand */
  const card: React.CSSProperties = {
    width: "100%", background: "var(--glass)", backdropFilter: "blur(9px)",
    borderRadius: 30, border: "1px solid var(--glass-edge)", padding: "28px 26px",
    boxShadow: "0 30px 70px -28px rgba(5,3,16,.8)",
  };
  const headline: React.CSSProperties = {
    fontFamily: "var(--serif, Georgia)", fontWeight: 400, fontSize: "1.3rem",
    color: "var(--ink-strong)", margin: "0 0 6px",
  };
  const bodyNote: React.CSSProperties = { fontSize: ".88rem", lineHeight: 1.7, color: "var(--ink-body)" };
  const quietNote: React.CSSProperties = { fontSize: ".76rem", color: "var(--muted)" };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      {existing ? (
        <div style={{ ...card, textAlign: "center" }}>
          <p style={headline}>✓ you&apos;re in, {existing.handle}</p>
          <p style={{ ...quietNote, margin: "0 0 16px" }}>{existing.handle}@{existing.space}</p>
          <Link href={`/u/${existing.handle}@${existing.space}`} className="btn" style={{ width: "100%", textAlign: "center", boxSizing: "border-box" }}>
            Go to my profile
          </Link>
          <p style={{ margin: "12px 0 0" }}>
            <button onClick={signOut} className="btn-quiet">sign out</button>
          </p>
        </div>
      ) : newKey ? (
        /* ── THE WELCOME — a brand-new key at the door ────────────────── */
        <div style={{ ...card, textAlign: "center" }}>
          <p style={headline}>✨ Welcome — this key is new here</p>
          <p style={{ ...bodyNote, margin: "0 0 16px" }}>
            Your key is perfect — it just doesn&apos;t have a name here yet. Claim one free
            and you&apos;re in: the booking calendar, the free meditation, Heartfield Commons.
          </p>
          <form onSubmit={claimAndEnter}>
            {/* the tag takes shape as they type: [   name]@onecocreation */}
            {/* the tag takes shape as they type — paper pill, dark ink (house law) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                borderRadius: 999,
                border: "1.5px solid rgba(180,134,43,.65)",
                background: "rgba(255,255,255,.94)",
                padding: "4px 18px 4px 6px",
              }}
            >
              <input
                autoFocus
                value={wish}
                onChange={(e) => wishChanged(e.target.value)}
                placeholder="what shall we call you?"
                aria-label="Your name"
                maxLength={20}
                style={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: "right",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "var(--field-ink)",
                  padding: "10px 2px",
                  fontSize: "1rem",
                }}
              />
              <span style={{ fontWeight: 700, whiteSpace: "nowrap", color: "var(--info, #9d86d9)" }}>
                @onecocreation
              </span>
            </div>
            {/* the name answers before the button is ever pressed */}
            <p
              aria-live="polite"
              style={{ margin: "8px 0 0", minHeight: "1.2em", fontSize: ".76rem", fontWeight: 700,
                letterSpacing: ".06em", textTransform: "uppercase", textAlign: "center" }}
            >
              {avail === "checking" && <span style={{ color: "var(--muted)" }}>checking…</span>}
              {avail === "free" && <span style={{ color: "var(--ok, #7fb98f)" }}>✓ this name is free</span>}
              {avail === "taken" && (
                <span style={{ color: "var(--err, #E7899E)" }}>✗ {availReason ?? "not available — try another"}</span>
              )}
            </p>
            <button
              className="btn"
              style={{ width: "100%", marginTop: 10, boxSizing: "border-box" }}
              type="submit"
              disabled={claimBusy || wish.trim().length < 3 || avail === "taken"}
            >
              {claimBusy ? "Claiming…" : "Claim my name — free"}
            </button>
          </form>
          <p style={{ ...quietNote, margin: "14px 0 0" }}>
            Free, sovereign, verifiable. Then we&apos;ll walk you in: dress your profile, add an
            email if you like — or skip it all and look around.
          </p>
          {claimNote && <p style={{ margin: "12px 0 0", fontSize: ".8rem", color: "var(--err, #E7899E)" }}>{claimNote}</p>}
          <p style={{ margin: "14px 0 0" }}>
            <button
              type="button"
              onClick={() => { setNewKey(null); setWish(""); setClaimNote(null); }}
              className="btn-quiet"
            >
              ← use a different key
            </button>
          </p>
        </div>
      ) : (
        /* ── THE ONE SIGN-IN CARD — key ⇄ email, one toggle ───────────── */
        <div style={card}>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }} role="tablist" aria-label="Sign-in method">
            {([
              ["email", "✉️ With email"],
              ["key", "🔑 With my key"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                role="tab"
                aria-selected={door === k}
                onClick={() => { doorChosen.current = true; setDoor(k); setError(null); }}
                style={{
                  ...tabBase,
                  ...(door === k
                    ? { background: "linear-gradient(135deg,var(--lavender-soft),var(--lavender, #8B76C4))", color: "#fff", border: "1.5px solid transparent" }
                    : { background: "transparent", color: "var(--ink-body)", border: "1.5px solid rgba(139,118,196,.4)" }),
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {door === "key" ? (
            <>
              <p style={headline}>{copy.returningTitle}</p>
              <p style={{ ...bodyNote, margin: "0 0 10px" }}>{copy.returningBlurb}</p>
              {/* nostr in one breath (Love's call, 0018.05.15) — no jargon wall */}
              <p style={{ ...quietNote, margin: "0 0 18px", fontStyle: "italic" }}>
                new word? <b style={{ color: "var(--ink-body)", fontStyle: "normal" }}>nostr</b> is
                simply a key that belongs to you — it signs you in here and anywhere else that
                speaks it. No company behind it, nothing to forget, yours forever.
              </p>
              {hasSigner === false ? (
                <div className="space-y-4">
                  <p style={{ ...quietNote, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: ".68rem" }}>
                    pick your door — same key, any device
                  </p>
                  <SignerDoors kind="login" submit={submitLogin} />
                  <SignerNudge />
                </div>
              ) : (
                <>
                  <button
                    onClick={signIn}
                    disabled={busy}
                    className="btn"
                    style={{ width: "100%", boxSizing: "border-box" }}
                  >
                    {busy ? copy.signingCta : copy.signInCta}
                  </button>
                  <details className="mt-4">
                    <summary className="btn-quiet" style={{ listStyle: "none" }}>
                      on a phone, or no extension here? more doors
                    </summary>
                    <div className="mt-3">
                      <SignerDoors kind="login" submit={submitLogin} />
                    </div>
                  </details>
                </>
              )}
              {error && <p style={{ margin: "12px 0 0", fontSize: ".8rem", color: "var(--err, #E7899E)" }}>{error}</p>}
              <div className="mt-4">
                <SigningExplainer kind="login" />
              </div>
            </>
          ) : (
            <EmailDoor bare />
          )}
        </div>
      )}

      {/* the community door — same width, same weight as the card above */}
      {!existing && !newKey && (
        <div className="space-y-4">
          <p style={{ textAlign: "center", fontSize: ".7rem", fontWeight: 700, letterSpacing: ".14em",
            textTransform: "uppercase", color: "var(--muted)", margin: 0 }}>
            {copy.doorsHeading}
          </p>
          {doors.map((d) => (
            <div key={d.tag} style={{ ...card, padding: "22px 24px" }}>
              <p style={{ margin: "0 0 4px", fontSize: ".74rem", fontWeight: 700, letterSpacing: ".08em",
                textTransform: "uppercase", color: ACCENT_INK[d.accent] }}>
                {d.tag} · {d.role}
              </p>
              <p style={{ ...bodyNote, margin: "0 0 12px" }}>{d.blurb}</p>
              {d.href.startsWith("http") ? (
                <a href={d.href} className="btn-quiet btn-quiet--accent" style={{ padding: 0 }}>{d.cta}</a>
              ) : (
                <Link href={d.href} className="btn-quiet btn-quiet--accent" style={{ padding: 0 }}>{d.cta}</Link>
              )}
            </div>
          ))}
          <p style={{ ...quietNote, textAlign: "center", margin: 0 }}>{copy.doorsFootnote}</p>
        </div>
      )}
    </div>
  );
}
