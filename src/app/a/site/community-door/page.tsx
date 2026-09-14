import type { Metadata } from "next";
import { headers } from "next/headers";
import OperatorGate from "@/components/OperatorGate";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import SiteCommunityDoorRoom from "./SiteCommunityDoorRoom";

/**
 * /a/site/community-door — THE COMMUNITY DOOR readiness room (TASK-241,
 * 0018.09.14 a₿). The room (T-162's card) is untouched — it moved to
 * `SiteCommunityDoorRoom.tsx` verbatim so this file could become a SERVER
 * component and carry the same key-is-the-operator gate as every other /a
 * room: no operator cookie, the door renders.
 */

export const metadata: Metadata = {
  title: "Community door — admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SiteCommunityDoorPage() {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }
  return <SiteCommunityDoorRoom />;
}
