import { NextResponse } from "next/server";
import { liveAdapter } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * The tip jar (the Admiral's ask, 0018.05.10) — three jars, one rail:
 *   love        → a gift to Love herself
 *   onecocreation → keeps the lights on (site, rails, rooms)
 *   payforward  → funds a session or membership for someone who can't
 *
 * v1 is honest about custody: all three flow through the site's BTCPay
 * store, tagged by jar in the charge id (`tip-<jar>-…`), so the books can
 * split them. SEPARATE destination wallets per jar — an admin-configurable
 * xpub/store per jar — is the designed next step and lives in the
 * questions-for-love checklist; this is people's livelihood, so custody
 * hygiene gets designed with the artist, not assumed.
 */
const JARS = new Set(["love", "onecocreation", "payforward"]);
const MIN_SATS = 210;
const MAX_SATS = 10_000_000;

export async function POST(request: Request) {
  const adapter = liveAdapter();
  if (!adapter) {
    return NextResponse.json(
      { ok: false, reason: "payment rail not connected yet" },
      { status: 503 },
    );
  }

  let body: { target?: string; amountSats?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  }

  const target = body.target ?? "";
  const sats = Math.floor(Number(body.amountSats));
  if (!JARS.has(target)) {
    return NextResponse.json({ ok: false, reason: "unknown jar" }, { status: 400 });
  }
  if (!Number.isFinite(sats) || sats < MIN_SATS || sats > MAX_SATS) {
    return NextResponse.json(
      { ok: false, reason: `amount must be ${MIN_SATS}–${MAX_SATS.toLocaleString()} sats` },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  const tipId = `tip-${target}-${crypto.randomUUID().slice(0, 8)}`;
  const charge = await adapter.createCharge(
    {
      orderId: tipId,
      amount: sats,
      currency: "SATS",
      redirectUrl: `${origin}/support?thanks=${target}`,
    },
    tipId,
  );

  return NextResponse.json({ ok: true, payUrl: charge.payUrl, tipId });
}
