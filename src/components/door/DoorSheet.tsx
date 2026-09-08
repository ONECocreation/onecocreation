"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { nip19 } from "nostr-tools";
import { applyFrenSession } from "@/hooks/useFrenSession";
import { nextPathFromLocation } from "@/lib/next-path";
import {
  DOOR_BACK,
  DOOR_COPY,
  DOOR_KEY_CTA,
  DOOR_KEY_NOTE,
  DOOR_NAME_SUFFIX,
  DoorState,
  isUnnamedKeyReason,
  landingFor,
  reduce,
} from "./door-machine";

/**
 * TASK-185 Phase B (ruled) — THE DOOR. One component, two mounts: a small
 * sheet under the header's Log in (the page behind does not change), and
 * the full page /login shows (deep links, `?next=`). They never disagree —
 * both render this card.
 *
 * The sheet turns from sign-in to sign-up on its own: an email whose first
 * code verifies into no member profile, or a good key that owns no name
 * yet, parks on the new-name step — never an error, never a second door.
 *
 * Every call below is a REAL route (`/api/auth/email/*`,
 * `/api/frens/session`, `/api/frens/claim`, `/api/member/profile`,
 * `/api/frens/availability`) — against the dev vault in dev, never the
 * live site. Nothing here mocks a route shape the server doesn't answer.
 */
