import { NextResponse } from "next/server";
import { enqueue } from "@/lib/mail-queue";

export const dynamic = "force-dynamic";

/**
 * E.T. PHONE HOME (her contact page's form, brought home 0018.05.15):
 * a visitor's note rides the house mail queue to Love's own inbox.
 * `company` is the honeypot — bots fill it, souls don't.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: string; email?: string; subject?: string; message?: string; company?: string;
  } | null;
  if (!body) return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  if (body.company?.trim()) return NextResponse.json({ ok: true }); // the honeypot ate it
  const name = body.name?.trim().slice(0, 120);
  const email = body.email?.trim().slice(0, 200);
  const message = body.message?.trim().slice(0, 5000);
  if (!name || !email || !/.+@.+\..+/.test(email) || !message) {
    return NextResponse.json({ ok: false, reason: "name, a real email, and a message" }, { status: 400 });
  }
  const subject = body.subject?.trim().slice(0, 160) || "A note from the site";
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  /* S2: pinned — needs a ruling: inbox HTML is an always-light room, and
     #3f3a4e/#897f97 are the DAWN faces of the theme-aware --ink-strong/--muted;
     the gold quote-bar is decorative (gold law). All three stay literal. */
  await enqueue([{
    to: process.env.CONTACT_INBOX ?? "love@onecocreation.com",
    subject: `✉️ ${subject} — from ${name}`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.7;color:#3f3a4e;max-width:560px">
      <p><b>${esc(name)}</b> &lt;${esc(email)}&gt; wrote through the site:</p>
      <blockquote style="border-left:3px solid #d9b24e;margin:0;padding:6px 0 6px 16px;white-space:pre-line">${esc(message)}</blockquote>
      <p style="color:#897f97;font-size:13px">reply straight to ${esc(email)} 💛</p>
    </div>`,
  }]);
  return NextResponse.json({ ok: true });
}
