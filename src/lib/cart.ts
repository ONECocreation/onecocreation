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

/** The 1..21 law, one source (T-357 — it used to live three places). */
export const CART_MAX_QTY = 21;

/** NaN → 1, otherwise `Math.max(1, Math.min(CART_MAX_QTY, Math.floor(n)))`.
 *  `Math.floor` runs FIRST and the NaN check reads ITS result, not the raw
 *  `n` — a non-numeric `body.qty` (e.g. `"abc"`) reaches here as a string
 *  despite this signature's promise of `number` (an unchecked JSON field,
 *  cast with `as` at the route), and `Math.floor` coerces it the same way
 *  the old inline line always did (JS's own ToNumber — `Math.floor("5")` is
 *  still `5`, unchanged); checking the FLOORED value is what catches the
 *  NaN a naive `Number.isNaN(n)` would miss on a string. `+Infinity` → 21
 *  and `-Infinity` → 1, exactly as the old line gave. */
export function clampQty(n: number): number {
  const floored = Math.floor(n);
  return Number.isNaN(floored) ? 1 : Math.max(1, Math.min(CART_MAX_QTY, floored));
}

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
    const doc: CartDoc = raw ? (JSON.parse(raw) as CartDoc) : { lines: [], updatedAtMs: 0 };
    // D2(a), T-357: heal a poisoned qty on READ, in memory only — KV keeps
    // the raw value until the next save. A slot line is one-of-a-kind and
    // always qty 1 (as is a gift-session voucher line); it rides through
    // untouched, never rebuilt.
    doc.lines = doc.lines.map((l) => (l.slot ? l : { ...l, qty: clampQty(l.qty) }));
    return doc;
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
    if (at >= 0) m.lines[at].qty = clampQty(m.lines[at].qty + line.qty);
    else m.lines.push({ ...line, qty: clampQty(line.qty) });
  }
  await saveCart(memberId, m);
  await clearCart(anonId);
}
