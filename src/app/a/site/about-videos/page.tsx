import type { Metadata } from "next";
import { headers } from "next/headers";
import OperatorGate from "@/components/OperatorGate";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import SiteAboutVideosRoom from "./SiteAboutVideosRoom";

/**
 * /a/site/about-videos — THE VIDEOS ON ABOUT door (TASK-241, 0018.09.14
 * a₿). The room (T-161's playlist card) is untouched — it moved to
 * `SiteAboutVideosRoom.tsx` verbatim so this file could become a SERVER
 * component and carry the same key-is-the-operator gate as every other /a
 * room: no operator cookie, the door renders (the Admiral opened this exact
 * room signed out and saw a bare frame — 0018.09.14 a₿ sighting).
 */

export const metadata: Metadata = {
  title: "Videos on About — admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SiteAboutVideosPage() {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }
  return <SiteAboutVideosRoom />;
}
