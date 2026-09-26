import { NextResponse } from "next/server";
import { AUTO_SLOT_BUILTIN, AUTO_SLOTS, isComposedLetterKey, isLetterKey, setAutoSlotRaw, type LetterAutoSlot } from "@/lib/letters";
import { effectiveAutoSlot } from "@/lib/reading-letters";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

/**
 * TASK-482 — the two automatic-send slots (the sign-up confirmation, the
 * 2 a.m. reading-day letter): which composed letter, if any, rides each
 * one. `reading-letters.ts`'s `effectiveAutoSlot()` is the ONE place both
 * the send path and this route resolve a slot's three-way state (a
 * composed letter, the literal "builtin", or the hardcoded default) —
 * this route never re-derives it. Gated exactly like every other
 * `/api/admin/letters/*` route.
 */

function gate(request: Request): NextResponse | null {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return null;
}

/** The EFFECTIVE key per slot (review BLOCKER: the hardcoded default
 *  applied when no slot has ever been set) — the page derives its own
 *  row's state from THIS, not the raw store, so `weekly-reading-with-love`
 *  shows "Sent when someone signs up…" even though no slot was ever
 *  explicitly written for it. */
export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const slots: Partial<Record<LetterAutoSlot, string>> = {};
  for (const slot of AUTO_SLOTS) slots[slot] = await effectiveAutoSlot(slot);
  return NextResponse.json({ ok: true, slots });
}

/** Move `key` onto `slot` ("" turns it off for `key`) — only a composed
 *  letter may ride a slot (review BLOCKER: a seeded letter's
 *  `{{placeholders}}` would go out raw to every sign-up). Every OTHER
 *  slot `key` effectively holds today (its own hardcoded default
 *  counts) is written the literal "builtin", never left absent — an
 *  absent slot would just silently fall back to `key` again (the
 *  review's second BLOCKER: "Not automatic" on the default letter did
 *  nothing, because clearing to absent re-adopted the same default). */
export async function PUT(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { key?: string; slot?: string } | null;
  if (!body?.key || !(await isLetterKey(body.key))) {
    return NextResponse.json({ ok: false, reason: "unknown letter" }, { status: 400 });
  }
  const wantSlot: LetterAutoSlot | null = body.slot ? (body.slot as LetterAutoSlot) : null;
  if (wantSlot !== null && !(AUTO_SLOTS as readonly string[]).includes(wantSlot)) {
    return NextResponse.json({ ok: false, reason: "unknown slot" }, { status: 400 });
  }
  if (wantSlot !== null && !(await isComposedLetterKey(body.key))) {
    return NextResponse.json(
      { ok: false, reason: "only a letter Love composes can ride an automatic send" },
      { status: 400 },
    );
  }
  for (const slot of AUTO_SLOTS) {
    if (slot === wantSlot) continue;
    if ((await effectiveAutoSlot(slot)) === body.key) {
      await setAutoSlotRaw(slot, AUTO_SLOT_BUILTIN);
    }
  }
  if (wantSlot !== null) await setAutoSlotRaw(wantSlot, body.key);
  return NextResponse.json({ ok: true });
}
