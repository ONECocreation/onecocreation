import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { ROOMS } from "@/lib/matrix-rooms";
import { roomRoster, matrixConfigured } from "@/lib/matrix";

export const dynamic = "force-dynamic";

/**
 * Love's Desk roster rail (Week "who's here" / Day "roster tonight") —
 * honest joined-member count + display names, read with the bot's OWN
 * session (matrix.ts's roomRoster; the bot is already a member of every
 * one of Love's rooms). TASK-160 (0018.06.17 a₿ · block 966,055): the
 * single-room answer now also carries the joined map + the bot-token
 * presence batch, so the desk's RosterPanel can run T-149's soulsOnline
 * filter itself — who is HERE NOW, never an invented dot.
 */
export async function GET(request: Request) {
  const operator = operatorFromCookieHeader(request.headers.get("cookie"));
  if (!operator) return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  if (!matrixConfigured()) {
    return NextResponse.json({ ok: false, reason: "matrix bot token not configured" }, { status: 503 });
  }
  const roomSlug = new URL(request.url).searchParams.get("room");
  const room = roomSlug ? ROOMS.find((r) => r.id.slice(1, r.id.indexOf(":")) === roomSlug) : null;
  if (roomSlug && !room) return NextResponse.json({ ok: false, reason: "unknown room" }, { status: 404 });

  if (room) {
    const res = await roomRoster(room.id);
    return res.ok
      ? NextResponse.json({ ok: true, room: roomSlug, count: res.count, names: res.names, joined: res.joined, presence: res.presence })
      : NextResponse.json({ ok: false, reason: res.reason }, { status: 502 });
  }

  const rosters = await Promise.all(
    ROOMS.map(async (r) => {
      const slug = r.id.slice(1, r.id.indexOf(":"));
      const res = await roomRoster(r.id);
      return res.ok
        ? { room: slug, title: r.title, count: res.count, names: res.names }
        : { room: slug, title: r.title, count: 0, names: [], error: res.reason };
    }),
  );
  return NextResponse.json({ ok: true, rooms: rosters });
}
