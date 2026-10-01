import { NextResponse } from "next/server";
import { tick } from "@/lib/mail-queue";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { enqueueReadingDayOf } from "@/lib/reading-letters";
import { enqueueJoinLetters } from "@/lib/join-letters";
import { draftReadingLetters } from "@/lib/reading-week-drafts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The sender tick — cron pulls this and the queue drains politely under the
 * hourly cap. Three keys open it: Vercel cron's CRON_SECRET bearer, the seat
 * secret (the house's own automation, e.g. the VPS crontab), or a logged-in
 * operator poking the console's "send now" button.
 */
function authorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  const seat = request.headers.get("x-seat-secret");
  if (process.env.SEAT_SECRET && seat === process.env.SEAT_SECRET) return true;
  if (operatorFromCookieHeader(request.headers.get("cookie"))) return true;
  return false;
}

/**
 * TASK-534: the `?draft=now` poke (make this week's draft now) is honored
 * for the seat secret or an operator cookie ONLY, never for the public cron
 * bearer's ordinary path. It bypasses the Tuesday check and nothing else.
 */
function pokeAllowed(request: Request): boolean {
  if (new URL(request.url).searchParams.get("draft") !== "now") return false;
  const seat = request.headers.get("x-seat-secret");
  if (process.env.SEAT_SECRET && seat === process.env.SEAT_SECRET) return true;
  return !!operatorFromCookieHeader(request.headers.get("cookie"));
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const result = await tick();
  /* TASK-389 (R1, the amendment): the two reading emails ride this SAME
     tick — direct sendMail calls, never mail-queue.enqueue() (a letter
     queued after the drain above would not be picked up again until
     TOMORROW's single daily cron), so no second drain is needed here. */
  const reading = await enqueueReadingDayOf(Date.now());
  /* TASK-519: the two join letters ride this SAME tick — direct sendMail
     from due-logic like the reading letters (R1), never the queue; the
     call is internally guarded and never throws into this response. */
  const join = await enqueueJoinLetters(Date.now());
  /* TASK-534: the weekly next-reading DRAFT and its review copy ride the
     same tick, AFTER the calls above, in their own try/catch: a draft
     can never fail the tick. It mails only the operator recipient set and
     never touches the list (the send panel is the only door to the list). */
  let drafts: Awaited<ReturnType<typeof draftReadingLetters>> | { nextReading: "error"; replay: "held"; reviewSent: 0 };
  try {
    drafts = await draftReadingLetters(Date.now(), { force: pokeAllowed(request) });
  } catch (err) {
    console.error("mail tick: reading drafts failed:", err);
    drafts = { nextReading: "error", replay: "held", reviewSent: 0 };
  }
  return NextResponse.json({ ok: true, ...result, reading, join, drafts });
}

export async function POST(request: Request) {
  return GET(request);
}
