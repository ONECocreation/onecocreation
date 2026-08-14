import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import RoomView from "@/components/rooms/RoomView";
import { ROOMS } from "@/lib/matrix-rooms";

export const dynamic = "force-dynamic";

const bySlug = (slug: string) => ROOMS.find((r) => r.id.slice(1, r.id.indexOf(":")) === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const room = bySlug(slug);
  return { title: `${room?.title ?? "Room"} — One Cocreation` };
}

/* C4: one room, worn in her brand — the timeline lives in RoomView. */
export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = bySlug(slug);
  if (!room) notFound();

  return (
    <main className="mgmt-ground">
      <SiteHeader />
      <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 880 }}>
        <header className="mgmt-head">
          <p className="mgmt-eyebrow">
            <Link href="/classes" style={{ color: "inherit" }}>Classes &amp; Community</Link>
          </p>
          <h1 className="mgmt-title">{room.title}</h1>
        </header>
        <RoomView
          slug={slug}
          alias={room.id}
          title={room.title}
          kind={room.kind}
        />
      </section>
      <SiteFooter />
    </main>
  );
}
