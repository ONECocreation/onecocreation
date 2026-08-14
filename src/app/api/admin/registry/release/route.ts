import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { releaseHandle } from "@/lib/registry";
import { spaceForHost } from "@/lib/identity-config";

export const dynamic = "force-dynamic";

/**
 * Release a QUEUED tag back to the pool — operator-only (test cleanup, a
 * fren's right of exit). Etched names stay permanent; releaseHandle itself
 * refuses those, and this route just carries its honest answer back.
 */
export async function POST(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  }
  let body: { handle?: string; space?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  }
  if (!body.handle) return NextResponse.json({ ok: false, reason: "handle required" }, { status: 400 });
  const space = body.space ?? spaceForHost(request.headers.get("host")).space;
  const result = await releaseHandle(body.handle, space);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
