import { NextResponse } from "next/server";
import { getSiteConfig } from "@/lib/site-config";
import { getStage1State } from "@/lib/stage1";

export const dynamic = "force-dynamic";

/**
 * STAGE 1's PUBLIC status read (TASK-438, block 968,222; HOLD LIFTED
 * block 968,269) — the one endpoint ReadingStage's island polls (every
 * 20 s) and re-fetches on the Watch click. The body is exactly
 * `{ ok, phase, room, jitsiDomain }`: the phase is reported truthfully
 * (closed AND prepared alike), but only a published, unexpired state
 * issues the room and the domain — preparing is private.
 *
 * Unlike /api/stage2 there is NO Jitsi reachability probe here: a viewer
 * needs no reachability answer, and the Watch click's own fresh fetch is
 * the re-check. The domain is read from `getSiteConfig().meeting` ONLY
 * for a published state — a closed stage never even touches site-config.
 * Every response is `Cache-Control: no-store`, and no clock is ever taken
 * from the request (`getStage1State()`'s own server-side default).
 *
 * Dependency failure fails CLOSED: a broken vault reads as a closed stage
 * (getStage1State's own fail-closed), never a 500, never a guessed-open
 * room.
 */

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

const CLOSED = { ok: true, phase: "closed", room: null, jitsiDomain: null } as const;

export async function GET(request: Request) {
  /* no clock, no input of any kind is ever taken from the request — the
     answer is the server's own fresh state read, always */
  void request;
  const state = await getStage1State();
  if (state.phase !== "published") {
    return jsonNoStore({ ok: true, phase: state.phase, room: null, jitsiDomain: null });
  }
  /* Defensive: getSiteConfig() is built never to throw (its own readStored
     swallows a vault failure to defaults), so this catch is belt-and-braces
     against a future regression — a published stage whose domain cannot be
     read fails CLOSED, never leaks the room without the domain that scopes
     it. */
  try {
    const { jitsiDomain } = (await getSiteConfig()).meeting;
    return jsonNoStore({ ok: true, phase: "published", room: state.room, jitsiDomain });
  } catch {
    return jsonNoStore(CLOSED);
  }
}
