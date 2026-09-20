"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { nip19 } from "nostr-tools";
import type { VerifiedEvent } from "nostr-tools/pure";
import { applyMemberSession } from "@/hooks/useMemberSession";
import { nextPathFromLocation } from "@/lib/next-path";
import SignerDoors from "@/components/SignerDoors";
import { isAndroid, SignTimeoutError, withSignTimeout } from "@/lib/signer-doors";
import Button from "@/components/kit/Button";
import Card from "@/components/kit/Card";
import Field from "@/components/kit/Field";
import Tabs from "@/components/kit/Tabs";
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
 * TASK-350 (lane 2 of the OC UI kit migration, REVIEW-K83 folded) —
 * `SignInCard`: the `/login` Puck-published path's own presentation, built
 * from the lane-1 kit (`Tabs`/`Card`/`Field`/`Button`).
 *
 * RULED (K83, decision 1 — WRAP, not replace): `door-machine.ts` stays
 * byte-identical and `DoorSheet.tsx` keeps its name and its other two
 * mounts — the header's sheet, the `/login` fallback (no Puck doc
 * published), and the signer-return strip — untabbed and otherwise
 * unchanged. `SignInCard` is a NEW, additive render of the SAME underlying
 * model (`reduce`/`DOOR_COPY`/`landingFor`, imported directly from
 * `door-machine.ts`), redrawn in kit parts — not a wrapper that mounts
 * `DoorSheet`'s own inline-styled JSX as an opaque child (that would keep
 * the inline `card`/`headline`/`bodyNote`/`field` objects the ask names
 * for replacement). The Email/Key split is a UI-only layer over the SAME
 * "sign-in" DoorState — exactly the `signerOpen` precedent (DoorSheet.tsx:
 * 99) the Ground section names, just hosted here instead.
 *
 * RULED item 3 — named, not fixed: the Email tab's own ghost button
 * ("Sign in with my key") can ALSO open `SignerDoors` in place, inside the
 * Email tab, via `signInWithKey()` below — the SAME function the Key tab's
 * own button calls when an extension is present. It is a real duplication
 * (two ways to reach the same doors) and is left as-is, per the ruling.
 *
 * Every call below is the SAME real route DoorSheet.tsx calls
 * (`/api/auth/email/*`, `/api/member/session`, `/api/member/claim`,
 * `/api/member/profile`, `/api/member/availability`) — nothing new
 * server-side, no auth logic rewritten.
 */

const noopSubscribe = () => () => {};
function useHasNostrExtension(): boolean | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof window !== "undefined" && !!window.nostr,
    () => null,
  );
}
function useIsAndroid(): boolean | null {
  return useSyncExternalStore(noopSubscribe, () => isAndroid(), () => null);
}

/* Per-device key note — duplicated from DoorSheet.tsx (TASK-316 item 3):
   door-machine.ts stays byte-identical, so these strings live beside each
   of DOOR_KEY_NOTE's consumers, not in the model. SignInCard is the SECOND
   consumer of this exact copy. */
const KEY_NOTE_ANDROID =
  "Have a key in a signer app? One tap — your signer app opens and brings you back.";
const KEY_NOTE_REMOTE =
  "Have a key? Connect a remote signer — it signs for you; the key never leaves it.";
function keyNoteFor(hasNostr: boolean | null, android: boolean | null): string {
  if (hasNostr || android === null) return DOOR_KEY_NOTE;
  return android ? KEY_NOTE_ANDROID : KEY_NOTE_REMOTE;
}

/** B2 — the Key tab's "what is this?" explainer, M2's exact words
    (`oc-kit-me-login-mockups.html:113`). Also this Puck field's default. */
export const KEY_EXPLAINER =
  "A key is a sign-in you own. No company holds your account. A small browser add-on keeps the key and asks you before it signs anything. New to it? Use the Email tab — you can add a key later.";

/** The 30-second timeout's plain message, M3's exact words (the Admiral,
    MOCKUPS-1, `oc-kit-me-login-mockups.html:120`) — used verbatim, never a
    paraphrase. */
export const SIGNER_TIMEOUT_MESSAGE =
  "⚠ No answer after 30 seconds. Your signer opens its own small window — look behind this one. Still nothing? Close this window, open a new one, and try again.";

