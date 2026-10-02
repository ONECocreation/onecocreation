import type { CallResult, SubView } from "./subscription-ui";

/**
 * T-541b: the browser side of the member subscription routes. Every call is
 * same-origin (so the browser sends the Origin header the routes demand),
 * takes an injectable `fetch` so the wiring is testable, and never throws:
 * a network failure comes back as `null`, a refusal as `{ ok:false, code,
 * reason, httpStatus }`. Prices and plans are NEVER sent: the body names a
 * tier and a variant key, and the card token comes from Square's SDK.
 */
type FetchLike = typeof fetch;
export type CallOut = (CallResult & { httpStatus?: number }) | null;

async function call(f: FetchLike, method: "GET" | "POST", path: string, body?: unknown): Promise<CallOut> {
  try {
    const res = await f(path, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      ...(method === "POST" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) } : {}),
    });
    const json = (await res.json().catch(() => ({}))) as CallResult;
    return { ...json, ok: res.ok && json.ok === true, httpStatus: res.status };
  } catch {
    return null;
  }
}

export const BASE = "/api/member/subscription";

export interface SubscribeInput {
  tier: string;
  variant?: string;
  cardToken: string;
  email?: string;
  verificationToken?: string;
}
export function subscribeCall(f: FetchLike, input: SubscribeInput): Promise<CallOut> {
  const body: Record<string, unknown> = { tier: input.tier, cardToken: input.cardToken };
  if (input.variant && input.variant !== "standard") body.variant = input.variant;
  if (input.email) body.email = input.email;
  if (input.verificationToken) body.verificationToken = input.verificationToken;
  return call(f, "POST", BASE, body);
}
export const cancelCall = (f: FetchLike) => call(f, "POST", `${BASE}/cancel`);
export const undoCancelCall = (f: FetchLike) => call(f, "POST", `${BASE}/undo-cancel`);
export const upgradeCall = (f: FetchLike, tier: string) => call(f, "POST", `${BASE}/upgrade`, { tier });
export async function getSubscription(f: FetchLike): Promise<{ subscription: SubView | null } | { off: true } | { error: true }> {
  const r = await call(f, "GET", BASE);
  if (!r) return { error: true };
  if (r.httpStatus === 404) return { off: true };
  if (!r.ok) return { error: true };
  return { subscription: r.subscription ?? null };
}

export interface JoinConfig {
  environment: "sandbox" | "production";
  applicationId: string;
  locationId: string;
  open: string[];
  /** tier -> variant -> the one honest offer sentence */
  offers: Record<string, Partial<Record<string, string>>>;
  /** this member has had a subscription before (promos are first-time only) */
  usedBefore?: boolean;
}
export async function getJoinConfig(f: FetchLike): Promise<JoinConfig | "off" | null> {
  const r = (await call(f, "GET", `${BASE}/config`)) as (CallOut & Partial<JoinConfig>) | null;
  if (!r) return null;
  if (r.httpStatus === 404) return "off";
  if (!r.ok || !r.applicationId || !r.locationId) return null;
  return {
    environment: r.environment === "production" ? "production" : "sandbox",
    applicationId: r.applicationId,
    locationId: r.locationId,
    open: r.open ?? ["standard"],
    offers: r.offers ?? {},
    usedBefore: r.usedBefore,
  };
}

/* ── operator (Money desk) ── */
export interface DeskRow {
  subject: string;
  tier: string;
  tierName: string;
  variant: string;
  status: string;
  chargedThroughMs: number | null;
  expiresAtMs: number | null;
  canceledAtMs: number | null;
}
export const getDeskRows = (f: FetchLike) => call(f, "GET", "/api/admin/store/subscriptions") as Promise<(CallOut & { rows?: DeskRow[]; counts?: Record<string, number> }) | null>;
export const getPlans = (f: FetchLike) => call(f, "GET", "/api/admin/store/subscription-plans");
export const savePlanMapCall = (f: FetchLike, map: unknown) => call(f, "POST", "/api/admin/store/subscription-plans", { map });
