/**
 * THE OVERLAY TOKEN (TASK-191, 0018.06.18 a₿ · block 966119) — the
 * /studio/overlay URL is pasted into OBS as a browser source, where no
 * cookie ever rides, so the gate is a SIGNED TOKEN IN THE QUERY instead:
 * one HMAC per scene over the house's own SEAT_SECRET (the operator
 * seat's secret — the overlay is the operator's broadcast surface, so it
 * shares the seat's trust root rather than growing a second one).
 *
 * The token never expires on purpose: an OBS browser source is configured
 * once and must survive restarts. Rotating SEAT_SECRET invalidates every
 * pasted overlay URL — the operator re-copies from /a/studio, which always
 * shows the current URLs. No secret configured → the overlay is honestly
 * CLOSED (it renders its closed card, never an unsigned stage).
 */

import { createHmac, timingSafeEqual } from "crypto";
import { isStudioScene, type StudioSceneId } from "./scenes";

function secret(): string | null {
  const s = process.env.SEAT_SECRET;
  return s && s.trim() ? s : null;
}

export function overlayConfigured(): boolean {
  return secret() !== null;
}

/** The per-scene token — deterministic, so the room's copy-able URLs are
 *  stable across renders and restarts (until the secret rotates). */
export function overlayToken(scene: StudioSceneId): string | null {
  const s = secret();
  if (!s) return null;
  return createHmac("sha256", s).update(`studio-overlay:${scene}`).digest("hex").slice(0, 40);
}

/** The full query pair for one scene's overlay URL, or null when the
 *  secret isn't configured (the room shows its honest closed note). */
export function overlayQuery(scene: StudioSceneId): string | null {
  const token = overlayToken(scene);
  return token ? `scene=${scene}&token=${token}` : null;
}

/** The gate: scene must be one of the three and the token must match its
 *  own scene's signature — a token minted for "solo" never opens "duo".
 *  Constant-time on equal-length candidates; a length mismatch is just
 *  false (the length is not the secret). */
export function verifyOverlayToken(scene: unknown, token: unknown): boolean {
  const s = secret();
  if (!s || !isStudioScene(scene) || typeof token !== "string") return false;
  const expected = overlayToken(scene);
  if (!expected || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
