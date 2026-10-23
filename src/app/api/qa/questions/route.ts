import { NextResponse } from "next/server";
import { addQuestion, sendNotice, countQuestionSend, qaSendVerdict, QA_DOOR_HELD } from "@/lib/qa-questions";

export const dynamic = "force-dynamic";

/**
 * THE QUESTION BOX'S DOOR (TASK-603 phase 2, K182) — POST /api/qa/questions.
 * A visitor's question lands in the month-keyed store (qa-questions.ts) and
 * Love's notice rides the existing mail module (the brief's RULED section,
 * block 971,255). No account needed; the name and email are optional; only
 * the question is required.
 *
 * The guards are the house's own: `company` is the honeypot (the contact
 * form's idiom — bots fill it, souls don't), and the meter is the sign-in
 * box's idiom (TASK-185 K7: INCR + EXPIRE over a ten-minute window, an
 * honest 429 past the cap), keyed by the email given or the caller's IP.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: string; email?: string; question?: string; company?: string;
  } | null;
  if (!body) return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  if (body.company?.trim()) return NextResponse.json({ ok: true }); // the honeypot ate it

  const words = body.question?.trim().slice(0, 2000);
  if (!words) return NextResponse.json({ ok: false, reason: "the question is the one thing needed" }, { status: 400 });
  const name = body.name?.trim().slice(0, 120) || "";
  const emailRaw = body.email?.trim().slice(0, 200) || "";
  if (emailRaw && !/.+@.+\..+/.test(emailRaw)) {
    return NextResponse.json({ ok: false, reason: "that email doesn't look right" }, { status: 400 });
  }
  const email = emailRaw || null;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (qaSendVerdict(await countQuestionSend(email, ip)) === "hold") {
    return NextResponse.json({ ok: false, reason: QA_DOOR_HELD }, { status: 429 });
  }

  let row;
  try {
    row = await addQuestion({ words, who: name || "no name given", email });
  } catch (err) {
    console.error("qa question store failed:", err);
    return NextResponse.json(
      { ok: false, reason: "the questions box didn't take it - please try again in a little while" },
      { status: 502 },
    );
  }
  /* the notice never blocks the thank-you: the question is safe, the mail
     rail's mood is reported in the log, not to the visitor */
  await sendNotice(row);
  return NextResponse.json({ ok: true });
}