export default function DoorSheet({
  mount,
  onIn,
  onClose,
}: {
  mount: "sheet" | "page";
  /** the sheet mount reports the resolved name so the header chip flips
   *  without a hard navigation */
  onIn?: (name: string) => void;
  onClose?: () => void;
}) {
  const router = useRouter();
  /* the sheet only renders while open — its state is never "closed" here;
     closing is the parent's job (onClose) */
  type OpenState = Exclude<DoorState, "closed">;
  const [state, setState] = useState<OpenState>("sign-in");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [wish, setWish] = useState("");
  const [avail, setAvail] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const [availReason, setAvailReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  /* a new key at the door: the signed event rides along as proof of key
     when the name is claimed (same atomic claim as today's LoginPanel) */
  const keyEvent = useRef<unknown>(null);
  const keyNpub = useRef<string | null>(null);
  const isNew = useRef(false);
  const availTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = (e: Parameters<typeof reduce>[1]) => setState((s) => reduce(s, e) as OpenState);

  async function sendCode(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/auth/email/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
      if (res.ok && data?.ok) go({ type: "code-sent" });
      else setNote(data?.reason ?? "the letter didn't send — try again");
    } catch {
      setNote("couldn't reach the server — check your connection and try again");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; reason?: string; handle?: string; space?: string }
        | null;
      if (!res.ok || !data?.ok) {
        setNote(data?.reason ?? "that code didn't match — try again");
        return;
      }
      applyFrenSession({ handle: data.handle!, space: data.space!, npub: null });
      window.dispatchEvent(new Event("oc-cart-changed"));
      /* new or returning? the member profile answers — no profile, no name:
         the sheet turns into the sign-up's one extra step on its own */
      const profile = (await fetch("/api/member/profile", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)) as { ok?: boolean; accountName?: string; displayName?: string } | null;
      const known = profile?.displayName || profile?.accountName;
      isNew.current = !known;
      if (known) onIn?.(known);
      go({ type: "verified", isNew: !known });
    } catch {
      setNote("couldn't reach the server — check your connection and try again");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithKey() {
    if (busy) return;
    setNote(null);
    if (!window.nostr) {
      setNote("no key signer on this device — the email door works everywhere");
      return;
    }
    setBusy(true);
    let event;
    try {
      event = await window.nostr.signEvent({
        kind: 22242,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: `PACS-LOGIN-${Date.now()}`,
      });
    } catch {
      setNote("signing was declined — nothing sent");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/frens/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; reason?: string; handle?: string; space?: string; npub?: string | null }
        | null;
      if (res.ok && data?.ok) {
        applyFrenSession({ handle: data.handle!, space: data.space!, npub: data.npub ?? null });
        window.dispatchEvent(new Event("oc-cart-changed"));
        isNew.current = false;
        onIn?.(data.handle!);
        go({ type: "key-known" });
      } else if (isUnnamedKeyReason(data?.reason) && (event as { pubkey?: string }).pubkey) {
        keyEvent.current = event;
        keyNpub.current = nip19.npubEncode((event as { pubkey: string }).pubkey);
        isNew.current = true;
        go({ type: "key-new" });
      } else {
        setNote(data?.reason ?? "the server hiccuped — your signature was fine; try again");
      }
    } catch {
      setNote("couldn't reach the server — check your connection and try again");
    } finally {
      setBusy(false);
    }
  }

  /* the name answers as they type — debounced against the availability API */
  function wishChanged(v: string) {
    const name = v.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setWish(name);
    setNote(null);
    if (availTimer.current) clearTimeout(availTimer.current);
    if (name.length < 3) { setAvail("idle"); return; }
    setAvail("checking");
    availTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/frens/availability?handle=${encodeURIComponent(name)}`);
        const d = (await res.json()) as { handle?: string; available?: boolean; reason?: string | null };
        if (d.handle !== name && (d.handle == null || !name.startsWith(d.handle))) return;
        setAvail(d.available ? "free" : "taken");
        setAvailReason(d.reason ?? null);
      } catch { setAvail("idle"); }
    }, 350);
  }

  async function claimName(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy || wish.trim().length < 3 || avail === "taken") return;
    setBusy(true);
    setNote(null);
    try {
      if (keyEvent.current && keyNpub.current) {
        /* a KEY soul: claim + session in one atomic call, the signed event
           rides along as proof of key (today's claim route, unchanged) */
        const res = await fetch("/api/frens/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: wish.trim(), npub: keyNpub.current, event: keyEvent.current }),
        });
        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; reason?: string; session?: { handle: string; space: string; npub: string } }
          | null;
        if (!res.ok || !data?.ok) {
          setNote(data?.reason ?? "that name couldn't be claimed — try another");
          return;
        }
        if (data.session) applyFrenSession(data.session);
      } else {
        /* an EMAIL soul: the name lands on the member profile (additive
           read/write of the existing route — nothing new server-side) */
        const res = await fetch("/api/member/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountName: wish.trim(), displayName: wish.trim() }),
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
        if (!res.ok || !data?.ok) {
          setNote(data?.reason ?? "that name couldn't be claimed — try another");
          return;
        }
      }
      window.dispatchEvent(new Event("oc-cart-changed"));
      onIn?.(wish.trim());
      go({ type: "named" });
    } catch {
      setNote("couldn't reach the server — try again");
    } finally {
      setBusy(false);
    }
  }

  function finish() {
    const dest = landingFor({ next: nextPathFromLocation(), isNew: isNew.current, mount });
    if (dest) router.push(dest);
    else onClose?.();
  }

  /* the house glass card — the same grammar as today's /login card; doors
     hug the bottom, stacked, uniform (the Admiral's law) */
  const card: React.CSSProperties = {
    width: "100%", background: "var(--glass)", backdropFilter: "blur(9px)",
    borderRadius: 30, border: "1px solid var(--glass-edge)", padding: "26px 24px",
    boxShadow: "0 30px 70px -28px rgba(5,3,16,.8)", textAlign: "center",
    boxSizing: "border-box",
  };
  const headline: React.CSSProperties = {
    fontFamily: "var(--serif, Georgia)", fontWeight: 400, fontSize: "1.25rem",
    color: "var(--ink-strong)", margin: "0 0 8px",
  };
  const bodyNote: React.CSSProperties = { fontSize: ".86rem", lineHeight: 1.65, color: "var(--ink-body)", margin: "0 0 16px" };
  const quietNote: React.CSSProperties = { fontSize: ".74rem", color: "var(--muted)" };
  /* paper pill, dark ink — the house input law */
  const field: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "12px 16px", borderRadius: 999,
    border: "1.5px solid rgba(180,134,43,.65)", background: "rgba(255,255,255,.94)",
    color: "var(--field-ink)", fontSize: ".95rem", textAlign: "center",
  };
  const copy = DOOR_COPY[state];

  return (
    <div style={card} role="dialog" aria-label="Sign in">
      {copy && <p style={headline}>{copy.title}</p>}

      {state === "sign-in" && (
        <>
          <p style={bodyNote}>{copy.note}</p>
          <form onSubmit={sendCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="email" required autoFocus value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com" aria-label="Email address" style={field}
            />
            <button className="btn btn-rose" type="submit" disabled={busy} style={{ width: "100%", boxSizing: "border-box" }}>
              {busy ? copy.busyCta : copy.cta}
            </button>
          </form>
          <p style={{ ...quietNote, margin: "16px 0 8px" }}>{DOOR_KEY_NOTE}</p>
          <button
            type="button" onClick={signInWithKey} disabled={busy}
            className="btn btn-ghost btn-sm" style={{ width: "100%", boxSizing: "border-box" }}
          >
            {DOOR_KEY_CTA}
          </button>
        </>
      )}

      {state === "code" && (
        <>
          <p style={bodyNote}>
            {copy.note} Sent to <b style={{ color: "var(--ink-strong)" }}>{email}</b>.
          </p>
          <form onSubmit={verifyCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              inputMode="numeric" pattern="\d{6}" required autoFocus value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="••••••" aria-label="Sign-in code"
              style={{ ...field, letterSpacing: ".35em", fontSize: "1.2rem" }}
            />
            <button className="btn" type="submit" disabled={busy || code.length !== 6} style={{ width: "100%", boxSizing: "border-box" }}>
              {busy ? copy.busyCta : copy.cta}
            </button>
          </form>
          <p style={{ margin: "14px 0 0" }}>
            <button type="button" className="btn-quiet" onClick={() => { setCode(""); setNote(null); go({ type: "back" }); }}>
              {DOOR_BACK}
            </button>
          </p>
        </>
      )}

      {state === "new-name" && (
        <>
          <p style={bodyNote}>{copy.note}</p>
          <form onSubmit={claimName} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", borderRadius: 999, border: "1.5px solid rgba(180,134,43,.65)", background: "rgba(255,255,255,.94)", padding: "4px 18px 4px 6px" }}>
              <input
                autoFocus value={wish} onChange={(e) => wishChanged(e.target.value)}
                placeholder="your name" aria-label="Your name" maxLength={20}
                style={{ flex: 1, minWidth: 0, textAlign: "right", border: "none", outline: "none", background: "transparent", color: "var(--field-ink)", padding: "10px 2px", fontSize: "1rem" }}
              />
              <span style={{ fontWeight: 700, whiteSpace: "nowrap", color: "var(--info, #9d86d9)" }}>{DOOR_NAME_SUFFIX}</span>
            </div>
            <p aria-live="polite" style={{ margin: 0, minHeight: "1.2em", fontSize: ".74rem", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>
              {avail === "checking" && <span style={{ color: "var(--muted)" }}>checking…</span>}
              {avail === "free" && <span style={{ color: "var(--ok, #7fb98f)" }}>✓ this name is free</span>}
              {avail === "taken" && <span style={{ color: "var(--err, #E7899E)" }}>✗ {availReason ?? "not available — try another"}</span>}
            </p>
            <button className="btn" type="submit" disabled={busy || wish.trim().length < 3 || avail === "taken"} style={{ width: "100%", boxSizing: "border-box" }}>
              {busy ? copy.busyCta : copy.cta}
            </button>
          </form>
          <p style={{ margin: "12px 0 0" }}>
            <button type="button" className="btn-quiet" onClick={() => { keyEvent.current = null; setWish(""); setNote(null); go({ type: "back" }); }}>
              ← back
            </button>
          </p>
        </>
      )}

      {state === "in" && (
        <>
          <p style={bodyNote}>{copy.note}</p>
          <button className="btn" onClick={finish} style={{ width: "100%", boxSizing: "border-box" }}>
            {copy.cta}
          </button>
        </>
      )}

      {note && <p role="alert" style={{ margin: "12px 0 0", fontSize: ".8rem", color: "var(--err, #E7899E)" }}>{note}</p>}
    </div>
  );
}
