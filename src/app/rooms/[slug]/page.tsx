import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ClassroomView from "@/components/rooms/ClassroomView";
import { ROOMS } from "@/lib/matrix-rooms";
import { getPin } from "@/lib/room-pins";
import { getSiteConfig } from "@/lib/site-config";
import { liveRoomName } from "@/lib/live";
import { sessionsFromCookieHeader } from "@/lib/fren-auth";
import { tierForSubject } from "@/lib/member-tier";
import { TIERS } from "@/lib/entitlement";
import { roomGate } from "@/lib/room-access";

export const dynamic = "force-dynamic";

const bySlug = (slug: string) => ROOMS.find((r) => r.id.slice(1, r.id.indexOf(":")) === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const room = bySlug(slug);
  return { title: `${room?.title ?? "Room"} — One Cocreation` };
}

/* C4: the Classroom Four — one room, three member vantages (Sanctuary /
 * Lesson Path / Circle, loves-desk-and-classroom-plan.md Lane ROOM) over
 * the same shipped chat rail (RoomView, unmodified). The pinned welcome is
 * read here — a server component, the cheapest honest path — and handed
 * down as a prop rather than an extra client round trip. */
export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = bySlug(slug);
  if (!room) notFound();

  const pin = await getPin(slug);
  /* TASK-146 minimal-forced-edit: the Video vantage's live embed needs the
   * site's own Jitsi domain and this room's namespaced room name — both
   * derive server-side (the switches read is server-only; live.ts's ONE
   * liveRoomName() helper is server-only too, see its docblock) and are
   * handed down as plain props. Without this the toggle in RoomVideoSlot
   * would be cosmetic — there would be nothing to embed. */
  const switches = await getSiteConfig();

  /* TASK-174: the Stage's video slot follows the SAME gate as the chat —
   * the room's minTier vs the visitor's tier, decided ONCE by
   * room-access.ts's roomGate so the two can never disagree. The visitor's
   * session + tier are read server-side (the same vault truth the rooms
   * feed derives) and threaded down as plain props; without this the video
   * slot would show the embed to a signed-out visitor while the chat below
   * rightly shows the sign-in door. */
  const session = sessionsFromCookieHeader((await headers()).get("cookie"))[0] ?? null;
  const visitorTier = session ? await tierForSubject(`${session.handle}@${session.space}`) : null;
  const door = roomGate(room.minTier, { signedIn: !!session, tier: visitorTier });
  const doorPackage = room.minTier === "all" ? null : TIERS[room.minTier].name;

  return (
    <main className="mgmt-ground">
      <SiteHeader />
      <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 1080 }}>
        <header className="mgmt-head">
          <p className="mgmt-eyebrow">
            <Link href="/classes" style={{ color: "inherit" }}>Classes &amp; Community</Link>
          </p>
          <h1 className="mgmt-title">{room.title}</h1>
        </header>
        <ClassroomView
          slug={slug}
          alias={room.id}
          title={room.title}
          kind={room.kind}
          pin={pin}
          jitsiDomain={switches.meeting.jitsiDomain}
          liveRoom={liveRoomName(slug)}
          door={door}
          doorPackage={doorPackage}
        />
      </section>
      <SiteFooter />
    </main>
  );
}
