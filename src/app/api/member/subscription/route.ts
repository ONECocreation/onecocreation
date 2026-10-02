import { NextResponse } from "next/server";
import { isTier } from "@/lib/entitlement";
import { isVariant, mySubscription, publicView, subscribe } from "@/lib/subscriptions";
import { memberGate, readBody, requestIdempotency, subErrorResponse } from "@/lib/subscription-route";

export const dynamic = "force-dynamic";

/** My subscription state. Feature OFF = 404. Session only; nothing in the URL names a member. */
export async function GET(request: Request) {
  const gate = await memberGate(request, { write: false, bucket: "get", max: 60, windowSec: 600 });
  if (gate instanceof NextResponse) return gate;
  try {
    return NextResponse.json({ ok: true, subscription: publicView(await mySubscription(gate.subject)) });
  } catch (err) {
    return subErrorResponse(err);
  }
}

/**
 * Subscribe. The body names a tier and a variant KEY and carries the
 * one-time card token from Square's Web Payments SDK; the plan variation id
 * and the price are looked up server-side, and who is subscribing is the
 * session. Every other field (price, planId, subject, redirectUrl...) is
 * ignored.
 */
export async function POST(request: Request) {
  const gate = await memberGate(request, { write: true, bucket: "subscribe", max: 5, windowSec: 600 });
  if (gate instanceof NextResponse) return gate;
  const body = await readBody(request);
  if (!isTier(body.tier)) return NextResponse.json({ ok: false, reason: "pick a membership" }, { status: 400 });
  const variant = body.variant === undefined ? "standard" : body.variant;
  if (!isVariant(variant)) return NextResponse.json({ ok: false, reason: "unknown offer" }, { status: 400 });
  if (typeof body.cardToken !== "string" || !body.cardToken) return NextResponse.json({ ok: false, reason: "card token missing" }, { status: 400 });
  try {
    const rec = await subscribe(gate.subject, body.tier, variant, body.cardToken, requestIdempotency(gate.subject, body.tier, variant, body.cardToken), {
      email: typeof body.email === "string" ? body.email : undefined,
      verificationToken: typeof body.verificationToken === "string" ? body.verificationToken : undefined,
    });
    return NextResponse.json({ ok: true, subscription: publicView(rec) });
  } catch (err) {
    return subErrorResponse(err);
  }
}
