import { NextResponse } from "next/server";
import { addSubscriber, addReadingTag, validEmail, subscribersConfigured } from "@/lib/subscribers";
import { mailConfigured } from "@/lib/mail";
import { sendLeadMagnetLetter, sendReadWithLoveLetter, enqueueDayTwoWelcome } from "@/lib/lead-magnet";
import { sendReadingConfirmation } from "@/lib/reading-letters";

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

  /* TASK-388 — the reading sign-up's own branch: tags the subscriber via
     the narrow seam (addReadingTag, subscribers.ts's own Ground — bare
     addSubscriber cannot express additive tagging on an existing record).
     TASK-389 (decision B): on a genuinely NEW tag ("joined") only, the
     confirmation goes out immediately through the shared send path
     (reading-letters.ts's sendReadingConfirmation — the same one the mail
     tick's backlog sweep uses, so the two can never double-send the same
     soul, R3). "already" gets no second letter; "unsubscribed" gets NONE,
     ever — the opt-out is preserved and the card already tells the soul
     plainly. A send failure (a dark rail, a spent hourly meter, R4) is
     swallowed here exactly like the route's existing rail-dark 503 guard
     swallows a dark rail elsewhere: the confirmation stays unstamped and
     the mail tick's backlog sweep is the retry, never a crashed request.
     The branch's own return shape, `{ ok: true, outcome }`, is unchanged;
     every other source's path below stays untouched. */
  if ((body.source ?? "") === "reading") {
    const { outcome } = await addReadingTag(email);
    if (outcome === "joined") {
      try {
        await sendReadingConfirmation(email);
      } catch (err) {
        console.error("reading confirmation send failed:", err);
      }
    }
    return NextResponse.json({ ok: true, outcome });
  }

  const { added, already } = await addSubscriber(email, body.source ?? "site");

  /* TASK-126 (0018.06.16 a₿): the Read with Love door pours its own letter —
     the weekly live reading, not the meditation; its day-two welcome is
     skipped (that note is about the meditation). Every other source is
     unchanged. */
  const rwl = (body.source ?? "") === "readwithlove";

  // A re-signup gets the letter again — they asked for it, send it.
  if (added || already) {
    try {
      if (rwl) await sendReadWithLoveLetter(email);
      else await sendLeadMagnetLetter(email);
    } catch (err) {
      console.error("lead magnet send failed:", err);
      return NextResponse.json(
        { ok: true, joined: true, mailed: false, note: `joined — the ${rwl ? "Read with Love" : "meditation"} letter will retry` },
        { status: 200 },
      );
    }

    // The day-two welcome (the Admiral's "kind extra special welcome") rides
    // the drip queue — only for genuinely NEW joins, never on a re-signup,
    // and never for Read with Love (it is about the meditation).
    // Copy is a placeholder shape awaiting Love's own voice (checklist item).
    if (added && !rwl) {
      try {
        await enqueueDayTwoWelcome(email);
      } catch (err) {
        console.error("welcome drip enqueue failed:", err);
      }
    }
  }

  return NextResponse.json({ ok: true, joined: added, already, mailed: true });
}
