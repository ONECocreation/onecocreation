import type { Metadata } from "next";
import { headers } from "next/headers";
import OperatorGate from "@/components/OperatorGate";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import SiteReadingRoom from "./SiteReadingRoom";

/**
 * /a/site/reading — THE WEEKLY READING room (TASK-381, block 968,047+).
 * Same server operator-gate shape as every other /a/site/* room
 * (community-door/page.tsx, about-videos/page.tsx): no operator cookie,
 * the door renders instead of the room.
 *
 * TASK-475 (block 968,624): `SiteReadingRoom` no longer takes a
 * `floorName` prop — the combined rooms card doesn't name Stage 2's floor
 * on its row (`STAGE2_FLOOR_NAME` still lives in `stage2-access.ts`, read
 * by `/reading` itself).
 */

export const metadata: Metadata = {
  title: "The weekly reading — admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SiteReadingPage() {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }
  return <SiteReadingRoom />;
}
