import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { getSiteConfig } from "@/lib/site-config";
import { getStage2State, prepareStage2, publishStage2, closeStage2 } from "@/lib/stage2";

export const dynamic = "force-dynamic";

/**
 * Stage 2's OPERATOR door (TASK-392, Build 3) — mirrors
 * `api/admin/site/route.ts`'s `gate()` shape exactly. Every response
 * carries `Cache-Control: no-store` (Astra's review, finding 3 — a
 * secret-bearing route must never ride an intermediary cache).
 *
 * `jitsiDomain` rides the GET response via `getSiteConfig().meeting`
 * (read-only call into an untouched file) — the SAME field the member
 * route's reachability probe reads (Astra's review, finding 6: named
 * once, never a second literal).
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
  const state = await getStage2State();
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
  /* TASK-460 (block 968,543): a write that throws past the handler would
     answer a bare 500 with NO Cache-Control — a secret-bearing route never
     rides an intermediary cache, so the failure is CAUGHT and answered
     no-store, exactly like admin/stage1/route.ts's own SEC-4 block. */
  try {
    if (action === "prepare") await prepareStage2();
    else if (action === "publish") await publishStage2();
    else if (action === "close") await closeStage2();
    else return jsonNoStore({ ok: false, reason: "action must be prepare, publish, or close" }, 400);
  } catch {
    return jsonNoStore({ ok: false, reason: "the stage store didn't answer — nothing changed" }, 500);
  }
  return stateResponse();
}
