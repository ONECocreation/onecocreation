import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { squareAdapter, squareBitcoinEnabled } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * SQUARE RAIL STATUS (Admiral's walk — replaces the dead "soon" chip on
 * /a/money). GET reports whether squareAdapter is configured() and, only
 * when it is, the bitcoin-enablement check against Pac's own Square
 * location (payments.ts's squareBitcoinEnabled() — see that file's header
 * for the honest "unverified field, first confirmed by a real sandbox run"
 * limit). `?refresh=1` bypasses squareBitcoinEnabled()'s brief cache — the
 * desk's "recheck" button. No secrets are ever echoed back — Square's
 * five env vars are deploy-time config (Vercel project settings), never a
 * browser-pasted key like Stripe's drawer.
 */
function gate(request: Request): NextResponse | null {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const configured = squareAdapter.configured();
  const force = new URL(request.url).searchParams.get("refresh") === "1";
  const squareBitcoin = configured ? await squareBitcoinEnabled(force) : null;
  return NextResponse.json({ ok: true, configured, squareBitcoin });
}
