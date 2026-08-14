import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import OperatorGate from "@/components/OperatorGate";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";

/**
 * /a/studio — thin redirect, not the editor (PUCK P2, 2026-08-10). The
 * studio moved to its own top-level route (src/app/studio/[[...slug]]/
 * page.tsx) so it can own the full viewport instead of squeezing into the
 * console's content strip (the P1 bug). This stub stays under /a purely so
 * the studio is still discoverable/bookmarkable from the console — it
 * gates itself the same way every /a room does, then hands off to /studio,
 * preserving whatever slug was requested.
 */
export const metadata: Metadata = {
  title: "Studio — One Cocreation admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StudioRedirect({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }

  const { slug: slugParts } = await params;
  const suffix = slugParts?.length ? `/${slugParts.join("/")}` : "";
  redirect(`/studio${suffix}`);
}
