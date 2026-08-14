import type { OrderRecord } from "./store";
import type { BookingRecord } from "./booking-orders";
import type { Service } from "./booking-time";
import { buildIcs, icsFilename } from "./ics";
import { sendMail, mailConfigured, brandShell } from "./mail";
import { siteBase } from "./subscribers";

/**
 * The booking confirmation — transactional, direct send, no queue (email-rail
 * brief: low volume speaks immediately; only blasts drip).
 *
 * Called from the settle path, which is idempotent and re-runs on webhook AND
 * reconcile — so this guards itself with a vault sent-flag: at-most-once. A
 * mail failure must never fail a settle; the booking is confirmed whether or
 * not the confirmation letter made it out tonight.
 */

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

/** SET NX — true exactly once per booking, ever. No vault → false (never
 *  risk a duplicate letter over a missing flag store). */
async function claimSendOnce(bookingId: string): Promise<boolean> {
  const rest = restEnv();
  if (!rest) return false;
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(["SET", `mail:sent:booking:${bookingId}`, "1", "NX"]),
    cache: "no-store",
  });
  if (!res.ok) return false;
  const { result } = (await res.json()) as { result: unknown };
  return result === "OK";
}

function fmtWhen(iso: string, tz: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export async function sendBookingConfirmation(
  order: OrderRecord,
  booking: BookingRecord,
  service: Service | null,
): Promise<void> {
  const to = booking.customer.email;
  if (!to || !mailConfigured("bookings")) return;
  // the BOOKING's own id keys everything — one order may carry many
  // sessions now (cart v1.5), each with its own letter and its own flag
  if (!(await claimSendOnce(booking.id))) return;

  const title = service?.title ?? "Your session";
  const receiptUrl = `${siteBase()}/book/receipt/${booking.id}`;
  const when = fmtWhen(booking.startUtc, booking.artistTz);

  const ics = buildIcs({
    uid: booking.id,
    startUtc: booking.startUtc,
    endUtc: booking.endUtc,
    summary: `${title} — One Cocreation`,
    description: booking.meetingUrl
      ? `Your meeting link: ${booking.meetingUrl}\nReceipt: ${receiptUrl}`
      : `Receipt: ${receiptUrl}`,
    location: booking.meetingUrl,
    url: receiptUrl,
    organizer: {
      name: "One Cocreation",
      email: process.env.BOOKING_ORGANIZER_EMAIL,
    },
    status: "CONFIRMED",
    sequence: 0,
    alarmMinutesBefore: 60,
  });

  const name = booking.customer.name ? `, ${booking.customer.name}` : "";
  const meetingRow = booking.meetingUrl
    ? `<p><b>Where:</b> <a href="${booking.meetingUrl}" style="color:#b4862b;">${booking.meetingUrl}</a></p>`
    : "";

  await sendMail("bookings", {
    to,
    subject: `Confirmed: ${title} — ${when}`,
    html: brandShell(
      `<p>Hello${name},</p>
       <p>Your booking is <b>confirmed</b>. We look forward to seeing you.</p>
       <p><b>What:</b> ${title}<br/><b>When:</b> ${when}</p>
       ${meetingRow}
       <p>The attached calendar file carries the time and a gentle reminder an
       hour before — open it and your own calendar keeps the appointment.</p>
       <p>Your receipt: <a href="${receiptUrl}" style="color:#b4862b;">${receiptUrl}</a></p>
       <p>With love,<br/>One Cocreation</p>`,
    ),
    attachments: [
      {
        filename: icsFilename(title, booking.startUtc),
        content: ics,
        contentType: "text/calendar; charset=utf-8; method=PUBLISH",
      },
    ],
  });
}
