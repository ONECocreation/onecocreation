import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { sessionsFromCookieHeader } from "@/lib/member-auth";
import { getSiteConfig } from "@/lib/site-config";
import { resolveStudioRoom, memberPrefillName } from "../room-access";
import PreJoin from "./pre-join";

export const metadata: Metadata = { title: "The meeting room — One Cocreation" };
export const dynamic = "force-dynamic";

/**
 * /meet/studio/<room> — THE MEETING ROOM, LIVING IN THE SITE (TASK-297,
 * 0018.06.25 a₿ · block ~967,218; T-292 DESIGN.md §2 Page B). The guest
 * link the site hands out is THIS page — onecocreation.com, never the
 * studio's address ("so they won't get to see my website yet" ends here,
 * Love call #4 item 12). The room id is the capability: an id that
 * isn't the registry's, the namespace's, or a confirmed vdo booking's
 * (room-access.ts's ONE read) is no room at all — notFound(), the
 * /meet/[bookingId] law.
 *
 * The room's title + note come from the fork's own brand/rooms.json when
 * it answers honestly; when it doesn't, the page carries the room id and
 * a plain line — never an invented title (derive-or-dash).
 *
 * SECURITY (T-292 §4): this page mints NOTHING keyed. The keyed studio
 * URL exists only inside the frame route's 302 (src/app/meet/studio/
 * frame/), so the key never touches this page's HTML — not as text, not
 * in a copy field, not in a client prop's flight data.
 */
export default async function MeetStudioPage({ params }: { params: Promise<{ room: string }> }) {
  const { room } = await params;
  const access = await resolveStudioRoom(room);
  if (!access) notFound();

  const member = sessionsFromCookieHeader((await headers()).get("cookie"))[0] ?? null;
  const initialName = member ? await memberPrefillName(member.handle, member.space) : "";
  const config = await getSiteConfig();

  return (
    <main className="mgmt-ground">
      <SiteHeader />
      <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 1020 }}>
        <header className="mgmt-head">
          <p className="mgmt-eyebrow">the meeting room</p>
          <h1 className="mgmt-title">{access.title ?? room}</h1>
          {access.note && <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>{access.note}</p>}
          {!access.title && (
            <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>
              a one-off room on Love&apos;s own studio — you were expected.
            </p>
          )}
        </header>
        <PreJoin
          room={room}
          vdoHost={config.meeting.vdoHost}
          roomTitle={access.title ?? room}
          initialName={initialName}
        />
      </section>
      <SiteFooter />
    </main>
  );
}
