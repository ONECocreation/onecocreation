"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/kit/Button";
import Field from "@/components/kit/Field";
import useMemberSession, { refresh as refreshSession } from "@/hooks/useMemberSession";
import { getJoinConfig, getSubscription, subscribeCall, type JoinConfig } from "@/lib/subscription-client";
import { errorWords, joinStage, monthlyLine, pickOffer, squareSdkUrl, type SubView } from "@/lib/subscription-ui";

/* The slice of Square's Web Payments SDK this box uses. */
interface SqCard {
  attach(selector: string | HTMLElement): Promise<void>;
  tokenize(): Promise<{ status: string; token?: string; errors?: { message?: string }[] }>;
  destroy(): Promise<void>;
}
interface SqPayments {
  card(opts?: { style?: Record<string, Record<string, string>> }): Promise<SqCard>;
  verifyBuyer(token: string, details: Record<string, unknown>): Promise<{ token?: string } | null>;
}
declare global {
  interface Window { Square?: { payments(appId: string, locationId: string): Promise<SqPayments> } }
}

function loadSquare(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Square) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    const el = existing ?? Object.assign(document.createElement("script"), { src, async: true });
    el.addEventListener("load", () => resolve(), { once: true });
    el.addEventListener("error", () => reject(new Error("square sdk")), { once: true });
    if (!existing) document.head.appendChild(el);
  });
}

/** The card box wears the page's own tokens, read at run time (no colour literals). */
function boxStyle(): Record<string, Record<string, string>> {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    input: { color: v("--field-ink"), fontSize: "16px", backgroundColor: v("--field-bg") },
    "input::placeholder": { color: v("--muted") },
    ".message-text": { color: v("--err") },
    ".message-icon": { color: v("--err") },
  };
}

/**
 * T-541b: "Join with card" on a tier page. Signed out meets the existing
 * sign-in door first (and comes back here). Signed in gets Square's card
 * box; the card number never touches our page or server (the SDK hands back
 * a one-time token). Shown only when `features.subscriptions` is ON: the
 * page chooses between this and the one-time buy.
 */
export default function JoinWithCard({ tier, tierName, priceUsd, slug }: { tier: "A" | "B" | "C"; tierName: string; priceUsd: number; slug: string }) {
  const { member, checked } = useMemberSession();
  const [config, setConfig] = useState<JoinConfig | "off" | null | undefined>(undefined);
  const [sub, setSub] = useState<SubView | null | undefined>(undefined);
  const [sdkError, setSdkError] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needEmail, setNeedEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const cardRef = useRef<SqCard | null>(null);
  const paymentsRef = useRef<SqPayments | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const signedIn = !!member;
  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    getSubscription(fetch).then((r) => { if (live) setSub("subscription" in r ? r.subscription : null); });
    getJoinConfig(fetch).then((c) => { if (live) setConfig(c); });
    return () => { live = false; };
  }, [signedIn]);

  const stage = joinStage({
    checked, signedIn,
    configOk: config === undefined ? null : config !== "off" && config !== null,
    subscription: sub,
  });
  const cfg = config && config !== "off" ? config : null;

  // mount Square's card box once the member is ready to join
  useEffect(() => {
    if (stage !== "ready" || !cfg) return;
    let live = true;
    (async () => {
      try {
        await loadSquare(squareSdkUrl(cfg.environment));
        if (!live || !window.Square || !boxRef.current) return;
        const payments = await window.Square.payments(cfg.applicationId, cfg.locationId);
        const card = await payments.card({ style: boxStyle() });
        if (!live || !boxRef.current) { void card.destroy(); return; }
        await card.attach(boxRef.current);
        paymentsRef.current = payments;
        cardRef.current = card;
        setCardReady(true);
      } catch {
        if (live) setSdkError(true);
      }
    })();
    return () => { live = false; void cardRef.current?.destroy().catch(() => {}); cardRef.current = null; setCardReady(false); };
  }, [stage, cfg]);

  const offer = pickOffer(cfg?.open ?? ["standard"], cfg?.offers?.[tier], cfg?.usedBefore === true);

  const join = useCallback(async () => {
    const card = cardRef.current;
    const payments = paymentsRef.current;
    if (!card || !payments || busy) return;
    setBusy(true);
    setError(null);
    try {
      const t = await card.tokenize();
      if (t.status !== "OK" || !t.token) {
        setError(t.errors?.[0]?.message ? `${t.errors[0].message}` : "Please check your card details and try again.");
        return;
      }
      let verificationToken: string | undefined;
      try {
        const v = await payments.verifyBuyer(t.token, { intent: "STORE", customerInitiated: true, sellerKeyedIn: false, billingContact: {} });
        verificationToken = v?.token;
      } catch {
        setError("Your bank could not confirm this card. Please try again or use another card.");
        return;
      }
      const res = await subscribeCall(fetch, { tier, variant: offer.variant, cardToken: t.token, email: needEmail ? email.trim() : undefined, verificationToken });
      if (res?.ok) {
        setDone(true);
        setSub(res.subscription ?? null);
        refreshSession();
        return;
      }
      if (res?.code === "email_required") setNeedEmail(true);
      setError(errorWords(res));
    } finally {
      setBusy(false);
    }
  }, [busy, tier, offer.variant, needEmail, email]);

  if (stage === "off") return null;
  if (stage === "checking") return <p className="kit-note" role="status" aria-busy="true">One moment...</p>;
  if (stage === "signed-out") {
    return (
      <div className="kit-stack">
        <Link className="kit-btn kit-btn-main" href={`/login?next=${encodeURIComponent(`/packages/${slug}`)}`}>
          Sign in to join
        </Link>
        <p className="kit-note">{monthlyLine(priceUsd)}</p>
      </div>
    );
  }
  if (done) {
    return (
      <div className="kit-stack" role="status">
        <p className="kit-body">Welcome to {tierName}. Your membership is active.</p>
        <Link className="kit-btn kit-btn-second" href="/me">See my membership</Link>
      </div>
    );
  }
  if (stage === "already") {
    return (
      <div className="kit-stack">
        <p className="kit-note">You already have a membership.</p>
        <Link className="kit-btn kit-btn-second" href="/me">Manage my membership</Link>
      </div>
    );
  }
  return (
    <div className="kit-stack">
      <p className="kit-note">{monthlyLine(priceUsd)}</p>
      {offer.line && <p className="kit-note"><b>Your offer:</b> {offer.line}</p>}
      <div ref={boxRef} className="kit-cardbox" aria-label="Card details" />
      {sdkError && <p className="kit-note kit-note-err" role="alert">The card box could not load. Please reload the page and try again.</p>}
      {needEmail && (
        <Field id={`join-email-${tier}`} label="Email for your receipts" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      )}
      {error && <p className="kit-note kit-note-err" role="alert">{error}</p>}
      <Button onClick={join} disabled={!cardReady || busy || (needEmail && !email.includes("@"))}>
        {busy ? "Joining..." : `\u{1F4B3} Join ${tierName}`}
      </Button>
    </div>
  );
}
