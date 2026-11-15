import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { isLetterKey } from "@/lib/letters";
import { getScheduleIntent, saveScheduleIntent } from "@/lib/letter-delivery";
export const dynamic = "force-dynamic";
/** Remembering a preferred time NEVER queues or authorizes a send. */
export async function GET(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) return NextResponse.json({ ok: false }, { status: 401 });
  const key = new URL(request.url).searchParams.get("key");
  if (!key || !(await isLetterKey(key))) return NextResponse.json({ ok: false }, { status: 404 });
  try { return NextResponse.json({ ok: true, intent: await getScheduleIntent(key) }); }
  catch { return NextResponse.json({ ok: false }, { status: 503 }); }
}
export async function PUT(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.key !== "string" || !(await isLetterKey(body.key))) return NextResponse.json({ ok: false }, { status: 400 });
  if (body.at !== null && (typeof body.at !== "string" || !Number.isFinite(Date.parse(body.at)))) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const intent = await saveScheduleIntent(body.key, body.at === null ? null : new Date(body.at).toISOString());
    return NextResponse.json({ ok: true, intent });
  } catch { return NextResponse.json({ ok: false }, { status: 503 }); }
}
