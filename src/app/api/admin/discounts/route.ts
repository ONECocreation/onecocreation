import { NextResponse } from "next/server";
import { listDiscounts, saveDiscounts, type DiscountCode } from "@/lib/discounts";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

/** The codes table — operator only. PUT replaces the whole list (it's
 *  small and the shelf editor works on the full set). */
function gate(request: Request): NextResponse | null {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  return NextResponse.json({ ok: true, codes: await listDiscounts() });
}

export async function PUT(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { codes?: DiscountCode[] } | null;
  if (!body || !Array.isArray(body.codes)) {
    return NextResponse.json({ ok: false, reason: "codes array required" }, { status: 400 });
  }
  await saveDiscounts(body.codes);
  return NextResponse.json({ ok: true, codes: await listDiscounts() });
}
