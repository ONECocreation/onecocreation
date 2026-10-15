import type { Metadata } from "next";
import { headers } from "next/headers";
import OperatorGate from "@/components/OperatorGate";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import SiteReadingRoom from "./SiteReadingRoom";
import HousewarmingSwitchCard from "./HousewarmingSwitchCard";
import PartSwitchCard from "./PartSwitchCard";

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
 *
 * TASK-499 (block 969,306+): the Housewarming-this-week switch card
 * mounts HERE, directly below `<SiteReadingRoom />` and behind the same
 * gate — never inside SiteReadingRoom.tsx, which task-446's stale live
 * claim owns (the brief's decision 3).
 *
 * TASK-614: the Book Talk (Part 3) and Q&A (Part 4) switches mount below
 * it, the same card pattern (PartSwitchCard.tsx, used twice).
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
  return (
    <>
      <SiteReadingRoom />
      <HousewarmingSwitchCard />
      <PartSwitchCard
        switchKey="bookTalk"
        label="Book Talk this week"
        onWords="this week has the Book Talk at 2:22, the paid group call"
        offWords="no Book Talk this week; the day goes from the Reading to the Q&A"
        onNote="saved - the Book Talk is back on the reading page's next render"
        offNote="saved - no Book Talk this week; the reading page hides it on its next render"
      />
      <PartSwitchCard
        switchKey="qa"
        label="Q&A with Love this week"
        onWords="this week ends with the Q&A with Love at 3:33"
        offWords="no Q&A this week; the day ends after the Book Talk"
        onNote="saved - the Q&A is back on the reading page's next render"
        offNote="saved - no Q&A this week; the reading page hides it on its next render"
      />
    </>
  );
}
