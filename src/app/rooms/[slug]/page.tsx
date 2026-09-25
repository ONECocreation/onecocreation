import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ClassroomView from "@/components/rooms/ClassroomView";
import { ROOMS } from "@/lib/matrix-rooms";
import { rosterForRequest } from "@/lib/matrix";
import { getPin } from "@/lib/room-pins";
import { getSiteConfig } from "@/lib/site-config";
import { liveRoomName, studioVdoLinks, studioGuestCameraLink } from "@/lib/live";
import { getStudioDoc } from "@/lib/studio/roster";
import { studioSceneKind, type StudioSceneId } from "@/lib/studio/scenes";
import { sessionsFromCookieHeader } from "@/lib/member-auth";
import { tierForSubject } from "@/lib/member-tier";
import { TIERS } from "@/lib/entitlement";
import { roomGate } from "@/lib/room-access";
import { READING_ROOM_SLUG } from "@/lib/reading-room";
import { nextReading, DEFAULT_READING_SCHEDULE, type ReadingSchedule } from "@/lib/reading-schedule";

export const dynamic = "force-dynamic";

/* TASK-465 (block 968,561): a room carrying `hidden: true` never resolves
 * here — a direct visit to its own /rooms/<slug> address notFounds, the
 * same as any unknown slug. Admin surfaces (go-live, the readiness card)
 * still operate the room; only this member-facing address is closed. */
const bySlug = (slug: string) => ROOMS.find((r) => !r.hidden && r.id.slice(1, r.id.indexOf(":")) === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const room = bySlug(slug);
  return { title: `${room?.title ?? "Room"} — One Cocreation` };
}

/* TASK-382: kept out of RoomPage's own body so the purity rule never meets
 * `Date.now()` (letters/[key]'s helper idiom,
 * src/app/a/letters/[key]/page.tsx:78-83 / src/app/a/page.tsx:83-96). Null
 * off the reading room; on it, the schedule plus the ONE server clock
 * reading both this and the notice's own first paint use (Ground,
 * DETERMINISTIC HYDRATION) — never re-read on the client for that paint. */
function computeReading(
  slug: string,
  schedule: ReadingSchedule,
): { schedule: ReadingSchedule; next: { startsAtMs: number; endsAtMs: number } | null; asOfMs: number } | null {
  if (slug !== READING_ROOM_SLUG) return null;
  const asOfMs = Date.now();
  const next = nextReading(schedule, asOfMs);
  return { schedule, next: next && { startsAtMs: next.startsAtMs, endsAtMs: next.endsAtMs }, asOfMs };
}

/* TASK-184 (0018.06.18 a₿): a classroom is THREE rooms — the Stage (the
 * Video layout wins), the Lesson Path (recordings + Materials merged in),
 * the Circle (the weekly view over the month). The Sanctuary and the
 * separate Video/Materials/People vantages retired; vantage.ts resolves
 * their stale picks to the Stage. The pinned welcome is read here — a
 * server component, the cheapest honest path — and handed down as a prop
 * rather than an extra client round trip. */
