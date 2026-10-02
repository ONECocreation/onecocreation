import crypto from "crypto";
import { NextResponse } from "next/server";
import { memberFromRequest } from "./member-auth";
import { strictSameOrigin } from "./origin-strict";
import { subscriptionsEnabled, rateLimited, SubError } from "./subscriptions";

/**
 * T-541a: the one door every member subscription route walks through, in
 * this order: feature switch (OFF = 404 for everyone, signed in or not),
 * strict Origin on anything that changes state (a MISSING Origin is
 * refused), the member session (the ONLY source of "who"), then a per-member
 * rate limit. Returns the session subject `handle@space`, or the response
 * to send.
 */
export async function memberGate(
  request: Request,
  opts: { write: boolean; bucket: string; max: number; windowSec: number },
): Promise<{ subject: string } | NextResponse> {
  if (!(await subscriptionsEnabled())) return NextResponse.json({ ok: false, reason: "not found" }, { status: 404 });
  if (opts.write && !strictSameOrigin(request)) return NextResponse.json({ ok: false, reason: "cross-origin request refused" }, { status: 403 });
  const fren = memberFromRequest(request);
  if (!fren) return NextResponse.json({ ok: false, reason: "sign in first" }, { status: 401 });
  const subject = `${fren.handle}@${fren.space}`;
  if (await rateLimited(subject, opts.bucket, opts.max, opts.windowSec)) {
    return NextResponse.json({ ok: false, reason: "too many tries, wait a little" }, { status: 429 });
  }
  return { subject };
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
