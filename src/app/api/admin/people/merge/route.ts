import { NextResponse } from "next/server";
import { linkMembers } from "@/lib/member-links";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

/** The admin's merge: tie two member subjects (email + key doors of one
 *  soul). Never destroys either — widens what each door sees. */
export async function POST(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { a?: string; b?: string } | null;
  if (!body?.a || !body?.b || body.a === body.b) {
    return NextResponse.json({ ok: false, reason: "two different member subjects required" }, { status: 400 });
  }
  try {
    await linkMembers(body.a, body.b);
  } catch {
    /* T-452: the link store couldn't be read — nothing was written */
    return NextResponse.json({ ok: false, reason: "couldn't read the links just now — nothing changed, try again" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
