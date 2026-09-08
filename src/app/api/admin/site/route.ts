import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { getSiteConfig, saveSiteConfig, aboutPatchError, type SiteConfigPatch } from "@/lib/site-config";
import { btcpayAdapter, squareAdapter } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * THE SWITCHES' door (TASK-129, cut 0018.06.16 a₿) — the /a/site room reads
 * and saves the site-config doc through here. Operator-gated like every
 * admin route; the client screen is a courtesy, this check is the gate.
 *
 * The GET carries each payment rail's env NAMES + a configured boolean —
 * never a value — so the room can grey a toggle whose rail couldn't actually
 * charge (a switch ON with no env behind it would pretend).
 */

/** The client screens are a courtesy; this check is the gate. */
function gate(request: Request): NextResponse | null {
  const operator = operatorFromCookieHeader(request.headers.get("cookie"));
  if (!operator) return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  return null;
}

/** env NAMES only — a value never rides this route. */
function railStatus() {
  return {
    btcpay: {
      configured: btcpayAdapter.configured(),
      env: ["BTCPAY_URL", "BTCPAY_STORE_ID", "BTCPAY_API_KEY"],
    },
    square: {
      configured: squareAdapter.configured(),
      env: ["SQUARE_ACCESS_TOKEN", "SQUARE_LOCATION_ID"],
    },
    stripe: {
      // no adapter yet (payments.ts getAdapter honestly returns null) and no
      // env — Love's Stripe keys live in the /a/money key drawer, vault-side
      configured: false,
      env: [] as string[],
    },
  };
}

export async function GET(request: Request) {
  const operator = operatorFromCookieHeader(request.headers.get("cookie"));
  /* Dual-mode read (TASK-129): the SWITCHES THEMSELVES are public — they only
     ever say what the site's own nav/footer/shelf already shows, and the
     client-side NavMenu/SiteFooter read them here (SiteHeader is client-
     reachable via FrenProfile/OperatorGate, so no server import may enter its
     graph — the booleans can't be passed down; same fetch idiom as
     FrenBadge → /api/frens/session). The rail/env STATUS stays behind the
     operator gate: env-configured state is the house's business, not the
     page's. Writes (PUT below) are always operator-only. */
  if (!operator) return NextResponse.json({ ok: true, config: await getSiteConfig() });
  return NextResponse.json({ ok: true, config: await getSiteConfig(), rails: railStatus() });
}

export async function PUT(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  let patch: SiteConfigPatch;
  try {
    patch = (await request.json()) as SiteConfigPatch;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  }
  if (!patch || typeof patch !== "object") {
    return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  }
  /* TASK-161 (0018.06.17 a₿ · block 966,080) — the About playlist rides this
     route now; a malformed `about` patch is refused IN WORDS, never silently
     sanitized into dropped rows. */
  if ("about" in patch) {
    const reason = aboutPatchError((patch as Record<string, unknown>).about);
    if (reason) return NextResponse.json({ ok: false, reason }, { status: 400 });
  }
  const config = await saveSiteConfig(patch);
  return NextResponse.json({ ok: true, config, rails: railStatus() });
}
