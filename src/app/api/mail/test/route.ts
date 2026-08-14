import { NextResponse } from "next/server";
import { sendMail, mailConfigured, brandShell, capRemaining, hourlyCap } from "@/lib/mail";
import { subscriberCount, subscribersConfigured, validEmail } from "@/lib/subscribers";
import { queueDepth } from "@/lib/mail-queue";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

/**
 * The rail's own smoke test + status readout. Operator (or seat secret) only.
 * GET = status: configured personas, meter, queue depth — the console MAIL
 * panel reads this. POST {to, persona?} = send one test letter.
 */
function authorized(request: Request): boolean {
  const seat = request.headers.get("x-seat-secret");
  if (process.env.SEAT_SECRET && seat === process.env.SEAT_SECRET) return true;
  if (operatorFromCookieHeader(request.headers.get("cookie"))) return true;
  return false;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({
    ok: true,
    personas: { bookings: mailConfigured("bookings"), news: mailConfigured("news") },
    vault: subscribersConfigured(),
    subscribers: subscribersConfigured() ? await subscriberCount() : null,
    queue: subscribersConfigured() ? await queueDepth() : null,
    hourlyCap: hourlyCap(),
    capLeftThisHour: subscribersConfigured() ? await capRemaining() : null,
  });
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { to?: string; persona?: string };
  const to = (body.to ?? "").trim();
  const persona = body.persona === "news" ? "news" : "bookings";
  if (!validEmail(to)) return NextResponse.json({ ok: false, reason: "bad to" }, { status: 400 });
  if (!mailConfigured(persona)) {
    return NextResponse.json({ ok: false, reason: `${persona} persona dark` }, { status: 503 });
  }
  await sendMail(persona, {
    to,
    subject: `One Cocreation mail rail — test from ${persona}@`,
    html: brandShell(
      `<p>The rail is lit. This letter left through the <b>${persona}</b> mailbox
       over the house SMTP relay — if you are reading it, transactional mail works
       end to end.</p><p>Tick tock — every letter finds its block.</p>`,
    ),
  });
  return NextResponse.json({ ok: true, sent: to, persona });
}
