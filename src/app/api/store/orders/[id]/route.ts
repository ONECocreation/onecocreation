import { NextResponse } from "next/server";
import { getOrder, getItem, recordChargeEvent } from "@/lib/store";
import {
  sessionsFromRequest,
  makeMemberToken,
  joinSessionTokens,
  MEMBER_COOKIE,
  MAX_SESSIONS,
} from "@/lib/member-auth";
import { verifyOrderKey } from "@/lib/order-receipt";
import { isOperatorEmail } from "@/lib/operator-auth";
import { getAdapter } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * Order status — the order id IS the capability (unguessable 96-bit random).
 * In-flight states reconcile against the processor directly (the receipt
 * page's live feed — rewritten records can be CDN-stale, the processor
 * can't be). Reconcile flips through recordChargeEvent — the same commit
 * function the webhook uses. Same guarantee, two triggers.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let order: Awaited<ReturnType<typeof getOrder>>;
  try {
    order = await getOrder(id);
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: `order vault unreachable: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 503 }
    );
  }
  if (!order) return NextResponse.json({ ok: false, reason: "no such order" }, { status: 404 });

  /* TASK-173 (0018.06.17 a₿) — THE SIGNED KEY: the receipt letter and the
     Square return URL carry ?key=, an HMAC over order id + buyer email
     (order-receipt.ts). A valid key proves this browser is the buyer's, so
     this answer pours the SAME email session the sign-in code would — same
     cookie, same helper, no new auth path — and already reads unlocked.
     A wrong/missing key changes nothing: today's honest locked state.
     The key only ever unlocks THIS order's email session; nothing is logged
     here but the order id. */
  const key = new URL(request.url).searchParams.get("key") ?? "";
  const unlocked = key ? verifyOrderKey(order, key) : ({ ok: false } as const);
  let sessions = sessionsFromRequest(request);
  let setCookie: string | null = null;
  /* T-453 (SECURITY): only a LETTER key pours the session — the letter went
     INTO that inbox, so opening it proves the inbox. The processor's return
     key rode back to whatever browser paid, and the checkout never proves
     the typed email, so a return key unlocks THIS order's receipt and
     download (below) and never a session. And no order key ever pours an
     operator's email seat: that seat is earned only by the real sign-in
     code (/api/auth/email/*). */
  const poursSession = unlocked.ok && unlocked.purpose === "letter" && !isOperatorEmail(unlocked.email);
  if (poursSession && unlocked.ok && !sessions.some((s) => s.handle === unlocked.email && s.space === "email")) {
    const fresh = makeMemberToken(unlocked.email, "email");
    const prior = sessions
      .filter((s) => !(s.space === "email" && s.handle === unlocked.email))
      .map((s) => s.token);
    const tokens = [fresh, ...prior].slice(0, MAX_SESSIONS);
    setCookie = `${MEMBER_COOKIE}=${joinSessionTokens(tokens)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
    // this very answer already reads unlocked — the cookie lands after it
    sessions = [{ token: fresh, handle: unlocked.email, space: "email" }, ...sessions];
  }

  if (["charge_created", "processing"].includes(order.state) && order.chargeIds.length > 0) {
    const adapter = getAdapter(order.adapterId);
    if (adapter?.configured()) {
      try {
        const chargeId = order.chargeIds[order.chargeIds.length - 1];
        const state = await adapter.status(chargeId);
        if (state !== order.state && state !== "charge_created") {
          order = (await recordChargeEvent(order.id, { type: state, chargeId })) ?? order;
        }
      } catch {
        /* processor unreachable — serve the record of fact, honestly stale */
      }
    }
  }

  // downloadable? — a label + locked flag for the receipt page, NEVER the
  // path (THE LEAK RULE in store.ts: blobPath stays server-side; the
  // buyer's only door to the file is /api/store/download/[orderId]).
  // locked mirrors the download route's owner gate: a subject-bound order
  // opens only for the buying tag's own session — a shared receipt link
  // shows the receipt, never a live download affordance.
  /* T-453: a valid key (either purpose) opens THIS order's download when the
     order belongs to that very email — the same file the key's session used
     to open, now without a session. A key-member's order (subject =
     handle@space) still needs that tag's own session, as before. The href
     carries the key only when the key is what opened it. */
  const keyOwnsOrder = unlocked.ok && order.entitlementSubject === `${unlocked.email}@email`;
  let deliverable: { label: string; locked: boolean; href: string } | undefined;
  for (const li of order.lineItems) {
    const item = await getItem(li.itemId);
    const d = item?.media?.deliverable;
    if (d?.blobPath) {
      const sessionOwns = order.entitlementSubject
        ? sessions.some((s) => `${s.handle}@${s.space}` === order.entitlementSubject)
        : true;
      const locked = !(sessionOwns || keyOwnsOrder);
      const href = `/api/store/download/${order.id}${!sessionOwns && keyOwnsOrder ? `?key=${encodeURIComponent(key)}` : ""}`;
      deliverable = { label: d.label || li.title, locked, href };
      break;
    }
  }

  // the buyer's view — never the full record (no events log, no purge bookkeeping)
  return NextResponse.json(
    {
      ok: true,
      order: {
        id: order.id,
        state: order.state,
        lineItems: order.lineItems,
        priceSnapshot: order.priceSnapshot,
        entitlementSubject: order.entitlementSubject,
        createdAtMs: order.createdAtMs,
        settledAtMs: order.settledAtMs,
        deliverable,
      },
    },
    setCookie ? { headers: { "Set-Cookie": setCookie } } : undefined,
  );
}
