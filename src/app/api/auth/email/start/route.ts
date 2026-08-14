import { NextResponse } from "next/server";
import { mintCode, emailAuthConfigured } from "@/lib/email-auth";
import { validEmail } from "@/lib/subscribers";
import { sendMail, mailConfigured, brandShell } from "@/lib/mail";

export const dynamic = "force-dynamic";

/** Step one of the email door: mint a six-digit code, send it warmly. */
export async function POST(request: Request) {
  if (!emailAuthConfigured() || !mailConfigured("bookings")) {
    return NextResponse.json(
      { ok: false, reason: "email sign-in isn't wired yet — please use your key, or try again soon" },
      { status: 503 },
    );
  }
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = (body.email ?? "").trim();
  if (!validEmail(email)) {
    return NextResponse.json({ ok: false, reason: "that email doesn't look right" }, { status: 400 });
  }

  const code = await mintCode(email);
  try {
    await sendMail("bookings", {
      to: email,
      subject: `${code} is your One Cocreation sign-in code`,
      html: brandShell(
        `<p>Welcome back.</p>
         <p style="font-size:28px;letter-spacing:.35em;text-align:center;margin:26px 0;"><b>${code}</b></p>
         <p>Enter this code on the sign-in page. It works for ten minutes and
         only on the device that asked for it. If you didn't request this,
         simply ignore it — nothing happens without the code.</p>
         <p>With love,<br/>One Cocreation</p>`,
      ),
    });
  } catch (err) {
    console.error("sign-in code send failed:", err);
    return NextResponse.json({ ok: false, reason: "the letter didn't send — try again" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
