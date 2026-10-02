import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { strictSameOrigin } from "@/lib/origin-strict";
import { getPlanMap, listSquarePlans, savePlanMap, sanitizePlanMap, subscriptionsEnabled, SubError } from "@/lib/subscriptions";
import { squareEnv, ensureSquareVault } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * T-541a: the subscription plan map, operator only. GET lists the Square
 * account's subscription plans and variations (ids, names, phases, prices)
 * so the Admiral can pick them, with the saved map beside it. POST saves
 * the map (tier -> variant -> plan VARIATION id, plus which promo variants
 * members may pick); every id must be one Square actually lists. The Square
 * token never leaves the server.
 */
function operatorOnly(request: Request): NextResponse | null {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = operatorOnly(request);
  if (denied) return denied;
  await ensureSquareVault();
  const env = squareEnv();
  try {
    return NextResponse.json({
      ok: true,
      environment: env?.environment ?? null,
      enabled: await subscriptionsEnabled(),
      map: await getPlanMap(),
      plans: env ? await listSquarePlans() : [],
    });
  } catch (err) {
    if (err instanceof SubError) return NextResponse.json({ ok: false, reason: err.message }, { status: err.status });
    return NextResponse.json({ ok: false, reason: "could not read the plans" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const denied = operatorOnly(request);
  if (denied) return denied;
  if (!strictSameOrigin(request)) return NextResponse.json({ ok: false, reason: "cross-origin request refused" }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, reason: "bad body" }, { status: 400 }); }
  const map = sanitizePlanMap((body as { map?: unknown })?.map);
  try {
    const known = new Set((await listSquarePlans()).flatMap((p) => p.variations.map((v) => v.id)));
    for (const row of Object.values(map.tiers)) {
      for (const id of Object.values(row ?? {})) {
        if (id && !known.has(id)) return NextResponse.json({ ok: false, reason: `Square lists no plan variation ${id}` }, { status: 400 });
      }
    }
    return NextResponse.json({ ok: true, map: await savePlanMap(map) });
  } catch (err) {
    if (err instanceof SubError) return NextResponse.json({ ok: false, reason: err.message }, { status: err.status });
    return NextResponse.json({ ok: false, reason: "could not save the map" }, { status: 502 });
  }
}
