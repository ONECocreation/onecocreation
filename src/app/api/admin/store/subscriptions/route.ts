import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { listRecords, subscriptionsEnabled } from "@/lib/subscriptions";
import { TIERS } from "@/lib/entitlement";
import { abbreviateSubject, deskStatus } from "@/lib/subscription-ui";

export const dynamic = "force-dynamic";

/**
 * T-541b: the Money desk's Subscriptions card, operator only and read only.
 * One row per member: an ABBREVIATED subject (never a card, customer or
 * subscription id, never an email), the tier, the status and the date.
 */
export async function GET(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  }
  try {
    const recs = await listRecords();
    const rows = recs.map((r) => ({
      subject: abbreviateSubject(r.subject),
      tier: r.tier,
      tierName: TIERS[r.tier].name,
      variant: r.variant,
      status: r.status,
      chargedThroughMs: r.chargedThroughMs ?? null,
      expiresAtMs: r.expiresAtMs ?? null,
      canceledAtMs: r.canceledAtMs ?? null,
    }));
    const counts: Record<string, number> = {};
    for (const r of rows) {
      const k = deskStatus(r.status as never);
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return NextResponse.json({ ok: true, enabled: await subscriptionsEnabled(), rows, counts });
  } catch {
    return NextResponse.json({ ok: false, reason: "could not read the memberships" }, { status: 502 });
  }
}
