import { NextResponse } from "next/server";
import { sessionsFromCookieHeader } from "@/lib/member-auth";
import { getSiteConfig } from "@/lib/site-config";
import { getStage2State } from "@/lib/stage2";
import { tierForSubject } from "@/lib/member-tier";
import { decideStage2, stage2PackageDoor } from "@/lib/stage2-access";

export const dynamic = "force-dynamic";

/**
 * Stage 2's MEMBER door (TASK-392, Build 4; TASK-439, block 968,218) —
 * never operator-gated. Carries `Cache-Control: no-store` on every
 * response (Astra's review, finding 3 — this is the route BOTH
 * `Stage2Door`'s background poll and its click-time re-check hit; a
 * cached 304/stale body would silently re-serve a stale authorization).
 * The session cookie is read FRESH on every call, the exact
 * `rooms/[slug]/page.tsx:82` idiom — this route is never memoized, which
 * is what makes "re-fetch at click time" actually re-authorize rather
 * than replay a cached answer.
 *
 * `open` means `phase === "published"` (and not expired — getStage2State
 * fails closed to IDLE past Denver midnight, ruling 4) ONLY — a
 * `prepared` room (Love has minted it but hasn't started the conference
 * yet) is invisible to every member, signed in or not (Astra's review,
 * finding 5: publishing, not preparing, is what makes the door exist).
 *
 * TASK-439 — THE PAID DOOR (ruling 1): every body carries `decision`,
 * and the tier check (`tierForSubject`, the exact subject spelling of
 * `rooms/[slug]/page.tsx:91`) runs BEFORE the Jitsi reachability probe
 * and any room disclosure. A free member's answer is `decision:
 * "package"` with NO `room` key, NO `reachable` key, and the probe never
 * fires. A thrown membership check answers 503 fail-closed (security
 * critic finding 7). Status 200 for every decision: this route is a
 * status read the door polls, and it issues a room only on `"open"` —
 * the house's own precedent reserves 401 for the operator console, and
 * this is not an entry attempt to refuse with 403 (finding 9, recorded
 * in REGISTER).
 *
 * TASK-487 (block 968,624+, the Admiral's ruling, option C) — the SITE
 * SWITCH is the authority for the /reading waiting picture now, never a
 * Jitsi-event guess. `camera: "shown" | "hidden"` rides this envelope
 * ONLY alongside a genuine room string (reachable, `decision: "open"`) —
 * never with a null room.
 */

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** The reachability probe (Astra's review, finding 6): a 2xx/3xx HEAD
 *  answer only, never `res.ok` alone (false for a 3xx redirect). Reads
 *  the SAME `getSiteConfig().meeting.jitsiDomain` the operator route's
 *  GET carries — one source, never a second hardcoded literal.
 *  `timeoutMs` defaults to the production value; a caller (tests) may
 *  pass a short one so a hung fetch costs milliseconds, not three real
 *  seconds — the abort mechanism itself is exercised either way. */
export async function probeJitsiReachable(jitsiDomain: string, timeoutMs = 3000): Promise<boolean> {
  try {
    const res = await fetch(`https://${jitsiDomain}/`, { method: "HEAD", signal: AbortSignal.timeout(timeoutMs) });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const session = sessionsFromCookieHeader(request.headers.get("cookie"))[0] ?? null;
  const state = await getStage2State();
  const published = state.phase === "published";

  /* an anonymous visitor learns only whether the door is open, never a
     room name — reachable stays null, it's never checked for them */
  if (!session) {
    return jsonNoStore({ ok: true, open: published, decision: published ? "signin" : "hidden", reachable: null });
  }

  /* not published (closed, merely prepared, or expired past Denver
     midnight) — invisible, even signed in; no room, no reachable key */
  if (!published) return jsonNoStore({ ok: true, open: false, decision: "hidden" });

  /* the tier check rides BEFORE the probe and any room disclosure
     (ruling 1); a registry/KV blip fails CLOSED — 503, no room, no probe */
  let tier: Awaited<ReturnType<typeof tierForSubject>>;
  try {
    tier = await tierForSubject(`${session.handle}@${session.space}`);
  } catch {
    return jsonNoStore({ ok: false, reason: "membership check failed" }, 503);
  }

  const decision = decideStage2(true, { signedIn: true, tier });

  /* the free member's door: the package's own words, NEVER a room, and
     the probe never fires for them */
  if (decision === "package") {
    return jsonNoStore({ ok: true, open: true, decision: "package", package: await stage2PackageDoor() });
  }

  const { jitsiDomain } = (await getSiteConfig()).meeting;
  const reachable = await probeJitsiReachable(jitsiDomain);
  /* unreachable never hands back a room a member can't use — and with no
     room to show, camera never rides the envelope either (TASK-487) */
  if (!reachable) return jsonNoStore({ ok: true, open: true, decision: "open", reachable, room: null });
  const camera = state.cameraShownAtMs !== null ? "shown" : "hidden";
  return jsonNoStore({ ok: true, open: true, decision: "open", reachable, room: state.room, camera });
}
