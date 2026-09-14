import type { Metadata } from "next";
import { headers } from "next/headers";
import OperatorGate from "@/components/OperatorGate";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import SiteRoom from "./SiteRoom";

/**
 * /a/site — THE SWITCHES door (TASK-241, 0018.06.23 a₿). The room itself
 * (the switches, payment rails, meeting picker) is unchanged — it moved to
 * `SiteRoom.tsx` verbatim so this file could become a SERVER component and
 * carry the same key-is-the-operator gate as every other /a room
 * (`/a/live`, `/a`, `/a/studio`, `/a/briefs`, …): no operator cookie, the
 * door renders and the console shell never mounts (src/app/a/layout.tsx
 * drops the shell too). SiteRoom's own `denied` branch stays as
 * belt-and-braces — the fetch can still 401 if the seat expires mid-visit.
 */

export const metadata: Metadata = {
  title: "Site — admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SiteSwitchesPage() {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }
  return <SiteRoom />;
}
