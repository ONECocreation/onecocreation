import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { postToRoom, matrixConfigured } from "@/lib/matrix";
import { ROOMS } from "@/lib/matrix-rooms";
import {
  getLiveState,
  setLiveState,
  liveStoreConfigured,
  roomForSlug,
  slugOfRoom,
  defaultOpeningWord,
  defaultGoodbyeWord,
  sendClassStartingLetters,
} from "@/lib/live";

export const dynamic = "force-dynamic";

/**
 * THE CLASS DOOR (TASK-37/S40 lane 1) — the operator opens a room: the bot
 * carries Love's opening word into it, the live flag lights the banner and
 * the /live page; the close posts the goodbye and lowers the flag.
 *
 * Auth mirrors the ceremony route EXACTLY (operator session, 401 without).
 * The room is validated against ROOMS by slug — never a free-form alias.
 *
 * Order matters on open: the WORD lands first, the flag second — a banner
 * that lights without the room ever hearing the announce would be a lie.
 * On close the flag lowers even if the goodbye fails (a stuck banner is the
 * worse lie); the outcome is reported either way.
 *
 * The class-starting letter rides as an OPTION (`letter: true`), default
 * OFF — the mail rail is reputation armor.
 */

interface OpenBody {
  action?: string;
  room?: string;
  message?: string;
  letter?: boolean;
}

export async function GET(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  }
  const state = await getLiveState();
  return NextResponse.json({
    ok: true,
    state,
    rooms: ROOMS.map((r) => ({ slug: slugOfRoom(r), title: r.title, kind: r.kind })),
    matrixConfigured: matrixConfigured(),
    vaultConfigured: liveStoreConfigured(),
  });
}

export async function POST(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  }
  if (!matrixConfigured()) {
    return NextResponse.json({ ok: false, reason: "matrix bot token not configured" }, { status: 503 });
  }
  if (!liveStoreConfigured()) {
    return NextResponse.json({ ok: false, reason: "live flag vault not configured" }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as OpenBody;

  if (body.action === "open") {
    const room = typeof body.room === "string" ? roomForSlug(body.room) : undefined;
    if (!room) {
      return NextResponse.json({ ok: false, reason: "unknown room — pick one of Love's rooms" }, { status: 400 });
    }
    const word = body.message?.trim() || defaultOpeningWord(room);
    const post = await postToRoom(room.id, word);
    if (!post.ok) {
      return NextResponse.json(
        { ok: false, reason: `the word did not land — nothing opened (${post.reason})` },
        { status: 502 },
      );
    }
    const state = {
      live: true as const,
      kind: room.kind,
      room: slugOfRoom(room),
      startedAt: Math.floor(Date.now() / 1000),
    };
    await setLiveState(state);
    // the letter is an OPTION, default off — only an explicit true sends it
    let letters: { audience: number; queued: number } | { failed: string } | null = null;
    if (body.letter === true) {
      try {
        letters = await sendClassStartingLetters(room);
      } catch (err) {
        letters = { failed: err instanceof Error ? err.message : "letter queue failed" };
      }
    }
    return NextResponse.json({ ok: true, opened: state, announced: word, letters });
  }

  if (body.action === "close") {
    const state = await getLiveState();
    if (!state.live || !state.room) {
      return NextResponse.json({ ok: true, closed: null, note: "the room was already dark" });
    }
    const room = roomForSlug(state.room);
    let goodbye: { ok: boolean; reason?: string } = { ok: false, reason: "room no longer known" };
    if (room) {
      const word = body.message?.trim() || defaultGoodbyeWord(room);
      const post = await postToRoom(room.id, word);
      goodbye = post.ok ? { ok: true } : { ok: false, reason: post.reason };
    }
    await setLiveState({ live: false });
    return NextResponse.json({ ok: true, closed: state.room, goodbye });
  }

  return NextResponse.json({ ok: false, reason: "unknown action — open or close" }, { status: 400 });
}
