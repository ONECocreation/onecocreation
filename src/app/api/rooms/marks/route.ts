import { NextResponse } from "next/server";
import { readConfig } from "@/lib/booking";

export const dynamic = "force-dynamic";

/**
 * PUBLIC-SAFE calendar marks for the Classroom Four's Circle vantage
 * (loves-desk-and-classroom-plan.md, Lane ROOM): day-level blackout /
 * retreat marks ONLY, told apart the same way Love's Desk's own
 * `desk/marks.ts` does — a retreat's days ride as ordinary `DateOverride`s
 * whose `note` starts with "Retreat" (booking-time.ts's own doc header).
 *
 * This NEVER returns a booking, a customer name, or anything else out of
 * `readConfig()`'s bookings/vault half — overrides are operational
 * scheduling data (when the door is dark), not PII, so — like `/api/live`
 * — this route carries no auth gate: day-level marks only, no client
 * names ever.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const startParam = url.searchParams.get("start");
  const start = startParam ? Date.parse(startParam) : Date.now();
  const daysParam = Number(url.searchParams.get("days"));
  const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 42) : 28;
  const end = start + days * 24 * 3600 * 1000;

  const { overrides } = await readConfig();
  const inWindow = overrides.filter((o) => {
    const t = Date.parse(o.date);
    return Number.isFinite(t) && t >= start - 24 * 3600 * 1000 && t <= end;
  });

  return NextResponse.json(
    {
      ok: true,
      overrides: inWindow.map((o) => ({
        date: o.date,
        kind: o.kind,
        isRetreat: !!o.note?.toLowerCase().startsWith("retreat"),
      })),
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
  );
}
