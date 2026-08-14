import { NextResponse } from "next/server";
import { tick } from "@/lib/mail-queue";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The sender tick — cron pulls this and the queue drains politely under the
 * hourly cap. Three keys open it: Vercel cron's CRON_SECRET bearer, the seat
 * secret (the house's own automation, e.g. the VPS crontab), or a logged-in
 * operator poking the console's "send now" button.
 */
function authorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  const seat = request.headers.get("x-seat-secret");
  if (process.env.SEAT_SECRET && seat === process.env.SEAT_SECRET) return true;
  if (operatorFromCookieHeader(request.headers.get("cookie"))) return true;
  return false;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const result = await tick();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  return GET(request);
}
