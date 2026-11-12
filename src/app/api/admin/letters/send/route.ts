import crypto from "crypto";
import { watchDelivery, saveScheduleIntent } from "@/lib/letter-delivery";
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
import { cancelSend, enqueue, getSendRecord, queuedRecipients, recentSendsForLetter, rescheduleSend } from "@/lib/mail-queue";
import { moveDelivery } from "@/lib/mailbox";
import { sendLetterToList } from "@/lib/list-send";

import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

/**
 * PUBLISH a letter to the list (the Admiral's ask): all of it, or one
 * door's segment (TASK-131) — now, or scheduled. Every copy rides the drip
 * queue so the hourly cap and the meter stay honest. `at` (ISO) sets
 * notBefore; omitted = next tick. A list send must carry `confirm` = the
 * exact headcount it was shown — the panel sends it only once Love ticks
 * the box that names the count (it used to be a typed-back number).
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
  // T-638: the queueing + bookkeeping lives in lib/list-send.ts so the
  // replays catch-up letter takes the very same path.
  const sent = await sendLetterToList({ key: body.key, subject: tpl.subject, body: tpl.body, source, notBefore, webUrl, list });
  const { sendId, scheduledFor, atMs } = sent;
  let recordConfirmed = false;
  let noticePending = false;
  try {
    const history = await recentSendsForLetter(body.key, 8, true);
    recordConfirmed = history.some((s) => s.sendId === sendId);
    if (recordConfirmed) {
      await watchDelivery(sendId, tpl.subject);
      noticePending = true;
      await saveScheduleIntent(body.key, null);
    }
  } catch { console.error("letter send accepted; tracking or notice could not be confirmed"); }
  const cap = hourlyCap();
  return NextResponse.json({
    ok: true,
    queued: list.length,
    recordConfirmed,
    noticePending,
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
  try {
    if (sendId) {
      const rec = await getSendRecord(sendId, true);
      if (!rec) return NextResponse.json({ ok: false, reason: "unknown send" }, { status: 404 });
      return NextResponse.json({ ok: true, ...rec, sendId });
    }
    if (key) {
      if (!(await isLetterKey(key))) return NextResponse.json({ ok: false, reason: "unknown letter" }, { status: 404 });
      const sends = await recentSendsForLetter(key, 5, true);
      return NextResponse.json({ ok: true, sends });
    }
    return NextResponse.json({ ok: false, reason: "sendId or key required" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, reason: "send status unavailable" }, { status: 503 });
  }
}

/**
 * Cancel or Change time on a send that has not gone out yet (the Admiral's
 * ask: "give the ability to modify an existing item that's going to send").
 * Body: { sendId, action: "cancel" } or { sendId, action: "reschedule", at }.
 * Operator only. The queue's own copies are untouched; the send's record
 * carries the change and the sender tick obeys it (lib/mail-queue.ts).
 */
export async function PATCH(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { sendId?: string; action?: string; at?: string } | null;
  if (!body?.sendId || (body.action !== "cancel" && body.action !== "reschedule")) {
    return NextResponse.json({ ok: false, reason: "sendId and action required" }, { status: 400 });
  }
  const before = await getSendRecord(body.sendId);
  let atMs: number | null = null;
  if (body.action === "reschedule") {
    atMs = body.at ? Date.parse(body.at) : NaN;
    if (!Number.isFinite(atMs)) return NextResponse.json({ ok: false, reason: "bad schedule time" }, { status: 400 });
    if (atMs <= Date.now()) return NextResponse.json({ ok: false, reason: "Pick a time that has not passed yet." }, { status: 400 });
  }
  const result = body.action === "cancel" ? await cancelSend(body.sendId) : await rescheduleSend(body.sendId, atMs as number);
  if (!result.ok) return NextResponse.json(result, { status: 409 });

  // each member's own /letters mailbox follows the change (best-effort)
  if (before) {
    const fromAtMs = before.scheduledFor === "next tick" ? before.createdAtMs : Date.parse(before.scheduledFor);
    for (const to of await queuedRecipients(body.sendId)) {
      await moveDelivery(to, before.key, fromAtMs, atMs).catch(() => {});
    }
  }
  if (body.action === "reschedule" && before) {
    const tpl = await getLetterOverride(before.key);
    if (tpl) await watchDelivery(body.sendId, tpl.subject).catch(() => console.error("reschedule notice deferred"));
  }
  return NextResponse.json({ ok: true, ...result.record, sendId: body.sendId });
}
