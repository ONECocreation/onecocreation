import { NextResponse } from "next/server";
import { COPY_MAX_LENGTH, deleteCopyOverride, getAllCopyOverrides, setCopyOverride } from "@/lib/copy";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

/* Same gate() shape as api/admin/letters/route.ts — every write re-checks
   the cookie server-side regardless of what the client believes (the
   client's useIsOperator() flag only decides whether the pen chrome
   renders; it is never trusted for the write itself). */
function gate(request: Request): NextResponse | null {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return null;
}

/* Defense in depth: contentEditable's innerText extraction on the client
   should already be plain text, but a pasted <script>/styled span could
   still ride along — reject rather than silently strip so a bad paste
   never quietly rewrites Love's words. */
function hasHtml(text: string): boolean {
  return /<[a-z!/][^>]*>/i.test(text);
}

/** GET ?ids=about.h1,about.p1 — batch read for a page's id list. Pages can
 *  also just call getAllCopyOverrides() directly server-side; this exists
 *  for the odd client-side refresh (not the primary path). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const overrides = await getAllCopyOverrides(ids);
  return NextResponse.json({ ok: true, overrides });
}

export async function POST(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { id?: string; text?: string } | null;
  if (!body?.id?.trim()) {
    return NextResponse.json({ ok: false, reason: "id required" }, { status: 400 });
  }
  const text = body.text ?? "";
  if (text.length > COPY_MAX_LENGTH) {
    return NextResponse.json({ ok: false, reason: `text over ${COPY_MAX_LENGTH} chars` }, { status: 400 });
  }
  if (hasHtml(text)) {
    return NextResponse.json({ ok: false, reason: "plain text only — no markup" }, { status: 400 });
  }
  await setCopyOverride(body.id.trim(), text);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id?.trim()) {
    return NextResponse.json({ ok: false, reason: "id required" }, { status: 400 });
  }
  await deleteCopyOverride(body.id.trim());
  return NextResponse.json({ ok: true });
}
