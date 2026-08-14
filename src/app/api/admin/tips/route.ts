import { NextResponse } from "next/server";
import { listTips, tipsConfigured } from "@/lib/tips";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

/** The jar readout — operator (or house automation) only. */
function authorized(request: Request): boolean {
  const seat = request.headers.get("x-seat-secret");
  if (process.env.SEAT_SECRET && seat === process.env.SEAT_SECRET) return true;
  if (operatorFromCookieHeader(request.headers.get("cookie"))) return true;
  return false;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  if (!tipsConfigured()) {
    return NextResponse.json({ ok: false, reason: "payment rail not configured" }, { status: 503 });
  }
  const ledger = await listTips();
  return NextResponse.json({ ok: true, ...ledger });
}
