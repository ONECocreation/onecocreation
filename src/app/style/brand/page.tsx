import type { Metadata } from "next";
import { headers } from "next/headers";
import OperatorGate from "@/components/OperatorGate";
import PaletteVars from "@/components/PaletteVars";
import BrandBoard from "@/components/studio/BrandBoard";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";

/**
 * BRAND BOARD — /studio/brand (BRAND BOARD batch, 2026-08-14). The brand's
 * dressing room: both theme skins side by side, the real type ladder and
 * blocks rendered through the registry, the palette machinery (roll /
 * eyedrop / dawn overrides / save) lifted out of the old top-bar
 * PaletteDock, and a gradient try-out lab.
 *
 * Same gate + noindex pattern as the studio catch-all; a STATIC route, so
 * Next resolves it ahead of /studio/[[...slug]] — and PuckEditor reserves
 * the "brand" slug (filtered from the switcher, rejected in goToPage) so a
 * page can never shadow the board.
 */
export const metadata: Metadata = {
  title: "Brand board — One Cocreation admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BrandBoardPage() {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }

  return (
    <>
      <PaletteVars />
      <BrandBoard />
    </>
  );
}
