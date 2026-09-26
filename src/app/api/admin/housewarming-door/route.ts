import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { getSiteConfig } from "@/lib/site-config";
import {
  getHousewarmingState,
  prepareHousewarming,
  publishHousewarming,
  closeHousewarming,
  showHousewarmingCamera,
  hideHousewarmingCamera,
} from "@/lib/housewarming-door";

export const dynamic = "force-dynamic";

/**
 * THE HOUSEWARMING'S OPERATOR DOOR (TASK-481, block 968,624+) —
 * `/api/admin/housewarming-door`, mirroring `api/admin/qa-door/route.ts`'s
 * `gate()` shape exactly (and `api/admin/stage1/route.ts`'s SEC-4 wrap for
 * a failed write). Every response carries `Cache-Control: no-store`.
 *
 * `jitsiDomain` rides the state response via `getSiteConfig().meeting`
 * (read-only into an untouched file) — the SAME field every other
 * stage/door route reads, never a second literal.
 *
 * Publish from closed is NOT refused — the Housewarming takes the
 * convenience path (`housewarming-door.ts`'s `allowPublishFromClosed:
 * true`), so `publishHousewarming()` never returns null and this route
 * never answers 409 — the one-click Open path `RoomsCard.tsx` relies on.
 *
 * TASK-487 (block 968,624+) — `camera: "shown" | "hidden"` rides every
 * state response now (the operator card's own three-state button needs
 * it, closed included — always hidden then). Two new PUT actions,
 * `show-camera`/`hide-camera`, valid ONLY while published; otherwise 409
 * with a plain reason, same shape as Stage 1's own publish-from-closed
 * refusal.
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
  const state = await getHousewarmingState();
  const { jitsiDomain } = (await getSiteConfig()).meeting;
  const camera = state.cameraShownAtMs !== null ? "shown" : "hidden";
  return jsonNoStore({ ok: true, phase: state.phase, room: state.room, jitsiDomain, camera });
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
     admin/stage1/route.ts and admin/qa-door/route.ts's own wraps). */
  try {
    if (action === "prepare") await prepareHousewarming();
    else if (action === "publish") await publishHousewarming();
    else if (action === "close") await closeHousewarming();
    else if (action === "show-camera") {
      const result = await showHousewarmingCamera();
      if (result === null) return jsonNoStore({ ok: false, reason: "open the room first — the camera needs a published room" }, 409);
    } else if (action === "hide-camera") {
      const result = await hideHousewarmingCamera();
      if (result === null) return jsonNoStore({ ok: false, reason: "open the room first — the camera needs a published room" }, 409);
    } else return jsonNoStore({ ok: false, reason: "action must be prepare, publish, close, show-camera, or hide-camera" }, 400);
  } catch {
    return jsonNoStore({ ok: false, reason: "the stage store didn't answer — nothing changed" }, 500);
  }
  return stateResponse();
}
