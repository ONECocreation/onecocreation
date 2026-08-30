import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { listPins, getPin, setPin } from "@/lib/room-pins";

export const dynamic = "force-dynamic";

/**
 * The operator's pinned-welcome editor (Love's Desk Day altitude, "the
 * pinned welcome leads" rail) — same gate shape as /api/admin/booking.
 */

function gate(request: Request): NextResponse | null {
  const operator = operatorFromCookieHeader(request.headers.get("cookie"));
  if (!operator) return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  return null;
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const roomSlug = new URL(request.url).searchParams.get("room");
  if (roomSlug) {
    const pin = await getPin(roomSlug);
    return NextResponse.json({ ok: true, pin });
  }
  const pins = await listPins();
  return NextResponse.json({ ok: true, pins });
}

interface Body {
  room?: string;
  text?: string;
}

export async function PUT(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, reason: "bad origin" }, { status: 403 });
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  }
  if (!body.room) return NextResponse.json({ ok: false, reason: "room required" }, { status: 400 });
  const result = await setPin(body.room, body.text ?? "");
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  return NextResponse.json(result);
}
