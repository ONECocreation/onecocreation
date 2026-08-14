import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { listOrders, markFulfilled } from "@/lib/store";
import { decideOfferWithLetters } from "@/lib/pwyc-letters";

export const dynamic = "force-dynamic";

/** The artist's order book — operator eyes only. PII purges on read schedule. */
export async function GET(request: Request) {
  const operator = operatorFromCookieHeader(request.headers.get("cookie"));
  if (!operator) return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  let orders: Awaited<ReturnType<typeof listOrders>>;
  try {
    orders = await listOrders();
  } catch (err) {
    // vault sick ≠ room dead: the shelf still renders; the book says why it can't
    return NextResponse.json({
      ok: false,
      reason: `order vault unreachable: ${err instanceof Error ? err.message : "unknown"}`,
      orders: [],
      needsAttention: [],
    });
  }
  return NextResponse.json({
    ok: true,
    orders,
    // the reconcile view's raw material: settled but not yet fulfilled
    needsAttention: orders.filter((o) => o.state === "settled").map((o) => o.id),
  });
}

/** Fulfillment flip — the artist saying "sent/granted". */
export async function POST(request: Request) {
  const operator = operatorFromCookieHeader(request.headers.get("cookie"));
  if (!operator) return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  let body: { id?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  }
  // Love's pay-what-you-can call — accept with love, or decline (refund owed).
  // The letters + refund mint live in ONE jug (pwyc-letters) so the email
  // doors and this desk can never drift apart (Admiral, 0018.05.23).
  if ((body.action === "pwyc-accept" || body.action === "pwyc-decline") && body.id) {
    const decided = await decideOfferWithLetters(
      body.id,
      body.action === "pwyc-accept" ? "accept" : "decline",
      "desk",
    );
    if (!decided) return NextResponse.json({ ok: false, reason: "no pending offer on that order" }, { status: 404 });
    return NextResponse.json({ ok: true, order: decided.order, refundLink: decided.refundLink });
  }
  if (body.action !== "fulfill" || !body.id) {
    return NextResponse.json({ ok: false, reason: "unknown action" }, { status: 400 });
  }
  const order = await markFulfilled(body.id);
  if (!order) return NextResponse.json({ ok: false, reason: "no such order" }, { status: 404 });
  return NextResponse.json({ ok: true, order });
}
