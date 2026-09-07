import { NextResponse } from "next/server";
import {
  EDITABLE_LETTERS,
  LETTER_DEFAULTS,
  audienceOf,
  createLetter,
  getLetterMeta,
  getLetterOverride,
  isLetterKey,
  listLetterKeys,
  saveLetterOverride,
  type LetterAudience,
  type LetterKey,
} from "@/lib/letters";
import { hourlyCap } from "@/lib/mail";
import { subscriberSegments, subscribersConfigured, listSubscribers } from "@/lib/subscribers";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

function gate(request: Request): NextResponse | null {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return null;
}

/** The Letters room's whole state: seeded + composed letters, and the list's
 *  segments with LIVE counts derived from the records (TASK-131). */
export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const letters = [];
  for (const k of await listLetterKeys()) {
    const seeded = (EDITABLE_LETTERS as readonly string[]).includes(k);
    const o = await getLetterOverride(k);
    letters.push({
      key: k,
      kind: seeded ? "seeded" : "composed",
      override: o,
      default: seeded ? (LETTER_DEFAULTS[k as LetterKey] ?? null) : null,
      audience: audienceOf(k, o),
      title: seeded ? null : ((await getLetterMeta(k))?.title ?? null),
    });
  }
  let segments: { source: string; count: number }[] = [];
  if (subscribersConfigured()) {
    const all = await listSubscribers();
    segments = [{ source: "all", count: all.length }, ...(await subscriberSegments())];
  }
  return NextResponse.json({ ok: true, letters, segments, mailHourlyCap: hourlyCap() });
}

/** TASK-131: "New letter" — Love composes beyond the seeded set. */
export async function POST(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as {
    key?: string;
    title?: string;
    audience?: string;
  } | null;
  if (!body?.title || (body.audience !== "public" && body.audience !== "list")) {
    return NextResponse.json({ ok: false, reason: "title and audience (public | list) required" }, { status: 400 });
  }
  try {
    const out = await createLetter({ key: body.key, title: body.title, audience: body.audience });
    return NextResponse.json({ ok: true, ...out });
  } catch (err) {
    return NextResponse.json({ ok: false, reason: err instanceof Error ? err.message : "create failed" }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as {
    key?: string;
    subject?: string;
    body?: string;
    audience?: string;
    reset?: boolean;
  } | null;
  // TASK-131: seeded keys AND Love's composed letters both save here
  if (!body?.key || !(await isLetterKey(body.key))) {
    return NextResponse.json({ ok: false, reason: "unknown letter" }, { status: 400 });
  }
  const k = body.key;
  if (body.reset) {
    await saveLetterOverride(k, null);
    return NextResponse.json({ ok: true, reset: true });
  }
  const audience: LetterAudience | undefined =
    body.audience === "public" || body.audience === "members" ? body.audience : undefined;
  // audience-only flip: merge onto the saved words (or the defaults)
  if (audience && !body.subject && !body.body) {
    const cur = (await getLetterOverride(k)) ?? LETTER_DEFAULTS[k as LetterKey];
    if (!cur) return NextResponse.json({ ok: false, reason: "no letter to flag yet" }, { status: 400 });
    await saveLetterOverride(k, { subject: cur.subject, body: cur.body, audience });
    return NextResponse.json({ ok: true, audience });
  }
  if (!body.subject?.trim() || !body.body?.trim()) {
    return NextResponse.json({ ok: false, reason: "subject and body required" }, { status: 400 });
  }
  const keepAudience = audience ?? (await getLetterOverride(k))?.audience;
  await saveLetterOverride(k, {
    subject: body.subject.trim(),
    body: body.body.trim(),
    ...(keepAudience ? { audience: keepAudience } : {}),
  });
  return NextResponse.json({ ok: true });
}
