import { NextResponse } from "next/server";
import { getLetterOverride, letterHtml, EDITABLE_LETTERS, LETTER_DEFAULTS, type LetterKey } from "@/lib/letters";
import { listSubscribers, subscribersConfigured, unsubscribeUrl } from "@/lib/subscribers";
import { enqueue } from "@/lib/mail-queue";
import { recordDelivery } from "@/lib/mailbox";

import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

/**
 * PUBLISH a letter to the whole list (the Admiral's ask): now, or
 * scheduled — every copy rides the drip queue so the hourly cap and the
 * meter stay honest. `at` (ISO) sets notBefore; omitted = next tick.
 */
export async function POST(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!subscribersConfigured()) {
    return NextResponse.json({ ok: false, reason: "subscriber vault not configured" }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as { key?: string; at?: string; testTo?: string } | null;
  if (!body?.key || !(EDITABLE_LETTERS as readonly string[]).includes(body.key)) {
    return NextResponse.json({ ok: false, reason: "unknown letter" }, { status: 400 });
  }
  const tpl =
    (await getLetterOverride(body.key as LetterKey)) ?? LETTER_DEFAULTS[body.key as LetterKey] ?? null;
  if (!tpl) {
    return NextResponse.json(
      { ok: false, reason: "save the letter first — publishing sends YOUR saved version" },
      { status: 400 },
    );
  }

  // a TEST copy to one address — the operator's own eyes before the list
  if (body.testTo) {
    await enqueue([{
      to: body.testTo,
      subject: `[test] ${tpl.subject}`,
      html: letterHtml(tpl.body, { webUrl: `/letters/${body.key}`, unsubscribeUrl: unsubscribeUrl(body.testTo) }),
    }]);
    return NextResponse.json({ ok: true, queued: 1, test: true });
  }
  const notBefore = body.at ? Date.parse(body.at) : undefined;
  if (body.at && !Number.isFinite(notBefore)) {
    return NextResponse.json({ ok: false, reason: "bad schedule time" }, { status: 400 });
  }

  const list = await listSubscribers();
  await enqueue(
    list.map((to) => ({
      to,
      subject: tpl.subject,
      html: letterHtml(tpl.body, { webUrl: `/letters/${body.key}`, unsubscribeUrl: unsubscribeUrl(to) }),
      notBefore,
    })),
  );
  // the mailbox remembers — each member's /letters shows what THEY received
  const atMs = notBefore ?? Date.now();
  for (const to of list) {
    await recordDelivery(to, { key: body.key, subject: tpl.subject, atMs }).catch(() => {});
  }
  return NextResponse.json({
    ok: true,
    queued: list.length,
    scheduledFor: notBefore ? new Date(notBefore).toISOString() : "next tick",
  });
}
