import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import VdoRoom from "@/components/booking/VdoRoom";
import { sessionsFromCookieHeader } from "@/lib/member-auth";
import { getSiteConfig } from "@/lib/site-config";
import { resolveStudioRoom, memberPrefillName, mintStudioFrameTarget } from "../room-access";
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
 * The flow: the PRE-JOIN CARD is a plain GET form (no client JS on the
 * door at all — the toggles ride the query). `?join=1` mounts VdoRoom
 * with the SERVER-MINTED guest link (mintStudioFrameTarget — the keyed
 * studio URL, both-off arrival unless the card's toggles flipped a half
 * on, `&hangupbutton`, `&iframetarget=<this request's origin>`).
 *
 * SECURITY (T-292 §4): the key appears in this page's HTML ONLY inside
 * the iframe src (pinned in tests/meet-studio.test.ts) — never as bare
 * text, never in a copy field, never in the URL we hand out; and this
 * page is force-dynamic, so the minted HTML is `no-store` (verified:
 * `Cache-Control: private, no-cache, no-store, max-age=0,
 * must-revalidate`). An earlier cut of this lane 302'd the iframe
 * through a same-origin frame route to keep the key out of the document
 * entirely — Chromium does NOT delegate camera/mic permissions through a
 * redirect inside an iframe (A/B proven this lane: direct keyed src =
 * granted, 302 = "Camera/mic permissions denied"), and the route was an
 * anonymous key-extractor besides. The brief's own shape — server-minted
 * link, mounted — is the right one.
 */
export default async function MeetStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ room: string }>;
  searchParams: Promise<{ join?: string; label?: string; camera?: string; mic?: string }>;
}) {
  const { room } = await params;
  const access = await resolveStudioRoom(room);
  if (!access) notFound();

  const member = sessionsFromCookieHeader((await headers()).get("cookie"))[0] ?? null;
  const initialName = member ? await memberPrefillName(member.handle, member.space) : "";
  const config = await getSiteConfig();
  const roomTitle = access.title ?? room;
  const q = await searchParams;

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "localhost"}`;

  return (
    <main className="mgmt-ground">
      <SiteHeader />
      <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 1020 }}>
        <header className="mgmt-head">
          <p className="mgmt-eyebrow">the meeting room</p>
          <h1 className="mgmt-title">{roomTitle}</h1>
          {access.note && <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>{access.note}</p>}
          {!access.title && (
            <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>
              a one-off room on Love&apos;s own studio — you were expected.
            </p>
          )}
        </header>
        {q.join === "1" ? (
          <VdoRoom
            src={mintStudioFrameTarget({
              vdoHost: config.meeting.vdoHost,
              room,
              label: (q.label ?? "").trim() || "Guest",
              camera: q.camera === "1",
              mic: q.mic === "1",
              origin,
            })}
            vdoHost={config.meeting.vdoHost}
            title={roomTitle}
          />
        ) : (
          <PreJoin room={room} initialName={initialName} />
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
