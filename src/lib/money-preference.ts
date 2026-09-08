import { useEffect, useState } from "react";
import { defaultPreferOf, type MoneyPrefer, type MoneyRails } from "./money-words";

/**
 * TASK-186 (0018.06.18 a₿) — THE MONEY PREFERENCE: which denomination the
 * visitor reads first. Three truths, one winner, in order:
 *
 *   1. SIGNED IN WINS — the member profile's additive `moneyPrefer` field
 *      (GET/PUT /api/member/profile) is the member's own saved word.
 *   2. the cookie/localStorage `oc-money` ("fiat" | "sats") — what the
 *      checkout toggle last chose on THIS browser. The cookie half lets the
 *      server-rendered price lines (the item page, the packages page) speak
 *      the visitor's language on first paint; localStorage gives the client
 *      surfaces the instant read.
 *   3. the default — "fiat" when the card rail is live, else "sats"
 *      (defaultPreferOf, money-words.ts).
 *
 * One tap on the "$ · sats" toggle flips every price on the page: the writer
 * stamps both stores and dispatches MONEY_EVENT; every surface riding
 * useMoneyPrefer hears it and re-words itself. No "≈", ever — the other
 * denomination is Love's own second number, never a conversion.
 */

export const MONEY_COOKIE = "oc-money";
export const MONEY_EVENT = "oc-money-changed";

/** anything but the two honest words is no preference at all */
export function normalizePrefer(v: unknown): MoneyPrefer | null {
  return v === "fiat" || v === "sats" ? v : null;
}

/** THE RESOLUTION, pure for tests: signed in wins, then the cookie, then
 *  the rail-judged default. */
export function resolvePrefer(
  member: MoneyPrefer | null,
  cookie: MoneyPrefer | null,
  rails: MoneyRails,
): MoneyPrefer {
  return member ?? cookie ?? defaultPreferOf(rails);
}

/* ── client side ──────────────────────────────────────────────────────────
 * Every read is guarded — these functions are imported by server modules too
 * (the pure half above rides along), so nothing touches window uninvited. */

/** the browser's remembered choice — localStorage first, the cookie as the
 *  same truth's second copy (a visitor who only carries the cookie still
 *  gets their words on the client surfaces) */
export function readPrefer(): MoneyPrefer | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(MONEY_COOKIE);
    if (normalizePrefer(v)) return normalizePrefer(v);
  } catch {
    /* storage can be denied — the cookie copy still speaks */
  }
  return preferFromCookieHeader(typeof document !== "undefined" ? document.cookie : null);
}

/** remember a choice on this browser: localStorage + the cookie (a year,
 *  root path — the server-rendered price lines read it), then tell every
 *  listening surface on the page */
export function savePrefer(prefer: MoneyPrefer): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MONEY_COOKIE, prefer);
  } catch {
    /* denied storage never blocks the flip */
  }
  document.cookie = `${MONEY_COOKIE}=${prefer}; Path=/; SameSite=Lax; Max-Age=${365 * 24 * 3600}`;
  window.dispatchEvent(new Event(MONEY_EVENT));
}

/**
 * The hook every client price surface rides. The FIRST render is the
 * rail-judged default on both sides of hydration (deterministic — no
 * mismatch); the effect then pours the remembered choice and listens for
 * the toggle's knock. `set` writes the choice and flips the page.
 */
export function useMoneyPrefer(
  rails: MoneyRails,
): [MoneyPrefer, (p: MoneyPrefer) => void] {
  const [prefer, setPreferState] = useState<MoneyPrefer>(() => defaultPreferOf(rails));
  useEffect(() => {
    const remembered = readPrefer();
    if (remembered) setPreferState(remembered);
    const onFlip = () => {
      const p = readPrefer();
      if (p) setPreferState(p);
    };
    window.addEventListener(MONEY_EVENT, onFlip);
    return () => window.removeEventListener(MONEY_EVENT, onFlip);
    // the rails are a per-page constant — the listener doesn't re-arm per render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setPrefer = (p: MoneyPrefer) => {
    savePrefer(p);
    setPreferState(p);
  };
  return [prefer, setPrefer];
}

/** the member's saved word (signed in wins). `signedIn` distinguishes "a
 *  member with no saved word yet" from a guest — the toggle only writes back
 *  to the profile when there IS a profile. */
export async function readMemberPrefer(): Promise<{ signedIn: boolean; prefer: MoneyPrefer | null }> {
  const d: { ok?: boolean; moneyPrefer?: unknown } | null = await fetch("/api/member/profile")
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  if (!d?.ok) return { signedIn: false, prefer: null };
  return { signedIn: true, prefer: normalizePrefer(d.moneyPrefer) };
}

/** persist the member's choice to their profile (additive field). Never
 *  throws — a profile write that fails leaves the cookie's truth standing. */
export async function saveMemberPrefer(prefer: MoneyPrefer): Promise<boolean> {
  const res = await fetch("/api/member/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ moneyPrefer: prefer }),
  }).catch(() => null);
  return !!res?.ok;
}

/* ── server side ──────────────────────────────────────────────────────────*/

/** the `oc-money` cookie out of a Cookie header (or the document.cookie
 *  string client-side) — the same tiny parse, both worlds */
export function preferFromCookieHeader(header: string | null): MoneyPrefer | null {
  if (!header) return null;
  const m = header.match(new RegExp(`(?:^|;\\s*)${MONEY_COOKIE}=(fiat|sats)(?:;|$)`));
  return normalizePrefer(m?.[1]);
}