export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = bySlug(slug);
  if (!room) notFound();

  const pin = await getPin(slug);
  /* TASK-146 minimal-forced-edit: the Stage's live embed needs the
   * site's own Jitsi domain and this room's namespaced room name — both
   * derive server-side (the switches read is server-only; live.ts's ONE
   * liveRoomName() helper is server-only too, see its docblock) and are
   * handed down as plain props. Without this the toggle in RoomVideoSlot
   * would be cosmetic — there would be nothing to embed. */
  const switches = await getSiteConfig();

  /* TASK-387: this room's own chat switch, off the SAME `switches` read
   * above -- zero new server fetch. Absent slug or absent map reads as
   * chat ON (Named decision D, today's behavior is the default). The
   * page's own `dynamic = "force-dynamic"` (set near the top of this
   * file) is what makes this a live read every request, so a hidden room
   * never flashes its chat on first paint, even once (Ground). */
  const chatHidden = switches.rooms?.[slug]?.chat === "hidden";

  /* TASK-382: the next-reading notice's own server snapshot (Ground,
   * DETERMINISTIC HYDRATION) — reads `switches.reading`, already fetched
   * above, so this costs no extra read. See `computeReading` above for why
   * the actual `Date.now()` call sits outside this component's own body. */
  const reading = computeReading(slug, switches.reading ?? DEFAULT_READING_SCHEDULE);

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
  /* TASK-236 (0018.06.23 a₿): the SAME signedIn/tier feed the after-hours
   * door's own gate (AfterHoursDoor, a Stage region) — its target room is a
   * DIFFERENT room than this one, so it can't reuse `door` above; it reuses
   * roomGate itself with these two threaded down instead. */
  const doorPackage = room.minTier === "all" ? null : TIERS[room.minTier].name;

  /* TASK-184 · the 429 hunt: ONE roster/presence read per open, taken
   * SERVER-SIDE with the bot's own seat (matrix.ts's roomRoster via
   * rosterForRequest — React cache(), deduped per request) and threaded
   * down as a plain prop. Before this, every vantage mount fired its own
   * member-token burst (login → directory → joined_members → up to 24
   * presence GETs) — the fan-out the homeserver's rate limit answered 429
   * on at the Clair Senses Sanctuary. The gate rides first: a visitor the
   * room is closed to costs the homeserver NOTHING (no read, roster null).
   * A 429 answer renders honest words in RoomPresence, never a blank room. */
  const roster = door === "open" ? await rosterForRequest(room.id) : null;

  /* TASK-245: the same pass-through shape as jitsiDomain/liveRoom above —
   * the Stage's video slot needs the meeting rail to know which studio to
   * mount, and (on the vdo rail) the studio's own room name, T-243's ONE
   * derivation (studioVdoLinks), never re-spelled here. TASK-440: called
   * with NO key — the unkeyed builder derives nothing (live-links.ts's
   * `key` is a pass-through parameter, never computed here). */
  const studioVdo = studioVdoLinks(switches.meeting.vdoRoomPrefix, switches.meeting.vdoHost);

  /* TASK-440 (block 968,222 — the Admiral: "let's make it dark so no one
     gets the pssword."): what THIS page controls — it derives and sends
     NO studio key, in EVERY rail, door and live state — no rail-and-door
     exception, no "live now" exception. Every signed-in member (the free
     Heart Field included) used to receive `roomKey` here, and
     room+password is one distinct VDO room, so that one key opened Love's
     own studio, her director seat and her camera seat. No key-producing
     helper is called on this page, and no keyed camera/view/push/gallery
     link is serialized. (T-305's `roomKey` derivation — live.ts's
     `studioRoomKey` over `studioVdo.room` — was retired by this ruling,
     and the `roomKey` client prop with it.)
     THE HONEST RESIDUAL: the READ-ONLY stage slot (RoomVideoSlot.tsx:323)
     gates on rail/live/host/room — never on a key — so while the rail is
     vdo and Love is live it still mounts an UNKEYED view iframe into the
     unkeyed twin room (:386). That frame shows nothing of Love's keyed
     studio (room+password is a different room), but it IS a broadcast
     frame on the page — the stage is dark in CONTENT, not absent, until
     Heart Field has its own room. */

  /* TASK-245: the gallery's on-camera set — derived, never fabricated. No
   * signal anywhere answers "is this soul's camera on right now" (the
   * studio kit's live state is Phase 2), so this reads the ONE real
   * intention already on record: the director's own guest roster
   * (studio/doc.ts's StudioDoc, typed at /a/studio before the show) — a
   * present soul whose display name matches the host or a listed guest is
   * who Love actually arranged to be on camera today. Read only on the vdo
   * rail while live and the room is open — the one case the gallery can
   * ever show, same gate the roster read above already takes. */
  const onCameraMxids: string[] = [];
  /* TASK-245 gate follow-through: the HOST is the stage itself, never a
   * watcher — a present soul whose name matches the director's own name
   * leaves the gallery entirely (she is already the big frame above it,
   * pushed as `host`), and only the named GUESTS go on camera. */
  const stageMxids: string[] = [];
  /* TASK-249: a present soul Love NAMED as today's guest draws a VDO tile
   * addressed by their OWN site handle — but nothing publishes under that
   * id until they open a door pushing it. `cameraDoor` is that door,
   * derived only when THIS viewer's own session handle matches one of the
   * mxids the loop below just placed on camera (mxid `@<handle>:<domain>`,
   * the local part compared handleOf-style, lowercase, against the
   * session handle). Same gate as the derivation above (vdo rail, live,
   * room open) — never a stray read, never a door for anyone Love didn't
   * name. */
  let cameraDoor: string | null = null;
  /* TASK-251 (0018.06.23 a₿): Love's full-frame scene (starting soon / be
   * right back / thank you) — the doc's own `activeScene` when its kind is
   * `full` (studioSceneKind, the overlay route's one branch point), else
   * null. "Live 20 minutes early, camera off" used to leave viewers
   * watching an empty host frame: nothing on the Stage ever watched this
   * id, it only ever rode a VDO `&website=` push to /studio/overlay. The
   * three text fields ride alongside it (the SAME doc read, never a second
   * one) so RoomVideoSlot can render the scene without an overlay token —
   * no signed key ever reaches this public page. */
  let fullScene: Extract<StudioSceneId, "starting" | "brb" | "ending"> | null = null;
  let fullSceneShowTitle = "";
  let fullSceneStartsAt = "";
  let fullSceneAfterHoursLine = "";
  if (switches.meeting.rail === "vdo" && door === "open" && roster?.ok) {
    const doc = await getStudioDoc();
    if (studioSceneKind(doc.activeScene) === "full") {
      fullScene = doc.activeScene as Extract<StudioSceneId, "starting" | "brb" | "ending">;
      fullSceneShowTitle = doc.showTitle;
      fullSceneStartsAt = doc.startsAt;
      fullSceneAfterHoursLine = doc.afterHoursLine;
    }
    const norm = (n: string) => n.trim().toLowerCase();
    const hostName = norm(doc.host.name);
    const guestNames = new Set(doc.guests.map((g) => norm(g.name)).filter((n) => n !== ""));
    for (const [mxid, info] of Object.entries(roster.joined)) {
      const name = norm(info.display_name || mxid.slice(1, mxid.indexOf(":")));
      if (hostName !== "" && name === hostName) stageMxids.push(mxid);
      else if (guestNames.has(name)) onCameraMxids.push(mxid);
    }
    if (session) {
      const viewerHandle = norm(session.handle);
      const mine = onCameraMxids.find((mxid) => norm(mxid.slice(1, mxid.indexOf(":"))) === viewerHandle);
      if (mine) {
        /* TASK-440: minted UNKEYED — this page sends no studio key (the
           DARK ruling above); the door pushes into the unkeyed room, the
           same one the keyless stage watches, never Love's keyed studio.
           THE HONEST RESIDUAL: pre-T-440 the SAME key rode both sides, so
           "Love named you as today's guest" reached her show; now this
           door no longer reaches Love's v2-keyed director desk (her desk
           never sees the unkeyed twin) — the named-guest camera path is
           dark with the stage until Heart Field has its own room. */
        cameraDoor = studioGuestCameraLink(switches.meeting.vdoHost, studioVdo.room, mine.slice(1, mine.indexOf(":")));
      }
    }
  }

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
          roster={roster}
          rail={switches.meeting.rail}
          vdoHost={switches.meeting.vdoHost}
          studioRoom={studioVdo.room}
          onCameraMxids={onCameraMxids}
          stageMxids={stageMxids}
          cameraDoor={cameraDoor}
          fullScene={fullScene}
          fullSceneShowTitle={fullSceneShowTitle}
          fullSceneStartsAt={fullSceneStartsAt}
          fullSceneAfterHoursLine={fullSceneAfterHoursLine}
          signedIn={!!session}
          viewerTier={visitorTier}
          reading={reading}
          chatHidden={chatHidden}
        />
      </section>
      <SiteFooter />
    </main>
  );
}
