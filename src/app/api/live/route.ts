import { NextResponse } from "next/server";
import { getLiveState, roomForSlug } from "@/lib/live";
import { getStudioDoc } from "@/lib/studio/roster";
import { studioSceneKind } from "@/lib/studio/scenes";

export const dynamic = "force-dynamic";

/**
 * THE PUBLIC LIVE READ (TASK-37/S40 lane 2) — tiny and cacheable (~15s):
 * the site-wide banner polls this, so the flag turns the whole site within
 * a breath of the door opening without punching the vault on every page
 * load. A dark vault reads as `live: false` — never an error page.
 *
 * TASK-251 (0018.06.23 a₿): `scene` rides beside the live flag — the
 * studio doc's own `activeScene` when its kind is `full` (starting/brb/
 * ending), else null. This is the SAME doc the room page reads server-side
 * for the first paint (`fullScene`, threaded through ClassroomView →
 * StageView → RoomVideoSlot); ClassroomView's existing 20s poll of this
 * route carries the UPDATES while a viewer watches, so the Stage's video
 * frame can react when Love changes the scene mid-show. The studio doc is
 * site-wide (one studio), not per-room, so `scene` is never gated by
 * `room`/`live` the way the rest of this payload is — getStudioDoc()
 * already answers the honest empty-stage default on any read failure,
 * never a 500.
 */
export async function GET() {
  const state = await getLiveState();
  const room = state.live && state.room ? roomForSlug(state.room) : undefined;
  const doc = await getStudioDoc();
  const scene = studioSceneKind(doc.activeScene) === "full" ? doc.activeScene : null;
  return NextResponse.json(
    {
      ok: true,
      live: state.live,
      kind: state.live ? (room?.kind ?? state.kind ?? "class") : null,
      room: state.live ? (state.room ?? null) : null,
      roomTitle: state.live ? (room?.title ?? null) : null,
      startedAt: state.live ? (state.startedAt ?? null) : null,
      scene,
    },
    { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" } },
  );
}
