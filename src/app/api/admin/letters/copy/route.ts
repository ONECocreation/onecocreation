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
export async function POST(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { key?: string; to?: string } | null;
  if (!body?.key || !(await isLetterKey(body.key))) {
    return NextResponse.json({ ok: false, reason: "unknown letter" }, { status: 400 });
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
