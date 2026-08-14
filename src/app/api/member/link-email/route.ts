import { NextResponse } from "next/server";
import { frenFromRequest } from "@/lib/fren-auth";
import { verifyCode, emailAuthConfigured } from "@/lib/email-auth";
import { validEmail, addSubscriber } from "@/lib/subscribers";
import { linkMembers } from "@/lib/member-links";

export const dynamic = "force-dynamic";

/**
 * The welcome path's email step: a KEY member proves an inbox (same OTP as
 * the email door) and it links to their soul — letters and receipts find
 * them, the session stays the key's. Same code machine, no session switch.
 */
export async function POST(request: Request) {
  const fren = frenFromRequest(request);
  if (!fren) return NextResponse.json({ ok: false, reason: "sign in first" }, { status: 401 });
  if (!emailAuthConfigured()) {
    return NextResponse.json({ ok: false, reason: "email isn't wired yet" }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { email?: string; code?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const code = (body.code ?? "").trim();
  if (!validEmail(email) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, reason: "bad email or code" }, { status: 400 });
  }
  if (!(await verifyCode(email, code))) {
    return NextResponse.json({ ok: false, reason: "that code didn't match — try again" }, { status: 401 });
  }
  await linkMembers(`${fren.handle}@${fren.space}`, `${email}@email`);
  try {
    await addSubscriber(email, "welcome-link");
  } catch {
    /* the link matters more than the list write */
  }
  return NextResponse.json({ ok: true, linked: `${email}@email` });
}
