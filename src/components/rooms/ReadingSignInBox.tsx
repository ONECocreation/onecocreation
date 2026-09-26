"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/kit/Card";
import Field from "@/components/kit/Field";
import Button from "@/components/kit/Button";
import useMemberSession, { applyMemberSession } from "@/hooks/useMemberSession";
import { ReadingSignUpCard, postReadingSignUp, OUTCOME_COPY } from "./ReadingSignUp";
import { classifySignUpKind, type ReadingTagOutcome } from "./reading-sign-up-state";

/**
 * TASK-468 (block 968,561) — ONE BOX, /reading#sign-up. The Thu 2026-09-24
 * call with Love (briefings/walk-968482/walk.txt, [00:06:27]-[00:07:26],
 * [00:29:56]-[00:31:18], [00:39:04]-[00:40:52]) asked for exactly this:
 * "it could say sign up you know keep me posted or sign up maybe it's
 * both... sign me up keep me posted and it takes care of two things at one
 * time"; "as soon as you get their email that creates their account...
 * that's your username until you customize it"; "send them the token like
 * that six digit and then they're logged in." The Admiral's tracker: route
 * them to the Heart Field after sign-in. Today (968,561): "want to watch
 * the live, be sure to sign up > email and code, all stays on page, with
 * the keep me posted or stay in the know emails. after email key login,
 * give the option to open the watch now reading first part."
 *
 * This REPLACES the old `<ReadingSignUp variant="public">` mount on
 * /reading (src/app/reading/page.tsx) — that component, its route
 * (/api/subscribe) and its ROOM mount (ReadingNotice.tsx, the free
 * member's "count me in") are UNTOUCHED. This box reuses its exact submit
 * path for the letters half (`postReadingSignUp`, `OUTCOME_COPY`) and its
 * exact returning-member card (`ReadingSignUpCard`, `variant="public"`) so
 * the two doors can never drift into two different promises.
 *
 * AUTH PATH — REUSED, NOT REBUILT. The same two routes EmailDoor.tsx and
 * SignInCard.tsx already call, nothing new server-side:
 *   start:  POST /api/auth/email/start  {email}       -> {ok, reason?}
 *           (src/app/api/auth/email/start/route.ts:10-49) — the code-door
 *           meter (code-door-limit.ts, 10 sends/10 min as of block 968,624)
 *           rides untouched by this component.
 *   verify: POST /api/auth/email/verify {email, code} -> {ok, handle,
 *           space} + Set-Cookie (src/app/api/auth/email/verify/
 *           route.ts:30-78) — the SAME real member-session cookie
 *           (SameSite=Lax, line 74 — this repo's CSRF guard for this
 *           cookie; a file named "login-csrf-origin-guard" was searched
 *           for and does not exist anywhere in this repo) every other
 *           door already sets. `email-auth.ts`'s own five-wrong-tries
 *           verify limit rides untouched too.
 * Subscribing rides ONLY after verify answers ok — `verifyAndSubscribe`
 * below never reaches `postReadingSignUp` on a bad code, so nobody can
 * quietly sign a stranger's inbox up by guessing an email alone.
 *
 * NEW-ACCOUNT NAMING — TRACED, NOT BUILT. `verify/route.ts:70-77` names a
 * brand-new email member by the RAW EMAIL itself (`handle: email` — line
 * 71's response, `makeMemberToken(email, "email")` — line 68): there is NO
 * "first part of the email" default anywhere on this path today. The only
 * surface that forces a manual "pick a name" step is `/login`'s
 * `SignInCard.tsx` (verifyCode:186-218 reads `/api/member/profile`; an
 * empty `displayName`/`accountName` sets `isNew`, which door-machine.ts's
 * `reduce()` (:40-41) sends to the `"new-name"` state — `claimName`:307-347
 * PUTs `/api/member/profile`, profile/route.ts:119-186). `EmailDoor.tsx`
 * (verify:70-98) — the OTHER real caller of this SAME verify route — never
 * forces that step either; it goes straight to "done". This box follows
 * EmailDoor's own precedent (no forced claim step) so "all stays on page"
 * holds and no new server path is needed for this lane. Auto-naming
 * (deriving a default @onecocreation handle from the email's local part)
 * would need a new default written into `verify/route.ts` around line 71
 * (the `{ ok: true, handle: email, ... }` response) or into
 * `profile/route.ts`'s GET lazy-heal around line 108 — NOT built here
 * (a sign-in lane gets no new server path); left as a follow-up.
 *
 * NO NAVIGATION. Every success path calls `applyMemberSession` (updates
 * the shared client store in place — the same function SignInCard.tsx's
 * own `verifyCode` calls) and refreshes the router in place (re-runs
 * server components against the now-set cookie) — never a full-page
 * redirect (EmailDoor.tsx's own success path assigns a new location) and
 * never a router push to a new path. The visitor never leaves
 * /reading#sign-up.
 *
 * TWO components, the same "pin the model, not the render" law
 * ReadingSignUp.tsx already carries: `ReadingSignInCard` (named) is pure
 * w.r.t. session — an explicit `member` prop, no `useMemberSession()` call
 * of its own — so `renderToStaticMarkup` can render every real state
 * directly (this repo's vitest runs no jsdom). `ReadingSignInBox` (default)
 * is the one real hook-wired mount, wired for `/reading`.
 */

