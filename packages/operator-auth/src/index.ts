import crypto from "crypto";
import { verifyEvent, nip19 } from "nostr-tools";

/**
 * Operator auth — ported from pacsarcade-org's console-auth: the operator IS
 * a key, not a password. Sign-in = signing a fresh challenge with a key on
 * the operator allowlist (comma-separated env). The session is an HMAC token
 * in an httpOnly cookie; nothing to breach but the operator's own key
 * hygiene. Same wire contract as the org console (PACS-CONSOLE-<ts>) — auth
 * strings are shared constants, not branding.
 *
 * Brand-neutral by construction: every site-specific value — the allowlist
 * env names, the secret's env name, the cookie name, the host's fren-session
 * reader — arrives as config. Nothing in here knows a customer's name.
 */

/** A fren session as the host's session reader reports it — the email seat
 *  only needs who and through which door. */
export interface OperatorFrenSession {
  handle: string;
  space: string;
}

export interface OperatorAuthConfig {
  /** env var holding the comma-separated operator npub allowlist. */
  npubsEnv: string;
  /** env var holding the comma-separated email-seat allowlist. */
  emailsEnv: string;
  /** env var holding the HMAC secret that signs the session tokens. */
  secretEnv: string;
  /** name of the operator session cookie. */
  cookieName: string;
  /** The host's fren-session reader — the email seat rides an ordinary
      email sign-in, so the gate must be able to read those sessions too. */
  frenSessionsFromCookieHeader: (cookieHeader: string | null) => OperatorFrenSession[];
}

export function createOperatorAuth(config: OperatorAuthConfig) {
  const OPERATOR_COOKIE = config.cookieName;
  /* A month, same as the fren session — it's an arcade, not a bank (Pac,
     2026-07-11). The 12h TTL was inherited from the org console port; the
     high-stakes actions (merge authorization, batch commits) are gated by
     per-action signatures now, so the session cookie isn't the security
     layer. */
  const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const CHALLENGE_WINDOW_MS = 5 * 60 * 1000;

  function secret(): string {
    const s = process.env[config.secretEnv]?.trim();
    if (!s) throw new Error(`${config.secretEnv} not configured`);
    return s;
  }

  function hmac(payload: string): string {
    return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  }

  function operatorHexKeys(): string[] {
    return (process.env[config.npubsEnv] ?? "")
      .split(",")
      .map((npub) => {
        try {
          const d = nip19.decode(npub.trim());
          return d.type === "npub" ? (d.data as string) : null;
        } catch {
          return null;
        }
      })
      .filter((k): k is string => !!k);
  }

  /** True when the deployment has at least one valid operator key configured. */
  function operatorsConfigured(): boolean {
    return operatorHexKeys().length > 0;
  }

  /** Is this npub on the operator allowlist? Eligibility only — the gate still
      demands a fresh signature. Lets the menu show the admiral their door even
      before the operator session exists (the lost-admin-item lesson). */
  function isOperatorNpub(npub: string): boolean {
    try {
      const d = nip19.decode(npub);
      return d.type === "npub" && operatorHexKeys().includes(d.data as string);
    } catch {
      return false;
    }
  }

  /** Hex-pubkey flavor of the allowlist check — for verifying per-action
      signatures (merge authorizations, future batch sign-offs). */
  function isOperatorHex(pubkeyHex: string): boolean {
    return operatorHexKeys().includes(pubkeyHex);
  }

  /** Login event contract: kind 22242, content `PACS-CONSOLE-<unix-ms>` fresh
      within 5 minutes, signed by an allowlisted key. */
  function verifyOperatorLogin(event: {
    content?: string;
    pubkey?: string;
    sig?: string;
    kind?: number;
    created_at?: number;
    tags?: unknown;
    id?: string;
  }): { ok: true; pubkey: string } | { ok: false; reason: string } {
    if (!event?.content || !event.pubkey || !event.sig) {
      return { ok: false, reason: "signed challenge required" };
    }
    const m = event.content.match(/^PACS-CONSOLE-(\d+)$/);
    if (!m) return { ok: false, reason: "not a console challenge" };
    if (Math.abs(Date.now() - Number(m[1])) > CHALLENGE_WINDOW_MS) {
      return { ok: false, reason: "challenge expired — sign a fresh one" };
    }
    if (!operatorHexKeys().includes(event.pubkey)) {
      return { ok: false, reason: "that key isn't on this site's operator list" };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!verifyEvent(event as any)) {
      return { ok: false, reason: "signature check failed" };
    }
    return { ok: true, pubkey: event.pubkey };
  }

  function makeOperatorToken(pubkey: string): string {
    const exp = Date.now() + SESSION_TTL_MS;
    return `${pubkey}.${exp}.${hmac(`${pubkey}|${exp}`)}`;
  }

  function verifyOperatorToken(token: string | undefined): string | null {
    if (!token) return null;
    const [pubkey, exp, sig] = token.split(".");
    if (!pubkey || !exp || !sig) return null;
    if (Date.now() > Number(exp)) return null;
    const expected = hmac(`${pubkey}|${exp}`);
    try {
      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    } catch {
      return null;
    }
    return operatorHexKeys().includes(pubkey) ? pubkey : null;
  }

  /** The email seat (the Admiral's ruling for Love, 0018.05.15): an email on
   *  the email-seat allowlist is an operator through her ordinary email
   *  sign-in — the interim door while her key is being worked out. */
  function operatorEmails(): string[] {
    return (process.env[config.emailsEnv] ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }

  /** Pulls the operator identity from a cookie header value, or null —
   *  a keyed operator's pubkey, or an allowlisted email seat's address. */
  function operatorFromCookieHeader(cookieHeader: string | null): string | null {
    const match = (cookieHeader ?? "").match(new RegExp(`${OPERATOR_COOKIE}=([^;]+)`));
    const keyed = verifyOperatorToken(match?.[1]);
    if (keyed) return keyed;
    const active = config.frenSessionsFromCookieHeader(cookieHeader)[0];
    if (active && active.space === "email" && operatorEmails().includes(active.handle.toLowerCase())) {
      return active.handle;
    }
    return null;
  }

  return {
    OPERATOR_COOKIE,
    operatorsConfigured,
    isOperatorNpub,
    isOperatorHex,
    verifyOperatorLogin,
    makeOperatorToken,
    verifyOperatorToken,
    operatorFromCookieHeader,
  };
}

export type OperatorAuth = ReturnType<typeof createOperatorAuth>;
