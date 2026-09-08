import type { Metadata } from "next";
import { headers } from "next/headers";
import BrandDesk from "@/components/console/BrandDesk";
import OperatorGate from "@/components/OperatorGate";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";

/**
 * /a/brand — TASK-135: the DRESSING ROOM (cert foundry + the retired
 * multi-theme tester, both Pac's Arcade furniture) is replaced by
 * BrandDesk, a real colour desk for the five brand-palette slots; TASK-182
 * (0018.06.18 a₿) gave the desk WORKING colour and font pickers (the top
 * half of /style/brand's board, one shared rail). See
 * src/components/console/BrandDesk.tsx for the room's own notes.
 * Operators only — same key-is-the-operator gate as every /a tab.
 */
export const metadata: Metadata = {
  title: "Brand — One Cocreation admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminBrandPage() {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }
  return <BrandDesk />;
}
