import { NextResponse } from "next/server";
import { addSubscriber, validEmail, subscribersConfigured } from "@/lib/subscribers";
import { mailConfigured } from "@/lib/mail";
import { sendLeadMagnetLetter, enqueueDayTwoWelcome } from "@/lib/lead-magnet";

export const dynamic = "force-dynamic";

/**
 * The list's front door (flow 1). Join → the record lands in the vault →
 * the lead magnet rides out immediately: "Unzip Into the New You" is the
 * promise on the form, so it is the FIRST mail, not a someday drip.
 *
 * Honesty rule (email-rail brief, risk #2): if the rail is dark we say so —
 * no signup box that goes nowhere.
 */
export async function POST(request: Request) {
  if (!subscribersConfigured() || !mailConfigured("news")) {
    return NextResponse.json(
      { ok: false, reason: "the mail rail is not wired yet — please try again soon" },
      { status: 503 },
    );
  }

  let body: { email?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  }
  const email = (body.email ?? "").trim();
  if (!validEmail(email)) {
    return NextResponse.json({ ok: false, reason: "that email doesn't look right" }, { status: 400 });
  }

  const { added, already } = await addSubscriber(email, body.source ?? "site");

  // A re-signup gets the meditation again — they asked for it, send it.
  if (added || already) {
    try {
      await sendLeadMagnetLetter(email);
    } catch (err) {
      console.error("lead magnet send failed:", err);
      return NextResponse.json(
        { ok: true, joined: true, mailed: false, note: "joined — the meditation letter will retry" },
        { status: 200 },
      );
    }

    // The day-two welcome (the Admiral's "kind extra special welcome") rides
    // the drip queue — only for genuinely NEW joins, never on a re-signup.
    // Copy is a placeholder shape awaiting Love's own voice (checklist item).
    if (added) {
      try {
        await enqueueDayTwoWelcome(email);
      } catch (err) {
        console.error("welcome drip enqueue failed:", err);
      }
    }
  }

  return NextResponse.json({ ok: true, joined: added, already, mailed: true });
}
