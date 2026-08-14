import { NextResponse } from "next/server";
import { readConfig } from "@/lib/booking";
import { busyFeed } from "@/lib/ical-busy";
import { getOrder, listOrders, markFulfilled, ordersConfigured } from "@/lib/store";
import { getBooking, setBookingNotes } from "@/lib/booking-orders";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

/**
 * The admin week feed: working-hour rules + every booking in the window,
 * each carrying WHO · WHAT · state (the "which call is this?" answer).
 */
export async function GET(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const url = new URL(request.url);
  const start = url.searchParams.get("start") ? Date.parse(url.searchParams.get("start")!) : Date.now();
  // 7 for the week view, up to 42 for the month grid
  const daysParam = Number(url.searchParams.get("days"));
  const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 42) : 7;
  const end = start + days * 24 * 3600 * 1000;

  const { rules, overrides, icalUrl } = await readConfig();

  const bookings: {
    bookingId: string;
    orderId: string;
    title: string;
    customer: string;
    customerEmail?: string;
    meetingUrl?: string;
    notes?: string;
    startUtc: string;
    endUtc: string;
    state: string;
    orderState: string;
    needsFulfil: boolean;
  }[] = [];

  if (ordersConfigured()) {
    for (const o of await listOrders()) {
      // cart orders carry a bookingId per SESSION line (v1.5); the legacy
      // order-level field still reads, deduped so old orders show once
      const pairs: { bookingId: string; title: string }[] = [];
      for (const l of o.lineItems) {
        if (l.bookingId) pairs.push({ bookingId: l.bookingId, title: l.title });
      }
      if (o.bookingId && !pairs.some((p) => p.bookingId === o.bookingId)) {
        pairs.push({ bookingId: o.bookingId, title: o.lineItems[0]?.title ?? "Session" });
      }
      for (const { bookingId, title } of pairs) {
        const b = await getBooking(bookingId);
        if (!b) continue;
        const t = Date.parse(b.startUtc);
        if (t < start || t > end) continue;
        if (!["held", "confirmed"].includes(b.state)) continue;
        bookings.push({
          bookingId,
          orderId: o.id,
          title,
          customer: b.customer.name || b.customer.email || b.customer.npub || "someone",
          customerEmail: b.customer.email,
          meetingUrl: b.meetingUrl,
          notes: b.adminNotes,
          startUtc: b.startUtc,
          endUtc: b.endUtc,
          state: b.state,
          orderState: o.state,
          needsFulfil: o.state === "settled",
        });
      }
    }
  }

  // the external calendar's busy windows shade the grid too
  const busy = await busyFeed(icalUrl);
  return NextResponse.json({
    ok: true,
    rules,
    overrides,
    bookings,
    busy: busy.windows.filter((w) => w.endMs > start && w.startMs < end),
    ical: {
      connected: !!icalUrl,
      skippedRecurring: busy.skippedRecurring,
      fetchedAtMs: busy.fetchedAtMs,
      error: busy.error ?? null,
    },
  });
}

/**
 * Session notes from the calendar popup. Saving notes on a session whose
 * order has settled also closes it out (marks the order fulfilled) — the
 * note IS the "call is done" record; mark-fulfilled stays a physical-goods
 * gesture over in the Items room (Admiral, 0018.05.28).
 */
export async function POST(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let body: { bookingId?: string; notes?: string; closeOut?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  }
  if (!body.bookingId || typeof body.notes !== "string") {
    return NextResponse.json({ ok: false, reason: "bookingId + notes required" }, { status: 400 });
  }
  const rec = await setBookingNotes(body.bookingId, body.notes);
  if (!rec) return NextResponse.json({ ok: false, reason: "no such booking" }, { status: 404 });
  let closedOut = false;
  if (body.closeOut && rec.orderId) {
    const order = await getOrder(rec.orderId);
    if (order?.state === "settled") {
      await markFulfilled(rec.orderId);
      closedOut = true;
    }
  }
  return NextResponse.json({ ok: true, closedOut });
}
