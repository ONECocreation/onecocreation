import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { getSiteConfig } from "@/lib/site-config";
import { getStage1State, prepareStage1, publishStage1, closeStage1 } from "@/lib/stage1";

export const dynamic = "force-dynamic";

/**
 * Stage 1's OPERATOR door (TASK-438, Build 2) — mirrors
 * `api/admin/stage2/route.ts`'s `gate()` shape exactly. Every response
 * carries `Cache-Control: no-store` (a secret-bearing route must never
 * ride an intermediary cache).
 *
 * The one deliberate difference from Stage 2: Publish from closed —
 * including an expired stored state — is REFUSED with 409. Stage 1's room
 * only ever exists after Prepare (Love standing inside it as host);
 * publishing never mints.
 *
 * `jitsiDomain` rides the state response via `getSiteConfig().meeting`
 * (read-only call into an untouched file) — the SAME field the public
 * route reads for a published state (named once, never a second literal).
 *
 * SEC-4 (K122, block 968,284): a failed write (the vault unreachable) is
 * CAUGHT and answered `500 { ok:false, reason }` no-store — a bare throw
 * past the handler would answer 500 with no Cache-Control at all.
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
  const state = await getStage1State();
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
  /* SEC-4 (K122): a write that throws past the handler would answer a bare
     500 with NO Cache-Control — a secret-bearing route never rides an
     intermediary cache, so the failure is CAUGHT and answered no-store */
  try {
    if (action === "prepare") await prepareStage1();
    else if (action === "publish") {
      const published = await publishStage1();
      if (published === null) {
        return jsonNoStore({ ok: false, reason: "prepare first — Stage 1 never publishes from closed" }, 409);
      }
    } else if (action === "close") await closeStage1();
    else return jsonNoStore({ ok: false, reason: "action must be prepare, publish, or close" }, 400);
  } catch {
    return jsonNoStore({ ok: false, reason: "the stage store didn't answer — nothing changed" }, 500);
  }
  return stateResponse();
}
