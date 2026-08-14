import { NextResponse } from "next/server";
import { listOrders, ordersConfigured } from "@/lib/store";
import { listSubscribers, subscribersConfigured } from "@/lib/subscribers";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

/**
 * PEOPLE — the admin's verify desk (wireframe v2): every soul the house
 * knows, with what they hold. Sources joined honestly: the subscriber list
 * (email members + signups) and the order book (purchases keyed by member).
 * Last sign-in tracking doesn't exist yet — shown as "—", never guessed;
 * class progress arrives with the Matrix rooms.
 */
export async function GET(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const people = new Map<
    string,
    { member: string; kind: "email" | "key"; packages: string[]; sessions: number; lastOrderMs: number | null; joinedMs: number | null }
  >();

  if (subscribersConfigured()) {
    for (const email of await listSubscribers()) {
      people.set(`${email}@email`, {
        member: email,
        kind: "email",
        packages: [],
        sessions: 0,
        lastOrderMs: null,
        joinedMs: null,
      });
    }
  }

  if (ordersConfigured()) {
    for (const o of await listOrders()) {
      if (!o.entitlementSubject) continue;
      if (!["settled", "fulfilled"].includes(o.state)) continue;
      const key = o.entitlementSubject;
      const kind = key.endsWith("@email") ? "email" : "key";
      const member = kind === "email" ? key.slice(0, -"@email".length) : key;
      const p =
        people.get(key) ??
        { member, kind: kind as "email" | "key", packages: [], sessions: 0, lastOrderMs: null, joinedMs: null };
      // cart orders (v1.5): sessions ride per LINE now — count each; the
      // non-session lines still land as packages/goods titles
      const lineSessions = o.lineItems.filter((l) => l.bookingId).length;
      p.sessions += lineSessions > 0 ? lineSessions : o.bookingId ? 1 : 0;
      for (const l of o.lineItems) {
        if (!l.bookingId && !o.bookingId && l.title && !p.packages.includes(l.title)) {
          p.packages.push(l.title);
        }
      }
      p.lastOrderMs = Math.max(p.lastOrderMs ?? 0, o.createdAtMs);
      people.set(key, p);
    }
  }

  return NextResponse.json({ ok: true, people: [...people.values()] });
}
