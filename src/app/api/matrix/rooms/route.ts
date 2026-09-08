import { NextResponse } from "next/server";
import { frenFromRequest } from "@/lib/fren-auth";
import { tierForSubject } from "@/lib/member-tier";
import { ROOMS } from "@/lib/matrix-rooms";
import { roomsLive } from "@/lib/community-readiness";
import { tierSatisfies, TIERS } from "@/lib/entitlement";

export const dynamic = "force-dynamic";

/**
 * The rooms shelf feed (C4): every room with its door-state for THIS
 * visitor. Signed out → everything shows softly locked with the join door;
 * signed in → their tier opens what it opens. The server's invite-only rule
 * stays the real gate — this feed only paints what the gate will say.
 *
 * TASK-162 (0018.06.17 a₿ · block 966,080): each room also carries `live`
 * from the homeserver's own directory answers (community-readiness.ts's
 * roomsLive — one bounded batch of GETs, the same derivation the readiness
 * card reads). true = the room stands · false = the server SAYS it isn't
 * there (the shelf paints "opens soon") · null = the server won't say, and
 * the shelf paints nothing (derive-or-dash — never an invented marker).
 */
export async function GET(request: Request) {
  const fren = frenFromRequest(request);
  const [tier, live] = await Promise.all([
    fren ? tierForSubject(`${fren.handle}@${fren.space}`) : Promise.resolve(null),
    roomsLive(),
  ]);
  const liveBySlug = new Map(live.map((r) => [r.slug, r.live]));

  const rooms = ROOMS.map((r) => {
    const slug = r.id.slice(1, r.id.indexOf(":"));
    const open = r.minTier === "all" ? !!fren : !!tier && tierSatisfies(tier, r.minTier);
    return {
      slug,
      alias: r.id,
      title: r.title,
      kind: r.kind,
      minTier: r.minTier,
      neededName: r.minTier === "all" ? null : TIERS[r.minTier].name,
      open,
      live: liveBySlug.get(slug) ?? null,
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
