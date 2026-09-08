import type { Metadata } from "next";
import { headers } from "next/headers";
import OperatorGate from "@/components/OperatorGate";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import { cartridge } from "@/brand/cartridge";
import { getSiteConfig } from "@/lib/site-config";
import { STUDIO_SCENES, type StudioSceneId } from "@/lib/studio/scenes";
import { overlayConfigured, overlayQuery } from "@/lib/studio/overlay-token";
import { getStudioDoc } from "@/lib/studio/roster";
import StudioRoom from "@/components/studio-overlay/StudioRoom";

/**
 * /a/studio — THE DIRECTOR'S DESK (TASK-191, 0018.06.18 a₿ · block
 * 966119). The /a/studio word is reclaimed with /studio (the Admiral's
 * GROUND ruling: T-175's thin redirect to the page designer is deleted —
 * the designer lives at /style now). This room holds the broadcast
 * studio's inputs: the scene picker, the host's own lower third, the
 * guest roster (name + specialty), the show title, the copy-able overlay
 * URL per scene, and the VDO push/guest links derived from the meeting
 * config's room prefix (T-137). The on-stage panel (the cameras' live
 * state) is Phase 2 — it comes with the studio kit, and the room says so.
 *
 * Same gate as every /a room: no operator cookie, the door renders.
 */

export const metadata: Metadata = {
  title: "Studio — admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StudioRoomPage() {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const origin = `${proto}://${host}`;

  const [doc, config] = await Promise.all([getStudioDoc(), getSiteConfig()]);

  /* the copy-able overlay URL per scene — null when the seat secret is
     unset and the room says so honestly instead of minting a dead link */
  const overlayUrls = Object.fromEntries(
    STUDIO_SCENES.map((s) => {
      const q = overlayQuery(s.id);
      return [s.id, q ? `${origin}/studio/overlay?${q}` : null];
    }),
  ) as Record<StudioSceneId, string | null>;

  /* the VDO room derives from the meeting config's prefix (T-137) — the
     same derivation the booking flow uses, one word further */
  const vdoRoom = `${config.meeting.vdoRoomPrefix}-studio`;
  const vdo = {
    room: vdoRoom,
    push: `https://vdo.ninja/?room=${encodeURIComponent(vdoRoom)}&push=host`,
    guest: `https://vdo.ninja/?room=${encodeURIComponent(vdoRoom)}`,
  };

  return (
    <StudioRoom
      initial={doc}
      overlayUrls={overlayUrls}
      overlayReady={overlayConfigured()}
      vdo={vdo}
      showTitleFallback={cartridge.copy.productName}
    />
  );
}
