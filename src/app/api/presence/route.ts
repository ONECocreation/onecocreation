import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

/**
 * The presence room door (step 6, presence multiplayer). Operator-gated:
 * returns the relay pool and the HMAC-derived room tag + encryption key —
 * NEVER the secret itself. Rotating PRESENCE_SECRET (or its SEAT_SECRET
 * fallback) rotates the room: the ex-operator eviction lever.
 *
 * Presence carries NO page content — names, slug, block ids, breakpoint,
 * rev only (blast-radius law; enforced by the package payload type).
 */

const DEFAULT_RELAYS = ["wss://relay.damus.io", "wss://nos.lol"];

function secret(): string {
  const s = process.env.PRESENCE_SECRET?.trim() || process.env.SEAT_SECRET?.trim();
  if (!s) throw new Error("no presence secret available");
  return s;
}

function hmacHex(label: string): string {
  return createHmac("sha256", secret()).update(label).digest("hex");
}

export async function GET(request: Request) {
  const operator = operatorFromCookieHeader(request.headers.get("cookie"));
  if (!operator) return NextResponse.json({ ok: false }, { status: 401 });

  const relays = (process.env.PRESENCE_RELAYS ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter((r) => r.startsWith("wss://"));

  /* name hint: email local-part for the email seat, short npub for keyed */
  const nameHint = operator.includes("@")
    ? operator.split("@")[0]
    : `${operator.slice(0, 8)}…`;

  return NextResponse.json({
    ok: true,
    relays: relays.length ? relays : DEFAULT_RELAYS,
    roomId: hmacHex("onecocreation:presence:v1").slice(0, 32),
    roomKey: hmacHex("onecocreation:presence:v1:key"),
    nameHint,
  });
}
