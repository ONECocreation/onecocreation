import { NextResponse } from "next/server";
import { frenFromRequest } from "@/lib/fren-auth";
import { tierForSubject } from "@/lib/member-tier";
import { ROOMS } from "@/lib/matrix-rooms";
import { tierSatisfies, TIERS } from "@/lib/entitlement";

export const dynamic = "force-dynamic";

/**
 * The rooms shelf feed (C4): every room with its door-state for THIS
 * visitor. Signed out → everything shows softly locked with the join door;
 * signed in → their tier opens what it opens. The server's invite-only rule
 * stays the real gate — this feed only paints what the gate will say.
 */
export async function GET(request: Request) {
  const fren = frenFromRequest(request);
  const tier = fren ? await tierForSubject(`${fren.handle}@${fren.space}`) : null;

  const rooms = ROOMS.map((r) => {
    const open = r.minTier === "all" ? !!fren : !!tier && tierSatisfies(tier, r.minTier);
    return {
      slug: r.id.slice(1, r.id.indexOf(":")),
      alias: r.id,
      title: r.title,
      kind: r.kind,
      minTier: r.minTier,
      neededName: r.minTier === "all" ? null : TIERS[r.minTier].name,
      open,
    };
  });

  return NextResponse.json({
    ok: true,
    signedIn: !!fren,
    handle: fren?.handle ?? null,
    tier,
    tierName: tier ? TIERS[tier].name : null,
    rooms,
  });
}