export interface SignInCardProps {
  /** SignInCard is the /login page-mount presentation only (RULED 1: the
   *  header's sheet keeps plain, untabbed DoorSheet) — an explicit literal
   *  rather than a union, so a future second mount is a visible decision. */
  mount?: "page";
  /** the sheet-mount contract DoorSheet carries — kept for API parity even
   *  though no caller in this lane mounts SignInCard as a sheet. */
  onIn?: (name: string) => void;
  onClose?: () => void;
  /** TASK-316's signer-return handoff shape — not exercised by any caller
   *  in this lane (signer-return/page.tsx keeps mounting DoorSheet
   *  directly, per RULED 1), kept for parity with the model it shares. */
  initialKey?: { event: unknown; npub: string } | null;
  /** Puck field (D3, B1 law): which tab opens first. */
  defaultTab?: "email" | "key";
  emailTabLabel?: string;
  keyTabLabel?: string;
  keyExplainer?: string;
}

export default function SignInCard({
  mount = "page",
  onIn,
  onClose,
  initialKey,
  defaultTab = "email",
  emailTabLabel = "Email",
  keyTabLabel = "Key",
  keyExplainer = KEY_EXPLAINER,
}: SignInCardProps) {
  const router = useRouter();
  const hasNostr = useHasNostrExtension();
  const android = useIsAndroid();

  type OpenState = Exclude<DoorState, "closed">;
  const [state, setState] = useState<OpenState>(initialKey ? "new-name" : "sign-in");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [wish, setWish] = useState("");
  const [avail, setAvail] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const [availReason, setAvailReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  /* RULED item 3 — named, not fixed: a UI-only flag over the "sign-in"
     state, exactly like DoorSheet's own signerOpen, deciding whether the
     Email tab shows its form or the same SignerDoors the Key tab shows. */
  const [emailSignerOpen, setEmailSignerOpen] = useState(false);

  const keyEvent = useRef<unknown>(initialKey?.event ?? null);
  const keyNpub = useRef<string | null>(initialKey?.npub ?? null);
  const isNew = useRef(!!initialKey);
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
      applyMemberSession({ handle: data.handle!, space: data.space!, npub: null });
      window.dispatchEvent(new Event("oc-cart-changed"));
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

  /* ONE submit function, every key entry point: the Email tab's ghost
     button's SignerDoors, the Key tab's own SignerDoors, and the Key tab's
     direct-extension button — mirrors DoorSheet.tsx's own submitSignedKey
     shape/contract exactly (TASK-316's "one submit" law). */
  async function submitSignedKey(event: VerifiedEvent): Promise<string | null> {
    setBusy(true);
    try {
      const res = await fetch("/api/member/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; reason?: string; handle?: string; space?: string; npub?: string | null }
        | null;
      if (res.ok && data?.ok) {
        applyMemberSession({ handle: data.handle!, space: data.space!, npub: data.npub ?? null });
        window.dispatchEvent(new Event("oc-cart-changed"));
        isNew.current = false;
        onIn?.(data.handle!);
        go({ type: "key-known" });
        return null;
      }
      if (isUnnamedKeyReason(data?.reason) && (event as { pubkey?: string }).pubkey) {
        keyEvent.current = event;
        keyNpub.current = nip19.npubEncode((event as { pubkey: string }).pubkey);
        isNew.current = true;
        go({ type: "key-new" });
        return null;
      }
      return data?.reason ?? "the server hiccuped — your signature was fine; try again";
    } catch {
      return "couldn't reach the server — check your connection and try again";
    } finally {
      setBusy(false);
    }
  }

  /* the Email tab's ghost button AND the Key tab's own "Sign in with my
     key" button both call this — RULED item 3's "same doors": no extension
     ⇒ SignerDoors (shown here, inside the Email tab, when triggered from
     there); extension present ⇒ the direct tap, wrapped in the shared
     30-second timeout (decision 3b), M3's exact words on expiry. */
  async function signInWithKey() {
    if (busy) return;
    setNote(null);
    if (!window.nostr) {
      setEmailSignerOpen(true);
      return;
    }
    setBusy(true);
    let event;
    try {
      event = await withSignTimeout(
        window.nostr.signEvent({
          kind: 22242,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: `PACS-LOGIN-${Date.now()}`,
        }),
      );
    } catch (e) {
      setNote(e instanceof SignTimeoutError ? SIGNER_TIMEOUT_MESSAGE : "signing was declined — nothing sent");
      setBusy(false);
      return;
    }
    const reason = await submitSignedKey(event as unknown as VerifiedEvent);
    if (reason) setNote(reason);
  }

  function wishChanged(v: string) {
    const name = v.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setWish(name);
    setNote(null);
    if (availTimer.current) clearTimeout(availTimer.current);
    if (name.length < 3) {
      setAvail("idle");
      return;
    }
    setAvail("checking");
    availTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/member/availability?handle=${encodeURIComponent(name)}`);
        const d = (await res.json()) as { handle?: string; available?: boolean; reason?: string | null };
        if (d.handle !== name && (d.handle == null || !name.startsWith(d.handle))) return;
        setAvail(d.available ? "free" : "taken");
        setAvailReason(d.reason ?? null);
      } catch {
        setAvail("idle");
      }
    }, 350);
  }

  async function claimName(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy || wish.trim().length < 3 || avail === "taken") return;
    setBusy(true);
    setNote(null);
    try {
      if (keyEvent.current && keyNpub.current) {
        const res = await fetch("/api/member/claim", {
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
        if (data.session) applyMemberSession(data.session);
      } else {
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

  const copy = DOOR_COPY[state];

  const emailPane = emailSignerOpen ? (
    <>
      <p className="kit-body">
        No extension on this device — your key still opens the door, one of these ways:
      </p>
      <SignerDoors kind="login" submit={submitSignedKey} next={nextPathFromLocation() ?? undefined} />
      <p style={{ margin: "14px 0 0" }}>
        <Button
          variant="quiet"
          onClick={() => {
            setEmailSignerOpen(false);
            setNote(null);
          }}
        >
          ← the email door
        </Button>
      </p>
    </>
  ) : (
    <>
      <p className="kit-body">{copy.note}</p>
      <form onSubmit={sendCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field
          id="signin-email"
          label="Email address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
        />
        <Button type="submit" disabled={busy}>
          {busy ? copy.busyCta : copy.cta}
        </Button>
      </form>
      <p className="kit-text-quiet" style={{ margin: "16px 0 8px" }}>
        {keyNoteFor(hasNostr, android)}
      </p>
      <Button variant="second" sm onClick={signInWithKey} disabled={busy}>
        {DOOR_KEY_CTA}
      </Button>
    </>
  );

  const keyPane = (
    <>
      <p className="kit-body">{keyExplainer}</p>
      {hasNostr ? (
        <Button onClick={signInWithKey} disabled={busy}>
          {busy ? "Signing…" : DOOR_KEY_CTA}
        </Button>
      ) : (
        <SignerDoors kind="login" submit={submitSignedKey} next={nextPathFromLocation() ?? undefined} />
      )}
    </>
  );

  return (
    <Card role="dialog" aria-label="Sign in">
      {copy && <p className="kit-h2">{copy.title}</p>}

      {state === "sign-in" && (
        <Tabs
          label="Sign in"
          defaultActive={defaultTab}
          items={[
            { id: "email", label: emailTabLabel, content: emailPane },
            { id: "key", label: keyTabLabel, content: keyPane },
          ]}
        />
      )}

      {state === "code" && (
        <>
          <p className="kit-body">
            {copy.note} Sent to <strong>{email}</strong>.
          </p>
          <form onSubmit={verifyCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field
              id="signin-code"
              label="Sign-in code"
              inputMode="numeric"
              pattern="\d{6}"
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="••••••"
            />
            <Button type="submit" disabled={busy || code.length !== 6}>
              {busy ? copy.busyCta : copy.cta}
            </Button>
          </form>
          <p style={{ margin: "14px 0 0" }}>
            <Button
              variant="quiet"
              onClick={() => {
                setCode("");
                setNote(null);
                go({ type: "back" });
              }}
            >
              {DOOR_BACK}
            </Button>
          </p>
        </>
      )}

      {state === "new-name" && (
        <>
          <p className="kit-body">{copy.note}</p>
          <form onSubmit={claimName} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field
              id="signin-name"
              label={`Your name (${DOOR_NAME_SUFFIX})`}
              autoFocus
              value={wish}
              onChange={(e) => wishChanged(e.target.value)}
              placeholder="your name"
              maxLength={20}
            />
            <p aria-live="polite" className="kit-text-quiet" style={{ margin: 0, minHeight: "1.2em" }}>
              {avail === "checking" && <span>checking…</span>}
              {avail === "free" && <span style={{ color: "var(--ok, #7fb98f)" }}>✓ this name is free</span>}
              {avail === "taken" && (
                <span style={{ color: "var(--err)" }}>✗ {availReason ?? "not available — try another"}</span>
              )}
            </p>
            <Button type="submit" disabled={busy || wish.trim().length < 3 || avail === "taken"}>
              {busy ? copy.busyCta : copy.cta}
            </Button>
          </form>
          <p style={{ margin: "12px 0 0" }}>
            <Button
              variant="quiet"
              onClick={() => {
                keyEvent.current = null;
                setWish("");
                setNote(null);
                go({ type: "back" });
              }}
            >
              ← back
            </Button>
          </p>
        </>
      )}

      {state === "in" && (
        <>
          <p className="kit-body">{copy.note}</p>
          <Button onClick={finish}>{copy.cta}</Button>
        </>
      )}

      {note && (
        <p role="alert" className="kit-text-quiet" style={{ color: "var(--err)" }}>
          {note}
        </p>
      )}
    </Card>
  );
}
