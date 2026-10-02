import { NextResponse } from "next/server";
import { isTier } from "@/lib/entitlement";
import { upgrade, publicView } from "@/lib/subscriptions";
import { memberGate, readBody, subErrorResponse } from "@/lib/subscription-route";

export const dynamic = "force-dynamic";

/** Upgrade: the price difference now, the higher tier at once, the new price from the next billing. Body is the target tier key only. */
export async function POST(request: Request) {
  const gate = await memberGate(request, { write: true, bucket: "upgrade", max: 3, windowSec: 3600 });
  if (gate instanceof NextResponse) return gate;
  const body = await readBody(request);
  if (!isTier(body.tier)) return NextResponse.json({ ok: false, reason: "pick a membership" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, subscription: publicView(await upgrade(gate.subject, body.tier)) });
  } catch (err) {
    return subErrorResponse(err);
  }
}
