import { frenFromRequest } from "@/lib/fren-auth";
import { getEntry } from "@/lib/registry";
import { getEntitlement, TIERS, entitlementsConfigured } from "@/lib/entitlement";
import { roomsForTier, matrixConfigured } from "@/lib/matrix";

export const dynamic = "force-dynamic";

/**
 * WHO IS AT THE DOOR — the same shape as /api/artist/entitlement, which is
 * the house's LEVEL-LOCKED precedent. THIS is the gate; the packages page
 * asking it is a courtesy.
 *
 * Three honest answers: 401 (no session), tier: null (signed in, nothing
 * paid), or the tier with the rooms it opens. It never explains away a locked
 * door — it says plainly that nothing is held.
 */
export async function GET(request: Request) {
  const fren = frenFromRequest(request);
  if (!fren) {
    return Response.json(
      { ok: false, reason: "sign in with your tag first" },
      { status: 401 },
    );
  }

  if (!entitlementsConfigured()) {
    return Response.json(
      { ok: false, reason: "memberships are not configured on this deployment" },
      { status: 503 },
    );
  }

  const entry = await getEntry(fren.handle, fren.space);
  const held = entry?.npub ? await getEntitlement(entry.npub) : null;

  return Response.json({
    ok: true,
    handle: fren.handle,
    space: fren.space,
    tier: held?.tier ?? null,
    package: held ? TIERS[held.tier].name : null,
    mxid: held?.mxid ?? null,
    /** the rooms this tier opens — titles only; ids are not public */
    rooms: held ? roomsForTier(held.tier).map((r) => ({ title: r.title, kind: r.kind })) : [],
    /** honest about the rail, so the page never promises rooms that can't open */
    matrixReady: matrixConfigured(),
  });
}
