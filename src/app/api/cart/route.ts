import { NextResponse } from "next/server";
import {
  cartIdFromRequest,
  getCart,
  saveCart,
  mergeCarts,
  CART_COOKIE,
  type CartDoc,
  type CartLine,
} from "@/lib/cart";
import { getItem, stripPrivateMedia } from "@/lib/store";
import { getService, readConfig, slotsFor } from "@/lib/booking";
import { claimSlot, releaseSlot, getClaim, newBookingId } from "@/lib/booking-orders";
import { busyFeed, subtractBusy } from "@/lib/ical-busy";
import { enqueue } from "@/lib/mail-queue";
import { holdReminderLetters } from "@/lib/cart-reminders";

export const dynamic = "force-dynamic";

/**
 * THE BASKET's API (v1.5): goods lines, SESSION lines (the slot is held
 * atomically for 72h the moment it lands — ruling #1), and per-line
 * pay-what-you-can offers (Admiral 0018.05.14). Expired holds fall out on
 * read, releasing their slot back to the board.
 */

const HOLD_MS = 72 * 3600 * 1000;

function withCookie(res: NextResponse, anonId?: string): NextResponse {
  if (anonId) {
    res.headers.set(
      "Set-Cookie",
      `${CART_COOKIE}=${anonId}; Path=/; SameSite=Lax; Secure; Max-Age=${72 * 3600}`,
    );
  }
  return res;
}

/** Resolve lines against the live shelf + calendar; sweep expired holds.
 *  Returns the view AND whether the doc changed (caller saves). */
async function resolved(cart: CartDoc) {
  const lines = [];
  // itemId rides along so the cart can offer a "re-add" door straight back
  // to booking (Admiral, 0018.05.11) — the exact slot is gone, but the door isn't
  const expired: { itemId: string; title: string }[] = [];
  let totalSats = 0;
  let allSats = true;
  const keep: CartLine[] = [];

  for (const l of cart.lines) {
    if (l.serviceGift) {
      // a gift-session voucher line — priced by the service, no slot
      const service = await getService(l.itemId);
      if (!service || service.status !== "live") continue;
      const listSats = service.price.sats ?? null;
      const lineSats = l.offerSats ?? listSats;
      if (lineSats == null) allSats = false;
      else totalSats += lineSats;
      keep.push(l);
      lines.push({
        itemId: l.itemId,
        qty: 1,
        title: service.title,
        kind: "service",
        sats: lineSats,
        listSats,
        offerSats: l.offerSats ?? null,
        giftTo: l.giftTo ?? null,
        serviceGift: true,
        fiat: service.price.fiat ?? null,
        image: null,
        physical: false,
        gated: false,
        inPerson: false,
        slot: null,
      });
      continue;
    }
    if (l.slot) {
      const service = await getService(l.itemId);
      if (!service || service.status !== "live") {
        await releaseHold(l);
        expired.push({ itemId: l.itemId, title: l.itemId });
        continue;
      }
      if (l.slot.holdUntilMs <= Date.now()) {
        await releaseHold(l);
        expired.push({ itemId: l.itemId, title: service.title });
        continue;
      }
      const listSats = service.price.sats ?? null;
      const lineSats = l.offerSats ?? listSats;
      if (lineSats == null) allSats = false;
      else totalSats += lineSats;
      keep.push(l);
      lines.push({
        itemId: l.itemId,
        qty: 1,
        title: service.title,
        kind: "service",
        sats: lineSats,
        listSats,
        offerSats: l.offerSats ?? null,
        giftTo: l.giftTo ?? null,
        fiat: service.price.fiat ?? null,
        image: null,
        physical: false,
        gated: false,
        inPerson: service.meetingRail?.kind === "inPerson",
        slot: { startUtc: l.slot.startUtc, endUtc: l.slot.endUtc, holdId: l.slot.holdId, holdUntilMs: l.slot.holdUntilMs },
        artistTz: service.artistTz,
      });
      continue;
    }

    const item = await getItem(l.itemId);
    if (!item || item.status !== "live") continue;
    const eff = item.sale ?? item.price;
    const listSats = eff.sats ?? null;
    const lineSats = l.offerSats ?? (listSats != null ? listSats * l.qty : null);
    if (lineSats == null) allSats = false;
    else totalSats += lineSats;
    keep.push(l);
    lines.push({
      itemId: l.itemId,
      qty: l.qty,
      size: l.size,
      title: item.title,
      kind: item.kind,
      sats: listSats,
      listSats,
      offerSats: l.offerSats ?? null,
      giftTo: l.giftTo ?? null,
      lineSats,
      fiat: eff.fiat ?? null,
      image: stripPrivateMedia(item).media?.images[0] ?? item.images[0] ?? null,
      physical: item.kind === "self" || item.kind === "fourthwall",
      gated: item.kind === "digital" || item.kind === "package" || item.kind === "retreat",
      inPerson: false,
      slot: null,
    });
  }

  const changed = keep.length !== cart.lines.length;
  cart.lines = keep;
  return { view: { lines, totalSats: allSats ? totalSats : null, expired }, changed };
}

