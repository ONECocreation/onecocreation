import { NextResponse } from "next/server";
import { AUTO_SLOTS, getAutoSlots, isLetterKey, setLetterAutoSlot, type LetterAutoSlot } from "@/lib/letters";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

/**
 * TASK-482 — the two automatic-send slots (the sign-up confirmation, the
 * 2 a.m. reading-day letter): which composed letter, if any, rides each
 * one. `reading-letters.ts` reads this same `letters:auto` doc directly
 * (its own slot wins over its hardcoded default when set); this route is
 * the `/a/letters/[key]` page's own read/write door onto it, gated
 * exactly like every other `/api/admin/letters/*` route.
 */

function gate(request: Request): NextResponse | null {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return null;
}

/** The whole slot map — the page derives its own row's state by checking
 *  whether ITS key is the value at either slot. */
export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const slots = await getAutoSlots();
  return NextResponse.json({ ok: true, slots });
}

/** Move `key` onto `slot` (or off every slot, `slot: null`) — a slot holds
 *  at most one letter, a letter holds at most one slot; choosing a slot
 *  here replaces whatever letter held it before. */
export async function PUT(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { key?: string; slot?: string | null } | null;
  if (!body?.key || !(await isLetterKey(body.key))) {
    return NextResponse.json({ ok: false, reason: "unknown letter" }, { status: 400 });
  }
  if (body.slot !== null && body.slot !== undefined && !(AUTO_SLOTS as readonly string[]).includes(body.slot)) {
    return NextResponse.json({ ok: false, reason: "unknown slot" }, { status: 400 });
  }
  await setLetterAutoSlot(body.key, (body.slot ?? null) as LetterAutoSlot | null);
  return NextResponse.json({ ok: true });
}
