import type { Metadata } from "next";
import { headers } from "next/headers";
import OperatorGate from "@/components/OperatorGate";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import SiteReplaysRoom from "./SiteReplaysRoom";

/**
 * /a/site/replays - the REPLAYS door (TASK-496, block 969,088+). The exact
 * T-241 gate-wrapper shape every /a/site room wears (pinned by
 * tests/a-site-rooms-wear-the-gate.test.ts): a SERVER page that reads the
 * cookie and renders the OperatorGate when there is no operator, the room
 * body (SiteReplaysRoom.tsx) behind it.
 */

export const metadata: Metadata = {
  title: "Replays · admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SiteReplaysPage() {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }
  return <SiteReplaysRoom />;
}