export const EMAIL_CTA = "Email me a code";
export const EMAIL_BUSY_CTA = "Sending your code…";
export const CODE_CTA = "Sign me in";
export const CODE_BUSY_CTA = "Signing you in…";
/* the SAME words the stage card above already uses for the same door
   (ReadingStage.tsx): one place, one set of words (Lumen's review, 968,561) */
export const WATCH_CTA = "Go to the Heart Field";
export const HEART_FIELD_HREF = "/rooms/heart-field";
export const NOSTR_KEY_POINTER = "Have a Nostr key? ";
export const NOSTR_KEY_LINK_LABEL = "Sign in with your Nostr key";
export const NOSTR_KEY_HREF = "/login?next=%2Freading";
export const BOX_HEADING = "Sign me up. Keep me posted.";
/* the code step says where the code went and how long it works (the
   /login sheet's own note, door-machine.ts, without its dash) */
export const CODE_SENT_LINE = "A code is on its way to your inbox. It works for ten minutes.";
/* block 968,624 (VERDICT-968624.md / L4-TRACE.md §4 item 2, ASTRA-REVIEW.md
   L4 "No false success") — the code step is reachable ONLY after
   startEmailCode() resolves { ok: true } below, so this confirmation is
   honest wherever it renders: it never appears before the server actually
   accepted the send. The box's own words, same law as CODE_SENT_LINE. */
export const CODE_SENT_CONFIRMATION = "Code sent. Check your inbox.";
/* A client fetch timeout for the send-code call (mail.ts's own transport
   timeout is the other half of this fix). A client-side abort does NOT
   cancel a server-side SMTP send already under way (VERDICT-968624:
   "client abort does not cancel server-side SMTP; retrying can deliver
   multiple codes") — so this never claims failure, only an honest,
   uncertain outcome. */
const SEND_TIMEOUT_MS = 25_000;
export const SEND_TIMEOUT_MESSAGE =
  "This is taking longer than usual. Check your inbox before trying again.";
export const DIFFERENT_EMAIL_POINTER = "Wrong email? ";
export const DIFFERENT_EMAIL_LINK_LABEL = "Use a different one";
/* the exact promise ReadingSignUp.tsx's own public card already keeps
   (its own `quietLine`) — reused verbatim so this box never states a
   second promise (Ground). */
export const BOX_QUIET_LINE =
  "A reminder the morning of each reading, and Love's letters when something fun is on.";

/* no em dash anywhere in this file's own copy (the Admiral, 968,561: "he
   calls dashes slop") — two short sentences instead. */
const GENERIC_ERROR = "Something went sideways. Please try again.";
const BAD_CODE = "That code didn't match. Try again.";
const NOT_READY = "Email sign-in isn't ready just now. Please try again soon.";

/* The box speaks its OWN words, picked by the route's status, never the
   route's `reason` string: those are lowercase and several carry an em
   dash (start/route.ts, verify/route.ts, code-door-limit.ts, all outside
   this lane). The adversarial review (block 968,561) proved a wrong code
   showed "that code didn't match — try again" here. */
