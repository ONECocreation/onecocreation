import type { Metadata } from "next";
import { headers } from "next/headers";
import OperatorGate from "@/components/OperatorGate";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import QuestionsRoom from "./QuestionsRoom";

/**
 * /a/letters/questions — the Intuitive Q&A questions room (TASK-603 phase 2,
 * K182). Same server operator-gate shape as every other /a/* room: no
 * operator cookie, the door renders instead of the room. roomForPath
 * (src/lib/console.ts) resolves this path to the letters room by
 * longest-prefix; SiteConsoleShell lists it under Studio (menu placement
 * ONLY, the T-545 precedent) and the page heading reads the sub-room's own
 * name (T-622's STUDIO_SUB_HEADS).
 */

export const metadata: Metadata = {
  title: "Q&A questions (admin)",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LettersQuestionsPage() {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }
  return <QuestionsRoom />;
}
