import { NextResponse } from "next/server";
import { getLiveState, roomForSlug } from "@/lib/live";

export const dynamic = "force-dynamic";

/**
 * THE PUBLIC LIVE READ (TASK-37/S40 lane 2) — tiny and cacheable (~15s):
 * the site-wide banner polls this, so the flag turns the whole site within
 * a breath of the door opening without punching the vault on every page
 * load. A dark vault reads as `live: false` — never an error page.
 */
export async function GET() {
  const state = await getLiveState();
  const room = state.live && state.room ? roomForSlug(state.room) : undefined;
  return NextResponse.json(
    {
      ok: true,
      live: state.live,
      kind: state.live ? (room?.kind ?? state.kind ?? "class") : null,
      room: state.live ? (state.room ?? null) : null,
      roomTitle: state.live ? (room?.title ?? null) : null,
      startedAt: state.live ? (state.startedAt ?? null) : null,
    },
    { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" } },
  );
}
