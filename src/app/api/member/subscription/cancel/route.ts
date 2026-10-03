import { NextResponse } from "next/server";
import { cancel } from "@/lib/subscriptions";
import { memberGate, memberView, subErrorResponse } from "@/lib/subscription-route";

export const dynamic = "force-dynamic";

/** Cancel at the end of the paid period. The subscription is OUR record for the session's member; the request names nothing. */
export async function POST(request: Request) {
  const gate = await memberGate(request, { write: true, bucket: "cancel", max: 3, windowSec: 3600 });
  if (gate instanceof NextResponse) return gate;
  try {
    return NextResponse.json({ ok: true, subscription: await memberView(await cancel(gate.subject)) });
  } catch (err) {
    return subErrorResponse(err);
  }
}
