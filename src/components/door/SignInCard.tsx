"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { nip19 } from "nostr-tools";
import type { VerifiedEvent } from "nostr-tools/pure";
import { applyMemberSession } from "@/hooks/useMemberSession";
import { nextPathFromLocation } from "@/lib/next-path";
import SignerDoors from "@/components/SignerDoors";
import { SignTimeoutError, withSignTimeout } from "@/lib/signer-doors";
import { useHasNostrExtension } from "@/lib/use-nostr-extension";
import Button from "@/components/kit/Button";
import Card from "@/components/kit/Card";
import Field from "@/components/kit/Field";
import Tabs from "@/components/kit/Tabs";
import {
  DOOR_BACK,
  DOOR_COPY,
  DOOR_KEY_CTA,
  DOOR_NAME_SUFFIX,
  DOOR_SEND_CONFIRMATION,
  DOOR_SEND_TIMEOUT_MS,
  DOOR_SEND_TIMEOUT_NOTE,
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
 * `door-machine.ts`), redrawn in kit parts.
 *
 * TASK-356 (0018.07.02 a₿, the Admiral's desktop walk of `/login`,
 * REVIEW-K87 folded — its "OWNS is now:" line is the real OWNS) — four
 * fixes from one walk:
 *
 *  1. THE ADMIRAL OVERRULES K83's own RULED item 3 ("same doors"): "on the
 *     email tab, we shouldnt have a button to sign in with a key. it makes
 *     it confusing for the user. that's why we split the tabs." The
 *     Email tab's second key Button, its device-aware quiet line, and the
 *     local sign-in-in-place branch that opened `SignerDoors` inside the
 *     Email tab are gone
 *     — replaced with one quiet, real pointer to the Key tab. `Tabs` runs
 *     controlled now (`activeTab` state, `active`/`onChange`) so that
 *     pointer can actually select the Key tab, not just say the words.
 *  2. THE KEY TAB ALWAYS SHOWS A REAL WAY IN: with no extension, a plain
 *     line above the doors says so, and `SignerDoors` renders with the new
 *     `variant="card"` (SignerDoors.tsx, additive) — a visible chevron,
 *     the native marker hidden, `--ghost-bg`/`--ghost-ink` in place of the
 *     quiet default, ≥4.5:1 on both themes (SUMMARY.md carries the
 *     computed ratios).
 *  3. THE SECOND CAUSE (REVIEW-K87 item 2, rides both mounts): the local
 *     one-shot `useHasNostrExtension` (never re-checked after first paint)
 *     is retired in favor of `@/lib/use-nostr-extension`'s real subscribe
 *     — an add-on that injects `window.nostr` after hydration now flips
 *     the card instead of stranding it. `DoorSheet.tsx` gets the same
 *     swap, that swap only.
 *  4. ALIGNMENT (RULED K-b = (a)): the title and the tab list are centred;
 *     body copy stays left (legibility doctrine — reading text is never
 *     centred); the email/code/name `Field`s lose their kit-wide
 *     `max-width:360px` cap (via a component-scoped class + a scoped
 *     `<style>`, `kit.css` itself untouched) so their right edge lands on
 *     the same edge as the full-width main Button beneath them.
 *
 * Every call below is the SAME real route DoorSheet.tsx calls
 * (`/api/auth/email/*`, `/api/member/session`, `/api/member/claim`,
 * `/api/member/profile`, `/api/member/availability`) — nothing new
 * server-side, no auth logic rewritten.
 *
 * SEND-BACK (Number One's Chrome walk, 390px): the kit's `variant="main"`
 * Button (kit.css `.kit-btn-main`) is a fixed 1.5rem/40px-padding/2px-
 * letter-spacing/nowrap size that clips at 390px (measured: width 277,
 * scrollWidth 281, "EMAIL ME A CODE"). `kit.css` is READ-ONLY for this
 * lane (T-349's), so every `variant="main"` Button below carries `sm` —
 * a real fluid button size is kit lane 4b's job, not this lane's.
 *
 * Mount matrix (Ground item 10): `login-door.tsx` (Puck block, READ-ONLY,
 * no self-wrap here), the `/login` hand-built fallback, `MeSwitch.tsx`
 * (×2, error + signed-out) — every one of them can mount this with no
 * props/callbacks at all, so every fix above must be safe under the
 * default props with no `onIn`/`onClose`.
 */

/** B2 — the Key tab's "what is this?" explainer, M2's exact words
    (`oc-kit-me-login-mockups.html:113`). Also this Puck field's default. */
export const KEY_EXPLAINER =
  "A key is a sign-in you own. No company holds your account. A small browser add-on keeps the key and asks you before it signs anything. New to it? Use the Email tab — you can add a key later.";

/** The 30-second timeout's plain message, M3's exact words (the Admiral,
    MOCKUPS-1, `oc-kit-me-login-mockups.html:120`) — used verbatim, never a
    paraphrase. */
export const SIGNER_TIMEOUT_MESSAGE =
  "⚠ No answer after 30 seconds. Your signer opens its own small window — look behind this one. Still nothing? Close this window, open a new one, and try again.";

/** TASK-356 (the Admiral's overruling of K83's RULED item 3): the Email
    tab's own quiet pointer to the Key tab — words, not a duplicate door.
    Split in two so only "Use the Key tab." rides inside the real,
    tab-selecting Button. */
export const EMAIL_KEY_POINTER = "Have a key? ";
export const EMAIL_KEY_TAB_LINK = "Use the Key tab.";

/** TASK-356 (REVIEW-K87 item 2 of the Build steps): the Key tab, no
    extension found — said plainly, above the doors, never a silent gap. */
export const KEY_NO_EXTENSION_NOTE =
  "No key add-on found in this browser. Pick one of these ways, or use the Email tab.";

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

  type OpenState = Exclude<DoorState, "closed">;
  const [state, setState] = useState<OpenState>(initialKey ? "new-name" : "sign-in");
  const [activeTab, setActiveTab] = useState<"email" | "key">(defaultTab ?? "email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [wish, setWish] = useState("");
  const [avail, setAvail] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const [availReason, setAvailReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

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
    /* block 968,624 — a slow relay fails HONESTLY on the client side too:
       25s, then an uncertain-outcome note (never "failed" — the server's
       send may still land, see DOOR_SEND_TIMEOUT_NOTE's own comment). */
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DOOR_SEND_TIMEOUT_MS);
    try {
      const res = await fetch("/api/auth/email/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
      if (res.ok && data?.ok) go({ type: "code-sent" });
      else setNote(data?.reason ?? "The letter didn't send. Try again.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") setNote(DOOR_SEND_TIMEOUT_NOTE);
      else setNote("Couldn't reach the server. Check your connection and try again.");
    } finally {
      clearTimeout(timer);
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

  /* ONE submit function, every key entry point: the Key tab's own
     SignerDoors and the Key tab's direct-extension button — mirrors
     DoorSheet.tsx's own submitSignedKey shape/contract exactly (TASK-316's
     "one submit" law). */
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

  /* the Key tab's own "Sign in with my key" button, wrapped in the shared
     30-second timeout (decision 3b), M3's exact words on expiry. */
  async function signInWithKey() {
    if (busy) return;
    setNote(null);
    if (!window.nostr) return;
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
          setNote(data?.reason ?? "That name couldn't be claimed. Try another.");
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
          setNote(data?.reason ?? "That name couldn't be claimed. Try another.");
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

  const emailPane = (
    <>
      <p className="kit-body" style={{ marginBottom: 12 }}>{copy.note}</p>
      <form onSubmit={sendCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field
          id="signin-email"
          label="Email address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="signin-card-field"
        />
        {/* send-back: sm — .kit-btn-main clips at 390px, kit.css is read-only */}
        <Button type="submit" sm disabled={busy} style={{ width: "100%" }}>
          {busy ? copy.busyCta : copy.cta}
        </Button>
      </form>
      {/* TASK-356 (the Admiral overrules K83's RULED item 3): a real
          pointer, not a second door — "Use the Key tab." selects the Key
          tab via the now-controlled Tabs below, it never opens SignerDoors
          in place here. */}
      <p className="kit-text-quiet" style={{ margin: "16px 0 0" }}>
        {EMAIL_KEY_POINTER}
        <Button variant="quiet" onClick={() => setActiveTab("key")}>
          {EMAIL_KEY_TAB_LINK}
        </Button>
      </p>
    </>
  );

  const keyPane = (
    <>
      <p className="kit-body" style={{ marginBottom: 12 }}>{keyExplainer}</p>
      {hasNostr ? (
        // send-back: sm — .kit-btn-main clips at 390px, kit.css is read-only
        <Button onClick={signInWithKey} sm disabled={busy} style={{ width: "100%" }}>
          {busy ? "Signing…" : DOOR_KEY_CTA}
        </Button>
      ) : (
        <>
          {/* REVIEW-K87 item 3 ("i dont see the ability to sign in there"):
              said plainly, above the doors, then a real way in — never a
              dead end. `variant="card"` is SignInCard's alone; DoorSheet
              and OperatorGate keep the default look. */}
          <p className="kit-body" style={{ marginBottom: 12 }}>{KEY_NO_EXTENSION_NOTE}</p>
          <SignerDoors
            kind="login"
            submit={submitSignedKey}
            next={nextPathFromLocation() ?? undefined}
            variant="card"
          />
        </>
      )}
    </>
  );

  return (
    <Card role="dialog" aria-label="Sign in">
      {/* RULED K-b = (a): title + tab list centred, body left, controls
          full card width. Neither kit.css nor Tabs.tsx/Field.tsx (both
          READ-ONLY) are touched — this scoped rule targets only this
          card's own Field wrapper (a component-local class, the
          WelcomeFlow.tsx "shine-walk" precedent) and its own tab-list
          wrapper (a data attribute, never a class rename). */}
      <style>{`
        .kit-field.signin-card-field{max-width:none}
        [data-signin-tabs] .kit-tabs-list{justify-content:center}
      `}</style>

      {copy && <p className="kit-h2" style={{ textAlign: "center" }}>{copy.title}</p>}

      {state === "sign-in" && (
        <div data-signin-tabs="">
          <Tabs
            label="Sign in"
            active={activeTab}
            onChange={(id) => setActiveTab(id === "key" ? "key" : "email")}
            items={[
              { id: "email", label: emailTabLabel, content: emailPane },
              { id: "key", label: keyTabLabel, content: keyPane },
            ]}
          />
        </div>
      )}

      {state === "code" && (
        <>
          <p className="kit-body" style={{ marginBottom: 12 }}>
            <strong>{DOOR_SEND_CONFIRMATION}</strong> {copy.note} Sent to <strong>{email}</strong>.
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
              className="signin-card-field"
            />
            {/* send-back: sm — .kit-btn-main clips at 390px, kit.css is read-only */}
            <Button type="submit" sm disabled={busy || code.length !== 6} style={{ width: "100%" }}>
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
          <p className="kit-body" style={{ marginBottom: 12 }}>{copy.note}</p>
          <form onSubmit={claimName} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field
              id="signin-name"
              label={`Your name (${DOOR_NAME_SUFFIX})`}
              autoFocus
              value={wish}
              onChange={(e) => wishChanged(e.target.value)}
              placeholder="your name"
              maxLength={20}
              className="signin-card-field"
            />
            <p aria-live="polite" className="kit-text-quiet" style={{ margin: 0, minHeight: "1.2em" }}>
              {avail === "checking" && <span>checking…</span>}
              {avail === "free" && <span style={{ color: "var(--ok, #7fb98f)" }}>✓ this name is free</span>}
              {avail === "taken" && (
                <span style={{ color: "var(--err)" }}>✗ {availReason ?? "not available — try another"}</span>
              )}
            </p>
            {/* send-back: sm — .kit-btn-main clips at 390px, kit.css is read-only */}
            <Button type="submit" sm disabled={busy || wish.trim().length < 3 || avail === "taken"} style={{ width: "100%" }}>
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
          <p className="kit-body" style={{ marginBottom: 12 }}>{copy.note}</p>
          {/* send-back: sm — .kit-btn-main clips at 390px, kit.css is read-only */}
          <Button onClick={finish} sm style={{ width: "100%" }}>
            {copy.cta}
          </Button>
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
