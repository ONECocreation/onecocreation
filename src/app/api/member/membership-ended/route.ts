import { NextResponse } from "next/server";
import { memberFromRequest } from "@/lib/member-auth";
import { endedMembershipForSubject } from "@/lib/member-tier";
import { TIERS, entitlementsConfigured } from "@/lib/entitlement";

export const dynamic = "force-dynamic";

/**
 * T-539: "Your membership ended on <date>" for /me. `ended` is null unless
 * the member holds NOTHING live across their linked doors and a paid term
 * has run out. A refund/revoke is never reported as "ended".
 */
export async function GET(request: Request) {
  const fren = memberFromRequest(request);
  if (!fren) return NextResponse.json({ ok: false }, { status: 401 });
  if (!entitlementsConfigured()) return NextResponse.json({ ok: true, ended: null });
  try {
    const ended = await endedMembershipForSubject(`${fren.handle}@${fren.space}`);
    return NextResponse.json({
      ok: true,
      ended: ended ? { tier: ended.tier, name: TIERS[ended.tier].name, endedAtMs: ended.endedAtMs } : null,
    });
  } catch {
    // a failed lookup says nothing rather than a false "ended"
    return NextResponse.json({ ok: true, ended: null });
  }
}
