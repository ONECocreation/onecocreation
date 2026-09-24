import crypto from "node:crypto";

/**
 * THE STUDIO INVITE TOKEN (TASK-440, block 968,222) — the ONE signed door
 * into a standing studio room. The Admiral: "the security leak is big.
 * and needs to be fixed." A signed-out `/meet/studio/<prefix>_studio
 * ?join=1` used to mint Love's own keyed room for anyone on the internet;
 * now a standing room opens for an operator or a VERIFIED invite only
 * (room-access.ts's `studioEntryAllowed` — the one admission decision).
 *
 * The shape is the house's expiring-HMAC idiom, copied — never
 * reinvented — from `order-receipt.ts`'s order key (`<exp>.<hmac>`,
 * `:67-71,84-93`) and `pwyc-letters.ts`'s offer token (`:29,42-45`):
 *
 *  · TOKEN: `<exp>.<hex sig>` with `exp` INSIDE the MAC payload
 *    `studio-invite|<room>|<exp>` — the label is domain-separated from
 *    `studio-room-key:` (live.ts), `studio-overlay:` (overlay-token.ts)
 *    and `offer|` (pwyc-letters.ts), and the room binding means a token
 *    minted for one room verifies for no other;
 *  · TTL: seven days (`pwyc-letters.ts`'s offer-letter precedent — the
 *    Admiral's default: "invites last seven days");
 *  · SECRET: the trimmed `SEAT_SECRET`, same as every member session —
 *    NO NEW ENV. Missing or whitespace-only secret FAILS CLOSED: mint
 *    returns null, verify returns false;
 *  · VERIFY reads the SERVER clock (`Date.now()`) only — never a value
 *    from the request, and it takes no clock argument (pinned in
 *    tests/studio-key-leak.test.ts) — then compares in constant time
 *    inside a `try`, exactly `order-receipt.ts`'s posture.
 *
 * The token is NOT the room key and never contains it: it rides the SITE
 * door (`/meet/studio/<room>?invite=<token>`), and the page's own server
 * mints the key into the iframe src at request time only after this
 * token verifies (T-292 §4's posture, unchanged). `withStudioInvite`
 * signs a site door; a failed mint returns NULL — never a usable
 * unsigned standing-room door.
 *
 * Server-only: reads `process.env`, imports `node:crypto`.
 */

/** Seven days, then Love sends a fresh one (the offer-letter precedent). */
export const STUDIO_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** The mint's time quantum: invites minted inside the same hour are the
 *  SAME token — `order-receipt.ts`'s deterministic-window precedent ("the
 *  return URL at checkout and the receipt letter at settle carry the SAME
 *  key"). Two honest consequences: the desk's copyable door is stable
 *  across reloads instead of churning per render, and the invite letter's
 *  double-send guard (`mail-studio-invite.ts`, keyed on the join URL)
 *  actually holds. Effective TTL shortens by up to one quantum — the
 *  honest direction (shorter, never longer). */
export const STUDIO_INVITE_MINT_QUANTUM_MS = 60 * 60 * 1000;

function secret(): string | null {
  return process.env.SEAT_SECRET?.trim() || null;
}

function hmac(payload: string): string {
  return crypto.createHmac("sha256", secret()!).update(payload).digest("hex");
}

/** Mint the invite for ONE room — `<exp>.<hex sig>`, exp inside the MAC.
 *  Null when the house secret is dark (the door fails closed, never
 *  lies). `nowMs` rides the mint only — verify takes no clock. */
/** T-455 (SECURITY): the MAC label. A member session signs
 *  `<handle>|<space>|<exp>` with the same house secret, and the old label
 *  `studio-invite|<room>|<exp>` was exactly that shape — a tag named
 *  "studio-invite" had the site sign a valid invite into any room. A member
 *  handle can never contain ":" (the registry's handle rule), so this label
 *  can never be a member payload. Invites minted before T-455 stop opening;
 *  Love sends fresh ones (they last seven days anyway). */
const INVITE_LABEL = "studio-invite:v2";

export function mintStudioInvite(room: string, nowMs = Date.now()): string | null {
  if (!secret()) return null;
  const exp = nowMs + STUDIO_INVITE_TTL_MS;
  return `${exp}.${hmac(`${INVITE_LABEL}|${room}|${exp}`)}`;
}

/** Verify a presented invite against THIS room: shape, expiry from the
 *  server clock only, then the constant-time compare. Any deviation —
 *  malformed, expired, wrong room, tampered — reads as false. */
export function verifyStudioInvite(room: string, token: string | null | undefined): boolean {
  if (!token || !secret()) return false;
  const m = token.match(/^(\d{1,16})\.([a-f0-9]{64})$/);
  if (!m) return false;
  const exp = Number(m[1]);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = hmac(`${INVITE_LABEL}|${room}|${exp}`);
  try {
    return crypto.timingSafeEqual(Buffer.from(m[2]), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Sign a site door (`/meet/studio/<room>` absolute URL) with a fresh
 *  invite — minted on the HOUR QUANTUM (see STUDIO_INVITE_MINT_QUANTUM_MS),
 *  so the same door signs to the same token within the hour. Null when
 *  the mint fails — a failed mint must NOT produce a usable unsigned
 *  standing-room door, so the caller degrades honestly instead of
 *  handing out the bare URL. */
export function withStudioInvite(url: string, room: string): string | null {
  const now = Math.floor(Date.now() / STUDIO_INVITE_MINT_QUANTUM_MS) * STUDIO_INVITE_MINT_QUANTUM_MS;
  const token = mintStudioInvite(room, now);
  if (!token) return null;
  return `${url}?invite=${encodeURIComponent(token)}`;
}