export function startErrorWords(status: number): string {
  if (status === 400) return "That email doesn't look right. Please check it.";
  if (status === 429) return "Too many codes asked for. Give it a few minutes and try again.";
  if (status === 502) return "The letter didn't send. Please try again.";
  if (status === 503) return NOT_READY;
  return GENERIC_ERROR;
}

export function verifyErrorWords(status: number): string {
  if (status === 400 || status === 401) return BAD_CODE;
  if (status === 503) return NOT_READY;
  return GENERIC_ERROR;
}

export type SignInOutcome = ReadingTagOutcome | "subscribe-unknown";

/** The three real outcomes `addReadingTag` reports (OUTCOME_COPY,
 *  ReadingSignUp.tsx), plus one honest fourth: a good sign-in is NEVER
 *  unwound by a subscribe call that itself failed (a dark mail rail, a
 *  network hiccup) — but the box never claims "on the list" when it
 *  doesn't actually know that. */
const BOX_OUTCOME_COPY: Record<SignInOutcome, string> = {
  ...OUTCOME_COPY,
  /* the shared card's "You're already in." doubled the box's own "You're
     in." heading (Lumen's review, 968,561) */
  already: "You were already on the list for the reading.",
  "subscribe-unknown": "You're signed in. The letters list didn't answer just now. Reload this page to try Keep me posted again.",
};

/** Step one — the exact /api/auth/email/start contract (EmailDoor.tsx's
 *  own `start`, SignInCard.tsx's own `sendCode`). */
export async function startEmailCode(email: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch("/api/auth/email/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    if (res.ok && data?.ok) return { ok: true };
    return { ok: false, message: startErrorWords(res.status) };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return { ok: false, message: SEND_TIMEOUT_MESSAGE };
    return { ok: false, message: GENERIC_ERROR };
  } finally {
    clearTimeout(timer);
  }
}

/** Step two — verify, THEN (only once the code is proven, never a moment
 *  earlier) subscribe through the exact call the public "Keep me posted"
 *  card already makes. A failed verify returns before `postReadingSignUp`
 *  is ever reached: no sign-in, no subscribe, no signing a stranger's
 *  inbox up off a guessed email. */