/** Give a held slot back — only if the claim is still OURS (the hold id
 *  matches); a slot someone else has since claimed is left alone. */
async function releaseHold(l: CartLine): Promise<void> {
  if (!l.slot) return;
  try {
    const claim = await getClaim(l.itemId, l.slot.startUtc);
    if (claim?.bookingId === l.slot.holdId && claim.state === "held") {
      await releaseSlot(l.itemId, l.slot.startUtc);
    }
  } catch {
    /* releasing is a courtesy — lazy expiry sweeps it anyway */
  }
}

/** Signing in must never eat a basket (Admiral's catch, 0018.05.17): a
 *  member with a lingering anonymous-cart cookie gets both baskets MERGED
 *  on the next cart touch, and the anon cookie retires. */
async function absorbAnonCart(request: Request, memberId: string | null): Promise<boolean> {
  if (!memberId) return false;
  const cookie = request.headers.get("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)oc-cart=([a-z0-9-]+)/);
  if (!m || m[1] === memberId) return false;
  try {
    await mergeCarts(m[1], memberId);
  } catch {
    return false;
  }
  return true;
}

const clearAnonCookie = (res: NextResponse): NextResponse => {
  res.headers.set("Set-Cookie", `${CART_COOKIE}=; Path=/; SameSite=Lax; Secure; Max-Age=0`);
  return res;
};

export async function GET(request: Request) {
  const { id, anon } = cartIdFromRequest(request);
  if (!id) return NextResponse.json({ ok: true, lines: [], totalSats: 0, expired: [] });
  const absorbed = !anon && (await absorbAnonCart(request, id));
  const cart = await getCart(id);
  const { view, changed } = await resolved(cart);
  if (changed) await saveCart(id, cart);
  const res = NextResponse.json({ ok: true, ...view });
  return absorbed ? clearAnonCookie(res) : res;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    itemId?: string;
    qty?: number;
    size?: string;
    remove?: boolean;
    /** hold id — targets a specific session line (remove) */
    holdId?: string;
    /** session add: the service + the chosen slot */
    serviceId?: string;
    startUtc?: string;
    /** pay-what-you-can: set/clear the line's offer (sats, whole line) */
    offerSats?: number | null;
    /** gift: set/clear who this line is for (email or @tag) */
    giftTo?: string | null;
  } | null;
  if (!body?.itemId && !body?.serviceId) {
    return NextResponse.json({ ok: false, reason: "itemId or serviceId required" }, { status: 400 });
  }

  let { id, anon } = cartIdFromRequest(request);
  let newAnon: string | undefined;
  if (!id) {
    id = crypto.randomUUID();
    newAnon = id;
  }
  if (!anon) await absorbAnonCart(request, id);
  const cart = await getCart(id);

  // ── a SESSION line: validate the slot, HOLD it, then remember it ────────
  if (body.serviceId && body.startUtc) {
    const service = await getService(body.serviceId);
    if (!service || service.status !== "live") {
      return NextResponse.json({ ok: false, reason: "no such session" }, { status: 404 });
    }
    // recompute from the artist's own rules — never trust a client instant;
    // the external calendar's busy windows count as closed too
    const { rules, overrides, icalUrl } = await readConfig();
    const busy = await busyFeed(icalUrl);
    const slot = subtractBusy(slotsFor(service, rules, overrides), busy.windows)
      .find((s) => s.startUtc === body.startUtc);
    if (!slot) return NextResponse.json({ ok: false, reason: "that time isn't open" }, { status: 409 });

    const holdId = newBookingId();
    const holdUntilMs = Date.now() + HOLD_MS;
    const claimed = await claimSlot(service.id, slot.startUtc, {
      state: "held",
      bookingId: holdId,
      untilMs: holdUntilMs,
    });
    if (!claimed) {
      return NextResponse.json({ ok: false, reason: "someone just took that time — pick another" }, { status: 409 });
    }
    cart.lines.push({
      itemId: service.id,
      qty: 1,
      slot: { startUtc: slot.startUtc, endUtc: slot.endUtc, holdId, holdUntilMs },
    });
    await saveCart(id, cart);

    // the 24h/48h reminders — only a member with an email door gets letters
    if (id.endsWith("@email")) {
      const to = id.slice(0, -"@email".length);
      const whenLocal = new Intl.DateTimeFormat("en-US", {
        timeZone: service.artistTz,
        weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(slot.startUtc));
      try {
        await enqueue(holdReminderLetters({
          to,
          cartId: id,
          holdId,
          serviceTitle: service.title,
          whenLocal,
          artistTz: service.artistTz,
          holdUntilMs,
          baseUrl: new URL(request.url).origin,
        }));
      } catch {
        /* a reminder that can't queue must not block the hold */
      }
    }

    const { view } = await resolved(cart);
    return withCookie(
      NextResponse.json({ ok: true, count: cart.lines.reduce((n, l) => n + l.qty, 0), ...view }),
      anon ? newAnon : undefined,
    );
  }

  // ── goods lines + offers + removal ──────────────────────────────────────
  const at = body.holdId
    ? cart.lines.findIndex((l) => l.slot?.holdId === body.holdId)
    : cart.lines.findIndex((l) => !l.slot && l.itemId === body.itemId && l.size === body.size);

  if (body.remove) {
    if (at >= 0) {
      await releaseHold(cart.lines[at]);
      cart.lines.splice(at, 1);
    }
  } else if (body.giftTo !== undefined) {
    if (at < 0) return NextResponse.json({ ok: false, reason: "that line isn't in your basket" }, { status: 404 });
    const to = (body.giftTo ?? "").trim();
    if (!to) {
      delete cart.lines[at].giftTo;
    } else if (to.length > 120) {
      return NextResponse.json({ ok: false, reason: "that address is a bit long" }, { status: 400 });
    } else {
      cart.lines[at].giftTo = to;
      // a GIFTED session carries no time (Admiral 0018.05.17): the held
      // slot goes back on the board and the recipient chooses their own
      if (cart.lines[at].slot) {
        await releaseHold(cart.lines[at]);
        delete cart.lines[at].slot;
        cart.lines[at].serviceGift = true;
        cart.lines[at].qty = 1;
      }
    }
  } else if (body.offerSats !== undefined) {
    // set/clear a pay-what-you-can offer on an existing line
    if (at < 0) return NextResponse.json({ ok: false, reason: "that line isn't in your basket" }, { status: 404 });
    if (body.offerSats === null) {
      delete cart.lines[at].offerSats;
    } else {
      const offer = Math.floor(body.offerSats);
      if (!Number.isInteger(offer) || offer < 111) {
        return NextResponse.json({ ok: false, reason: "offers start at 111 sats" }, { status: 400 });
      }
      cart.lines[at].offerSats = offer;
    }
  } else {
    const item = await getItem(body.itemId!);
    if (!item || item.status !== "live") {
      return NextResponse.json({ ok: false, reason: "that item isn't on the shelf" }, { status: 404 });
    }
    const qty = Math.max(1, Math.min(21, Math.floor(body.qty ?? 1)));
    if (at >= 0) cart.lines[at].qty = qty;
    else cart.lines.push({ itemId: body.itemId!, qty, size: body.size });
  }
  await saveCart(id, cart);
  const { view } = await resolved(cart);
  return withCookie(
    NextResponse.json({ ok: true, count: cart.lines.reduce((n, l) => n + l.qty, 0), ...view }),
    anon ? newAnon : undefined,
  );
}
