import { NextResponse } from "next/server";
import { getBooking, moveBooking, releaseBookingForOrder } from "@/lib/booking-orders";
import { getService, readConfig, slotsFor } from "@/lib/booking";
import { busyFeed, subtractBusy } from "@/lib/ical-busy";
import { getOrder, attachCharge } from "@/lib/store";
import { voucherForBooking, reopenVoucher } from "@/lib/gift-vouchers";
import { btcpayRefundLink } from "@/lib/payments";
import { enqueue } from "@/lib/mail-queue";
import { brandShell } from "@/lib/mail";
import { siteBase } from "@/lib/subscribers";

export const dynamic = "force-dynamic";

/**
 * SELF-SERVE RESCHEDULE & CANCEL (Admiral, 0018.05.17): the booking id is
 * the capability, same law as the receipt. The house rule until Love says
 * otherwise: changes close 24 HOURS before the session — inside that window
 * it's a note to Love, not a button.
 *
 * Cancel is kind three ways: a GIFT booking reopens its voucher (the gift
 * is never lost); a PAID booking on a settled order mints a refund claim
 * link; anything else simply releases the time.
 */
const CUTOFF_MS = 24 * 3600 * 1000;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as {
    action?: "reschedule" | "cancel";
    startUtc?: string;
  };

  const booking = await getBooking(id);
  if (!booking) return NextResponse.json({ ok: false, reason: "no such booking" }, { status: 404 });
  if (!["confirmed", "held"].includes(booking.state)) {
    return NextResponse.json({ ok: false, reason: "this booking isn't active" }, { status: 409 });
  }
  if (Date.parse(booking.startUtc) - Date.now() < CUTOFF_MS) {
    return NextResponse.json(
      { ok: false, reason: "changes close 24 hours before your session — write to Love and she'll make it right" },
      { status: 409 },
    );
  }

  const email = booking.customer.email;

  if (body.action === "reschedule") {
    if (!body.startUtc) return NextResponse.json({ ok: false, reason: "pick a time" }, { status: 400 });
    const service = await getService(booking.serviceId);
    if (!service || service.status !== "live") {
      return NextResponse.json({ ok: false, reason: "this session isn't offered right now" }, { status: 409 });
    }
    const { rules, overrides, icalUrl } = await readConfig();
    const busy = await busyFeed(icalUrl);
    const slot = subtractBusy(slotsFor(service, rules, overrides), busy.windows)
      .find((s) => s.startUtc === body.startUtc);
    if (!slot) return NextResponse.json({ ok: false, reason: "that time isn't open — pick another" }, { status: 409 });

    const moved = await moveBooking(id, slot);
    if (!moved.ok) return NextResponse.json(moved, { status: 409 });

    if (email) {
      const when = new Intl.DateTimeFormat("en-US", {
        timeZone: booking.artistTz, weekday: "long", month: "long", day: "numeric",
        hour: "numeric", minute: "2-digit", timeZoneName: "short",
      }).format(new Date(slot.startUtc));
      try {
        await enqueue([{
          to: email,
          subject: `Your time moved — ${booking.serviceTitle}`,
          html: brandShell(
            `<p>All set — your session found its new moment:</p>
             <p style="font-size:1.1em"><b>${booking.serviceTitle}</b><br/>${when}</p>
             <p style="text-align:center;margin:24px 0;">
               <a href="${siteBase()}/book/receipt/${id}" style="background:#b4862b;color:#fff;padding:12px 26px;border-radius:999px;text-decoration:none;">My receipt &amp; calendar file</a>
             </p>`,
          ),
        }]);
      } catch { /* the move stands */ }
    }
    return NextResponse.json({ ok: true, moved: true, startUtc: slot.startUtc });
  }

  if (body.action === "cancel") {
    const order = await getOrder(booking.orderId);
    const voucher = order ? await voucherForBooking(order, id) : null;

    await releaseBookingForOrder(id, "canceled");

    // a gifted session: the voucher reopens — the gift is never lost
    if (voucher) {
      await reopenVoucher(voucher.id);
      const giftUrl = `${siteBase()}/gift/${voucher.id}`;
      const to = email ?? (/@.+\./.test(voucher.to) ? voucher.to : null);
      if (to) {
        try {
          await enqueue([{
            to,
            subject: `Your gift is open again — ${booking.serviceTitle}`,
            html: brandShell(
              `<p>Your session is canceled, and your gift is safe — choose a new time whenever you're ready:</p>
               <p style="text-align:center;margin:24px 0;">
                 <a href="${giftUrl}" style="background:#b4862b;color:#fff;padding:12px 26px;border-radius:999px;text-decoration:none;">Choose a new time</a>
               </p>`,
            ),
          }]);
        } catch { /* the reopen stands */ }
      }
      return NextResponse.json({ ok: true, canceled: true, giftReopened: true, giftUrl });
    }

    // a paid, settled booking: mint the refund claim
    let refundLink: string | null = null;
    if (order && ["settled", "fulfilled"].includes(order.state)) {
      const lastCharge = order.chargeIds.filter((c) => !c.startsWith("refund:")).pop();
      if (lastCharge) {
        refundLink = await btcpayRefundLink(lastCharge);
        if (refundLink) await attachCharge(order.id, `refund:${refundLink}`);
      }
      if (email) {
        try {
          await enqueue([{
            to: email,
            subject: `Canceled with love — ${booking.serviceTitle}`,
            html: brandShell(
              `<p>Your session is canceled — no hard feelings, only love.</p>
               ${refundLink
                 ? `<p style="text-align:center;margin:24px 0;"><a href="${refundLink}" style="background:#b4862b;color:#fff;padding:12px 26px;border-radius:999px;text-decoration:none;">Claim your sats back</a></p>
                    <p>The link returns your payment over lightning or on-chain — your pick.</p>`
                 : `<p>Reply to this letter with a lightning address and your sats come straight back.</p>`}`,
            ),
          }]);
        } catch { /* the cancel stands */ }
      }
    }
    return NextResponse.json({ ok: true, canceled: true, refundLink });
  }

  return NextResponse.json({ ok: false, reason: "unknown action" }, { status: 400 });
}
