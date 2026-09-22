import type { Metadata } from "next";
import { headers } from "next/headers";
import OperatorGate from "@/components/OperatorGate";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import { SectionHead } from "@/components/console/glass";
import SiteChatCard from "@/components/console/SiteChatCard";

/**
 * /a/site/chat — Love's studio chat switch (TASK-387, block 968,088+).
 * Same server operator-gate shape as every other /a/site/* room
 * (reading/page.tsx, community-door/page.tsx, about-videos/page.tsx): no
 * operator cookie, the door renders instead of the room. The h1/intro/
 * SectionHead shell folds directly in here (SiteReadingRoom.tsx's own
 * shape) rather than a third file — this lane's OWNS names only this
 * page and SiteChatCard.tsx.
 */

export const metadata: Metadata = {
  title: "Room chat — admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SiteChatPage() {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }
  return (
    <div className="p-6" style={{ maxWidth: 860 }}>
      <h1 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 4px" }}>Room chat</h1>
      <p style={{ fontSize: ".82rem", color: "var(--muted)", margin: "0 0 6px", maxWidth: 640 }}>
        Hide the chat fully for a room, or turn it back on — the same switch works live,
        mid-session; open rooms follow within about one poll after you Save.
      </p>
      <SectionHead label="Room chat — on or hidden, per room" />
      <SiteChatCard />
    </div>
  );
}
