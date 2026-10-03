import { NextResponse } from "next/server";
import { undoCancel } from "@/lib/subscriptions";
import { memberGate, memberView, subErrorResponse } from "@/lib/subscription-route";

export const dynamic = "force-dynamic";

/** Keep my membership: clear a scheduled cancel. */
export async function POST(request: Request) {
  const gate = await memberGate(request, { write: true, bucket: "undo", max: 3, windowSec: 3600 });
  if (gate instanceof NextResponse) return gate;
  try {
    return NextResponse.json({ ok: true, subscription: await memberView(await undoCancel(gate.subject)) });
  } catch (err) {
    return subErrorResponse(err);
  }
}
