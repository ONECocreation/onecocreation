import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { reconcileAll } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * T-541a reconcile: re-reads Square for every subscription record (bounded
 * batch of 50) so a dropped webhook heals. Same three keys as /api/mail/tick:
 * Vercel cron's CRON_SECRET bearer, the seat secret header (VPS crontab), or
 * a logged-in operator. Cron line (NOT wired): daily
 *   curl -fsS -H "x-seat-secret: $SEAT_SECRET" https://<site>/api/subscriptions/reconcile
 * from the red-hawk crontab, or a Vercel cron entry for this path.
 */
function authorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  const seat = request.headers.get("x-seat-secret");
  if (process.env.SEAT_SECRET && seat === process.env.SEAT_SECRET) return true;
  return !!operatorFromCookieHeader(request.headers.get("cookie"));
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await reconcileAll()) });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
