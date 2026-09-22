import { NextResponse } from "next/server";
import { sessionsFromCookieHeader } from "@/lib/member-auth";
import { getSiteConfig } from "@/lib/site-config";
import { getStage2State } from "@/lib/stage2";

export const dynamic = "force-dynamic";

/**
 * Stage 2's MEMBER door (TASK-392, Build 4) — never operator-gated.
 * Carries `Cache-Control: no-store` on every response (Astra's review,
 * finding 3 — this is the route BOTH `Stage2Door`'s background poll and
 * its click-time re-check hit; a cached 304/stale body would silently
 * re-serve a stale authorization). The session cookie is read FRESH on
 * every call, the exact `rooms/[slug]/page.tsx:82` idiom — this route is
 * never memoized, which is what makes "re-fetch at click time" actually
 * re-authorize rather than replay a cached answer.
 *
 * `open` means `phase === "published"` ONLY — a `prepared` room (Love has
 * minted it but hasn't started the conference yet) is invisible to every
 * member, signed in or not (Astra's review, finding 5: publishing, not
 * preparing, is what makes the door exist).
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
  if (!session) return jsonNoStore({ ok: true, open: published, reachable: null });

  /* not published (closed or merely prepared) — invisible, even signed
     in; no room, no reachable key at all */
  if (!published) return jsonNoStore({ ok: true, open: false });

  const { jitsiDomain } = (await getSiteConfig()).meeting;
  const reachable = await probeJitsiReachable(jitsiDomain);
  /* unreachable never hands back a room a member can't use */
  return jsonNoStore({ ok: true, open: true, reachable, room: reachable ? state.room : null });
}
