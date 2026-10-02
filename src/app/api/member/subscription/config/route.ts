import { NextResponse } from "next/server";
import { ensureSquareVault, squareEnv } from "@/lib/payments";
import { getPlanMap, hasSubscriptionHistory } from "@/lib/subscriptions";
import { memberGate } from "@/lib/subscription-route";
import { openOffers } from "@/lib/subscription-offers";

export const dynamic = "force-dynamic";

/**
 * T-541b: what the join box needs to start Square's card box: the PUBLIC
 * application id and location id (both are meant to sit in a browser page),
 * the environment (which of Square's two script hosts to load), and which
 * promo offers are open with their words. NEVER the access token. Same door
 * as every member subscription route: switch OFF = 404, member session
 * required, rate limited.
 */
export async function GET(request: Request) {
  const gate = await memberGate(request, { write: false, bucket: "config", max: 60, windowSec: 600 });
  if (gate instanceof NextResponse) return gate;
  await ensureSquareVault();
  const env = squareEnv();
  const applicationId = process.env.SQUARE_APPLICATION_ID ?? "";
  if (!env || !applicationId) {
    return NextResponse.json({ ok: false, reason: "memberships are not available right now", code: "store_unavailable" }, { status: 503 });
  }
  const [map, offers, usedBefore] = await Promise.all([getPlanMap(), openOffers(), hasSubscriptionHistory(gate.subject)]);
  return NextResponse.json({
    ok: true,
    environment: env.environment,
    applicationId,
    locationId: env.locationId,
    open: map.open,
    offers,
    usedBefore,
  });
}
