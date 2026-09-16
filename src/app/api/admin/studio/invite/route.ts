import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { getSiteConfig } from "@/lib/site-config";
import { studioVdoLinks } from "@/lib/live";
import { meetStudioUrl } from "@/lib/live-links";
import { getStudioDoc } from "@/lib/studio/roster";
import { sendStudioInvite } from "@/lib/mail-studio-invite";

export const dynamic = "force-dynamic";

/**
 * TASK-304 (0018.06.26 a₿) — POST { email } sends ONE community member the
 * studio's guest-door invite letter (the "Send to user" door on /a/studio's
 * links card). The join link is derived HERE, exactly the way /a/studio's
 * own page derives it (studioVdoLinks + meetStudioUrl on the request's own
 * origin) — the guest door only, keyless by construction, and nothing the
 * client sends can steer it (the body carries no URL at all). One member
 * per call, every time: an array or list-shaped body is refused outright,
 * never partially sent.
 */
export async function POST(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad json" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, reason: "one member at a time — { email } only, never a list" },
      { status: 400 },
    );
  }
  const { email, roomTitle } = body as { email?: unknown; roomTitle?: unknown };
  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ ok: false, reason: "one member's email, nothing else" }, { status: 400 });
  }

  /* the guest door, derived the SAME way /a/studio derives it — the room id
     doesn't depend on the room key (page.tsx's own T-305 note), so the
     unkeyed derivation is the honest one for a keyless door */
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost";
  const origin = `${proto}://${host}`;

  const [doc, config] = await Promise.all([getStudioDoc(), getSiteConfig()]);
  const vdo = studioVdoLinks(config.meeting.vdoRoomPrefix, config.meeting.vdoHost);
  const joinUrl = meetStudioUrl(origin, vdo.room);

  const result = await sendStudioInvite({
    to: email,
    roomTitle: typeof roomTitle === "string" ? roomTitle : undefined,
    joinUrl,
    startsAt: doc.startsAt || undefined,
    afterHoursLine: doc.afterHoursLine || undefined,
  });
  if (result.ok) return NextResponse.json(result);
  const status = result.code === "dark" ? 503 : result.code === "duplicate" ? 409 : 502;
  return NextResponse.json(result, { status });
}