export async function verifyAndSubscribe(
  email: string,
  code: string,
): Promise<{ ok: true; handle: string; space: string; outcome: SignInOutcome } | { ok: false; message: string }> {
  let verifyData: { ok?: boolean; handle?: string; space?: string } | null;
  try {
    const res = await fetch("/api/auth/email/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    verifyData = await res.json().catch(() => null);
    if (!res.ok || !verifyData?.ok) {
      return { ok: false, message: verifyErrorWords(res.status) };
    }
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
  // verified — safe to subscribe now, never a moment before this line
  const sub = await postReadingSignUp(email);
  return {
    ok: true,
    handle: verifyData.handle!,
    space: verifyData.space!,
    outcome: sub.ok ? sub.outcome : "subscribe-unknown",
  };
}

export interface ReadingSignInCardProps {
  /** Explicit, no hook here — mirrors `ReadingSignUpCard`'s own pure-render
   *  law. `ReadingSignInBox` (below) is the one real `useMemberSession()`
   *  caller. */
  member: { handle: string; space: string } | null;
  /** The outcome THIS box's own verify-and-subscribe call just resolved.
   *  Absent/null means "arrived already signed in" — the subscribe outcome
   *  is unknown, so the returning-member card is reused as-is (Build
   *  step 3). */
  justJoined?: SignInOutcome | null;
  /** Testability seed only — the same `defaultTab` convention
   *  `SignInCard.tsx` already carries for its own step state. No real
   *  caller passes this; this repo's vitest runs no jsdom, so the code
   *  step's own render is pinned by seeding the initial step rather than
   *  simulating a click. */
  initialStep?: "email" | "code";
  onVerified?: (result: { handle: string; space: string; outcome: SignInOutcome }) => void;
}

export function ReadingSignInCard({ member, justJoined, initialStep = "email", onVerified }: ReadingSignInCardProps) {
  const [step, setStep] = useState<"email" | "code">(initialStep);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNote(null);
    const result = await startEmailCode(email);
    if (result.ok) setStep("code");
    else setNote(result.message);
    setBusy(false);
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNote(null);
    const result = await verifyAndSubscribe(email, code);
    if (result.ok) onVerified?.(result);
    else setNote(result.message);
    setBusy(false);
  }

  // Case 2 — just completed this box's own email+code flow this session:
  // the honest outcome is already known, so ONE button, nothing else.
  if (justJoined) {
    return (
      <Card id="sign-up" className="kit-signup">
        <div className="kit-stack">
          <h2 className="kit-h2">You&apos;re in.</h2>
          <p>{BOX_OUTCOME_COPY[justJoined]}</p>
        </div>
        <div className="center">
          <Link className="kit-btn kit-btn-main kit-btn-sm" href={HEART_FIELD_HREF}>
            {WATCH_CTA}
          </Link>
        </div>
      </Card>
    );
  }

  // Case 3 — arrived already signed in: the subscribe outcome is unknown,
  // so REUSE the exact returning-member card ReadingSignUp.tsx's public
  // variant already has (Keep me posted / already-in, never rebuilt). No
  // Heart Field button here: the stage card above already carries that
  // door, and a button between two cards floated loose in the shots
  // (Number One's review, block 968,561). The door right after a fresh
  // sign-in (Case 2) stays.
  if (member) {
    const memberKind = member.space === "email" ? "member" : "member-key";
    return (
      <div id="sign-up">
        <ReadingSignUpCard
          kind={memberKind}
          memberEmail={memberKind === "member" ? member.handle : null}
          variant="public"
        />
      </div>
    );
  }

  // Case 1 — signed out: email, then (same box) the code.
  return (
    <Card id="sign-up" className="kit-signup">
      <div className="kit-stack">
        <h2 className="kit-h2">{BOX_HEADING}</h2>
        <p className="kit-text-quiet">{BOX_QUIET_LINE}</p>
      </div>

      {step === "email" && (
        <>
          <form className="kit-inline-form" onSubmit={submitEmail}>
            <Field
              id="reading-signin-email"
              label="Email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={note ?? undefined}
            />
            <Button type="submit" sm disabled={busy}>
              {busy ? EMAIL_BUSY_CTA : EMAIL_CTA}
            </Button>
          </form>
          {/* the ONLY key word Love allows (the walk: plain "your key"
              confused her) — a quiet pointer, never a second loud door */}
          <p className="kit-text-quiet">
            {NOSTR_KEY_POINTER}
            <Link href={NOSTR_KEY_HREF}>{NOSTR_KEY_LINK_LABEL}</Link>
          </p>
        </>
      )}

      {step === "code" && (
        <>
          <p className="kit-text-quiet">
            <strong>{CODE_SENT_CONFIRMATION}</strong> {CODE_SENT_LINE} Sent to <b>{email}</b>.
          </p>
          <form className="kit-inline-form" onSubmit={submitCode}>
            <Field
              id="reading-signin-code"
              label="Sign-in code"
              inputMode="numeric"
              pattern="\d{6}"
              required
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              error={note ?? undefined}
            />
            <Button type="submit" sm disabled={busy || code.length !== 6}>
              {busy ? CODE_BUSY_CTA : CODE_CTA}
            </Button>
          </form>
          {/* a mistyped email is never a dead end. The same quiet pointer
              line as the Nostr key link on the email step, so the box keeps
              one button size (the /login sheet's back door, as a link). */}
          <p className="kit-text-quiet">
            {DIFFERENT_EMAIL_POINTER}
            <a
              href="#sign-up"
              onClick={(e) => {
                e.preventDefault();
                if (busy) return;
                setStep("email");
                setCode("");
                setNote(null);
              }}
            >
              {DIFFERENT_EMAIL_LINK_LABEL}
            </a>
          </p>
        </>
      )}
    </Card>
  );
}

export default function ReadingSignInBox() {
  const { member, checked } = useMemberSession();
  const router = useRouter();
  const [justJoined, setJustJoined] = useState<SignInOutcome | null>(null);

  const kind = classifySignUpKind({ checked, member: member ? { space: member.space } : null });
  if (kind === "loading") return null; // Ground: never flash a step before the session resolves

  return (
    <ReadingSignInCard
      member={member ? { handle: member.handle, space: member.space } : null}
      justJoined={justJoined}
      onVerified={(result) => {
        applyMemberSession({ handle: result.handle, space: result.space, npub: null });
        setJustJoined(result.outcome);
        router.refresh(); // stays on /reading#sign-up — never a navigation
      }}
    />
  );
}
