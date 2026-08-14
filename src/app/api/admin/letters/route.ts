import { NextResponse } from "next/server";
import {
  EDITABLE_LETTERS,
  LETTER_DEFAULTS,
  audienceOf,
  getLetterOverride,
  saveLetterOverride,
  type LetterAudience,
  type LetterKey,
} from "@/lib/letters";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

function gate(request: Request): NextResponse | null {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const overrides: Record<string, unknown> = {};
  const audiences: Record<string, LetterAudience> = {};
  for (const k of EDITABLE_LETTERS) {
    const o = await getLetterOverride(k);
    overrides[k] = o;
    audiences[k] = audienceOf(k, o);
  }
  return NextResponse.json({ ok: true, overrides, defaults: LETTER_DEFAULTS, audiences });
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
  if (!body?.key || !(EDITABLE_LETTERS as readonly string[]).includes(body.key)) {
    return NextResponse.json({ ok: false, reason: "unknown letter" }, { status: 400 });
  }
  const k = body.key as LetterKey;
  if (body.reset) {
    await saveLetterOverride(k, null);
    return NextResponse.json({ ok: true, reset: true });
  }
  const audience: LetterAudience | undefined =
    body.audience === "public" || body.audience === "members" ? body.audience : undefined;
  // audience-only flip: merge onto the saved words (or the defaults)
  if (audience && !body.subject && !body.body) {
    const cur = (await getLetterOverride(k)) ?? LETTER_DEFAULTS[k];
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
