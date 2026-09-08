import { NextResponse } from "next/server";
import { verifyCode, emailAuthConfigured, claimFirstSignIn } from "@/lib/email-auth";
import { validEmail, addSubscriber } from "@/lib/subscribers";
import { sendLeadMagnetLetter, enqueueWelcomeLetter, enqueueDayTwoWelcome } from "@/lib/lead-magnet";
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
 *
 * TASK-156 (0018.06.17 a₿, Love's meeting: "if they login they get the
 * newsletter, and a welcome, free meditation"): the FIRST sign-in pours the
 * welcome — list source `welcome`, the `welcome` letter queued, and the
 * free meditation ("Unzip Into the New You" — the house's one free item;
 * no store entry is marked free, so the gift rides the lead-magnet letter
 * that already delivers it). `claimFirstSignIn`'s SET NX marker answers
 * once per email, so a repeat sign-in — or a raced double submit — never
 * re-pours. Idempotent by construction.
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
    /* the list write stands on every sign-in (members are opted in); the
       record keeps the FIRST door's source, so a footer join stays "footer"
       and a soul whose first door is sign-in reads "welcome" (TASK-156) */
    await addSubscriber(email, "welcome");
  } catch {
    /* the session matters more than the list write */
  }

  try {
    if (await claimFirstSignIn(email)) {
      // FIRST sign-in only — the welcome, never on repeat (Love's meeting)
      sendLeadMagnetLetter(email).catch((err) => console.error("first-sign-in meditation failed:", err));
      enqueueWelcomeLetter(email).catch((err) => console.error("first-sign-in welcome failed:", err));
      enqueueDayTwoWelcome(email).catch((err) => console.error("first-sign-in day-two failed:", err));
    }
  } catch {
    /* a marker-vault hiccup never costs the session */
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
