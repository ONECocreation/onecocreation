import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ClassroomView from "@/components/rooms/ClassroomView";
import { ROOMS } from "@/lib/matrix-rooms";
import { getPin } from "@/lib/room-pins";

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
        />
      </section>
      <SiteFooter />
    </main>
  );
}
