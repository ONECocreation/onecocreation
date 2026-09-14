import type { Metadata } from "next";
import { headers } from "next/headers";
import OperatorGate from "@/components/OperatorGate";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import SiteMenuRoom from "./SiteMenuRoom";

/**
 * /a/site/menu — THE MENU door (TASK-241, 0018.06.23 a₿). The room (the
 * nav editor) is untouched — it moved to `SiteMenuRoom.tsx` verbatim so
 * this file could become a SERVER component and carry the same
 * key-is-the-operator gate as every other /a room: no operator cookie, the
 * door renders.
 */

export const metadata: Metadata = {
  title: "Menu — admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SiteMenuPage() {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }
  return <SiteMenuRoom />;
}
