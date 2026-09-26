import { NextResponse } from "next/server";
import { sessionsFromCookieHeader } from "@/lib/member-auth";
import { getSiteConfig } from "@/lib/site-config";
import { getQaState } from "@/lib/qa-door";
import { tierForSubject } from "@/lib/member-tier";
import { qaEntitled } from "@/lib/qa-entitlement";
import { qaDoor as qaOfferDoor } from "@/lib/reading-day-doors";
import { probeJitsiReachable } from "@/app/api/stage2/route";

export const dynamic = "force-dynamic";

/**
 * THE Q&A'S MEMBER DOOR (TASK-475, block 968,624) — `/api/qa-door`, the
 * EXACT wire shape `/api/stage2`'s own GET answers with, field for field
 * (T-473's `ReadingStageDoor.tsx` polls this route expecting that exact
 * contract):
 *   - signed out: `{ ok:true, open, decision: open ? "signin" : "hidden",
 *     reachable:null }`
 *   - not published: `{ ok:true, open:false, decision:"hidden" }`
 *   - membership read throws: `503 { ok:false, ... }`
 *   - signed in, not entitled: `{ ok:true, open:true, decision:"package",
 *     package:{...} }`
 *   - entitled: `{ ok:true, open:true, decision:"open", reachable, room }`
 * No `jitsiDomain` on the wire here (stage2's own shape never carries
 * one either) — `Cache-Control: no-store` on every response, the session
 * cookie read FRESH on every call, and the tier/entitlement check rides
 * BEFORE any room disclosure or the reachability probe (reused verbatim
 * from `/api/stage2` — `probeJitsiReachable`, never a second copy).
 *
 * The ONE real difference from `/api/stage2`: entitlement here isn't a
 * bare tier check — `qaEntitled` sits at the exact step stage2's own
 * `decideStage2` occupies (tier C short-circuits before any order read,
 * so the common case never touches the ledger), and it also admits a
 * `settled`/`fulfilled` order for the Q&A pass (`QA_ITEM_ID`) — never a
 * `refunded` or `disputed` one, `entitlement-fulfil.ts`'s own line —
 * because that pass carries no `entitlementTier`/`entitlementDays` of its
 * own (the brief's show stopper). A not-entitled caller's
 * `decision: "package"` carries the SAME buy-the-pass-or-Evening-Star
 * offer `ReadingDayBody.tsx` already shows (`reading-day-doors.ts`'s
 * `qaDoor()`), reused rather than reinvented. The order read itself only
 * ever runs AFTER the not-published early return above — a closed Q&A
 * costs zero KV/order reads.
 */

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const session = sessionsFromCookieHeader(request.headers.get("cookie"))[0] ?? null;
  const state = await getQaState();
  const published = state.phase === "published";

  /* an anonymous visitor learns only whether the door is open, never a
     room name — reachable stays null, it's never checked */
  if (!session) {
    return jsonNoStore({ ok: true, open: published, decision: published ? "signin" : "hidden", reachable: null });
  }

  /* not published (closed, merely prepared, or expired past Denver
     midnight) — invisible, even signed in; no room, no reachable key */
  if (!published) return jsonNoStore({ ok: true, open: false, decision: "hidden" });

  const subject = `${session.handle}@${session.space}`;

  /* the tier check rides BEFORE entitlement/the probe/any room
     disclosure; a registry/KV blip fails CLOSED — 503, no room, no probe */
  let tier: Awaited<ReturnType<typeof tierForSubject>>;
  try {
    tier = await tierForSubject(subject);
  } catch {
    return jsonNoStore({ ok: false, reason: "membership check failed" }, 503);
  }

  /* qaEntitled itself fails closed to `false` on any throw (its own
     doc), so this never actually rejects — the try/catch is
     belt-and-braces against a future regression, the same defensive
     shape stage1's route keeps around a call built never to throw. This
     is the exact step stage2's own decideStage2 occupies. */
  let entitled: boolean;
  try {
    entitled = await qaEntitled(subject, tier);
  } catch {
    return jsonNoStore({ ok: false, reason: "membership check failed" }, 503);
  }

  /* the not-entitled visitor's door: the pass/Evening Star offer, NEVER a
     room, and the probe never fires for them */
  if (!entitled) {
    return jsonNoStore({ ok: true, open: true, decision: "package", package: await qaOfferDoor() });
  }

  const { jitsiDomain } = (await getSiteConfig()).meeting;
  const reachable = await probeJitsiReachable(jitsiDomain);
  /* unreachable never hands back a room a member can't use */
  return jsonNoStore({ ok: true, open: true, decision: "open", reachable, room: reachable ? state.room : null });
}
