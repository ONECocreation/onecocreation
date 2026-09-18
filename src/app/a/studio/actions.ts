"use server";

/**
 * The studio room's ONE write rail (TASK-191, 0018.06.18 a₿ · block
 * 966119) — the desk saves the whole stage doc at once (show title, host,
 * guest roster, picked scene). Same gate every /a surface keeps: no
 * operator cookie, no write. Validation lives in the store's sanitize —
 * this action only gates and reports honestly.
 */

import { headers } from "next/headers";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { saveStudioDoc, type StudioDoc } from "@/lib/studio/roster";
import { mintJitsiRoom, setJitsiDoor } from "@/lib/studio/jitsi-door";

export type StudioSave = { ok: true; doc: StudioDoc } | { ok: false; reason: string };

export async function saveStudio(raw: unknown): Promise<StudioSave> {
  const operator = operatorFromCookieHeader((await headers()).get("cookie"));
  if (!operator) return { ok: false, reason: "operator session required — sign in at the door" };
  try {
    return { ok: true, doc: await saveStudioDoc(raw) };
  } catch (e) {
    return { ok: false, reason: `the stage doc would not take the write — ${e instanceof Error ? e.message : "error"}` };
  }
}

/** TASK-337: the Jitsi one-time door's own mint — same gate as saveStudio
 *  above (no operator cookie, no mint). Additive only. */
export type JitsiDoorMint = { ok: true; room: string } | { ok: false; reason: string };

export async function mintJitsiDoor(): Promise<JitsiDoorMint> {
  const operator = operatorFromCookieHeader((await headers()).get("cookie"));
  if (!operator) return { ok: false, reason: "operator session required — sign in at the door" };
  try {
    const room = mintJitsiRoom();
    await setJitsiDoor(room);
    return { ok: true, room };
  } catch (e) {
    return { ok: false, reason: `the room name would not take the write — ${e instanceof Error ? e.message : "error"}` };
  }
}
