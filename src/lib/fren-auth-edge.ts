/**
 * TASK-259 (0018.06.24 a₿) — the fren session, verified the ONLY way the
 * Edge runtime can: Web Crypto, zero node:crypto, zero filesystem.
 *
 * `src/middleware.ts` runs in Next's Edge runtime. The scout's plan (the
 * brief) was to add this beside `sessionsFromCookieHeader` in
 * `src/lib/fren-auth.ts`, additive — but `fren-auth.ts` carries a
 * top-of-file `import { findHandleByNpub } from "./registry"`, and
 * `registry.ts` uses node's `fs`/`path`/`process.cwd()` (a real vault
 * file, not a KV). Turbopack's Edge-runtime check walks the WHOLE module
 * graph reachable from an edge entry point — even a dynamic `import()`
 * inside a function body still got flagged (`next build` proved it: "A
 * Node.js API is used (process.cwd at registry.ts:107) which is not
 * supported in the Edge Runtime", import trace `middleware.ts → fren-
 * auth.ts → registry.ts"). Importing ANYTHING from fren-auth.ts into the
 * middleware — Web-Crypto-only functions included — drags registry.ts
 * along and fails the build. This file has NO import from fren-auth.ts,
 * NO import from registry.ts, NO node:crypto: middleware.ts is the only
 * caller. tests/fren-auth-edge.test.ts pins that its constants and its
 * verify decision agree with fren-auth.ts's own node path, token for
 * token, so the two can never quietly drift apart.
 */

/** Mirrors fren-auth.ts's `FREN_COOKIE` — cannot import it (see the file
 *  docblock); pinned equal by tests/fren-auth-edge.test.ts. */
export const FREN_COOKIE = "pa-fren";
/** Mirrors fren-auth.ts's private `TOKEN_JOIN` — same reason. */
const TOKEN_JOIN = "~";

function secret(): string {
  const s = process.env.SEAT_SECRET?.trim();
  if (!s) throw new Error("SEAT_SECRET not configured");
  return s;
}

async function hmacKey(): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function hmac(payload: string): Promise<string> {
  const key = await hmacKey();
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** A fixed-length hex compare, walked in full regardless of where the
 *  digests first differ — the portable shape of `crypto.timingSafeEqual`
 *  (a node:crypto-only API the Edge runtime doesn't carry). */
function hexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** One token, verified the Web-Crypto way — fren-auth.ts's private
 *  `parseToken`, same shape: split from the END (a handle may itself carry
 *  dots — every email member's handle is `name@host`), same expiry check,
 *  async because `subtle.sign` is a promise. */
export async function verifySessionTokenEdge(raw: string): Promise<{ handle: string; space: string } | null> {
  const parts = raw.split(".");
  if (parts.length < 4) return null;
  const sig = parts.pop()!;
  const exp = parts.pop()!;
  const space = parts.pop()!;
  const handle = parts.join(".");
  if (!handle || !space || !exp || !sig) return null;
  if (Date.now() > Number(exp)) return null;
  const expected = await hmac(`${handle}|${space}|${exp}`);
  if (!hexEqual(expected, sig)) return null;
  return { handle, space };
}

/** Whether the raw cookie header carries ANY valid session — the Edge twin
 *  of `sessionsFromCookieHeader`, scoped to what the rooms door needs (a
 *  yes/no, not the parsed sessions). TASK-259: the middleware used to ask
 *  only whether the cookie was PRESENT; a stale/tampered/foreign-secret
 *  cookie sailed through and the room page's own gate rendered an in-page
 *  "please sign in" card — from the soul's chair, "Continue took me
 *  nowhere". Now the cookie has to prove itself before the door opens. */
export async function hasValidSessionEdge(cookieHeader: string | null): Promise<boolean> {
  const cookie = cookieHeader ?? "";
  const match = cookie.match(new RegExp(`${FREN_COOKIE}=([^;]+)`));
  if (!match) return false;
  /* Number One follow-through (T-259 gate): fail CLOSED. A missing
     SEAT_SECRET on the edge must read as "no session" (the soul meets the
     sign-in door), never a 500 on every room route. */
  try {
    for (const raw of match[1].split(TOKEN_JOIN)) {
      if (await verifySessionTokenEdge(raw)) return true;
    }
  } catch {
    return false;
  }
  return false;
}
