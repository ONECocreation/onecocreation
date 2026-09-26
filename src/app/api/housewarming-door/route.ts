import { NextResponse } from "next/server";
import { sessionsFromCookieHeader } from "@/lib/member-auth";
import { getSiteConfig } from "@/lib/site-config";
import { getHousewarmingState } from "@/lib/housewarming-door";
import { probeJitsiReachable } from "@/app/api/stage2/route";

export const dynamic = "force-dynamic";

/**
 * THE HOUSEWARMING'S MEMBER DOOR (TASK-481, block 968,624+) —
 * `/api/housewarming-door`, the EXACT wire shape `/api/stage2`'s and
 * `/api/qa-door`'s own GET answer with, field for field
 * (`ReadingStageDoor.tsx`'s poller reads this exact contract):
 *   - signed out: `{ ok:true, open, decision: open ? "signin" : "hidden",
 *     reachable:null }`
 *   - not published: `{ ok:true, open:false, decision:"hidden" }`
 *   - signed in, published: `{ ok:true, open:true, decision:"open",
 *     reachable, room }`
 * No `jitsiDomain` on the wire here (stage2's/the Q&A door's own shape
 * never carries one either) — `Cache-Control: no-store` on every
 * response, the session cookie read FRESH on every call, and the
 * reachability probe reused verbatim from `/api/stage2` (never a second
 * copy).
 *
 * THE ONE REAL DIFFERENCE FROM `/api/stage2`/`/api/qa-door`: the
 * Housewarming is FREE — no tier check, no entitlement, no `"package"`
 * decision. A signed-in caller past a published door goes straight to the
 * reachability probe; `decision: "open"` for any signed-in visitor, no
 * tier at all (the brief's own words).
 */

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const session = sessionsFromCookieHeader(request.headers.get("cookie"))[0] ?? null;
  const state = await getHousewarmingState();
  const published = state.phase === "published";

  /* an anonymous visitor learns only whether the door is open, never a
     room name — reachable stays null, it's never checked */
  if (!session) {
    return jsonNoStore({ ok: true, open: published, decision: published ? "signin" : "hidden", reachable: null });
  }

  /* not published (closed, merely prepared, or expired past Denver
     midnight) — invisible, even signed in; no room, no reachable key */
  if (!published) return jsonNoStore({ ok: true, open: false, decision: "hidden" });

  /* FREE room — no tier/entitlement/package branch, any signed-in caller
     is entitled; straight to the reachability probe. */
  const { jitsiDomain } = (await getSiteConfig()).meeting;
  const reachable = await probeJitsiReachable(jitsiDomain);
  /* unreachable never hands back a room a member can't use */
  return jsonNoStore({ ok: true, open: true, decision: "open", reachable, room: reachable ? state.room : null });
}
