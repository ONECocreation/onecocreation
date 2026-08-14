import { enqueue } from "./mail-queue";
import { brandShell } from "./mail";
import { siteBase } from "./subscribers";
import type { OrderRecord } from "./store";

/**
 * GIFT VOUCHERS (Admiral, 0018.05.17): a gifted SESSION carries no time —
 * the recipient chooses their own from Love's live calendar. The voucher is
 * minted at settle (id = order+line, so retries mint once), the recipient's
 * letter carries the claim door, and redeeming books the real slot.
 */
export interface GiftVoucher {
  id: string;
  serviceId: string;
  serviceTitle: string;
  orderId: string;
  /** who it's for — an email (letter sent) or a @tag (Love delivers) */
  to: string;
  from?: string;
  createdAtMs: number;
  redeemedAtMs?: number;
  bookingId?: string;
}

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) throw new Error("gift vault not configured");
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`gift vault: ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

const key = (id: string) => `gift:${id}`;

export async function getVoucher(id: string): Promise<GiftVoucher | null> {
  if (!/^[a-z0-9:-]{6,80}$/.test(id)) return null;
  try {
    const raw = (await kv(["GET", key(id)])) as string | null;
    return raw ? (JSON.parse(raw) as GiftVoucher) : null;
  } catch {
    return null;
  }
}

async function saveVoucher(v: GiftVoucher): Promise<void> {
  await kv(["SET", key(v.id), JSON.stringify(v)]);
}

/** A canceled gift-booking reopens its voucher — the gift is not lost,
 *  the recipient simply chooses again. */
export async function reopenVoucher(id: string): Promise<boolean> {
  const v = await getVoucher(id);
  if (!v || !v.redeemedAtMs) return false;
  await kv(["DEL", `${key(id)}:lock`]);
  const fresh = { ...v };
  delete fresh.redeemedAtMs;
  delete fresh.bookingId;
  await saveVoucher(fresh);
  return true;
}

/** The voucher (if any) that a booking was born from. */
export async function voucherForBooking(order: OrderRecord, bookingId: string): Promise<GiftVoucher | null> {
  for (let i = 0; i < order.lineItems.length; i++) {
    if (!order.lineItems[i].voucher) continue;
    const v = await getVoucher(`${order.id}-${i}`);
    if (v?.bookingId === bookingId) return v;
  }
  return null;
}

/** Redeem exactly once — SETNX on a lock key is the atomic gate. */
export async function markRedeemed(id: string, bookingId: string): Promise<boolean> {
  const got = await kv(["SET", `${key(id)}:lock`, bookingId, "NX"]);
  if (got !== "OK") return false;
  const v = await getVoucher(id);
  if (v) await saveVoucher({ ...v, redeemedAtMs: Date.now(), bookingId });
  return true;
}

/**
 * Mint vouchers for a SETTLED order's gift-session lines — idempotent (the
 * voucher id IS order+line) — and send each email recipient their door.
 */
export async function settleGiftsFromOrder(order: OrderRecord): Promise<string[]> {
  if (!["settled", "fulfilled"].includes(order.state)) return [];
  const minted: string[] = [];
  for (let i = 0; i < order.lineItems.length; i++) {
    const l = order.lineItems[i];
    if (!l.voucher || !l.giftTo) continue;
    const id = `${order.id}-${i}`;
    if (await getVoucher(id)) continue; // retry — already minted
    const voucher: GiftVoucher = {
      id,
      serviceId: l.itemId,
      serviceTitle: l.title,
      orderId: order.id,
      to: l.giftTo,
      from: order.entitlementSubject ?? order.contact?.email ?? undefined,
      createdAtMs: Date.now(),
    };
    await saveVoucher(voucher);
    minted.push(id);

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.giftTo)) {
      const url = `${siteBase()}/gift/${id}`;
      try {
        await enqueue([{
          to: l.giftTo,
          subject: `A gift for you — ${l.title} 🕊️`,
          html: brandShell(
            `<p>Someone who loves you has gifted you a session:</p>
             <p style="font-size:1.15em"><b>${l.title}</b></p>
             <p>The time is yours to choose — pick any open moment on Love's calendar.</p>
             <p style="text-align:center;margin:26px 0;">
               <a href="${url}" style="background:#b4862b;color:#fff;padding:13px 28px;border-radius:999px;text-decoration:none;">Choose my time</a>
             </p>
             <p>No payment needed — your gift covers everything.</p>`,
          ),
        }]);
      } catch { /* the voucher stands; the letter can be resent */ }
    }
  }
  return minted;
}
