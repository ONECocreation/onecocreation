import { NextResponse } from "next/server";
import { getVoucher, markRedeemed } from "@/lib/gift-vouchers";
import { getService, readConfig, slotsFor } from "@/lib/booking";
import { busyFeed, subtractBusy } from "@/lib/ical-busy";
import { claimSlot, releaseSlot, createBooking, type BookingRecord } from "@/lib/booking-orders";
import { getOrder } from "@/lib/store";
import { siteBase } from "@/lib/subscribers";

export const dynamic = "force-dynamic";

/**
 * Redeem a gift voucher (Admiral, 0018.05.17): the RECIPIENT picks their
 * time from Love's live calendar — same rules, same busy-sync, same atomic
 * claim as a paid booking. The gift already paid; redeeming books it,
 * exactly once.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    voucherId?: string;
    startUtc?: string;
    customer?: { name?: string; email?: string; note?: string; city?: string; state?: string; zip?: string };
  };
  if (!body.voucherId || !body.startUtc) {
    return NextResponse.json({ ok: false, reason: "voucher and time required" }, { status: 400 });
  }

  const voucher = await getVoucher(body.voucherId);
  if (!voucher) return NextResponse.json({ ok: false, reason: "that gift isn't on the books" }, { status: 404 });
  if (voucher.redeemedAtMs) {
    return NextResponse.json({ ok: false, reason: "this gift is already booked — check your email for the receipt" }, { status: 409 });
  }
  const order = await getOrder(voucher.orderId);
  if (!order || !["settled", "fulfilled"].includes(order.state)) {
    return NextResponse.json({ ok: false, reason: "the gift's payment hasn't settled yet — try again shortly" }, { status: 409 });
  }

  const service = await getService(voucher.serviceId);
  if (!service || service.status !== "live") {
    return NextResponse.json({ ok: false, reason: "that session isn't offered right now — write to Love" }, { status: 409 });
  }

  // the time must be one Love actually offers, busy-sync included
  const { rules, overrides, icalUrl } = await readConfig();
  const busy = await busyFeed(icalUrl);
  const slot = subtractBusy(slotsFor(service, rules, overrides), busy.windows)
    .find((s) => s.startUtc === body.startUtc);
  if (!slot) return NextResponse.json({ ok: false, reason: "that time isn't open — pick another" }, { status: 409 });

  if (service.meetingRail.kind === "inPerson" && !(body.customer?.city && body.customer.state && body.customer.zip)) {
    return NextResponse.json({ ok: false, reason: "city, state and zip tell the studio where to drive" }, { status: 400 });
  }

  // claim the slot, then the voucher — losing either unwinds cleanly.
  // Deterministic id: order prefix + line index — unique per voucher even
  // when one order carries several gifts.
  const lineIdx = voucher.id.slice(voucher.id.lastIndexOf("-") + 1);
  const bookingId = `${voucher.orderId.slice(0, 22)}${Number(lineIdx || 0).toString(16).padStart(2, "0")}`;
  const claimed = await claimSlot(service.id, slot.startUtc, {
    state: "confirmed",
    bookingId,
  });
  if (!claimed) {
    return NextResponse.json({ ok: false, reason: "someone just took that time — pick another" }, { status: 409 });
  }
  if (!(await markRedeemed(voucher.id, bookingId))) {
    await releaseSlot(service.id, slot.startUtc);
    return NextResponse.json({ ok: false, reason: "this gift is already booked — check your email for the receipt" }, { status: 409 });
  }

  const rail = service.meetingRail;
  const meetingUrl =
    rail.kind === "static" ? rail.url
    : rail.kind === "jitsi" ? `${siteBase()}/meet/${bookingId}`
    : undefined;

  const booking: BookingRecord = {
    id: bookingId,
    schemaVersion: 1,
    serviceId: service.id,
    serviceTitle: service.title,
    startUtc: slot.startUtc,
    endUtc: slot.endUtc,
    artistTz: service.artistTz,
    state: "confirmed",
    orderId: voucher.orderId,
    customer: {
      name: body.customer?.name?.trim() || undefined,
      email: body.customer?.email?.trim() || (/@.+\./.test(voucher.to) ? voucher.to : undefined),
      note: body.customer?.note?.trim() || undefined,
      city: body.customer?.city?.trim() || undefined,
      state: body.customer?.state?.trim() || undefined,
      zip: body.customer?.zip?.trim() || undefined,
    },
    meetingUrl,
    createdAtMs: Date.now(),
    confirmedAtMs: Date.now(),
  };
  await createBooking(booking);

  // the confirmation letter + calendar file ride the usual rail
  try {
    const { sendBookingConfirmation } = await import("@/lib/mail-booking");
    await sendBookingConfirmation(order, booking, service);
  } catch { /* the booking stands; the letter can be resent */ }

  return NextResponse.json({ ok: true, bookingId, receiptUrl: `/book/receipt/${bookingId}` });
}
