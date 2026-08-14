import { frenFromRequest } from "./fren-auth";

/**
 * THE BASKET (cart phase 2 v1 — Admiral's rulings 0018.05.13): a vault
 * object that REMEMBERS. Signed-in members carry their cart across
 * devices (keyed by subject); strangers ride an anonymous cart cookie
 * that merges into the member cart at checkout-time sign-in. v1 carries
 * GOODS lines (store items); service-slot lines with their 72-hour holds
 * and 24-hour reminder letters are v1.5 on this same object.
 */
export interface CartLine {
  itemId: string;
  qty: number;
  size?: string;
  /** v1.5: a SESSION line — the slot is HELD (72h) the moment it lands in
   *  the basket, so a cart can't promise a taken time. holdId doubles as
   *  the future bookingId, which is what lets settle confirm the claim. */
  slot?: { startUtc: string; endUtc: string; holdId: string; holdUntilMs: number };
  /** pay-what-you-can offer for this LINE (total sats, Admiral 0018.05.14):
   *  charged up front; below list price the order waits on Love's review. */
  offerSats?: number;
  /** a gift for another one (Admiral 0018.05.17): who it's for — an email
   *  or a @tag. Rides the order so Love can deliver with love. */
  giftTo?: string;
  /** a SESSION gifted WITHOUT a time — the recipient books their own from
   *  the live calendar (voucher rail). itemId is the serviceId. */
  serviceGift?: boolean;
}
export interface CartDoc {
  lines: CartLine[];
  updatedAtMs: number;
}

export const CART_COOKIE = "oc-cart";
const TTL_S = 72 * 3600; // the Admiral's 72 hours — carts remember

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) throw new Error("cart: vault not configured");
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`cart: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

const key = (id: string) => `cart:${id}`;

/** The cart's identity: the member subject when signed in, else the
 *  anonymous cart cookie (caller mints it if absent). */
export function cartIdFromRequest(request: Request): { id: string | null; anon: boolean } {
  const fren = frenFromRequest(request);
  if (fren) return { id: `${fren.handle}@${fren.space}`, anon: false };
  const cookie = request.headers.get("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)oc-cart=([a-z0-9-]+)/);
  return { id: m ? m[1] : null, anon: true };
}

export async function getCart(id: string): Promise<CartDoc> {
  try {
    const raw = (await kv(["GET", key(id)])) as string | null;
    return raw ? (JSON.parse(raw) as CartDoc) : { lines: [], updatedAtMs: 0 };
  } catch {
    return { lines: [], updatedAtMs: 0 };
  }
}

export async function saveCart(id: string, doc: CartDoc): Promise<void> {
  doc.updatedAtMs = Date.now();
  await kv(["SET", key(id), JSON.stringify(doc), "EX", String(TTL_S)]);
}

export async function clearCart(id: string): Promise<void> {
  await kv(["DEL", key(id)]);
}

/** An anonymous cart follows its soul through the door at sign-in. */
export async function mergeCarts(anonId: string, memberId: string): Promise<void> {
  const [a, m] = [await getCart(anonId), await getCart(memberId)];
  if (a.lines.length === 0) return;
  for (const line of a.lines) {
    if (line.slot) {
      // a held slot is one-of-a-kind — it rides over whole, never merges
      if (!m.lines.some((l) => l.slot?.holdId === line.slot?.holdId)) m.lines.push(line);
      continue;
    }
    const at = m.lines.findIndex((l) => !l.slot && l.itemId === line.itemId && l.size === line.size);
    if (at >= 0) m.lines[at].qty += line.qty;
    else m.lines.push(line);
  }
  await saveCart(memberId, m);
  await clearCart(anonId);
}
