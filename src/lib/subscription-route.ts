import crypto from "crypto";
import { NextResponse } from "next/server";
import { memberFromRequest } from "./member-auth";
import { operatorFromCookieHeader } from "./operator-auth";
import { strictSameOrigin } from "./origin-strict";
import { subscriptionsEnabled, rateLimited, publicView, SubError, type SubRecord } from "./subscriptions";
import { tierOpenForJoin } from "./tier-open";

/**
 * T-541a: the one door every member subscription route walks through, in
 * this order: feature switch (OFF = 404 for everyone, signed in or not),
 * strict Origin on anything that changes state (a MISSING Origin is
 * refused), the member session (the ONLY source of "who"), then a per-member
 * rate limit. Returns the session subject `handle@space`, or the response
 * to send.
 *
 * T-555, the operator test door: with the switch OFF, a request that ALSO
 * carries a valid operator session passes the switch check and nothing else
 * changes. The switch is read first; the operator cookie is read only when
 * it is off. Everything after is unchanged and in the same order: strict
 * Origin on writes, the member session as the only source of "who" (an
 * operator with no member session gets 401, never a subscribe), the rate
 * limit. This is the only bypass.
 */
export async function memberGate(
  request: Request,
  opts: { write: boolean; bucket: string; max: number; windowSec: number },
): Promise<{ subject: string } | NextResponse> {
  if (!(await subscriptionsEnabled()) && !operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false, reason: "not found" }, { status: 404 });
  }
  if (opts.write && !strictSameOrigin(request)) return NextResponse.json({ ok: false, reason: "cross-origin request refused" }, { status: 403 });
  const fren = memberFromRequest(request);
  if (!fren) return NextResponse.json({ ok: false, reason: "sign in first" }, { status: 401 });
  const subject = `${fren.handle}@${fren.space}`;
  if (await rateLimited(subject, opts.bucket, opts.max, opts.windowSec)) {
    return NextResponse.json({ ok: false, reason: "too many tries, wait a little" }, { status: 429 });
  }
  return { subject };
}

/**
 * T-556: the member's view, with `upgrades` cut to the memberships that are
 * open to join (tierOpenForJoin). A closed tier is never offered as an
 * Upgrade. No record stays null.
 */
export async function memberView(rec: SubRecord | null) {
  const view = publicView(rec);
  if (!view) return null;
  const open = await Promise.all(view.upgrades.map((u) => tierOpenForJoin(u.tier)));
  return { ...view, upgrades: view.upgrades.filter((_, i) => open[i]) };
}

export function subErrorResponse(err: unknown): NextResponse {
  if (err instanceof SubError) return NextResponse.json({ ok: false, code: err.code, reason: err.message }, { status: err.status });
  console.warn("subscription route failed:", err instanceof Error ? err.message : "error");
  return NextResponse.json({ ok: false, reason: "something went wrong, try again" }, { status: 500 });
}

/** A body with only the keys the caller names; anything else (price, plan, subject) is dropped. */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const b = (await request.json()) as unknown;
    return b && typeof b === "object" ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const requestIdempotency = (...parts: string[]) => crypto.createHash("sha256").update(parts.join("|")).digest("hex");
