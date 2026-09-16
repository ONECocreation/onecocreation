import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import OperatorGate from "@/components/OperatorGate";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import { getSiteConfig } from "@/lib/site-config";
import { studioRoomKey } from "@/lib/live";
import VdoRoom from "@/components/booking/VdoRoom";
import { resolveStudioRoom } from "@/app/meet/studio/room-access";
import { mintStudioDirectorTarget } from "../mint";
import DirectorDeskEndCard from "./end-card";

export const metadata: Metadata = {
  title: "Director's desk — admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /a/studio/room/<room> — THE DIRECTOR'S DESK, LIVING IN THE SITE
 * (TASK-306, 0018.06.25 a₿ · block ~967,218; T-292 DESIGN.md §2 Page A,
 * the shell + keyed iframe slice — the right rail is a follow-on lane).
 * The operator's "Open your director's desk" door now lands HERE, on her
 * own site, instead of the studio's address — and the keyed studio URL
 * leaves every href and copy button it used to ride bare: after this
 * route exists, the key appears only inside the iframe src this page's
 * own server mints (the exact posture T-297 set for the guest room).
 *
 * The gate is the SAME independent operator check every /a room wears —
 * a nested route does not inherit the parent page's runtime check (the
 * /a layout's own shell-gate is chrome, not authorization). The room id
 * is still the room-selection mechanism: it must pass T-297's ONE access
 * read (resolveStudioRoom — registry ∨ namespace ∨ booking, imported
 * from the guest room's READ-ONLY module, never re-derived) or it's a
 * 404, even for the operator — no garbage mints.
 *
 * The keyed director URL mounts DIRECTLY as the iframe src — the house
 * law T-297 A/B-proved (Chromium does not delegate camera/mic through a
 * redirect inside an iframe; no redirect route, ever). This page is
 * force-dynamic, so the minted HTML is no-store natively.
 */
export default async function DirectorDeskPage({ params }: { params: Promise<{ room: string }> }) {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }

  const { room } = await params;
  const access = await resolveStudioRoom(room);
  if (!access) notFound();

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "localhost"}`;

  const config = await getSiteConfig();
  const roomTitle = access.title ?? room;
  const src = mintStudioDirectorTarget({
    vdoHost: config.meeting.vdoHost,
    room,
    key: studioRoomKey(room) ?? undefined,
    origin,
  });

  return (
    <div className="p-2 text-sm" style={{ color: "var(--ink)" }}>
      <p style={{ margin: "0 0 4px", fontSize: ".85rem", color: "var(--muted)" }}>
        your director&apos;s desk — {roomTitle} · the room, the guests, the controls, inside the site.
      </p>
      <VdoRoom
        src={src}
        vdoHost={config.meeting.vdoHost}
        title={`${roomTitle} — the director's desk`}
        height="78vh"
        endCard={<DirectorDeskEndCard />}
      />
    </div>
  );
}
