import { NextResponse } from "next/server";
import { EDITABLE_LETTERS, LETTER_DEFAULTS, getLetterOverride, isLetterKey, letterHtml, type LetterKey } from "@/lib/letters";
import { fillSamples } from "@/lib/letter-samples";
import { onceWithin } from "@/lib/mail";
import { enqueue } from "@/lib/mail-queue";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

/**
 * T-591: "Send me a copy" on every letter row. One copy of the letter as it
 * stands (saved words, or the house default) to ONE address the operator
 * types, "[test]" on the subject, the blanks filled with sample words. It
 * never touches the list, the send record or a draft's state.
 */
/**
 * T-604 (letters 553a): the edit page's own address. The session's email, only
 * for an email-seat operator (a keyed operator's session names a public key,
 * not an address). The page asks first so its button can say where the copy
 * goes, and says plainly when there is nowhere to send one.
 */
function sessionEmail(request: Request): string | null {
  const who = operatorFromCookieHeader(request.headers.get("cookie"));
  return who && who.includes("@") ? who : null;
}

export async function GET(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const to = sessionEmail(request);
  return NextResponse.json({ ok: true, canCopy: to !== null, to });
}

const NO_ADDRESS = "Your sign-in has no email address, so there is nowhere to send a copy.";
const MAX_BODY = 60000;
const MAX_SUBJECT = 300;

export async function POST(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    key?: string; to?: string; fromEditor?: boolean; subject?: unknown; body?: unknown;
  } | null;
  if (!body?.key || !(await isLetterKey(body.key))) {
    return NextResponse.json({ ok: false, reason: "unknown letter" }, { status: 400 });
  }
  /* T-604: the edit page's copy. What is ON THE SCREEN, to the signed-in
   * address only; a `to` the client sends is ignored. */
  if (body.fromEditor === true) {
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const words = typeof body.body === "string" ? body.body : "";
    if (!subject || !words.trim()) {
      return NextResponse.json({ ok: false, reason: "this letter has no words yet" }, { status: 400 });
    }
    if (subject.length > MAX_SUBJECT || words.length > MAX_BODY) {
      return NextResponse.json({ ok: false, reason: "this letter is too long to copy" }, { status: 400 });
    }
    const me = sessionEmail(request);
    if (!me) return NextResponse.json({ ok: false, reason: NO_ADDRESS }, { status: 400 });
    if (!(await onceWithin(`letter-copy:${body.key}:${me.toLowerCase()}`, 4000))) {
      return NextResponse.json({ ok: false, reason: "already sending, one moment" }, { status: 429 });
    }
    const seededKey = (EDITABLE_LETTERS as readonly string[]).includes(body.key);
    await enqueue([{
      to: me,
      subject: `[test] ${fillSamples(subject)}`,
      html: letterHtml(fillSamples(words), { webUrl: seededKey ? `/letters/${body.key}` : undefined, unsubscribeUrl: "#test-copy" }),
    }]);
    return NextResponse.json({ ok: true, queued: 1, to: me });
  }
  const to = (body.to ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ ok: false, reason: "type an email address" }, { status: 400 });
  }
  const tpl = (await getLetterOverride(body.key)) ?? LETTER_DEFAULTS[body.key as LetterKey] ?? null;
  if (!tpl || !tpl.subject.trim() || !tpl.body.trim()) {
    return NextResponse.json({ ok: false, reason: "this letter has no words yet" }, { status: 400 });
  }
  if (!(await onceWithin(`letter-copy:${body.key}:${to.toLowerCase()}`, 4000))) {
    return NextResponse.json({ ok: false, reason: "already sending, one moment" }, { status: 429 });
  }
  const seeded = (EDITABLE_LETTERS as readonly string[]).includes(body.key);
  await enqueue([{
    to,
    subject: `[test] ${fillSamples(tpl.subject)}`,
    html: letterHtml(fillSamples(tpl.body), { webUrl: seeded ? `/letters/${body.key}` : undefined, unsubscribeUrl: "#test-copy" }),
  }]);
  return NextResponse.json({ ok: true, queued: 1 });
}
