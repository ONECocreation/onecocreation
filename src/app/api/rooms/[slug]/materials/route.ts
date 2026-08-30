import { NextResponse } from "next/server";
import { frenFromRequest } from "@/lib/fren-auth";
import { tierForSubject } from "@/lib/member-tier";
import { ROOMS } from "@/lib/matrix-rooms";
import { tierSatisfies } from "@/lib/entitlement";
import { listMaterials, materialsConfigured } from "@/lib/class-materials";

export const dynamic = "force-dynamic";

/**
 * The member's tier-gated read on one room's materials shelf — same gate
 * shape as /api/matrix/rooms (fren session → tier → tierSatisfies), the
 * gate this brief asked for. Signed out or under-tier both read as "no
 * shelf" (an empty list + `open: false`), never a 403 that would confirm
 * a room exists to someone who can't see it — matching /api/matrix/rooms'
 * own soft-lock shape.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = ROOMS.find((r) => r.id.slice(1, r.id.indexOf(":")) === slug);
  if (!room) return NextResponse.json({ ok: false, reason: "unknown room" }, { status: 404 });

  const fren = frenFromRequest(request);
  const tier = fren ? await tierForSubject(`${fren.handle}@${fren.space}`) : null;
  const open = room.minTier === "all" ? !!fren : !!tier && tierSatisfies(tier, room.minTier);

  if (!open) {
    return NextResponse.json({ ok: true, open: false, items: [] });
  }
  if (!materialsConfigured()) {
    return NextResponse.json({ ok: false, reason: "materials vault not configured" }, { status: 503 });
  }
  const items = await listMaterials(slug);
  return NextResponse.json({ ok: true, open: true, items });
}
