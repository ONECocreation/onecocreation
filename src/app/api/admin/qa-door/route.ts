import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { getSiteConfig } from "@/lib/site-config";
import { getQaState, prepareQa, publishQa, closeQa } from "@/lib/qa-door";

export const dynamic = "force-dynamic";

/**
 * THE Q&A'S OPERATOR DOOR (TASK-475, block 968,624) — `/api/admin/qa-door`,
 * mirroring `api/admin/stage2/route.ts`'s `gate()` shape exactly (and
 * `api/admin/stage1/route.ts`'s SEC-4 wrap for a failed write). Every
 * response carries `Cache-Control: no-store`.
 *
 * `jitsiDomain` rides the state response via `getSiteConfig().meeting`
 * (read-only into an untouched file) — the SAME field every other
 * stage/door route reads, never a second literal.
 *
 * Unlike Stage 1, publish from closed is NOT refused here — the Q&A door
 * takes Stage 2's own convenience path (`qa-door.ts`'s
 * `allowPublishFromClosed: true`), so `publishQa()` never returns null and
 * this route never answers 409.
 */

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** The client screen is a courtesy; this check is the gate. */
function gate(request: Request): NextResponse | null {
  const operator = operatorFromCookieHeader(request.headers.get("cookie"));
  if (!operator) return jsonNoStore({ ok: false, reason: "operator session required" }, 401);
  return null;
}

async function stateResponse() {
  const state = await getQaState();
  const { jitsiDomain } = (await getSiteConfig()).meeting;
  return jsonNoStore({ ok: true, phase: state.phase, room: state.room, jitsiDomain });
}

export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  return stateResponse();
}

/** body `{ action: "prepare" | "publish" | "close" }` — not a bare
 *  boolean, the three-phase lifecycle needs three verbs. */
export async function PUT(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  let body: { action?: unknown };
  try {
    body = (await request.json()) as { action?: unknown };
  } catch {
    return jsonNoStore({ ok: false, reason: "bad request" }, 400);
  }
  const action = body?.action;
  /* a write that throws past the handler would answer a bare 500 with NO
     Cache-Control — a secret-bearing route never rides an intermediary
     cache, so the failure is CAUGHT and answered no-store (SEC-4, mirrors
     admin/stage1/route.ts and admin/stage2/route.ts's own wraps). */
  try {
    if (action === "prepare") await prepareQa();
    else if (action === "publish") await publishQa();
    else if (action === "close") await closeQa();
    else return jsonNoStore({ ok: false, reason: "action must be prepare, publish, or close" }, 400);
  } catch {
    return jsonNoStore({ ok: false, reason: "the stage store didn't answer — nothing changed" }, 500);
  }
  return stateResponse();
}
