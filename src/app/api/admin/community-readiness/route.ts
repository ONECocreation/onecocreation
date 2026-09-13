import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { communityReadiness } from "@/lib/community-readiness";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/**
 * THE COMMUNITY DOOR'S probes (TASK-162, cut 0018.06.17 a₿ · block
 * 966,080) — the /a/site "Community door" card reads its five readiness
 * rows through here. Operator-gated like every admin route (the client
 * screen is a courtesy, this check is the gate). Every probe is a GET and
 * each row's words carry hostnames and the seat's mxid only — never a
 * token, key, or env VALUE (the rail-status rule: names, not secrets).
 */
export async function GET(request: Request) {
  const operator = operatorFromCookieHeader(request.headers.get("cookie"));
  if (!operator) {
    return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  }
  /* TASK-210: the identity row resolves the seat THIS operator is in (Love's
     own email door), never the bot's whoami printed under her name */
  const [rows, config] = await Promise.all([communityReadiness({ operator }), getSiteConfig()]);
  return NextResponse.json({ ok: true, rows, communityOn: config.features.community });
}
