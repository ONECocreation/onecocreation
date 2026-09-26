import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  EDITABLE_LETTERS,
  LETTER_DEFAULTS,
  getLetterOverride,
  isLetterKey,
  letterHtml,
  type LetterKey,
} from "@/lib/letters";
import { hourlyCap, onceWithin } from "@/lib/mail";
import { listSubscribers, subscribersConfigured, unsubscribeUrl } from "@/lib/subscribers";
import { enqueue, getSendRecord, initSendRecord, recentSendsForLetter, recordSendForLetter } from "@/lib/mail-queue";
import { recordDelivery } from "@/lib/mailbox";

import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

/**
 * PUBLISH a letter to the list (the Admiral's ask): all of it, or one
 * door's segment (TASK-131) — now, or scheduled. Every copy rides the drip
 * queue so the hourly cap and the meter stay honest. `at` (ISO) sets
 * notBefore; omitted = next tick. A list send must carry `confirm` = the
 * exact headcount it was shown — the typed-back number, not a button tap.
 */
export async function POST(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!subscribersConfigured()) {
    return NextResponse.json({ ok: false, reason: "subscriber vault not configured" }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as {
    key?: string;
    at?: string;
    testTo?: string;
    source?: string;
    confirm?: number;
  } | null;
  if (!body?.key || !(await isLetterKey(body.key))) {
    return NextResponse.json({ ok: false, reason: "unknown letter" }, { status: 400 });
  }
  const tpl =
    (await getLetterOverride(body.key)) ?? LETTER_DEFAULTS[body.key as LetterKey] ?? null;
  if (!tpl || !tpl.body.trim()) {
    return NextResponse.json(
      { ok: false, reason: "save the letter first — publishing sends YOUR saved version" },
      { status: 400 },
    );
  }

  // TASK-214: one send per click, enforced at the seam too (the panel's own
  // disable is the first line — see [key]/page.tsx). The SAME request body
  // (this letter, this segment/testTo, this typed count) arriving again
  // inside 4s is a click that beat the disable or a retry, not a second send.
  const dedupeKey = crypto
    .createHash("sha256")
    .update(JSON.stringify({ key: body.key, testTo: body.testTo ?? null, source: body.source ?? null, confirm: body.confirm ?? null, at: body.at ?? null }))
    .digest("hex");
  if (!(await onceWithin(dedupeKey, 4000))) {
    return NextResponse.json({ ok: false, reason: "already sending — one moment" }, { status: 429 });
  }

  // derive-or-dash: a composed letter has no site page until the /letters
  // seam (outside this lane's OWNS) lists it — no "view on the site" link yet
  const seeded = (EDITABLE_LETTERS as readonly string[]).includes(body.key);
  const webUrl = seeded ? `/letters/${body.key}` : undefined;
  const htmlFor = (to: string) => letterHtml(tpl.body, { webUrl, unsubscribeUrl: unsubscribeUrl(to) });

  // a TEST copy to one address — the operator's own eyes before the list
  if (body.testTo) {
    await enqueue([{
      to: body.testTo,
      subject: `[test] ${tpl.subject}`,
      html: htmlFor(body.testTo),
    }]);
    return NextResponse.json({ ok: true, queued: 1, test: true });
  }
  const notBefore = body.at ? Date.parse(body.at) : undefined;
  if (body.at && !Number.isFinite(notBefore)) {
    return NextResponse.json({ ok: false, reason: "bad schedule time" }, { status: 400 });
  }
  const source = typeof body.source === "string" && body.source && body.source !== "all" ? body.source : undefined;

  const list = await listSubscribers(source ? { source } : {});
  // the typed-back count must match the headcount the panel showed — a stale
  // panel or a fat finger stops the send, never fires it
  if (body.confirm !== list.length) {
    return NextResponse.json(
      { ok: false, reason: "type the exact count to send", expected: list.length },
      { status: 409 },
    );
  }
  // T-484 (walk item S7): one sendId per list-send click — every queued
  // copy carries it, `tick()` bumps its sent/dropped tally against it, and
  // the panel polls that tally instead of trusting silence.
  const sendId = crypto.randomUUID();
  const scheduledFor = notBefore ? new Date(notBefore).toISOString() : "next tick";
  await enqueue(
    list.map((to) => ({
      to,
      subject: tpl.subject,
      html: htmlFor(to),
      notBefore,
      guard: { kind: "subscribed" as const },
      sendId,
    })),
  );
  await initSendRecord(sendId, { key: body.key, queued: list.length, segment: source ?? "all", scheduledFor });
  await recordSendForLetter(body.key, sendId);
  // the mailbox remembers — each member's /letters shows what THEY received
  const atMs = notBefore ?? Date.now();
  for (const to of list) {
    await recordDelivery(to, { key: body.key, subject: tpl.subject, atMs }).catch(() => {});
  }
  const cap = hourlyCap();
  return NextResponse.json({
    ok: true,
    queued: list.length,
    segment: source ?? "all",
    recipients: list,
    sendId,
    scheduledFor,
    // the drip is honest about its pace: past the cap, the queue spans hours
    hourlyCap: cap,
    estimatedFinish:
      list.length > cap
        ? new Date(atMs + Math.ceil(list.length / cap) * 3_600_000).toISOString()
        : undefined,
  });
}

/**
 * T-484 (walk item S7): the real sent state, read back. Operator only,
 * exactly like the POST above. Two shapes, one query param each:
 *   ?sendId=<id>  — that one send's own tally: {queued, sent, dropped}
 *                   (plus the metadata the panel already has, so a fresh
 *                   poll never needs a second round trip for it).
 *   ?key=<key>    — the last few sends FOR that letter, newest first —
 *                   what the panel shows after a reload, with no send
 *                   in flight to poll.
 * Neither param present, or an unknown sendId, is a plain 400/404 — never
 * a thrown error, never a guessed number.
 */
export async function GET(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const url = new URL(request.url);
  const sendId = url.searchParams.get("sendId");
  const key = url.searchParams.get("key");
  if (sendId) {
    const rec = await getSendRecord(sendId);
    if (!rec) return NextResponse.json({ ok: false, reason: "unknown send" }, { status: 404 });
    return NextResponse.json({ ok: true, ...rec, sendId });
  }
  if (key) {
    const sends = await recentSendsForLetter(key, 5);
    return NextResponse.json({ ok: true, sends });
  }
  return NextResponse.json({ ok: false, reason: "sendId or key required" }, { status: 400 });
}
