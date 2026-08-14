import { NextResponse } from "next/server";
import { readConfig, slotsFor } from "@/lib/booking";
import { takenSlots, slotField } from "@/lib/booking-orders";
import { busyFeed, subtractBusy } from "@/lib/ical-busy";

export const dynamic = "force-dynamic";

/**
 * Public slot list (spec: docs/booking-flow.md, step 2 — route gate matrix:
 * "slot list: public"). A visitor has to see what's free before they have any
 * identity, so this is open by design.
 *
 * It answers in UTC and names the artist's zone; it never formats for a
 * human. Rendering in the visitor's zone — and showing the artist's zone
 * beside it, per the timezone law — is the surface's job.
 *
 * Held and confirmed slots are subtracted here (step 3). A hold that has
 * expired is not subtracted — its time goes back on the board automatically,
 * which is the whole point of giving holds a TTL.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("service");
  if (!serviceId) return NextResponse.json({ ok: false, reason: "service required" }, { status: 400 });

  const { services, rules, overrides, icalUrl } = await readConfig();
  const service = services.find((s) => s.id === serviceId);
  if (!service || service.status !== "live") {
    return NextResponse.json({ ok: false, reason: "no such service" }, { status: 404 });
  }

  const daysParam = Number(searchParams.get("days"));
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, service.maxAdvanceDays) : undefined;

  const offered = slotsFor(service, rules, overrides, { days });
  const taken = await takenSlots();
  // the artist's own external calendar blocks time too (iCal busy sync)
  const busy = await busyFeed(icalUrl);
  const slots = subtractBusy(
    offered.filter((s) => !taken.has(slotField(service.id, s.startUtc))),
    busy.windows,
  );

  return NextResponse.json({
    ok: true,
    service: {
      id: service.id,
      title: service.title,
      blurb: service.blurb,
      durationMin: service.durationMin,
      price: service.price,
      pricingMode: service.pricingMode,
      artistTz: service.artistTz,
    },
    slots,
  });
}
