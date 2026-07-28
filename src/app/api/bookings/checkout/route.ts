import { NextResponse } from "next/server";
import { getService, slotsFor, readConfig } from "@/lib/booking";
import {
  claimSlot,
  createBooking,
  newBookingId,
  releaseSlot,
  bookingsConfigured,
  type BookingRecord,
} from "@/lib/booking-orders";
import { createOrder, attachCharge, newOrderId, ordersConfigured, type OrderRecord, type PriceSnapshot } from "@/lib/store";
import { liveAdapter } from "@/lib/payments";
import { frenFromRequest } from "@/lib/fren-auth";

export const dynamic = "force-dynamic";

/**
 * Book a slot (spec: docs/booking-flow.md, step 3).
 *
 * Order of operations matters and is deliberate:
 *   1. validate the slot against the artist's OWN rules — never trust a
 *      client-supplied time; a forged startUtc would otherwise book 3am
 *   2. CLAIM it (atomic) — before any money exists, so two buyers can't
 *      both reach checkout for the same 10:00
 *   3. create the booking + order records
 *   4. mint the charge
 * If step 4 throws, the hold is released — a payment rail hiccup must not
 * silently eat a slot.
 *
 * The hold TTL is rail-shaped (spec §2): lightning settles in seconds and
 * takes the short window; an on-chain payer needs the long one because their
 * transaction genuinely sits in `processing` for 10–60+ minutes.
 */

const HOLD_MS = { lightning: 15 * 60_000, onchain: 90 * 60_000 } as const;

export async function POST(request: Request) {
  const adapter = liveAdapter();
  if (!adapter) {
    return NextResponse.json(
      { ok: false, reason: "payment rail not connected — times are browse-only" },
      { status: 503 },
    );
  }
  if (!ordersConfigured() || !bookingsConfigured()) {
    return NextResponse.json({ ok: false, reason: "booking store not configured" }, { status: 503 });
  }

  let body: {
    serviceId?: string;
    startUtc?: string;
    rail?: "lightning" | "onchain";
    amountSats?: number; // pwyc only — the customer names it
    customer?: { name?: string; email?: string; note?: string };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  }

  const service = body.serviceId ? await getService(body.serviceId) : null;
  if (!service || service.status !== "live") {
    return NextResponse.json({ ok: false, reason: "no such session" }, { status: 404 });
  }

  // ── 1. the slot must be one the artist actually offers ──────────────────
  // Recomputing from the rules is the gate. A client could otherwise post any
  // instant it liked — 3am, a blocked day, a slot outside the lead window.
  const { rules, overrides } = await readConfig();
  const offered = slotsFor(service, rules, overrides);
  const slot = offered.find((s) => s.startUtc === body.startUtc);
  if (!slot) {
    return NextResponse.json({ ok: false, reason: "that time isn't open" }, { status: 409 });
  }

  // ── the price ───────────────────────────────────────────────────────────
  let snapshot: PriceSnapshot;
  if (service.pricingMode === "pwyc") {
    const sats = Number(body.amountSats);
    if (!Number.isInteger(sats) || sats <= 0) {
      return NextResponse.json({ ok: false, reason: "name an amount in sats" }, { status: 400 });
    }
    snapshot = { amount: sats, currency: "SATS", at: new Date().toISOString() };
  } else if (service.price.sats != null) {
    snapshot = { amount: service.price.sats, currency: "SATS", at: new Date().toISOString() };
  } else if (service.price.fiat) {
    snapshot = {
      amount: service.price.fiat.amount,
      currency: service.price.fiat.currency,
      at: new Date().toISOString(),
    };
  } else {
    return NextResponse.json({ ok: false, reason: "this session has no price set" }, { status: 409 });
  }

  // ── 2. claim it BEFORE any money exists ────────────────────────────────
  const bookingId = newBookingId();
  const rail = body.rail === "lightning" ? "lightning" : "onchain";
  const claimed = await claimSlot(service.id, slot.startUtc, {
    state: "held",
    bookingId,
    untilMs: Date.now() + HOLD_MS[rail],
  });
  if (!claimed) {
    return NextResponse.json(
      { ok: false, reason: "someone just took that time — pick another" },
      { status: 409 },
    );
  }

  // From here on, any failure must give the slot back.
  try {
    const fren = frenFromRequest(request);
    const orderId = newOrderId();

    const booking: BookingRecord = {
      id: bookingId,
      schemaVersion: 1,
      serviceId: service.id,
      serviceTitle: service.title,
      startUtc: slot.startUtc,
      endUtc: slot.endUtc,
      artistTz: service.artistTz,
      state: "held",
      orderId,
      customer: {
        name: body.customer?.name?.trim() || undefined,
        email: body.customer?.email?.trim() || undefined,
        note: body.customer?.note?.trim() || undefined,
        npub: fren ? `${fren.handle}@${fren.space}` : undefined,
      },
      createdAtMs: Date.now(),
    };
    await createBooking(booking);

    const order: OrderRecord = {
      id: orderId,
      schemaVersion: 2,
      state: "created",
      lineItems: [{ itemId: service.id, title: service.title, qty: 1 }],
      priceSnapshot: snapshot,
      adapterId: adapter.id,
      chargeIds: [],
      bookingId,
      contact: booking.customer.email ? { email: booking.customer.email } : undefined,
      createdAtMs: Date.now(),
      events: [],
    };
    await createOrder(order);

    const origin = new URL(request.url).origin;
    const charge = await adapter.createCharge(
      {
        orderId,
        amount: snapshot.amount,
        currency: snapshot.currency,
        buyerEmail: booking.customer.email,
        redirectUrl: `${origin}/book/receipt/${bookingId}`,
      },
      `${orderId}:0`,
    );
    await attachCharge(orderId, charge.chargeId);

    return NextResponse.json({
      ok: true,
      bookingId,
      orderId,
      payUrl: charge.payUrl,
      extras: charge.extras,
      holdExpiresAtMs: Date.now() + HOLD_MS[rail],
      /** the honest wait, so the surface can say it before they pay */
      processingNote:
        rail === "onchain"
          ? "paying on-chain holds this time for 90 minutes while the transaction confirms"
          : "lightning settles in seconds",
    });
  } catch (err) {
    // a rail hiccup must never silently eat a slot
    await releaseSlot(service.id, slot.startUtc);
    return NextResponse.json(
      { ok: false, reason: err instanceof Error ? err.message : "could not start checkout" },
      { status: 502 },
    );
  }
}
