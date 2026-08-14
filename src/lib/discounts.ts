import type { PriceSnapshot } from "./store";

/**
 * DISCOUNT CODES (the Admiral's ask, 0018.05.11 — Shine parity: Love runs
 * IAMLOVED / LEAP25 / FREELOVE26 there today). Store-level, not BTCPay:
 * the code reprices BEFORE any invoice is minted, and a 100% code settles
 * the order with no invoice at all — mark-as-paid, honestly recorded.
 *
 * Codes live in the vault as one list: { code, kind, value, enabled }.
 *   percent — value = 0–100, works on sats or fiat snapshots
 *   flat    — value = sats off (sats-priced checkouts only, v1)
 * The admin toggle is the on/off switch; disabled codes refuse politely.
 */
export interface DiscountCode {
  code: string; // stored UPPERCASE
  kind: "percent" | "flat";
  value: number;
  enabled: boolean;
  /** YYYY-MM-DD — the code works through that whole day (UTC), then refuses */
  expiresAt?: string;
}

/** Still good today? Absent expiry = evergreen. */
export function discountActive(d: DiscountCode, nowMs = Date.now()): boolean {
  if (!d.enabled) return false;
  if (!d.expiresAt) return true;
  const end = Date.parse(`${d.expiresAt}T23:59:59.999Z`);
  return Number.isFinite(end) ? nowMs <= end : true;
}

const KEY = "store:discounts";

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) throw new Error("discounts: vault not configured");
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`discounts: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

export async function listDiscounts(): Promise<DiscountCode[]> {
  if (!restEnv()) return [];
  const raw = (await kv(["GET", KEY])) as string | null;
  return raw ? (JSON.parse(raw) as DiscountCode[]) : [];
}

export async function saveDiscounts(codes: DiscountCode[]): Promise<void> {
  const clean = codes
    .filter((c) => c.code && /^[A-Z0-9]{2,24}$/.test(c.code.toUpperCase()))
    .map((c) => ({
      code: c.code.toUpperCase(),
      kind: c.kind === "flat" ? ("flat" as const) : ("percent" as const),
      value: Math.max(0, Math.min(c.kind === "flat" ? 100_000_000 : 100, Math.floor(Number(c.value) || 0))),
      enabled: !!c.enabled,
      ...(typeof c.expiresAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(c.expiresAt)
        ? { expiresAt: c.expiresAt }
        : {}),
    }));
  await kv(["SET", KEY, JSON.stringify(clean)]);
}

export async function findDiscount(code: string | undefined): Promise<DiscountCode | null> {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  if (!c) return null;
  return (await listDiscounts()).find((d) => d.code === c && discountActive(d)) ?? null;
}

/** Apply a code to a price snapshot. Never below zero; flat codes are
 *  sats-only (a flat-sats code on a fiat checkout returns null = refused). */
export function applyDiscount(snapshot: PriceSnapshot, d: DiscountCode): PriceSnapshot | null {
  if (d.kind === "percent") {
    const amount = Math.max(0, Math.floor((snapshot.amount * (100 - d.value)) / 100));
    return { ...snapshot, amount };
  }
  if (snapshot.currency !== "SATS") return null;
  return { ...snapshot, amount: Math.max(0, snapshot.amount - d.value) };
}
