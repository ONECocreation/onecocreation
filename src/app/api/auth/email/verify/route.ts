import { NextResponse } from "next/server";
import { verifyCode, emailAuthConfigured } from "@/lib/email-auth";
import { validEmail, addSubscriber } from "@/lib/subscribers";
import { sendLeadMagnetLetter, enqueueDayTwoWelcome } from "@/lib/lead-magnet";
import {
  makeFrenToken,
  sessionsFromRequest,
  joinSessionTokens,
  FREN_COOKIE,
  MAX_SESSIONS,
} from "@/lib/fren-auth";

export const dynamic = "force-dynamic";

/**
 * Step two of the email door: right code → a REAL member session (the fren
 * cookie, space "email"), so every signed-in check on the site just works.
 * The member also lands on the list (doctrine: members are opted in, the
 * off switch lives in their profile).
 */
export async function POST(request: Request) {
  if (!emailAuthConfigured()) {
    return NextResponse.json({ ok: false, reason: "email sign-in isn't wired yet" }, { status: 503 });
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

  try {
    const { added } = await addSubscriber(email, "login");
    // the JOIN door gives the same gift as the newsletter door (Love's walk
    // found the gap, 0018.05.15): a genuinely-new soul gets the meditation
    // letter now and the day-two welcome tomorrow
    if (added) {
      sendLeadMagnetLetter(email).catch((err) => console.error("join lead magnet failed:", err));
      enqueueDayTwoWelcome(email).catch((err) => console.error("join day-two enqueue failed:", err));
    }
  } catch {
    /* the session matters more than the list write */
  }

  const prior = sessionsFromRequest(request)
    .filter((s) => !(s.space === "email" && s.handle === email))
    .map((s) => s.token);
  const tokens = [makeFrenToken(email, "email"), ...prior].slice(0, MAX_SESSIONS);

  return NextResponse.json(
    { ok: true, handle: email, space: "email" },
    {
      headers: {
        "Set-Cookie": `${FREN_COOKIE}=${joinSessionTokens(tokens)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
      },
    },
  );
}
