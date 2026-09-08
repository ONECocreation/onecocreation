import { NextResponse } from "next/server";
import { squareAdapter, squareOrderMetadata, ensureSquareVault, squareWebhookSignatureOk } from "@/lib/payments";
import { recordChargeEvent } from "@/lib/store";
import { settleBookingFromOrder } from "@/lib/booking-fulfil";
import { settleEntitlementFromOrder } from "@/lib/entitlement-fulfil";
import { settleGiftsFromOrder } from "@/lib/gift-vouchers";

export const dynamic = "force-dynamic";

/**
 * The Square webhook (mirrors webhook/btcpay/route.ts's shape). RAW body
 * first — the HMAC is over the raw bytes, so no framework JSON parsing may
 * touch the request before verification. An unverifiable POST gets a
 * 200-shaped nothing (no oracle for forgers); a verified event flips the
 * order through the ONE sanctioned commit function.
 *
 * Unlike BTCPay (whose invoice metadata carries our orderId directly in
 * the webhook body), Square's payment.updated events don't embed the
 * order's metadata inline — so after verifying, this route re-reads the
 * order (squareOrderMetadata()) to recover `metadata.orderId`, the value
 * createCharge() stamped on the Square order at checkout time. One extra
 * API read per event; simple and always-correct beats parsing two
 * different Square payload shapes for the same fact.
 *
 * TASK-167 (0018.06.17 a₿, additive) — THE DESK'S PROOF MARKERS: the Money
 * desk's checklist can only call the webhook key/URL "verified" once Square
 * itself has knocked. A verified event stamps `square:webhook:last-verified`
 * {at, eventType}; a signed POST whose signature does NOT match stamps
 * `square:webhook:last-rejected` {at, reason} — and ONLY that case (a
 * verified-but-unactionable event like order.updated OPEN must never read
 * as a rejection, hence squareWebhookSignatureOk's three-way answer).
 * Marker writes are best-effort: a vault hiccup never costs Square its 200.
 */

const KV_VERIFIED = "square:webhook:last-verified";
const KV_REJECTED = "square:webhook:last-rejected";

/** The desk reads these verbatim — the exact fix-it sentence lives here. */
export const SQUARE_WEBHOOK_REJECT_REASON =
  "signature did not match: check SQUARE_WEBHOOK_URL character for character";

async function writeMarker(key: string, value: unknown): Promise<void> {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return; // no vault → no marker, never an error at Square
    await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["SET", key, JSON.stringify(value)]),
      cache: "no-store",
    });
  } catch {
    /* best-effort — the event's 200 is already decided */
  }
}

export async function POST(request: Request) {
  await ensureSquareVault(); // cold instance: vault keys before verifying
  const rawBody = await request.text();
  const event = await squareAdapter.verifyWebhook(rawBody, request.headers);
  if (!event) {
    // a signed knock whose signature fails verification is the ONE case the
    // desk shows in red — unsigned/missing-config POSTs and verified-but-
    // unactionable events leave no mark
    if ((await squareWebhookSignatureOk(rawBody, request.headers)) === false) {
      await writeMarker(KV_REJECTED, { at: new Date().toISOString(), reason: SQUARE_WEBHOOK_REJECT_REASON });
    }
    return NextResponse.json({ ok: true });
  }

  let eventType: string = event.type; // our own mapped word, if the payload won't re-parse
  try {
    const payload = JSON.parse(rawBody) as { type?: string };
    if (typeof payload.type === "string" && payload.type) eventType = payload.type;
  } catch {
    /* keep the mapped word */
  }
  await writeMarker(KV_VERIFIED, { at: new Date().toISOString(), eventType });

  const metadata = await squareOrderMetadata(event.chargeId);
  const orderId = metadata?.orderId;
  if (orderId) {
    const order = await recordChargeEvent(orderId, event);
    // no bookingId guard — cart orders (v1.5) carry bookings per LINE, and
    // the settle helper returns fast when an order has none at all
    if (order) await settleBookingFromOrder(order);
    if (order) await settleEntitlementFromOrder(order);
    if (order) await settleGiftsFromOrder(order).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
